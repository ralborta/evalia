import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";

export async function GET(_req: Request, ctx: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session?.user || (session.user.role !== "EVALUATOR" && session.user.role !== "ADMIN")) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }
  const { id } = await ctx.params;
  const interview = await prisma.interview.findUnique({
    where: { id },
    include: {
      candidate: true,
      jobPosition: true,
      evaluationProfile: true,
      evaluation: { include: { metrics: true } },
    },
  });
  if (!interview) return NextResponse.json({ error: "No encontrada" }, { status: 404 });
  return NextResponse.json(interview);
}
