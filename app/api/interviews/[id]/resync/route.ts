import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { trySyncInterviewAfterCallEnd } from "@/lib/interview-elevenlabs-import";
import { revalidatePath } from "next/cache";
import { NextResponse } from "next/server";

export const runtime = "nodejs";
export const maxDuration = 45;

export async function POST(_req: Request, ctx: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session?.user || (session.user.role !== "EVALUATOR" && session.user.role !== "ADMIN")) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }

  const { id } = await ctx.params;
  const interview = await prisma.interview.findUnique({ where: { id } });
  if (!interview) return NextResponse.json({ error: "not_found" }, { status: 404 });

  const sync = await trySyncInterviewAfterCallEnd(id);

  revalidatePath(`/interviews/${id}`);
  revalidatePath("/interviews");
  revalidatePath("/dashboard");

  if (sync.mode === "evaluated") {
    return NextResponse.json({ ok: true, sync });
  }

  if (sync.mode === "skipped" && sync.reason === "no_conversation_id") {
    return NextResponse.json({
      ok: true,
      sync,
      message: "No hay id de conversación. Importala manualmente desde el apartado de soporte.",
    });
  }

  // Si tras reintentos no hay transcript, devolvemos info para que la UI decida.
  return NextResponse.json({ ok: true, sync });
}
