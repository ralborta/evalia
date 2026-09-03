import { fail } from "@/lib/api-response";
import { requireOrgContext } from "@/lib/org-context";
import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";

export async function GET(_req: Request, ctx: { params: Promise<{ id: string }> }) {
  try {
    const org = await requireOrgContext({ evaluator: true });
    const { id } = await ctx.params;
    const interview = await prisma.interview.findFirst({
      where: { id, organizationId: org.organizationId },
      include: {
        candidate: true,
        jobPosition: true,
        evaluationProfile: true,
        evaluation: { include: { metrics: true } },
      },
    });
    if (!interview) return NextResponse.json({ error: "No encontrada" }, { status: 404 });
    return NextResponse.json(interview);
  } catch (error) {
    return fail(error);
  }
}
