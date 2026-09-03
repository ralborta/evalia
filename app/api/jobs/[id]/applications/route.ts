import { NextResponse } from "next/server";
import { z } from "zod";
import { fail } from "@/lib/api-response";
import { requireOrgContext } from "@/lib/org-context";
import { createManualApplication } from "@/lib/talent/jobs";
import { prisma } from "@/lib/prisma";

const createSchema = z.object({
  candidateName: z.string().trim().min(1).max(160),
  candidateEmail: z.string().email().optional().nullable(),
  candidatePhone: z.string().trim().max(40).optional().nullable(),
  notes: z.string().trim().max(1000).optional().nullable(),
  existingCandidateId: z.string().min(1).optional().nullable(),
});

export async function GET(_req: Request, ctxParams: { params: Promise<{ id: string }> }) {
  try {
    const ctx = await requireOrgContext({ evaluator: true });
    const { id } = await ctxParams.params;
    const job = await prisma.job.findFirst({
      where: { id, organizationId: ctx.organizationId },
      include: { stages: { orderBy: { sortOrder: "asc" } } },
    });
    if (!job) return NextResponse.json({ error: "Vacante no encontrada" }, { status: 404 });

    const applications = await prisma.application.findMany({
      where: { jobId: id, organizationId: ctx.organizationId },
      include: { candidate: true, stage: true },
      orderBy: { updatedAt: "desc" },
    });
    return NextResponse.json({ job, applications });
  } catch (error) {
    return fail(error);
  }
}

export async function POST(req: Request, ctxParams: { params: Promise<{ id: string }> }) {
  try {
    const ctx = await requireOrgContext({ evaluator: true, write: true });
    const { id } = await ctxParams.params;
    const parsed = createSchema.safeParse(await req.json().catch(() => null));
    if (!parsed.success) {
      return NextResponse.json({ error: "Payload inválido", details: parsed.error.flatten() }, { status: 400 });
    }
    const result = await createManualApplication({
      organizationId: ctx.organizationId,
      actorUserId: ctx.user.id,
      jobId: id,
      ...parsed.data,
    });
    if ("error" in result) return NextResponse.json({ error: result.error }, { status: result.status });
    return NextResponse.json(result, { status: 201 });
  } catch (error) {
    return fail(error);
  }
}
