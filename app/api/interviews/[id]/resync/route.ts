import { fail } from "@/lib/api-response";
import { requireInterviewInOrg } from "@/lib/require-org-interview";
import { trySyncInterviewAfterCallEnd } from "@/lib/interview-elevenlabs-import";
import { revalidatePath } from "next/cache";
import { NextResponse } from "next/server";

export const runtime = "nodejs";
export const maxDuration = 45;

export async function POST(_req: Request, ctx: { params: Promise<{ id: string }> }) {
  try {
  const { id } = await ctx.params;
  await requireInterviewInOrg(id);

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
  } catch (error) {
    return fail(error);
  }
}
