import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { revalidatePath } from "next/cache";
import { NextResponse } from "next/server";
import { InterviewStatus } from "@prisma/client";

export const runtime = "nodejs";

export async function POST(_req: Request, ctx: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session?.user || (session.user.role !== "EVALUATOR" && session.user.role !== "ADMIN")) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }

  const { id } = await ctx.params;
  const interview = await prisma.interview.findUnique({
    where: { id },
    include: { evaluation: { select: { id: true } } },
  });
  if (!interview) return NextResponse.json({ error: "not_found" }, { status: 404 });

  if (interview.evaluation) {
    return NextResponse.json(
      { error: "ya tiene informe; no se puede marcar como fallida" },
      { status: 409 },
    );
  }

  const updated = await prisma.interview.update({
    where: { id },
    data: {
      status: InterviewStatus.FAILED,
      finishedAt: interview.finishedAt ?? new Date(),
    },
  });

  revalidatePath(`/interviews/${id}`);
  revalidatePath("/interviews");
  revalidatePath("/dashboard");

  return NextResponse.json({ ok: true, interview: updated });
}
