import { JobStatus } from "@prisma/client";
import { NextResponse } from "next/server";
import { z } from "zod";
import { fail } from "@/lib/api-response";
import { requireOrgContext } from "@/lib/org-context";
import { createJob, jobListInclude } from "@/lib/talent/jobs";
import { prisma } from "@/lib/prisma";

const createSchema = z.object({
  title: z.string().trim().min(1).max(160),
  description: z.string().trim().max(8000).optional().nullable(),
  location: z.string().trim().max(160).optional().nullable(),
  status: z.nativeEnum(JobStatus).optional(),
});

export async function GET() {
  try {
    const ctx = await requireOrgContext({ evaluator: true });
    const jobs = await prisma.job.findMany({
      where: { organizationId: ctx.organizationId },
      orderBy: { updatedAt: "desc" },
      include: jobListInclude(),
    });
    return NextResponse.json({ jobs });
  } catch (error) {
    return fail(error);
  }
}

export async function POST(req: Request) {
  try {
    const ctx = await requireOrgContext({ evaluator: true, write: true });
    const parsed = createSchema.safeParse(await req.json().catch(() => null));
    if (!parsed.success) {
      return NextResponse.json({ error: "Payload inválido", details: parsed.error.flatten() }, { status: 400 });
    }
    const job = await createJob({
      organizationId: ctx.organizationId,
      actorUserId: ctx.user.id,
      title: parsed.data.title,
      description: parsed.data.description,
      location: parsed.data.location,
      status: parsed.data.status,
    });
    return NextResponse.json({ job }, { status: 201 });
  } catch (error) {
    return fail(error);
  }
}
