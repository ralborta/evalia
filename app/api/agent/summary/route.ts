import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";

export async function GET() {
  const session = await auth();
  if (!session?.user || session.user.role !== "AGENT") {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }

  const interviews = await prisma.interview.findMany({
    where: { candidate: { linkedUserId: session.user.id } },
    orderBy: { createdAt: "desc" },
    take: 50,
    include: {
      jobPosition: true,
      evaluationProfile: true,
      evaluation: true,
    },
  });

  const completed = interviews.filter((i) => i.evaluation);
  const avg =
    completed.length === 0
      ? null
      : Math.round(completed.reduce((a, i) => a + (i.evaluation?.overallScore ?? 0), 0) / completed.length);

  return NextResponse.json({
    interviews,
    stats: {
      total: interviews.length,
      completed: completed.length,
      avgScore: avg,
      strengths: completed.filter((i) => (i.evaluation?.overallScore ?? 0) >= 80).length,
      toImprove: completed.filter((i) => (i.evaluation?.overallScore ?? 0) < 70).length,
    },
  });
}
