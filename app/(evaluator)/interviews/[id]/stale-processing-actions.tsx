"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { AlertTriangle, Clock, RefreshCw, XCircle } from "lucide-react";
import { Button } from "@/components/ui/button";

const STUCK_THRESHOLD_MIN = 5;

type ResyncResponse = {
  ok?: boolean;
  message?: string;
  sync?:
    | { mode: "evaluated"; transcriptChars: number }
    | { mode: "skipped"; reason: "no_api_key" | "no_conversation_id" }
    | { mode: "pending_webhook"; reason: "transcript_not_ready" | "sync_error"; detail?: string };
};

export function StaleProcessingActions({
  interviewId,
  referenceIso,
  hasConversationId,
}: {
  interviewId: string;
  referenceIso: string;
  hasConversationId: boolean;
}) {
  const router = useRouter();
  const [busy, setBusy] = useState<"resync" | "fail" | null>(null);
  const [msg, setMsg] = useState<string | null>(null);
  const [tone, setTone] = useState<"info" | "error" | "success">("info");
  const [minutesStuck, setMinutesStuck] = useState<number>(0);

  useEffect(() => {
    const refTime = new Date(referenceIso).getTime();
    const compute = () => Math.max(0, Math.floor((Date.now() - refTime) / 60000));
    const tid = setTimeout(() => setMinutesStuck(compute()), 0);
    const i = setInterval(() => setMinutesStuck(compute()), 30000);
    return () => {
      clearTimeout(tid);
      clearInterval(i);
    };
  }, [referenceIso]);

  const showStuckPanel = minutesStuck >= STUCK_THRESHOLD_MIN;

  async function resync() {
    setBusy("resync");
    setMsg(null);
    try {
      const res = await fetch(`/api/interviews/${interviewId}/resync`, { method: "POST" });
      const data = (await res.json().catch(() => ({}))) as ResyncResponse;
      if (!res.ok) {
        setTone("error");
        setMsg("No pudimos sincronizar la entrevista. Probá nuevamente en unos minutos.");
        return;
      }
      if (data.sync?.mode === "evaluated") {
        setTone("success");
        setMsg("Listo: la conversación se sincronizó y el informe quedó generado.");
        router.refresh();
        return;
      }
      if (data.sync?.mode === "pending_webhook") {
        setTone("info");
        setMsg(
          "La conversación todavía no tiene transcripción disponible. Si esperaste unos minutos y sigue igual, podés marcarla como fallida.",
        );
        return;
      }
      if (data.sync?.mode === "skipped" && data.sync.reason === "no_conversation_id") {
        setTone("info");
        setMsg(
          "No hay id de conversación asociado. Importala manualmente desde el apartado de soporte más abajo o marcala como fallida.",
        );
        return;
      }
      setTone("info");
      setMsg(data.message ?? "Sincronización completada.");
    } catch {
      setTone("error");
      setMsg("Error de red al sincronizar. Volvé a intentar en unos instantes.");
    } finally {
      setBusy(null);
    }
  }

  async function markFailed() {
    if (!confirm("¿Marcar esta entrevista como fallida? Esta acción no genera informe.")) return;
    setBusy("fail");
    setMsg(null);
    try {
      const res = await fetch(`/api/interviews/${interviewId}/mark-failed`, { method: "POST" });
      if (!res.ok) {
        setTone("error");
        setMsg("No se pudo cambiar el estado. Volvé a intentar en unos instantes.");
        return;
      }
      setTone("success");
      setMsg("Entrevista marcada como fallida.");
      router.refresh();
    } catch {
      setTone("error");
      setMsg("Error de red. Volvé a intentar.");
    } finally {
      setBusy(null);
    }
  }

  const toneClass =
    tone === "error"
      ? "border-red-200 bg-red-50 text-red-800"
      : tone === "success"
        ? "border-emerald-200 bg-emerald-50 text-emerald-800"
        : "border-violet-200 bg-violet-50 text-violet-900";

  if (!showStuckPanel) {
    return (
      <div className="overflow-hidden rounded-xl border border-slate-200/90 bg-white p-6 shadow-sm md:p-8">
        <div className="flex min-w-0 gap-4">
          <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-violet-100 text-violet-600 ring-1 ring-violet-200/60">
            <Clock className="h-5 w-5" strokeWidth={2} />
          </span>
          <div className="min-w-0">
            <h2 className="text-lg font-semibold text-slate-900">Informe en preparación</h2>
            <p className="mt-2 max-w-xl text-sm leading-relaxed text-slate-600">
              El informe suele generarse en pocos minutos cuando ya hay transcripción. Si pasa más tiempo del esperado
              te vamos a mostrar acciones para reintentar o marcarla como fallida.
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="overflow-hidden rounded-xl border border-amber-200/80 bg-amber-50/70 p-5 shadow-sm md:p-6">
      <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
        <div className="flex min-w-0 gap-4">
          <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-amber-100 text-amber-700 ring-1 ring-amber-200">
            <AlertTriangle className="h-5 w-5" strokeWidth={2} />
          </span>
          <div className="min-w-0">
            <h2 className="text-lg font-semibold text-amber-900">
              Procesando hace {minutesStuck} {minutesStuck === 1 ? "minuto" : "minutos"}
            </h2>
            <p className="mt-2 max-w-xl text-sm leading-relaxed text-amber-900/85">
              La entrevista quedó esperando la transcripción más tiempo del habitual. Esto suele pasar cuando la
              conversación se cortó antes de tiempo o no se completó. Podés{" "}
              <strong className="font-semibold">reintentar la sincronización</strong>, o si ya pasó suficiente tiempo
              <strong className="font-semibold"> marcarla como fallida</strong> para liberar el caso.
              {!hasConversationId ? (
                <>
                  {" "}
                  En este caso, además, <strong className="font-semibold">no se registró el id de conversación</strong>,
                  así que la sincronización automática no va a poder recuperar nada — importá manualmente desde el
                  apartado de soporte o marcala como fallida.
                </>
              ) : null}
            </p>
          </div>
        </div>
        <div className="flex shrink-0 flex-col gap-2 sm:flex-row sm:flex-wrap md:flex-col md:items-end">
          <Button
            type="button"
            variant="default"
            size="sm"
            className="font-semibold"
            disabled={!hasConversationId || busy !== null}
            onClick={() => void resync()}
          >
            <RefreshCw className={`h-4 w-4 ${busy === "resync" ? "animate-spin" : ""}`} />
            {busy === "resync" ? "Sincronizando…" : "Reintentar sincronización"}
          </Button>
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="border-red-200 font-semibold text-red-700 hover:bg-red-50"
            disabled={busy !== null}
            onClick={() => void markFailed()}
          >
            <XCircle className={`h-4 w-4 ${busy === "fail" ? "animate-spin" : ""}`} />
            {busy === "fail" ? "Marcando…" : "Marcar como fallida"}
          </Button>
        </div>
      </div>
      {msg ? (
        <p className={`mt-4 rounded-lg border px-4 py-3 text-sm leading-relaxed ${toneClass}`}>{msg}</p>
      ) : null}
    </div>
  );
}
