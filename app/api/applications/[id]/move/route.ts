import { NextResponse } from "next/server";
import { z } from "zod";
import { fail } from "@/lib/api-response";
import { requireOrgContext } from "@/lib/org-context";
import { moveApplication } from "@/lib/talent/jobs";

const bodySchema = z.object({
  toStageId: z.string().min(1),
  note: z.string().trim().max(500).optional().nullable(),
});

export async function POST(req: Request, ctxParams: { params: Promise<{ id: string }> }) {
  try {
    const ctx = await requireOrgContext({ evaluator: true, write: true });
    const { id } = await ctxParams.params;
    const parsed = bodySchema.safeParse(await req.json().catch(() => null));
    if (!parsed.success) {
      return NextResponse.json({ error: "Payload inválido" }, { status: 400 });
    }
    const result = await moveApplication({
      organizationId: ctx.organizationId,
      actorUserId: ctx.user.id,
      applicationId: id,
      toStageId: parsed.data.toStageId,
      note: parsed.data.note,
    });
    if ("error" in result) return NextResponse.json({ error: result.error }, { status: result.status });
    return NextResponse.json(result);
  } catch (error) {
    return fail(error);
  }
}
