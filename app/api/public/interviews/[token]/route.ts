import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";

export async function GET(_req: Request, ctx: { params: Promise<{ token: string }> }) {
  const { token } = await ctx.params;
  const interview = await prisma.interview.findUnique({
    where: { publicToken: token },
    include: {
      candidate: { select: { name: true } },
      jobPosition: { select: { title: true } },
      evaluationProfile: { select: { name: true, key: true } },
    },
  });

  if (!interview) {
    return NextResponse.json({ error: "invalid_token" }, { status: 404 });
  }

  if (interview.status === "COMPLETED") {
    return NextResponse.json({ error: "already_completed" }, { status: 410 });
  }
  if (interview.status === "EXPIRED" || (interview.expiresAt && interview.expiresAt < new Date())) {
    return NextResponse.json({ error: "expired" }, { status: 410 });
  }

  return NextResponse.json({
    interviewId: interview.id,
    candidateName: interview.candidate.name,
    jobTitle: interview.jobPosition.title,
    durationMinutes: interview.durationMinutes,
    targetLevel: interview.targetLevel,
    evaluationProfile: interview.evaluationProfile.name,
    status: interview.status,
  });
}
