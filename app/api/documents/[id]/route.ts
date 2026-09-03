import { NextResponse } from "next/server";
import { fail } from "@/lib/api-response";
import { requireOrgContext } from "@/lib/org-context";
import { prisma } from "@/lib/prisma";
import { softDeleteDocument } from "@/lib/talent/cv/documents";

export async function GET(_req: Request, ctxParams: { params: Promise<{ id: string }> }) {
  try {
    const ctx = await requireOrgContext({ evaluator: true });
    const { id } = await ctxParams.params;
    const document = await prisma.candidateDocument.findFirst({
      where: { id, organizationId: ctx.organizationId },
      select: {
        id: true,
        applicationId: true,
        candidateId: true,
        kind: true,
        version: true,
        isCurrent: true,
        originalFileName: true,
        mimeType: true,
        byteSize: true,
        processingStatus: true,
        processingError: true,
        createdAt: true,
        updatedAt: true,
      },
    });
    if (!document) return NextResponse.json({ error: "Documento no encontrado" }, { status: 404 });
    return NextResponse.json({ document });
  } catch (error) {
    return fail(error);
  }
}

export async function DELETE(_req: Request, ctxParams: { params: Promise<{ id: string }> }) {
  try {
    const ctx = await requireOrgContext({ evaluator: true, write: true });
    const { id } = await ctxParams.params;
    await softDeleteDocument({
      organizationId: ctx.organizationId,
      documentId: id,
      actorUserId: ctx.user.id,
      purgeStorage: false,
    });
    return NextResponse.json({ ok: true });
  } catch (error) {
    if (error instanceof Error && error.name === "NotFoundError") {
      return NextResponse.json({ error: error.message }, { status: 404 });
    }
    return fail(error);
  }
}
