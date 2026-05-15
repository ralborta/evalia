"use client";

import { useEffect, useMemo, useState } from "react";
import { ConversationProvider, useConversation } from "@elevenlabs/react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Mic2 } from "lucide-react";

type Meta =
  | { ok: true; candidateName: string; jobTitle: string; durationMinutes: number; status: string }
  | { ok: false; code: string };

function Inner({ token }: { token: string }) {
  const { startSession, endSession, status, getId, setMuted, isMuted, mode } = useConversation();
  const [step, setStep] = useState<"welcome" | "mic" | "room" | "done" | "error">("welcome");
  const [meta, setMeta] = useState<Meta | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const [savedConv, setSavedConv] = useState(false);

  useEffect(() => {
    void (async () => {
      const res = await fetch(`/api/public/interviews/${token}`);
      if (res.status === 404) return setMeta({ ok: false, code: "invalid" });
      if (res.status === 410) {
        const j = await res.json().catch(() => ({}));
        return setMeta({ ok: false, code: (j.error as string) ?? "closed" });
      }
      if (!res.ok) return setMeta({ ok: false, code: "error" });
      const data = await res.json();
      setMeta({
        ok: true,
        candidateName: data.candidateName,
        jobTitle: data.jobTitle,
        durationMinutes: data.durationMinutes,
        status: data.status,
      });
    })();
  }, [token]);

  useEffect(() => {
    if (status !== "connected" || savedConv) return;
    const id = getId();
    if (!id) return;
    setSavedConv(true);
    void fetch(`/api/public/interviews/${token}/conversation`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ conversationId: id }),
    });
  }, [status, savedConv, getId, token]);

  const title = useMemo(() => {
    if (!meta || !meta.ok) return "";
    return `Welcome, ${meta.candidateName}`;
  }, [meta]);

  async function checkMic() {
    setErr(null);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      stream.getTracks().forEach((t) => t.stop());
      setStep("mic");
    } catch {
      setErr("No pudimos acceder al micrófono. Actívalo en el navegador e inténtalo de nuevo.");
    }
  }

  async function beginInterview() {
    setErr(null);
    const res = await fetch(`/api/public/interviews/${token}/session`, { method: "POST" });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      setErr(data.message ?? data.error ?? "No se pudo iniciar la sesión de voz");
      return;
    }
    startSession({
      signedUrl: data.signedUrl,
      dynamicVariables: data.dynamicVariables,
    });
    setStep("room");
  }

  const [finishNote, setFinishNote] = useState<string | null>(null);

  async function finish() {
    setFinishNote(null);
    try {
      await endSession();
    } catch {
      /* ignore */
    }
    const res = await fetch(`/api/public/interviews/${token}/finish`, { method: "POST" });
    const data = (await res.json().catch(() => ({}))) as {
      sync?: { mode?: string; reason?: string };
    };
    if (data.sync?.mode === "evaluated") {
      setFinishNote("Evaluación generada. El equipo ya puede ver el informe en el panel.");
    } else if (data.sync?.mode === "pending_webhook") {
      setFinishNote(
        "Seguimos procesando el audio en ElevenLabs; el informe aparecerá en breve (o cuando llegue el webhook).",
      );
    } else if (data.sync?.mode === "skipped" && data.sync?.reason === "no_conversation_id") {
      setFinishNote("No se registró el id de conversación; el evaluador puede importarla manualmente desde ElevenLabs.");
    }
    setStep("done");
  }

  if (!meta) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#050b2e] text-white">
        <div className="flex flex-col items-center gap-3">
          <div className="h-10 w-10 animate-pulse rounded-full bg-violet-500/40" />
          <p className="text-sm text-slate-400">Cargando entrevista…</p>
        </div>
      </div>
    );
  }

  if (!meta.ok) {
    const copy =
      meta.code === "invalid"
        ? "Este enlace no es válido."
        : meta.code === "already_completed"
          ? "Esta entrevista ya fue completada."
          : meta.code === "expired"
            ? "Este enlace expiró."
            : "No se puede abrir esta entrevista.";
    return (
      <div className="flex min-h-screen flex-col items-center justify-center bg-[#050b2e] px-6 text-center text-white">
        <div className="evalia-glass-card max-w-md rounded-3xl px-8 py-10">
          <Mic2 className="mx-auto mb-4 h-12 w-12 text-violet-300" />
          <p className="text-lg font-medium leading-snug">{copy}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#050b2e] text-white">
      <div
        className="pointer-events-none fixed inset-0 opacity-90"
        style={{
          background:
            "radial-gradient(ellipse 80% 50% at 50% -20%, rgba(99,71,209,0.35), transparent), radial-gradient(ellipse 60% 40% at 100% 100%, rgba(56,189,248,0.12), transparent)",
        }}
      />
      <header className="relative z-10 flex items-center justify-between border-b border-white/10 px-5 py-4 backdrop-blur-md md:px-8">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-violet-500 to-indigo-600 shadow-lg shadow-violet-900/40">
            <Mic2 className="h-5 w-5 text-white" />
          </div>
          <span className="font-bold tracking-tight">EvalIA</span>
        </div>
        <span className="rounded-full border border-white/10 bg-white/5 px-3 py-1 text-[10px] font-semibold uppercase tracking-widest text-slate-400">
          English interview
        </span>
      </header>

      <main className="relative z-10 mx-auto flex max-w-lg flex-col gap-8 px-5 py-10 md:px-6">
        {step === "welcome" ? (
          <Card className="evalia-glass-card rounded-3xl border-0 text-white shadow-2xl shadow-black/30">
            <CardHeader className="pb-2">
              <CardTitle className="text-2xl font-bold tracking-tight text-white">{title}</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4 text-sm leading-relaxed text-slate-200">
              <p>You are about to start a short English speaking interview.</p>
              <p>
                This assessment will help evaluate your communication level for the role:{" "}
                <span className="font-semibold text-white">{meta.jobTitle}</span>
              </p>
              <p className="rounded-xl bg-white/5 px-3 py-2 text-slate-300">
                Estimated duration: <span className="font-medium text-white">{meta.durationMinutes} minutes</span>
              </p>
              <ul className="list-inside list-disc space-y-1.5 text-slate-300">
                <li>Find a quiet place.</li>
                <li>Use headphones if possible.</li>
                <li>Speak naturally.</li>
                <li>Do not close this window during the interview.</li>
              </ul>
              {err ? (
                <p className="rounded-xl border border-red-400/30 bg-red-500/10 px-3 py-2 text-sm text-red-200">{err}</p>
              ) : null}
              <div className="flex flex-wrap gap-3 pt-2">
                <Button type="button" variant="secondary" className="font-semibold" onClick={() => void checkMic()}>
                  Check microphone
                </Button>
              </div>
            </CardContent>
          </Card>
        ) : null}

        {step === "mic" ? (
          <Card className="evalia-glass-card rounded-3xl border-0 text-white shadow-2xl shadow-black/30">
            <CardHeader>
              <CardTitle className="text-xl font-bold text-white">Micrófono listo</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <p className="text-sm text-slate-200">
                Cuando estés preparado, inicia la conversación con el entrevistador virtual.
              </p>
              {err ? (
                <p className="rounded-xl border border-red-400/30 bg-red-500/10 px-3 py-2 text-sm text-red-200">{err}</p>
              ) : null}
              <div className="flex flex-wrap gap-3">
                <Button type="button" className="font-semibold" onClick={() => void beginInterview()}>
                  Start interview
                </Button>
                <Button type="button" variant="ghost" className="text-slate-300 hover:bg-white/10" onClick={() => setStep("welcome")}>
                  Volver
                </Button>
              </div>
            </CardContent>
          </Card>
        ) : null}

        {step === "room" ? (
          <div className="flex flex-col items-center gap-8 text-center">
            <div className="evalia-orb flex h-44 w-44 items-center justify-center rounded-full bg-gradient-to-br from-violet-500 via-violet-600 to-indigo-800 shadow-[0_0_60px_rgba(99,71,209,0.45)] ring-4 ring-violet-500/20">
              <Mic2 className="h-16 w-16 text-white/95" />
            </div>
            <div className="evalia-glass-card w-full max-w-sm rounded-2xl px-6 py-4">
              <p className="text-[10px] font-bold uppercase tracking-[0.25em] text-violet-300/90">Estado</p>
              <p className="mt-1 text-xl font-semibold capitalize text-white">{status}</p>
              <p className="mt-1 text-xs text-slate-400">Modo: {mode}</p>
            </div>
            <div className="flex flex-wrap justify-center gap-3">
              <Button type="button" variant="secondary" className="min-w-[100px] font-semibold" onClick={() => setMuted(!isMuted)}>
                {isMuted ? "Unmute" : "Mute"}
              </Button>
              <Button type="button" variant="destructive" className="font-semibold" onClick={() => void finish()}>
                Finalizar entrevista
              </Button>
            </div>
            <p className="max-w-md text-xs leading-relaxed text-slate-500">
              La conversación es oral; no verás un chat completo. Mantén esta ventana abierta.
            </p>
          </div>
        ) : null}

        {step === "done" ? (
          <Card className="evalia-glass-card rounded-3xl border-0 text-white shadow-2xl shadow-black/30">
            <CardHeader>
              <CardTitle className="text-xl font-bold text-white">Entrevista finalizada</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3 text-sm text-slate-200">
              <p>Thank you for completing the interview. The evaluation team will review your results.</p>
              {finishNote ? (
                <p className="rounded-xl border border-white/10 bg-white/10 px-4 py-3 text-xs leading-relaxed text-slate-100">
                  {finishNote}
                </p>
              ) : null}
            </CardContent>
          </Card>
        ) : null}
      </main>
    </div>
  );
}

export function PublicInterviewPage({ token }: { token: string }) {
  return (
    <ConversationProvider>
      <Inner token={token} />
    </ConversationProvider>
  );
}
