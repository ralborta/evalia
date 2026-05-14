import { auth } from "@/auth";
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { runInterviewEvaluation } from "@/lib/evaluation";

export async function POST(_req: Request, ctx: { params: Promise<{ interviewId: string }> }) {
  const session = await auth();
  if (!session?.user || (session.user.role !== "EVALUATOR" && session.user.role !== "ADMIN")) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }
  const { interviewId } = await ctx.params;
  const interview = await prisma.interview.findUnique({ where: { id: interviewId } });
  if (!interview) return NextResponse.json({ error: "No encontrada" }, { status: 404 });
  if (!interview.transcript?.trim()) {
    return NextResponse.json({ error: "Sin transcripción" }, { status: 400 });
  }
  try {
    const evaluation = await runInterviewEvaluation(interviewId);
    return NextResponse.json(evaluation);
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: String(e) }, { status: 500 });
  }
}
