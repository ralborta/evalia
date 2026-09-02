import { NextResponse } from "next/server";
import { fail } from "@/lib/api-response";
import { requireOrgContext } from "@/lib/org-context";
import { ScorecardDraftSchema, validateScorecardWeights } from "@/lib/talent/scorecard";
import { getLatestScorecard, publishScorecard, saveScorecardDraft } from "@/lib/talent/jobs";

export async function GET(_req: Request, ctxParams: { params: Promise<{ id: string }> }) {
  try {
    const ctx = await requireOrgContext({ evaluator: true });
    const { id } = await ctxParams.params;
    const scorecard = await getLatestScorecard(id, ctx.organizationId);
    if (!scorecard) return NextResponse.json({ error: "Scorecard no encontrado" }, { status: 404 });
    return NextResponse.json({
      scorecard,
      weights: validateScorecardWeights(scorecard.criteria),
    });
  } catch (error) {
    return fail(error);
  }
}

export async function PUT(req: Request, ctxParams: { params: Promise<{ id: string }> }) {
  try {
    const ctx = await requireOrgContext({ evaluator: true, write: true });
    const { id } = await ctxParams.params;
    const parsed = ScorecardDraftSchema.safeParse(await req.json().catch(() => null));
    if (!parsed.success) {
      return NextResponse.json({ error: "Payload inválido", details: parsed.error.flatten() }, { status: 400 });
    }
    const scorecard = await saveScorecardDraft({
      organizationId: ctx.organizationId,
      actorUserId: ctx.user.id,
      jobId: id,
      draft: parsed.data,
    });
    if (!scorecard) return NextResponse.json({ error: "Vacante no encontrada" }, { status: 404 });
    return NextResponse.json({
      scorecard,
      weights: validateScorecardWeights(scorecard.criteria),
    });
  } catch (error) {
    return fail(error);
  }
}

export async function POST(req: Request, ctxParams: { params: Promise<{ id: string }> }) {
  try {
    const ctx = await requireOrgContext({ evaluator: true, write: true });
    const { id } = await ctxParams.params;
    const body = (await req.json().catch(() => ({}))) as { action?: string };
    if (body.action !== "publish") {
      return NextResponse.json({ error: "Acción no soportada" }, { status: 400 });
    }
    const result = await publishScorecard({
      organizationId: ctx.organizationId,
      actorUserId: ctx.user.id,
      jobId: id,
    });
    if ("error" in result) return NextResponse.json({ error: result.error }, { status: result.status });
    return NextResponse.json({ scorecard: result.published });
  } catch (error) {
    return fail(error);
  }
}
