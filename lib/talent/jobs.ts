import { AuditAction, JobStatus, Prisma, ScorecardStatus } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { writeAudit } from "@/lib/audit";
import { defaultPipelineCreateData } from "@/lib/talent/pipeline";
import { assertPublishableScorecard, nextScorecardVersionAction, type ScorecardDraft } from "@/lib/talent/scorecard";

function newFamilyId() {
  return `scf_${Date.now().toString(36)}${Math.random().toString(36).slice(2, 8)}`;
}

export async function createJob(input: {
  organizationId: string;
  actorUserId: string;
  title: string;
  description?: string | null;
  location?: string | null;
  status?: JobStatus;
}) {
  return prisma.$transaction(async (tx) => {
    const job = await tx.job.create({
      data: {
        organizationId: input.organizationId,
        title: input.title.trim(),
        description: input.description?.trim() || null,
        location: input.location?.trim() || null,
        status: input.status ?? JobStatus.DRAFT,
        createdById: input.actorUserId,
        stages: { create: defaultPipelineCreateData(input.organizationId) },
        scorecards: {
          create: {
            organizationId: input.organizationId,
            familyId: newFamilyId(),
            version: 1,
            status: ScorecardStatus.DRAFT,
            name: `Scorecard · ${input.title.trim()}`,
            createdById: input.actorUserId,
          },
        },
      },
      include: { stages: { orderBy: { sortOrder: "asc" } }, scorecards: true },
    });
    await writeAudit(tx, {
      organizationId: input.organizationId,
      actorUserId: input.actorUserId,
      action: AuditAction.JOB_CREATED,
      entityType: "Job",
      entityId: job.id,
    });
    return job;
  });
}

export async function updateJob(input: {
  organizationId: string;
  actorUserId: string;
  jobId: string;
  title?: string;
  description?: string | null;
  location?: string | null;
  status?: JobStatus;
}) {
  const existing = await prisma.job.findFirst({
    where: { id: input.jobId, organizationId: input.organizationId },
  });
  if (!existing) return null;

  return prisma.$transaction(async (tx) => {
    const job = await tx.job.update({
      where: { id: existing.id },
      data: {
        ...(input.title != null ? { title: input.title.trim() } : {}),
        ...(input.description !== undefined ? { description: input.description?.trim() || null } : {}),
        ...(input.location !== undefined ? { location: input.location?.trim() || null } : {}),
        ...(input.status ? { status: input.status } : {}),
      },
      include: { stages: { orderBy: { sortOrder: "asc" } } },
    });
    await writeAudit(tx, {
      organizationId: input.organizationId,
      actorUserId: input.actorUserId,
      action: AuditAction.JOB_UPDATED,
      entityType: "Job",
      entityId: job.id,
    });
    return job;
  });
}

export async function getLatestScorecard(jobId: string, organizationId: string) {
  return prisma.scorecard.findFirst({
    where: { jobId, organizationId },
    orderBy: { version: "desc" },
    include: { criteria: { orderBy: { sortOrder: "asc" } } },
  });
}

export async function saveScorecardDraft(input: {
  organizationId: string;
  actorUserId: string;
  jobId: string;
  draft: ScorecardDraft;
}) {
  const job = await prisma.job.findFirst({
    where: { id: input.jobId, organizationId: input.organizationId },
  });
  if (!job) return null;

  const latest = await getLatestScorecard(job.id, input.organizationId);
  const action = nextScorecardVersionAction(latest);
  const target =
    action.mode === "update"
      ? latest!
      : await prisma.scorecard.create({
          data: {
            organizationId: input.organizationId,
            jobId: job.id,
            familyId: latest?.familyId ?? newFamilyId(),
            version: action.version,
            status: ScorecardStatus.DRAFT,
            name: input.draft.name,
            sourcePrompt: input.draft.sourcePrompt ?? null,
            createdById: input.actorUserId,
          },
        });

  return prisma.$transaction(async (tx) => {
    await tx.scorecardCriterion.deleteMany({ where: { scorecardId: target.id } });
    const saved = await tx.scorecard.update({
      where: { id: target.id },
      data: {
        name: input.draft.name,
        sourcePrompt: input.draft.sourcePrompt ?? null,
        criteria: {
          create: input.draft.criteria.map((c, index) => ({
            key: c.key,
            label: c.label,
            description: c.description,
            weight: c.weight,
            type: c.type,
            required: c.required,
            evidenceRequired: c.evidenceRequired,
            scoringRule: c.scoringRule,
            sortOrder: c.sortOrder ?? index,
          })),
        },
      },
      include: { criteria: { orderBy: { sortOrder: "asc" } } },
    });
    await writeAudit(tx, {
      organizationId: input.organizationId,
      actorUserId: input.actorUserId,
      action: action.mode === "update" ? AuditAction.SCORECARD_UPDATED : AuditAction.SCORECARD_CREATED,
      entityType: "Scorecard",
      entityId: saved.id,
    });
    return saved;
  });
}

