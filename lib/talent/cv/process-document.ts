import { AuditAction, DocumentProcessingStatus, Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { writeAudit } from "@/lib/audit";
import { extractTextFromBuffer, detectInsufficientText } from "@/lib/talent/cv/extract";
import { getOcrProvider, OcrNeededError } from "@/lib/talent/cv/ocr";
import { getDocumentStorage } from "@/lib/talent/cv/storage";
import { extractStructuredProfile } from "@/lib/talent/cv/structured-profile";
import {
  buildRankingExplanation,
  computeOverallScore,
  mergeAiProposalsWithCriteria,
  proposeCriterionMatches,
} from "@/lib/talent/cv/compare-scorecard";

function sanitizeError(error: unknown): string {
  const msg = error instanceof Error ? error.message : "Error de procesamiento";
  return msg.replace(/\b[\w.+-]+@[\w.-]+\.\w+\b/g, "[redacted]").slice(0, 400);
}

async function setStatus(
  documentId: string,
  organizationId: string,
  status: DocumentProcessingStatus,
  processingError?: string | null,
) {
  await prisma.candidateDocument.updateMany({
    where: { id: documentId, organizationId },
    data: {
      processingStatus: status,
      processingError: processingError ?? null,
    },
  });
}

/**
 * Pipeline completo: UPLOADED → QUEUED → EXTRACTING → ANALYZING → COMPLETED|FAILED|NEEDS_OCR.
 * No registra texto del CV ni PII.
 */
export async function processCandidateDocument(documentId: string) {
  const doc = await prisma.candidateDocument.findFirst({
    where: { id: documentId },
    include: {
      application: {
        include: {
          candidate: { select: { name: true } },
          scorecard: { include: { criteria: { orderBy: { sortOrder: "asc" } } } },
          job: true,
        },
      },
      extraction: true,
    },
  });

  if (!doc) throw new Error("Documento no encontrado");
  const organizationId = doc.organizationId;

  try {
    await setStatus(documentId, organizationId, "QUEUED");
    await writeAudit(prisma, {
      organizationId,
      actorUserId: doc.uploadedById,
      action: AuditAction.CV_ANALYSIS_STARTED,
      entityType: "CandidateDocument",
      entityId: documentId,
    });

    await setStatus(documentId, organizationId, "EXTRACTING");
    const storage = getDocumentStorage();
    const buffer = await storage.get(doc.storageKey);

    let extraction = doc.extraction;
    if (!extraction?.rawText) {
      const extracted = await extractTextFromBuffer(buffer, doc.mimeType);
      const needsOcr = detectInsufficientText(extracted.charCount, extracted.pageCount);
      let rawText = extracted.text;
      let extractor = extracted.extractor;
      let ocrProvider: string | null = null;

      if (needsOcr) {
        try {
          const ocr = getOcrProvider();
          rawText = await ocr.extract(buffer, doc.mimeType);
          extractor = `${extracted.extractor}+${ocr.name}`;
          ocrProvider = ocr.name;
        } catch (e) {
          if (e instanceof OcrNeededError || (e as { code?: string })?.code === "NEEDS_OCR") {
            extraction = await prisma.documentExtraction.upsert({
              where: { documentId },
              create: {
                organizationId,
                documentId,
                rawText: extracted.text || null,
                charCount: extracted.charCount,
                pageCount: extracted.pageCount,
                extractor: extracted.extractor,
                needsOcr: true,
                ocrProvider: null,
              },
              update: {
                rawText: extracted.text || null,
                charCount: extracted.charCount,
                pageCount: extracted.pageCount,
                extractor: extracted.extractor,
                needsOcr: true,
              },
            });
            await setStatus(documentId, organizationId, "NEEDS_OCR", "Texto insuficiente; se requiere OCR");
            return { status: "NEEDS_OCR" as const };
          }
          throw e;
        }
      }

      extraction = await prisma.documentExtraction.upsert({
        where: { documentId },
        create: {
          organizationId,
          documentId,
          rawText,
          charCount: rawText.length,
          pageCount: extracted.pageCount,
          extractor,
          needsOcr: false,
          ocrProvider,
        },
        update: {
          rawText,
          charCount: rawText.length,
          pageCount: extracted.pageCount,
          extractor,
          needsOcr: false,
          ocrProvider,
        },
      });
    }

    const rawText = extraction.rawText || "";
    if (detectInsufficientText(rawText.length, extraction.pageCount)) {
      await setStatus(documentId, organizationId, "NEEDS_OCR", "Texto insuficiente tras extracción");
      return { status: "NEEDS_OCR" as const };
    }

    await setStatus(documentId, organizationId, "ANALYZING");

    const scorecard = doc.application.scorecard;
    if (!scorecard) {
      throw new Error("La candidatura no tiene scorecard asociado");
    }

    const structured = await extractStructuredProfile(rawText);
    const latestProfile = await prisma.cvStructuredProfile.findFirst({
      where: { documentId, organizationId },
      orderBy: { version: "desc" },
    });
    const profileVersion = (latestProfile?.version ?? 0) + 1;
    const profileRow = await prisma.cvStructuredProfile.create({
      data: {
        organizationId,
        documentId,
        version: profileVersion,
        profileJson: structured.profile as unknown as Prisma.InputJsonValue,
        parserVersion: structured.parserVersion,
        model: structured.model,
        promptVersion: structured.promptVersion,
      },
    });

    const criteria = scorecard.criteria.map((c) => ({
      key: c.key,
      label: c.label,
      type: c.type as "SCORED" | "EXCLUDING",
      weight: c.weight,
      description: c.description,
      scoringRule: c.scoringRule,
    }));

    const ai = await proposeCriterionMatches({
      criteria,
      profileJson: structured.profile,
      cvText: rawText,
    });

    const merged = mergeAiProposalsWithCriteria(criteria, ai.proposals);
    const scored = computeOverallScore(merged);

    await prisma.cvEvaluation.updateMany({
      where: { applicationId: doc.applicationId, organizationId, isCurrent: true },
      data: { isCurrent: false },
    });

    const latestEval = await prisma.cvEvaluation.findFirst({
      where: { applicationId: doc.applicationId, organizationId },
      orderBy: { version: "desc" },
    });
    const evalVersion = (latestEval?.version ?? 0) + 1;

    const evaluation = await prisma.cvEvaluation.create({
      data: {
        organizationId,
        applicationId: doc.applicationId,
        jobId: doc.application.jobId,
        documentId,
        scorecardId: scorecard.id,
        version: evalVersion,
        isCurrent: true,
        status: "COMPLETED",
        overallScore: scored.overallScore,
        excludingOutcome: scored.excludingOutcome,
        rankingExplanation: null,
        model: ai.model,
        promptVersion: ai.promptVersion,
        scorecardVersion: scorecard.version,
        createdById: doc.uploadedById,
        criteriaResults: {
          create: merged.map((r) => ({
            criterionKey: r.criterionKey,
            criterionLabel: r.criterionLabel,
            criterionType: r.criterionType,
            weight: r.weight,
            status: r.status,
            partialScore: r.partialScore,
            confidence: r.confidence,
            evidence: r.evidence,
            explanation: r.explanation,
          })),
        },
        suggestedQuestions: {
          create: ai.suggestedQuestions.map((q, i) => ({
            criterionKey: q.criterionKey || null,
            question: q.question,
            reason: q.reason || null,
            sortOrder: i,
          })),
        },
      },
    });

    // Explicación vs vecino inmediato (ranking local del job)
    const neighbors = await prisma.cvEvaluation.findMany({
      where: {
        organizationId,
        jobId: doc.application.jobId,
        isCurrent: true,
        status: "COMPLETED",
      },
      include: { application: { include: { candidate: { select: { name: true } } } } },
      orderBy: [{ overallScore: "desc" }, { createdAt: "asc" }],
    });
    const idx = neighbors.findIndex((n) => n.id === evaluation.id);
    const above = idx > 0 ? neighbors[idx - 1] : null;
    const explanation = buildRankingExplanation(
      {
        candidateLabel: doc.application.candidate.name,
        overallScore: scored.overallScore,
        excludingOutcome: scored.excludingOutcome,
      },
      above
        ? {
            candidateLabel: above.application.candidate.name,
            overallScore: above.overallScore,
            excludingOutcome: above.excludingOutcome,
          }
        : null,
    );
    await prisma.cvEvaluation.update({
      where: { id: evaluation.id },
      data: { rankingExplanation: explanation },
    });

    await setStatus(documentId, organizationId, "COMPLETED");
    await writeAudit(prisma, {
      organizationId,
      actorUserId: doc.uploadedById,
      action: AuditAction.CV_ANALYSIS_COMPLETED,
      entityType: "CvEvaluation",
      entityId: evaluation.id,
    });

    void profileRow;
    return { status: "COMPLETED" as const, evaluationId: evaluation.id };
  } catch (error) {
    const message = sanitizeError(error);
    await setStatus(documentId, organizationId, "FAILED", message);
    await writeAudit(prisma, {
      organizationId,
      actorUserId: doc.uploadedById,
      action: AuditAction.CV_ANALYSIS_FAILED,
      entityType: "CandidateDocument",
      entityId: documentId,
    });
    throw error;
  }
}
