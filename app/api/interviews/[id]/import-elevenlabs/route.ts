import { fail } from "@/lib/api-response";
import { requireInterviewInOrg } from "@/lib/require-org-interview";
import { importElevenLabsConversationIntoInterview } from "@/lib/interview-elevenlabs-import";
import { NextResponse } from "next/server";
import { z } from "zod";

export const runtime = "nodejs";

const bodySchema = z.object({
  conversationId: z.string().min(1, "conversationId requerido"),
  runEvaluation: z.boolean().optional().default(true),
});

export async function POST(req: Request, ctx: { params: Promise<{ id: string }> }) {
  try {
  const { id: interviewId } = await ctx.params;
  await requireInterviewInOrg(interviewId);
  const json = await req.json().catch(() => null);
  const parsed = bodySchema.safeParse(json);
  if (!parsed.success) {
    return NextResponse.json({ error: "Payload inválido", details: parsed.error.flatten() }, { status: 400 });
  }

  const { conversationId, runEvaluation } = parsed.data;

  try {
    const result = await importElevenLabsConversationIntoInterview(interviewId, conversationId, {
      runEvaluation,
    });
    return NextResponse.json({ ok: true, ...result });
  } catch (e) {
    const message = e instanceof Error ? e.message : String(e);
    if (message.includes("Entrevista no encontrada")) {
      return NextResponse.json({ error: message }, { status: 404 });
    }
    if (message.includes("servicio de voz")) {
      return NextResponse.json({ error: message }, { status: 502 });
    }
    if (message.includes("OPENAI_API_KEY") || message.includes("OpenAI")) {
      return NextResponse.json({ error: message }, { status: 503 });
    }
    return NextResponse.json({ error: message }, { status: 400 });
  }
  } catch (error) {
    return fail(error);
  }
}
