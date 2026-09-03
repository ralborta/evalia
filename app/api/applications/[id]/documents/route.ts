import { NextResponse } from "next/server";
import { fail } from "@/lib/api-response";
import { requireOrgContext } from "@/lib/org-context";
import { prisma } from "@/lib/prisma";
import { DocumentValidationError, uploadApplicationDocument } from "@/lib/talent/cv/documents";

export async function GET(_req: Request, ctxParams: { params: Promise<{ id: string }> }) {
  try {
    const ctx = await requireOrgContext({ evaluator: true });
    const { id } = await ctxParams.params;
    const application = await prisma.application.findFirst({
      where: { id, organizationId: ctx.organizationId },
      select: { id: true },
    });
    if (!application) return NextResponse.json({ error: "Candidatura no encontrada" }, { status: 404 });

    const documents = await prisma.candidateDocument.findMany({
      where: { applicationId: id, organizationId: ctx.organizationId },
      orderBy: { version: "desc" },
      select: {
        id: true,
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
    return NextResponse.json({ documents });
  } catch (error) {
    return fail(error);
  }
}

export async function POST(req: Request, ctxParams: { params: Promise<{ id: string }> }) {
  try {
    const ctx = await requireOrgContext({ evaluator: true, write: true });
    const { id } = await ctxParams.params;

    const form = await req.formData();
    const file = form.get("file");
    if (!file || !(file instanceof File)) {
      return NextResponse.json({ error: "Falta el archivo (campo file)" }, { status: 400 });
    }

    const buffer = Buffer.from(await file.arrayBuffer());
    const result = await uploadApplicationDocument({
      organizationId: ctx.organizationId,
      applicationId: id,
      actorUserId: ctx.user.id,
      filename: file.name || "cv.pdf",
      buffer,
    });

    return NextResponse.json(
      {
        document: {
          id: result.document.id,
          version: result.document.version,
          isCurrent: result.document.isCurrent,
          originalFileName: result.document.originalFileName,
          mimeType: result.document.mimeType,
          byteSize: result.document.byteSize,
          processingStatus: result.document.processingStatus,
          reused: result.reused,
        },
      },
      { status: result.reused ? 200 : 201 },
    );
  } catch (error) {
    if (error instanceof DocumentValidationError) {
      return NextResponse.json({ error: error.message, code: error.code }, { status: 400 });
    }
    if (error instanceof Error && error.name === "NotFoundError") {
      return NextResponse.json({ error: error.message }, { status: 404 });
    }
    if (error instanceof Error && error.name === "DuplicateDocumentError") {
      return NextResponse.json({ error: error.message }, { status: 409 });
    }
    return fail(error);
  }
}
