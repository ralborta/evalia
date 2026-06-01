"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { AlertTriangle, Clock, Loader2, XCircle } from "lucide-react";
import { Button } from "@/components/ui/button";

const AUTO_RETRY_INTERVAL_MS = 25_000;
const FAIL_PANEL_AFTER_MIN = 8;

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
  const [busyFail, setBusyFail] = useState(false);
  const [autoMsg, setAutoMsg] = useState<string | null>(null);
  const [failMsg, setFailMsg] = useState<{ tone: "info" | "error" | "success"; text: string } | null>(null);
  const [minutesStuck, setMinutesStuck] = useState<number>(0);
  const [retrying, setRetrying] = useState(false);
  const inFlightRef = useRef(false);

  useEffect(() => {
    const refTime = new Date(referenceIso).getTime();
    const compute = () => Math.max(0, Math.floor((Date.now() - refTime) / 60_000));
    const tid = setTimeout(() => setMinutesStuck(compute()), 0);
    const i = setInterval(() => setMinutesStuck(compute()), 30_000);
    return () => {
      clearTimeout(tid);
      clearInterval(i);
    };
  }, [referenceIso]);

  const tryResync = useCallback(async () => {
    if (inFlightRef.current) return;
    if (!hasConversationId) return;
    inFlightRef.current = true;
    setRetrying(true);
    try {
      const res = await fetch(`/api/interviews/${interviewId}/resync`, { method: "POST" });
      const data = (await res.json().catch(() => ({}))) as ResyncResponse;
      if (data.sync?.mode === "evaluated") {
        setAutoMsg("Listo: el informe se generó.");
        router.refresh();
        return;
      }
      if (data.sync?.mode === "pending_webhook") {
        setAutoMsg("Todavía esperando la transcripción del proveedor.");
      } else if (data.sync?.mode === "skipped" && data.sync.reason === "no_conversation_id") {
        setAutoMsg("No hay id de conversación; importala manualmente más abajo.");
      } else {
        setAutoMsg("Reintentando…");
      }
    } catch {
      setAutoMsg("Sin conexión; reintentamos en unos segundos.");
    } finally {
      inFlightRef.current = false;
      setRetrying(false);
    }
  }, [hasConversationId, interviewId, router]);

  useEffect(() => {
    if (!hasConversationId) return;
    const tid = setTimeout(() => {
      void tryResync();
    }, 0);
    const i = setInterval(() => {
      void tryResync();
    }, AUTO_RETRY_INTERVAL_MS);
    return () => {
      clearTimeout(tid);
      clearInterval(i);
    };
  }, [hasConversationId, tryResync]);

  async function markFailed() {
    if (!confirm("¿Marcar esta entrevista como fallida? Esta acción no genera informe.")) return;
    setBusyFail(true);
    setFailMsg(null);
    try {
      const res = await fetch(`/api/interviews/${interviewId}/mark-failed`, { method: "POST" });
      if (!res.ok) {
        setFailMsg({ tone: "error", text: "No se pudo cambiar el estado. Volvé a intentar en unos instantes." });
        return;
      }
      setFailMsg({ tone: "success", text: "Entrevista marcada como fallida." });
      router.refresh();
    } catch {
      setFailMsg({ tone: "error", text: "Error de red. Volvé a intentar." });
    } finally {
      setBusyFail(false);
    }
  }

  const showFailPanel = minutesStuck >= FAIL_PANEL_AFTER_MIN;

  if (!showFailPanel) {
    return (
      <div className="overflow-hidden rounded-xl border border-violet-200/80 bg-violet-50/60 p-6 shadow-sm md:p-8">
        <div className="flex min-w-0 gap-4">
          <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-violet-100 text-violet-700 ring-1 ring-violet-200/60">
            {retrying ? (
              <Loader2 className="h-5 w-5 animate-spin" strokeWidth={2} />
            ) : (
              <Clock className="h-5 w-5" strokeWidth={2} />
            )}
          </span>
          <div className="min-w-0">
            <h2 className="text-lg font-semibold text-slate-900">Generando informe automáticamente</h2>
            <p className="mt-2 max-w-xl text-sm leading-relaxed text-slate-600">
              Estamos sincronizando la conversación y armando el informe. Esto suele tardar entre 30 segundos y un par
              de minutos. Podés cerrar esta pantalla y volver más tarde — la página se va a actualizar sola cuando esté
              listo.
            </p>
            {hasConversationId ? (
              <p className="mt-3 text-xs text-slate-500">
                {retrying ? "Verificando con el proveedor…" : autoMsg ?? "Reintentando automáticamente cada 25 segundos."}
              </p>
            ) : (
              <p className="mt-3 text-xs text-amber-700">
                No tenemos id de conversación asociado. Importala manualmente desde el apartado de soporte más abajo.
              </p>
            )}
          </div>
        </div>
      </div>
    );
  }

  const toneClass =
    failMsg?.tone === "error"
      ? "border-red-200 bg-red-50 text-red-800"
      : failMsg?.tone === "success"
        ? "border-emerald-200 bg-emerald-50 text-emerald-800"
        : "border-violet-200 bg-violet-50 text-violet-900";

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
              Seguimos reintentando en segundo plano, pero la conversación todavía no devolvió transcripción. Suele
              pasar cuando la llamada se cortó antes de tiempo o quedó sin audio aprovechable. Podés esperar un poco
              más, o si no avanza, <strong className="font-semibold">marcarla como fallida</strong> para liberar el caso.
              {!hasConversationId ? (
                <>
                  {" "}
                  En este caso, además, <strong className="font-semibold">no hay id de conversación registrado</strong>,
                  así que la sincronización automática no va a poder recuperar nada — importá manualmente desde el
                  apartado de soporte o marcala como fallida.
                </>
              ) : null}
            </p>
            {hasConversationId ? (
              <p className="mt-3 text-xs text-amber-800">
                {retrying ? "Verificando con el proveedor…" : autoMsg ?? "Reintentando automáticamente cada 25 segundos."}
              </p>
            ) : null}
          </div>
        </div>
        <div className="flex shrink-0 flex-col gap-2 sm:flex-row sm:flex-wrap md:flex-col md:items-end">
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="border-red-200 font-semibold text-red-700 hover:bg-red-50"
            disabled={busyFail}
            onClick={() => void markFailed()}
          >
            <XCircle className={`h-4 w-4 ${busyFail ? "animate-spin" : ""}`} />
            {busyFail ? "Marcando…" : "Marcar como fallida"}
          </Button>
        </div>
      </div>
      {failMsg ? (
        <p className={`mt-4 rounded-lg border px-4 py-3 text-sm leading-relaxed ${toneClass}`}>{failMsg.text}</p>
      ) : null}
    </div>
  );
}
