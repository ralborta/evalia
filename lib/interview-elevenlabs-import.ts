import { InterviewStatus } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { runInterviewEvaluation } from "@/lib/evaluation";
import {
  extractInterviewIdFromConversationPayload,
  fetchElevenLabsConversation,
  formatConversationTranscript,
} from "@/lib/elevenlabs-conversation";

export type ImportElevenLabsResult = {
  transcriptChars: number;
  evaluated: boolean;
};

/**
 * Descarga una conversación ConvAI y la asocia a esta entrevista EvalIA.
 * Si `runEvaluation` y hay transcript, ejecuta la evaluación OpenAI (estado COMPLETED o FAILED).
 */
export async function importElevenLabsConversationIntoInterview(
  interviewId: string,
  conversationId: string,
  opts: { runEvaluation: boolean },
): Promise<ImportElevenLabsResult> {
  const exists = await prisma.interview.findUnique({ where: { id: interviewId }, select: { id: true } });
  if (!exists) throw new Error("Entrevista no encontrada");

  const payload = await fetchElevenLabsConversation(conversationId);
  const linked = extractInterviewIdFromConversationPayload(payload);
  if (linked && linked !== interviewId) {
    throw new Error(
      `Esta conversación en ElevenLabs referencia otra entrevista (${linked}). Importa desde el detalle correcto o usa una conversación sin interview_id en variables.`,
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
