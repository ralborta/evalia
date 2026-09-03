import { NextResponse } from "next/server";
import { AuditAction } from "@prisma/client";
import { fail } from "@/lib/api-response";
import { requireOrgContext } from "@/lib/org-context";
import { prisma } from "@/lib/prisma";
import { writeAudit } from "@/lib/audit";
import { getDocumentStorage, verifyDocumentContentSignature } from "@/lib/talent/cv/storage";

export async function GET(req: Request, ctxParams: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await ctxParams.params;
    const url = new URL(req.url);
    const exp = url.searchParams.get("exp");
    const sig = url.searchParams.get("sig");

    let organizationId: string | null = null;
    let actorUserId: string | null = null;

    if (exp && sig) {
      if (!verifyDocumentContentSignature(id, exp, sig)) {
        return NextResponse.json({ error: "Firma inválida o expirada" }, { status: 403 });
      }
      const doc = await prisma.candidateDocument.findFirst({ where: { id } });
      if (!doc) return NextResponse.json({ error: "Documento no encontrado" }, { status: 404 });
      organizationId = doc.organizationId;
    } else {
      const ctx = await requireOrgContext({ evaluator: true });
      organizationId = ctx.organizationId;
      actorUserId = ctx.user.id;
    }

    const document = await prisma.candidateDocument.findFirst({
      where: { id, organizationId },
    });
    if (!document) return NextResponse.json({ error: "Documento no encontrado" }, { status: 404 });

    const buffer = await getDocumentStorage().get(document.storageKey);

    await writeAudit(prisma, {
      organizationId: document.organizationId,
      actorUserId,
      action: AuditAction.DOCUMENT_ACCESSED,
      entityType: "CandidateDocument",
      entityId: document.id,
    });

    return new NextResponse(new Uint8Array(buffer), {
      status: 200,
      headers: {
        "content-type": document.mimeType,
        "content-disposition": `attachment; filename="${document.originalFileName.replace(/"/g, "")}"`,
        "cache-control": "private, no-store",
      },
    });
  } catch (error) {
    return fail(error);
  }
}
