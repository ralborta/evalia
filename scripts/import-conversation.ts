/**
 * Importa transcript (y metadatos) desde la API del proveedor de voz hacia una Interview de EvalIA,
 * y opcionalmente ejecuta la evaluación OpenAI (mismo flujo que el webhook post-call).
 *
 * Uso:
 *   pnpm import:conversation -- <conversation_id> [<conversation_id> ...]
 *   pnpm import:conversation -- --conversation=xxx --interview=<cuid_evalia>
 *
 * Opciones:
 *   --interview=<id>   Entrevista EvalIA (obligatoria si la conversación no está enlazada por conversation_id en BD ni trae interview_id en variables dinámicas)
 *   --no-eval          Solo escribe transcript/resumen/duración; no llama a OpenAI
 *   --dry-run          Solo muestra preview; no escribe en BD
 */
import "dotenv/config";
import { prisma } from "../lib/prisma";
import {
  extractInterviewIdFromConversationPayload,
  fetchElevenLabsConversation,
  formatConversationTranscript,
} from "../lib/elevenlabs-conversation";
import { importElevenLabsConversationIntoInterview } from "../lib/interview-elevenlabs-import";

type Args = {
  conversationIds: string[];
  interviewId: string | null;
  noEval: boolean;
  dryRun: boolean;
};

function parseArgs(argv: string[]): Args {
  const conversationIds: string[] = [];
  let interviewId: string | null = null;
  let noEval = false;
  let dryRun = false;

  for (const a of argv) {
    if (a === "--no-eval") noEval = true;
    else if (a === "--dry-run") dryRun = true;
    else if (a.startsWith("--interview=")) interviewId = a.slice("--interview=".length).trim() || null;
    else if (a.startsWith("--conversation=")) {
      const v = a.slice("--conversation=".length).trim();
      if (v) conversationIds.push(...v.split(",").map((s) => s.trim()).filter(Boolean));
    } else if (!a.startsWith("--") && a.length > 0) {
      conversationIds.push(a);
    }
  }

  return { conversationIds, interviewId, noEval, dryRun };
}

async function resolveInterviewId(
  conversationId: string,
  payload: Awaited<ReturnType<typeof fetchElevenLabsConversation>>,
  explicitInterviewId: string | null,
): Promise<string> {
  if (explicitInterviewId) {
    const row = await prisma.interview.findUnique({ where: { id: explicitInterviewId } });
    if (!row) throw new Error(`No existe entrevista con id ${explicitInterviewId}`);
    return row.id;
  }

  const byConv = await prisma.interview.findFirst({
    where: { elevenlabsConversationId: conversationId },
  });
  if (byConv) return byConv.id;

  const fromPayload = extractInterviewIdFromConversationPayload(payload);
  if (fromPayload) {
    const row = await prisma.interview.findUnique({ where: { id: fromPayload } });
    if (row) return row.id;
  }

  throw new Error(
    "No se pudo enlazar la conversación a una entrevista EvalIA. " +
      "Crea la entrevista en el panel, haz al menos un intento que guarde el conversation_id, " +
      "o pasa --interview=<id_prisma> (cuid de la fila Interview).",
  );
}

async function importOne(conversationId: string, args: Args): Promise<void> {
  console.info(`\n→ Conversación externa: ${conversationId}`);
  const payload = await fetchElevenLabsConversation(conversationId);
  const transcript = formatConversationTranscript(payload.transcript);
  if (!transcript.trim()) {
    console.warn("  (sin mensajes de texto en transcript; nada que importar)");
    return;
  }

  const durationSeconds =
    typeof payload.metadata?.call_duration_secs === "number"
      ? payload.metadata.call_duration_secs
      : undefined;

  if (args.dryRun) {
    console.info(`  [dry-run] transcript: ${transcript.length} chars, duración: ${durationSeconds ?? "—"}s`);
    console.info("  preview:\n" + transcript.slice(0, 600) + (transcript.length > 600 ? "\n  …" : ""));
    return;
  }

  const interviewId = await resolveInterviewId(conversationId, payload, args.interviewId);
  const result = await importElevenLabsConversationIntoInterview(interviewId, conversationId, {
    runEvaluation: !args.noEval,
  });
  console.info(`  Entrevista EvalIA: ${interviewId} (${result.transcriptChars} caracteres)`);
  if (result.evaluated) console.info("  Evaluación completada (COMPLETED).");
  else console.info("  --no-eval: no se ejecutó evaluación OpenAI.");
}

async function main() {
  const argv = process.argv.slice(2).filter((x) => x !== "--");
  const args = parseArgs(argv);

  if (args.conversationIds.length > 1 && args.interviewId) {
    console.error("Con varios conversation_id no uses --interview (solo enlaza una entrevista).");
    process.exit(1);
  }

  if (args.conversationIds.length === 0) {
    console.error(`Uso:
  pnpm import:conversation -- <conversation_id> [conversation_id ...]
  pnpm import:conversation -- --conversation=id1,id2 --interview=<cuid>   # solo un id con --interview

Requiere DATABASE_URL y ELEVENLABS_API_KEY. Opcional: OPENAI_API_KEY (si no usas --no-eval).
`);
    process.exit(1);
  }

  for (const cid of args.conversationIds) {
    try {
      await importOne(cid, args);
    } catch (e) {
      console.error(e);
      process.exitCode = 1;
    }
  }
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
