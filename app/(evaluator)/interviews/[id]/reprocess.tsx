"use client";

import { useState } from "react";
import { RefreshCw } from "lucide-react";
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
      <Button
        type="button"
        variant="secondary"
        size="sm"
        disabled={!hasTranscript || loading}
        className="border border-slate-200 bg-slate-50 font-semibold text-slate-700 shadow-sm hover:bg-slate-100 disabled:opacity-50"
        onClick={() => void run()}
      >
        <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} />
        {loading ? "Procesando…" : "Reprocesar evaluación"}
      </Button>
      {msg ? <span className="max-w-xs text-right text-xs text-red-600">{msg}</span> : null}
    </div>
  );
}
