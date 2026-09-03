import { NextResponse } from "next/server";
import { fail } from "@/lib/api-response";
import { requireOrgContext } from "@/lib/org-context";
import { prisma } from "@/lib/prisma";
import { listJobRanking } from "@/lib/talent/cv/ranking";

export async function GET(_req: Request, ctxParams: { params: Promise<{ id: string }> }) {
  try {
    const ctx = await requireOrgContext({ evaluator: true });
    const { id } = await ctxParams.params;
    const job = await prisma.job.findFirst({
      where: { id, organizationId: ctx.organizationId },
      select: { id: true, title: true },
    });
    if (!job) return NextResponse.json({ error: "Vacante no encontrada" }, { status: 404 });

    const ranking = await listJobRanking(ctx.organizationId, id);
    return NextResponse.json({ job, ranking });
  } catch (error) {
    return fail(error);
  }
}
