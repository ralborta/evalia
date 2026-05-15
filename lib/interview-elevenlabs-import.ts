import { InterviewStatus } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { runInterviewEvaluation } from "@/lib/evaluation";
import type { GetConversationPayload } from "@/lib/elevenlabs-conversation";
import {
  extractInterviewIdFromConversationPayload,
  fetchElevenLabsConversation,
  fetchElevenLabsConversationWhenTranscriptReady,
  formatConversationTranscript,
} from "@/lib/elevenlabs-conversation";

export type ImportElevenLabsResult = {
  transcriptChars: number;
  evaluated: boolean;
};

/**
 * Descarga una conversación ConvAI y la asocia a esta entrevista EvalIA.
 * Si `runEvaluation` y hay transcript, ejecuta la evaluación OpenAI (estado COMPLETED o FAILED).
 * Si pasás `prefetchedPayload`, no vuelve a llamar a GET (p. ej. tras reintentos en el cierre de llamada).
 */
export async function importElevenLabsConversationIntoInterview(
  interviewId: string,
  conversationId: string,
  opts: { runEvaluation: boolean; prefetchedPayload?: GetConversationPayload },
): Promise<ImportElevenLabsResult> {
  const exists = await prisma.interview.findUnique({ where: { id: interviewId }, select: { id: true } });
  if (!exists) throw new Error("Entrevista no encontrada");

  const payload = opts.prefetchedPayload ?? (await fetchElevenLabsConversation(conversationId));
  const linked = extractInterviewIdFromConversationPayload(payload);
  if (linked && linked !== interviewId) {
    throw new Error(
      `Esta conversación ya está asociada a otra entrevista (${linked}). Abrí el detalle correcto o usá una conversación sin interview_id en las variables dinámicas.`,
    );
  }

  const transcript = formatConversationTranscript(payload.transcript);
  if (!transcript.trim()) {
    throw new Error("La conversación no tiene mensajes de texto en el transcript.");
  }

  const summary =
    (payload.analysis && typeof payload.analysis.transcript_summary === "string"
      ? payload.analysis.transcript_summary
      : null) ?? undefined;
  const durationSeconds =
    typeof payload.metadata?.call_duration_secs === "number"
      ? payload.metadata.call_duration_secs
      : undefined;

  await prisma.interview.update({
    where: { id: interviewId },
    data: {
      elevenlabsConversationId: conversationId,
      transcript,
      summary: summary ?? undefined,
      durationSeconds: durationSeconds ?? undefined,
      rawWebhookPayload: payload as object,
      status: InterviewStatus.PROCESSING,
    },
  });

  if (!opts.runEvaluation) {
    return { transcriptChars: transcript.length, evaluated: false };
  }

  try {
    await runInterviewEvaluation(interviewId);
    return { transcriptChars: transcript.length, evaluated: true };
  } catch (e) {
    await prisma.interview.update({
      where: { id: interviewId },
      data: { status: InterviewStatus.FAILED },
    });
    throw e;
  }
}

export type AfterCallSyncResult =
  | { mode: "evaluated"; transcriptChars: number }
  | { mode: "skipped"; reason: "no_api_key" | "no_conversation_id" }
  | { mode: "pending_webhook"; reason: "transcript_not_ready" | "sync_error"; detail?: string };

/**
 * Tras "Finalizar entrevista": intenta traer transcript + evaluar vía API del proveedor de voz
 * (con reintentos), sin esperar al webhook. Si no hay transcript aún, queda PROCESSING para el webhook.
 */
export async function trySyncInterviewAfterCallEnd(interviewId: string): Promise<AfterCallSyncResult> {
  if (!process.env.ELEVENLABS_API_KEY?.trim()) {
    return { mode: "skipped", reason: "no_api_key" };
  }

  const row = await prisma.interview.findUnique({
    where: { id: interviewId },
    select: { elevenlabsConversationId: true },
  });
  const convId = row?.elevenlabsConversationId?.trim();
  if (!convId) {
    return { mode: "skipped", reason: "no_conversation_id" };
  }

  try {
    const payload = await fetchElevenLabsConversationWhenTranscriptReady(convId, {
      maxAttempts: 10,
      delayMs: 650,
    });
    if (!payload) {
      return { mode: "pending_webhook", reason: "transcript_not_ready" };
    }

    const r = await importElevenLabsConversationIntoInterview(interviewId, convId, {
      runEvaluation: true,
      prefetchedPayload: payload,
    });
    return { mode: "evaluated", transcriptChars: r.transcriptChars };
  } catch (e) {
    const detail = e instanceof Error ? e.message : String(e);
    console.error("[trySyncInterviewAfterCallEnd]", interviewId, e);
    return { mode: "pending_webhook", reason: "sync_error", detail };
  }
}
