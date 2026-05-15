const ELEVEN_BASE = "https://api.elevenlabs.io/v1";

export type TranscriptTurn = {
  role: string;
  message?: string | null;
  time_in_call_secs?: number;
};

export type GetConversationPayload = {
  conversation_id?: string;
  agent_id?: string;
  transcript?: TranscriptTurn[];
  metadata?: {
    call_duration_secs?: number;
  };
  analysis?: {
    transcript_summary?: string;
  } | null;
  conversation_initiation_client_data?: {
    dynamic_variables?: Record<string, unknown>;
  } | null;
};

export async function fetchElevenLabsConversation(conversationId: string): Promise<GetConversationPayload> {
  const key = process.env.ELEVENLABS_API_KEY;
  if (!key) throw new Error("ELEVENLABS_API_KEY no configurada");

  const url = `${ELEVEN_BASE}/convai/conversations/${encodeURIComponent(conversationId)}`;
  const res = await fetch(url, {
    method: "GET",
    headers: { "xi-api-key": key },
    cache: "no-store",
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`ElevenLabs GET conversation ${res.status}: ${text}`);
  }

  return (await res.json()) as GetConversationPayload;
}

/** Texto plano tipo webhook, ordenado por tiempo en llamada. */
export function formatConversationTranscript(turns: TranscriptTurn[] | undefined): string {
  if (!turns?.length) return "";
  const sorted = [...turns].sort(
    (a, b) => (a.time_in_call_secs ?? 0) - (b.time_in_call_secs ?? 0),
  );
  const lines: string[] = [];
  for (const t of sorted) {
    const msg = typeof t.message === "string" ? t.message.trim() : "";
    if (!msg) continue;
    const label = t.role === "user" ? "Candidate" : t.role === "agent" ? "Agent" : t.role;
    lines.push(`${label}: ${msg}`);
  }
  return lines.join("\n");
}

export function extractInterviewIdFromConversationPayload(payload: GetConversationPayload): string | null {
  const dyn = payload.conversation_initiation_client_data?.dynamic_variables;
  if (dyn && typeof dyn === "object") {
    const v = dyn.interview_id ?? dyn.interviewId;
    if (typeof v === "string" && v.trim()) return v.trim();
  }
  return null;
}
