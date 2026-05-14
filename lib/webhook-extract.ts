export function extractConversationId(payload: unknown): string | null {
  if (!payload || typeof payload !== "object") return null;
  const o = payload as Record<string, unknown>;
  const direct =
    (typeof o.conversation_id === "string" && o.conversation_id) ||
    (typeof o.conversationId === "string" && o.conversationId) ||
    (typeof o.ConversationID === "string" && o.ConversationID);
  if (direct) return direct;
  const data = o.data;
  if (data && typeof data === "object") {
    const d = data as Record<string, unknown>;
    const nested =
      (typeof d.conversation_id === "string" && d.conversation_id) ||
      (typeof d.conversationId === "string" && d.conversationId);
    if (nested) return nested;
  }
  return null;
}

export function extractTranscript(payload: unknown): string | null {
  if (!payload || typeof payload !== "object") return null;
  const o = payload as Record<string, unknown>;
  const tryStr = (v: unknown) => (typeof v === "string" && v.trim() ? v : null);
  const fromTranscript = tryStr(o.transcript) ?? tryStr(o.text);
  if (fromTranscript) return fromTranscript;
  const data = o.data;
  if (data && typeof data === "object") {
    const d = data as Record<string, unknown>;
    const t = tryStr(d.transcript) ?? tryStr(d.text);
    if (t) return t;
  }
  const analysis = o.analysis;
  if (analysis && typeof analysis === "object") {
    const a = analysis as Record<string, unknown>;
    const t = tryStr(a.transcript_summary) ?? tryStr(a.summary);
    if (t) return t;
  }
  return null;
}

export function extractSummary(payload: unknown): string | null {
  if (!payload || typeof payload !== "object") return null;
  const o = payload as Record<string, unknown>;
  const tryStr = (v: unknown) => (typeof v === "string" && v.trim() ? v : null);
  return tryStr(o.summary) ?? tryStr((o.data as Record<string, unknown> | undefined)?.summary);
}

export function extractAudioUrl(payload: unknown): string | null {
  if (!payload || typeof payload !== "object") return null;
  const o = payload as Record<string, unknown>;
  const tryStr = (v: unknown) => (typeof v === "string" && v.startsWith("http") ? v : null);
  return (
    tryStr(o.recording_url) ??
    tryStr(o.audio_url) ??
    tryStr((o.data as Record<string, unknown> | undefined)?.recording_url)
  );
}

export function extractInterviewIdFromPayload(payload: unknown): string | null {
  if (!payload || typeof payload !== "object") return null;
  const o = payload as Record<string, unknown>;
  const meta = o.metadata ?? o.conversation_initiation_client_data;
  if (meta && typeof meta === "object") {
    const m = meta as Record<string, unknown>;
    const v = m.interview_id ?? m.interviewId;
    if (typeof v === "string") return v;
  }
  const dyn = o.dynamic_variables;
  if (dyn && typeof dyn === "object") {
    const d = dyn as Record<string, unknown>;
    const v = d.interview_id;
    if (typeof v === "string") return v;
  }
  return null;
}

export function extractDurationSeconds(payload: unknown): number | null {
  if (!payload || typeof payload !== "object") return null;
  const o = payload as Record<string, unknown>;
  const n = (v: unknown) => (typeof v === "number" && Number.isFinite(v) ? Math.round(v) : null);
  return n(o.duration_seconds) ?? n(o.durationSeconds) ?? n((o.metadata as Record<string, unknown> | undefined)?.call_duration_secs);
}

