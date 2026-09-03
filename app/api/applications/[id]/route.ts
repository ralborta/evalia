import { NextResponse } from "next/server";
import { fail } from "@/lib/api-response";
import { requireOrgContext } from "@/lib/org-context";
import { prisma } from "@/lib/prisma";

export async function GET(_req: Request, ctxParams: { params: Promise<{ id: string }> }) {
  try {
    const ctx = await requireOrgContext({ evaluator: true });
    const { id } = await ctxParams.params;
    const application = await prisma.application.findFirst({
      where: { id, organizationId: ctx.organizationId },
      include: {
        candidate: true,
        job: { include: { stages: { orderBy: { sortOrder: "asc" } } } },
        stage: true,
        scorecard: { include: { criteria: { orderBy: { sortOrder: "asc" } } } },
        history: {
          orderBy: { createdAt: "asc" },
          include: { fromStage: true, toStage: true, actor: { select: { id: true, name: true, email: true } } },
        },
      },
    });
    if (!application) return NextResponse.json({ error: "Candidatura no encontrada" }, { status: 404 });
    return NextResponse.json({ application });
  } catch (error) {
    return fail(error);
  }
}
