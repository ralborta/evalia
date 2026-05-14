import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";

export async function GET(_req: Request, ctx: { params: Promise<{ interviewId: string }> }) {
  const session = await auth();
  if (!session?.user || (session.user.role !== "EVALUATOR" && session.user.role !== "ADMIN")) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }
  const { interviewId } = await ctx.params;
  const evaluation = await prisma.evaluation.findUnique({
    where: { interviewId },
    include: { metrics: true },
  });
  if (!evaluation) return NextResponse.json({ error: "No encontrada" }, { status: 404 });
  return NextResponse.json(evaluation);
}
