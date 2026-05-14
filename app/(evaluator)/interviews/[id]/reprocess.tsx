"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";

export function ReprocessEvaluation({ interviewId, hasTranscript }: { interviewId: string; hasTranscript: boolean }) {
  const [msg, setMsg] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function run() {
    setLoading(true);
    setMsg(null);
    const res = await fetch(`/api/evaluations/${interviewId}/run`, { method: "POST" });
    setLoading(false);
    if (!res.ok) {
      const j = await res.json().catch(() => ({}));
      setMsg(j.error ?? "Error al evaluar");
      return;
    }
    window.location.reload();
  }

  return (
    <div className="flex flex-col items-end gap-1">
      <Button type="button" variant="secondary" size="sm" disabled={!hasTranscript || loading} onClick={() => void run()}>
        {loading ? "Procesando…" : "Reprocesar evaluación"}
      </Button>
      {!hasTranscript ? <span className="text-xs text-slate-400">Requiere transcripción</span> : null}
      {msg ? <span className="text-xs text-red-600">{msg}</span> : null}
    </div>
  );
}
