import { NextResponse } from "next/server";
import { fail } from "@/lib/api-response";
import { requireInterviewInOrg } from "@/lib/require-org-interview";
import { runInterviewEvaluation } from "@/lib/evaluation";

export async function POST(_req: Request, ctx: { params: Promise<{ interviewId: string }> }) {
  try {
    const { interviewId } = await ctx.params;
    const { interview } = await requireInterviewInOrg(interviewId);
    if (!interview.transcript?.trim()) {
      return NextResponse.json({ error: "Sin transcripción" }, { status: 400 });
    }
    const evaluation = await runInterviewEvaluation(interviewId);
    return NextResponse.json(evaluation);
  } catch (error) {
    return fail(error);
  }
}
