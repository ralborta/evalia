import { getAppBaseUrl } from "@/lib/app-url";
import { fail } from "@/lib/api-response";
import { requireOrgContext } from "@/lib/org-context";
import { prisma } from "@/lib/prisma";
import { generatePublicToken } from "@/lib/tokens";
import { NextResponse } from "next/server";
import { z } from "zod";
import { InterviewAudience, InterviewStatus } from "@prisma/client";

const createSchema = z.object({
  candidateName: z.string().min(1),
  candidateEmail: z.string().email().optional().nullable(),
  candidatePhone: z.string().optional().nullable(),
  jobTitle: z.string().min(1),
  targetLevel: z.enum(["A1", "A2", "B1", "B2", "C1", "C2"]).optional().nullable(),
  evaluationProfileId: z.string().min(1),
  durationMinutes: z.number().int().min(3).max(60).default(8),
  internalNotes: z.string().max(500).optional().nullable(),
  audience: z.nativeEnum(InterviewAudience).default(InterviewAudience.EXTERNAL_CANDIDATE),
  agentUserId: z.string().optional().nullable(),
});

export async function GET() {
  try {
  const ctx = await requireOrgContext({ evaluator: true });

  const interviews = await prisma.interview.findMany({
    where: { organizationId: ctx.organizationId },
    orderBy: { createdAt: "desc" },
    take: 100,
    include: {
      candidate: true,
      jobPosition: true,
      evaluationProfile: true,
      evaluation: true,
    },
  });

  const counts = await prisma.interview.groupBy({
    by: ["status"],
    where: { organizationId: ctx.organizationId },
    _count: { _all: true },
  });

  const completed = interviews.filter((i) => i.status === "COMPLETED");
  const avgScore =
    completed.length === 0
      ? null
      : Math.round(
          completed.reduce((acc, i) => acc + (i.evaluation?.overallScore ?? 0), 0) / completed.length,
        );

  return NextResponse.json({
    interviews,
    stats: {
      total: interviews.length,
      byStatus: Object.fromEntries(counts.map((c) => [c.status, c._count._all])),
      avgScore,
    },
  });
  } catch (error) {
    return fail(error);
  }
}

export async function POST(req: Request) {
  try {
  const ctx = await requireOrgContext({ evaluator: true, write: true });

  const json = await req.json().catch(() => null);
  const parsed = createSchema.safeParse(json);
  if (!parsed.success) {
    return NextResponse.json({ error: "Payload inválido", details: parsed.error.flatten() }, { status: 400 });
  }

  const body = parsed.data;

  let candidateId: string;
  const audience = body.audience;
  if (audience === InterviewAudience.INTERNAL_AGENT && body.agentUserId) {
    const agent = await prisma.user.findFirst({
      where: {
        id: body.agentUserId,
        role: "AGENT",
        memberships: { some: { organizationId: ctx.organizationId } },
      },
    });
    if (!agent) return NextResponse.json({ error: "Agente no encontrado" }, { status: 400 });
    const cand =
      (await prisma.candidate.findFirst({
        where: { linkedUserId: agent.id, organizationId: ctx.organizationId },
      })) ??
      (await prisma.candidate.create({
        data: {
          organizationId: ctx.organizationId,
          name: agent.name,
          email: agent.email,
          linkedUserId: agent.id,
        },
      }));
    candidateId = cand.id;
  } else {
    const cand = await prisma.candidate.create({
      data: {
        organizationId: ctx.organizationId,
        name: body.candidateName,
        email: body.candidateEmail ?? undefined,
        phone: body.candidatePhone ?? undefined,
      },
    });
    candidateId = cand.id;
  }

  const job =
    (await prisma.jobPosition.findFirst({
      where: { title: body.jobTitle, organizationId: ctx.organizationId },
    })) ??
    (await prisma.jobPosition.create({
      data: {
        organizationId: ctx.organizationId,
        title: body.jobTitle,
        targetLevel: body.targetLevel ?? undefined,
      },
    }));

  const profile = await prisma.evaluationProfile.findFirst({
    where: { id: body.evaluationProfileId, organizationId: ctx.organizationId },
  });
  if (!profile) return NextResponse.json({ error: "Perfil de evaluación no encontrado" }, { status: 400 });

  const interview = await prisma.interview.create({
    data: {
      organizationId: ctx.organizationId,
      publicToken: generatePublicToken(),
      audience,
      candidateId,
      jobPositionId: job.id,
      evaluationProfileId: profile.id,
      createdById: ctx.user.id,
      durationMinutes: body.durationMinutes,
      targetLevel: body.targetLevel ?? undefined,
      internalNotes: body.internalNotes ?? undefined,
      status: InterviewStatus.LINK_READY,
      elevenlabsAgentId: process.env.ELEVENLABS_AGENT_ID ?? null,
    },
  });

  const appUrl = getAppBaseUrl();
  const publicUrl = `${appUrl}/interview/${interview.publicToken}`;

  const full = await prisma.interview.findUnique({
    where: { id: interview.id },
    include: { candidate: true, jobPosition: true },
  });

  return NextResponse.json({
    interview,
    publicUrl,
    candidateEmail: full?.candidate.email ?? null,
    candidateName: full?.candidate.name ?? body.candidateName,
    jobTitle: full?.jobPosition.title ?? body.jobTitle,
    durationMinutes: interview.durationMinutes,
  });
  } catch (error) {
    return fail(error);
  }
}
