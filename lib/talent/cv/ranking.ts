import { prisma } from "@/lib/prisma";
import { buildRankingExplanation } from "@/lib/talent/cv/compare-scorecard";

export type RankedApplication = {
  rank: number;
  applicationId: string;
  candidateId: string;
  candidateName: string;
  overallScore: number | null;
  excludingOutcome: "PASS" | "FAIL" | "UNKNOWN";
  eligible: boolean;
  warnings: string[];
  explanationVsNeighbor: string;
  evaluationId: string | null;
  documentStatus: string | null;
};

/**
 * Ranking: excluyentes FAIL al final, luego overallScore desc, luego createdAt.
 */
export async function listJobRanking(organizationId: string, jobId: string): Promise<RankedApplication[]> {
  const applications = await prisma.application.findMany({
    where: { organizationId, jobId },
    include: {
      candidate: { select: { id: true, name: true } },
      documents: {
        where: { isCurrent: true },
        take: 1,
        select: { processingStatus: true },
      },
      cvEvaluations: {
        where: { isCurrent: true },
        take: 1,
        include: {
          criteriaResults: true,
        },
      },
    },
    orderBy: { createdAt: "asc" },
  });

  type Row = {
    applicationId: string;
    candidateId: string;
    candidateName: string;
    overallScore: number | null;
    excludingOutcome: "PASS" | "FAIL" | "UNKNOWN";
    createdAt: Date;
    evaluationId: string | null;
    documentStatus: string | null;
    warnings: string[];
  };

  const rows: Row[] = applications.map((app) => {
    const evaluation = app.cvEvaluations[0] ?? null;
    const docStatus = app.documents[0]?.processingStatus ?? null;
    const excludingOutcome = (evaluation?.excludingOutcome ?? "UNKNOWN") as Row["excludingOutcome"];
    const warnings: string[] = [];
    if (!evaluation) warnings.push("Sin análisis de CV");
    if (docStatus === "NEEDS_OCR") warnings.push("Requiere OCR");
    if (docStatus === "FAILED") warnings.push("Procesamiento fallido");
    if (excludingOutcome === "UNKNOWN") warnings.push("Excluyentes pendientes de validación");
    if (evaluation?.criteriaResults.some((c) => c.status === "NEEDS_VALIDATION")) {
      warnings.push("Criterios pendientes de validación humana");
    }
    return {
      applicationId: app.id,
      candidateId: app.candidate.id,
      candidateName: app.candidate.name,
      overallScore: evaluation?.overallScore ?? null,
      excludingOutcome,
      createdAt: app.createdAt,
      evaluationId: evaluation?.id ?? null,
      documentStatus: docStatus,
      warnings,
    };
  });

  rows.sort((a, b) => {
    const aFail = a.excludingOutcome === "FAIL" ? 1 : 0;
    const bFail = b.excludingOutcome === "FAIL" ? 1 : 0;
    if (aFail !== bFail) return aFail - bFail;
    const sa = a.overallScore ?? -1;
    const sb = b.overallScore ?? -1;
    if (sb !== sa) return sb - sa;
    return a.createdAt.getTime() - b.createdAt.getTime();
  });

  return rows.map((row, index) => {
    const neighbor = index > 0 ? rows[index - 1] : null;
    const explanationVsNeighbor = buildRankingExplanation(
      {
        candidateLabel: row.candidateName,
        overallScore: row.overallScore,
        excludingOutcome: row.excludingOutcome,
      },
      neighbor
        ? {
            candidateLabel: neighbor.candidateName,
            overallScore: neighbor.overallScore,
            excludingOutcome: neighbor.excludingOutcome,
          }
        : null,
    );
    return {
      rank: index + 1,
      applicationId: row.applicationId,
      candidateId: row.candidateId,
      candidateName: row.candidateName,
      overallScore: row.overallScore,
      excludingOutcome: row.excludingOutcome,
      eligible: row.excludingOutcome !== "FAIL",
      warnings: row.warnings,
      explanationVsNeighbor,
      evaluationId: row.evaluationId,
      documentStatus: row.documentStatus,
    };
  });
}
