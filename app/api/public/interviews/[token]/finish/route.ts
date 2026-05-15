import { prisma } from "@/lib/prisma";
import { trySyncInterviewAfterCallEnd } from "@/lib/interview-elevenlabs-import";
import { revalidatePath } from "next/cache";
import { NextResponse } from "next/server";
import { InterviewStatus } from "@prisma/client";

export const runtime = "nodejs";
/** Reintentos al cerrar la llamada; evitar timeout en serverless. */
export const maxDuration = 45;

export async function POST(_req: Request, ctx: { params: Promise<{ token: string }> }) {
  const { token } = await ctx.params;
  const interview = await prisma.interview.findUnique({ where: { publicToken: token } });
  if (!interview) return NextResponse.json({ error: "invalid_token" }, { status: 404 });

  await prisma.interview.update({
    where: { id: interview.id },
    data: {
      finishedAt: new Date(),
      status: InterviewStatus.PROCESSING,
    },
  });

  const sync = await trySyncInterviewAfterCallEnd(interview.id);

  revalidatePath("/dashboard");
  revalidatePath("/interviews");
  revalidatePath(`/interviews/${interview.id}`);

  return NextResponse.json({ ok: true, sync });
}
