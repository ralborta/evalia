import { NextResponse } from "next/server";
import { z } from "zod";
import { fail } from "@/lib/api-response";
import { requireOrgContext } from "@/lib/org-context";
import { prisma } from "@/lib/prisma";
import { proposeScorecardFromProfile } from "@/lib/talent/ai-profile";
import { validateScorecardWeights } from "@/lib/talent/scorecard";

const bodySchema = z.object({
  freeText: z.string().trim().min(20).max(8000),
});

export async function POST(req: Request, ctxParams: { params: Promise<{ id: string }> }) {
  try {
    const ctx = await requireOrgContext({ evaluator: true, write: true });
    const { id } = await ctxParams.params;
    const job = await prisma.job.findFirst({
      where: { id, organizationId: ctx.organizationId },
    });
    if (!job) return NextResponse.json({ error: "Vacante no encontrada" }, { status: 404 });

    const parsed = bodySchema.safeParse(await req.json().catch(() => null));
    if (!parsed.success) {
      return NextResponse.json({ error: "Describe el perfil con al menos 20 caracteres" }, { status: 400 });
    }

    const proposal = await proposeScorecardFromProfile({
      title: job.title,
      description: job.description,
      freeText: parsed.data.freeText,
    });

    return NextResponse.json({
      proposal,
      weights: validateScorecardWeights(proposal.criteria),
      confirmationRequired: true,
    });
  } catch (error) {
    return fail(error);
  }
}
