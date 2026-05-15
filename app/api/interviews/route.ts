import { auth } from "@/auth";
import { getAppBaseUrl } from "@/lib/app-url";
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
  const session = await auth();
  if (!session?.user || (session.user.role !== "EVALUATOR" && session.user.role !== "ADMIN")) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }

  const interviews = await prisma.interview.findMany({
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
}

export async function POST(req: Request) {
  const session = await auth();
  if (!session?.user || (session.user.role !== "EVALUATOR" && session.user.role !== "ADMIN")) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }

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
      where: { id: body.agentUserId, role: "AGENT" },
    });
    if (!agent) return NextResponse.json({ error: "Agente no encontrado" }, { status: 400 });
    const cand =
      (await prisma.candidate.findUnique({ where: { linkedUserId: agent.id } })) ??
      (await prisma.candidate.create({
        data: {
          name: agent.name,
          email: agent.email,
          linkedUserId: agent.id,
        },
      }));
    candidateId = cand.id;
  } else {
    const cand = await prisma.candidate.create({
      data: {
        name: body.candidateName,
        email: body.candidateEmail ?? undefined,
        phone: body.candidatePhone ?? undefined,
      },
    });
    candidateId = cand.id;
  }

  const job =
    (await prisma.jobPosition.findFirst({ where: { title: body.jobTitle } })) ??
    (await prisma.jobPosition.create({
      data: {
        title: body.jobTitle,
        targetLevel: body.targetLevel ?? undefined,
      },
    }));

  const profile = await prisma.evaluationProfile.findUnique({ where: { id: body.evaluationProfileId } });
  if (!profile) return NextResponse.json({ error: "Perfil de evaluación no encontrado" }, { status: 400 });

  const interview = await prisma.interview.create({
    data: {
      publicToken: generatePublicToken(),
      audience,
      candidateId,
      jobPositionId: job.id,
      evaluationProfileId: profile.id,
      createdById: session.user.id,
      durationMinutes: body.durationMinutes,
      targetLevel: body.targetLevel ?? undefined,
      internalNotes: body.internalNotes ?? undefined,
      status: InterviewStatus.LINK_READY,
      elevenlabsAgentId: process.env.ELEVENLABS_AGENT_ID ?? null,
    },
  });

  const appUrl = getAppBaseUrl();
  return NextResponse.json({
    interview,
    publicUrl: `${appUrl}/interview/${interview.publicToken}`,
  });
}
