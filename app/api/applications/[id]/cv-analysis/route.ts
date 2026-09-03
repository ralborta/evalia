import { NextResponse } from "next/server";
import { fail } from "@/lib/api-response";
import { requireOrgContext } from "@/lib/org-context";
import { prisma } from "@/lib/prisma";

export async function GET(_req: Request, ctxParams: { params: Promise<{ id: string }> }) {
  try {
    const ctx = await requireOrgContext({ evaluator: true });
    const { id } = await ctxParams.params;

    const application = await prisma.application.findFirst({
      where: { id, organizationId: ctx.organizationId },
      select: { id: true },
    });
    if (!application) return NextResponse.json({ error: "Candidatura no encontrada" }, { status: 404 });

    const evaluation = await prisma.cvEvaluation.findFirst({
      where: { applicationId: id, organizationId: ctx.organizationId, isCurrent: true },
      include: {
        criteriaResults: true,
        suggestedQuestions: { orderBy: { sortOrder: "asc" } },
        document: {
          select: {
            id: true,
            version: true,
            processingStatus: true,
            originalFileName: true,
            mimeType: true,
            byteSize: true,
            createdAt: true,
          },
        },
      },
    });

    let structuredProfile = null;
    if (evaluation?.documentId) {
      structuredProfile = await prisma.cvStructuredProfile.findFirst({
        where: { documentId: evaluation.documentId, organizationId: ctx.organizationId },
        orderBy: { version: "desc" },
      });
    }

    const currentDoc = await prisma.candidateDocument.findFirst({
      where: { applicationId: id, organizationId: ctx.organizationId, isCurrent: true },
      select: {
        id: true,
        version: true,
        processingStatus: true,
        processingError: true,
        originalFileName: true,
        mimeType: true,
        byteSize: true,
        createdAt: true,
      },
    });

    return NextResponse.json({
      document: currentDoc,
      evaluation,
      structuredProfile: structuredProfile
        ? {
            id: structuredProfile.id,
            version: structuredProfile.version,
            profileJson: structuredProfile.profileJson,
            parserVersion: structuredProfile.parserVersion,
            promptVersion: structuredProfile.promptVersion,
            model: structuredProfile.model,
            createdAt: structuredProfile.createdAt,
          }
        : null,
    });
  } catch (error) {
    return fail(error);
  }
}