export async function publishScorecard(input: {
  organizationId: string;
  actorUserId: string;
  jobId: string;
}) {
  const draft = await prisma.scorecard.findFirst({
    where: { jobId: input.jobId, organizationId: input.organizationId, status: ScorecardStatus.DRAFT },
    include: { criteria: { orderBy: { sortOrder: "asc" } } },
  });
  if (!draft) return { error: "No hay un borrador para publicar", status: 400 as const };

  try {
    assertPublishableScorecard({
      name: draft.name,
      sourcePrompt: draft.sourcePrompt,
      criteria: draft.criteria.map((c) => ({
        key: c.key,
        label: c.label,
        description: c.description,
        weight: c.weight,
        type: c.type,
        required: c.required,
        evidenceRequired: c.evidenceRequired,
        scoringRule: c.scoringRule,
        sortOrder: c.sortOrder,
      })),
    });
  } catch (e) {
    return { error: e instanceof Error ? e.message : "Scorecard inválido", status: 400 as const };
  }

  return prisma.$transaction(async (tx) => {
    await tx.scorecard.updateMany({
      where: {
        jobId: input.jobId,
        organizationId: input.organizationId,
        status: ScorecardStatus.PUBLISHED,
        id: { not: draft.id },
      },
      data: { status: ScorecardStatus.ARCHIVED },
    });
    const published = await tx.scorecard.update({
      where: { id: draft.id },
      data: { status: ScorecardStatus.PUBLISHED, publishedAt: new Date() },
      include: { criteria: { orderBy: { sortOrder: "asc" } } },
    });
    await tx.job.update({
      where: { id: input.jobId },
      data: { publishedScorecardId: published.id },
    });
    await writeAudit(tx, {
      organizationId: input.organizationId,
      actorUserId: input.actorUserId,
      action: AuditAction.SCORECARD_PUBLISHED,
      entityType: "Scorecard",
      entityId: published.id,
    });
    return { published };
  });
}

export async function createManualApplication(input: {
  organizationId: string;
  actorUserId: string;
  jobId: string;
  candidateName: string;
  candidateEmail?: string | null;
  candidatePhone?: string | null;
  notes?: string | null;
  existingCandidateId?: string | null;
}) {
  const job = await prisma.job.findFirst({
    where: { id: input.jobId, organizationId: input.organizationId },
    include: { stages: { orderBy: { sortOrder: "asc" } } },
  });
  if (!job) return { error: "Vacante no encontrada", status: 404 as const };

  const firstStage = job.stages.find((s) => !s.isRejected) ?? job.stages[0];
  if (!firstStage) return { error: "La vacante no tiene pipeline", status: 400 as const };

  let candidateId = input.existingCandidateId ?? null;
  if (candidateId) {
    const candidate = await prisma.candidate.findFirst({
      where: { id: candidateId, organizationId: input.organizationId },
    });
    if (!candidate) return { error: "Candidato no encontrado", status: 404 as const };
  } else {
    const created = await prisma.candidate.create({
      data: {
        organizationId: input.organizationId,
        name: input.candidateName.trim(),
        email: input.candidateEmail?.trim().toLowerCase() || null,
        phone: input.candidatePhone?.trim() || null,
      },
    });
    candidateId = created.id;
  }

  const duplicate = await prisma.application.findFirst({
    where: { jobId: job.id, candidateId },
  });
  if (duplicate) return { error: "Este candidato ya está en la vacante", status: 409 as const };

  return prisma.$transaction(async (tx) => {
    const application = await tx.application.create({
      data: {
        organizationId: input.organizationId,
        jobId: job.id,
        candidateId: candidateId!,
        stageId: firstStage.id,
        scorecardId: job.publishedScorecardId,
        notes: input.notes?.trim() || null,
        createdById: input.actorUserId,
        history: {
          create: {
            toStageId: firstStage.id,
            actorUserId: input.actorUserId,
            note: "Candidatura creada",
          },
        },
      },
      include: {
        candidate: true,
        stage: true,
        job: { select: { id: true, title: true } },
      },
    });
    await writeAudit(tx, {
      organizationId: input.organizationId,
      actorUserId: input.actorUserId,
      action: AuditAction.APPLICATION_CREATED,
      entityType: "Application",
      entityId: application.id,
    });
    return { application };
  });
}

export async function moveApplication(input: {
  organizationId: string;
  actorUserId: string;
  applicationId: string;
  toStageId: string;
  note?: string | null;
}) {
  const application = await prisma.application.findFirst({
    where: { id: input.applicationId, organizationId: input.organizationId },
    include: { stage: true },
  });
  if (!application) return { error: "Candidatura no encontrada", status: 404 as const };

  const toStage = await prisma.pipelineStage.findFirst({
    where: { id: input.toStageId, jobId: application.jobId, organizationId: input.organizationId },
  });
  if (!toStage) return { error: "Etapa no encontrada", status: 404 as const };
  if (toStage.id === application.stageId) return { application };

  return prisma.$transaction(async (tx) => {
    const updated = await tx.application.update({
      where: { id: application.id },
      data: { stageId: toStage.id },
      include: { candidate: true, stage: true, history: { orderBy: { createdAt: "desc" } } },
    });
    await tx.applicationStageHistory.create({
      data: {
        applicationId: application.id,
        fromStageId: application.stageId,
        toStageId: toStage.id,
        actorUserId: input.actorUserId,
        note: input.note?.trim() || null,
      },
    });
    await writeAudit(tx, {
      organizationId: input.organizationId,
      actorUserId: input.actorUserId,
      action: AuditAction.APPLICATION_STAGE_MOVED,
      entityType: "Application",
      entityId: application.id,
    });
    return { application: updated };
  });
}

export function jobListInclude(): Prisma.JobInclude {
  return {
    stages: { orderBy: { sortOrder: "asc" } },
    publishedScorecard: { include: { criteria: { orderBy: { sortOrder: "asc" } } } },
    _count: { select: { applications: true } },
  };
}
