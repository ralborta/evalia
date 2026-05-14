import { prisma } from "@/lib/prisma";
import { getSignedConversationUrl } from "@/lib/elevenlabs";
import { NextResponse } from "next/server";
import { InterviewStatus } from "@prisma/client";

export async function POST(_req: Request, ctx: { params: Promise<{ token: string }> }) {
  const { token } = await ctx.params;
  const interview = await prisma.interview.findUnique({
    where: { publicToken: token },
    include: {
      candidate: true,
      jobPosition: true,
      evaluationProfile: true,
    },
  });

  if (!interview) return NextResponse.json({ error: "invalid_token" }, { status: 404 });
  if (interview.status === "COMPLETED") return NextResponse.json({ error: "already_completed" }, { status: 410 });
  if (interview.status === "EXPIRED" || (interview.expiresAt && interview.expiresAt < new Date())) {
    return NextResponse.json({ error: "expired" }, { status: 410 });
  }

  const agentId = interview.elevenlabsAgentId ?? process.env.ELEVENLABS_AGENT_ID;
  if (!agentId) {
    return NextResponse.json({ error: "agent_not_configured" }, { status: 500 });
  }

  let signedUrl: string;
  try {
    signedUrl = await getSignedConversationUrl(agentId);
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: "signed_url_failed", message: String(e) }, { status: 502 });
  }

  await prisma.interview.update({
    where: { id: interview.id },
    data: {
      status: interview.status === "CREATED" || interview.status === "LINK_READY" ? InterviewStatus.IN_PROGRESS : interview.status,
    },
  });

  const dynamicVariables: Record<string, string> = {
    candidate_name: interview.candidate.name,
    job_title: interview.jobPosition.title,
    target_level: interview.targetLevel ?? "B1",
    duration_minutes: String(interview.durationMinutes),
    evaluation_profile: interview.evaluationProfile.name,
    interview_id: interview.id,
  };

  return NextResponse.json({
    signedUrl,
    interviewId: interview.id,
    candidateId: interview.candidateId,
    candidateName: interview.candidate.name,
    jobTitle: interview.jobPosition.title,
    durationMinutes: interview.durationMinutes,
    dynamicVariables,
  });
}
