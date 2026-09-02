import { JobStatus } from "@prisma/client";
import { NextResponse } from "next/server";
import { z } from "zod";
import { fail } from "@/lib/api-response";
import { requireOrgContext } from "@/lib/org-context";
import { getLatestScorecard, jobListInclude, updateJob } from "@/lib/talent/jobs";
import { prisma } from "@/lib/prisma";

const patchSchema = z.object({
  title: z.string().trim().min(1).max(160).optional(),
  description: z.string().trim().max(8000).optional().nullable(),
  location: z.string().trim().max(160).optional().nullable(),
  status: z.nativeEnum(JobStatus).optional(),
});

export async function GET(_req: Request, ctxParams: { params: Promise<{ id: string }> }) {
  try {
    const ctx = await requireOrgContext({ evaluator: true });
    const { id } = await ctxParams.params;
    const job = await prisma.job.findFirst({
      where: { id, organizationId: ctx.organizationId },
      include: {
        ...jobListInclude(),
        applications: {
          include: { candidate: true, stage: true },
          orderBy: { updatedAt: "desc" },
        },
      },
    });
    if (!job) return NextResponse.json({ error: "Vacante no encontrada" }, { status: 404 });
    const draft = await getLatestScorecard(job.id, ctx.organizationId);
    return NextResponse.json({ job, latestScorecard: draft });
  } catch (error) {
    return fail(error);
  }
}

export async function PATCH(req: Request, ctxParams: { params: Promise<{ id: string }> }) {
  try {
    const ctx = await requireOrgContext({ evaluator: true, write: true });
    const { id } = await ctxParams.params;
    const parsed = patchSchema.safeParse(await req.json().catch(() => null));
    if (!parsed.success) {
      return NextResponse.json({ error: "Payload inválido", details: parsed.error.flatten() }, { status: 400 });
    }
    const job = await updateJob({
      organizationId: ctx.organizationId,
      actorUserId: ctx.user.id,
      jobId: id,
      ...parsed.data,
    });
    if (!job) return NextResponse.json({ error: "Vacante no encontrada" }, { status: 404 });
    return NextResponse.json({ job });
  } catch (error) {
    return fail(error);
  }
}
