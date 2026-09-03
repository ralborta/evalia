import { NextResponse } from "next/server";
import { fail } from "@/lib/api-response";
import { requireOrgContext } from "@/lib/org-context";
import { reprocessDocument } from "@/lib/talent/cv/documents";

export async function POST(_req: Request, ctxParams: { params: Promise<{ id: string }> }) {
  try {
    const ctx = await requireOrgContext({ evaluator: true, write: true });
    const { id } = await ctxParams.params;
    const document = await reprocessDocument({
      organizationId: ctx.organizationId,
      documentId: id,
      actorUserId: ctx.user.id,
    });
    return NextResponse.json({
      document: {
        id: document.id,
        processingStatus: "QUEUED",
        version: document.version,
      },
    });
  } catch (error) {
    if (error instanceof Error && error.name === "NotFoundError") {
      return NextResponse.json({ error: error.message }, { status: 404 });
    }
    return fail(error);
  }
}
