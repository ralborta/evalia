import { fail } from "@/lib/api-response";
import { requireInterviewInOrg } from "@/lib/require-org-interview";
import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";

export async function GET(_req: Request, ctx: { params: Promise<{ interviewId: string }> }) {
  try {
    const { interviewId } = await ctx.params;
    await requireInterviewInOrg(interviewId);
    const evaluation = await prisma.evaluation.findUnique({
      where: { interviewId },
      include: { metrics: true },
    });
    if (!evaluation) return NextResponse.json({ error: "No encontrada" }, { status: 404 });
    return NextResponse.json(evaluation);
  } catch (error) {
    return fail(error);
  }
}
