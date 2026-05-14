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

  async function finish() {
    try {
      await endSession();
    } catch {
      /* ignore */
    }
    await fetch(`/api/public/interviews/${token}/finish`, { method: "POST" });
    setStep("done");
  }

  if (!meta) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#050b2e] text-white">
        <p className="text-sm text-slate-300">Cargando…</p>
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
        <Mic2 className="mb-4 h-10 w-10 text-violet-400" />
        <p className="max-w-md text-lg">{copy}</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#050b2e] text-white">
      <header className="flex items-center justify-between border-b border-white/10 px-6 py-4">
        <div className="flex items-center gap-2">
          <div className="flex h-9 w-9 items-center justify-center rounded-full bg-violet-600">
            <Mic2 className="h-4 w-4" />
          </div>
          <span className="font-semibold">EvalIA</span>
        </div>
        <span className="text-xs text-slate-400">English interview</span>
      </header>

      <main className="mx-auto flex max-w-lg flex-col gap-6 px-6 py-10">
        {step === "welcome" ? (
          <Card className="border-white/10 bg-white/5 text-white shadow-none">
            <CardHeader>
              <CardTitle className="text-xl text-white">{title}</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4 text-sm text-slate-200">
              <p>You are about to start a short English speaking interview.</p>
              <p>
                This assessment will help evaluate your communication level for the role:{" "}
                <span className="font-medium text-white">{meta.jobTitle}</span>
              </p>
              <p>Estimated duration: {meta.durationMinutes} minutes.</p>
              <ul className="list-inside list-disc space-y-1 text-slate-300">
                <li>Find a quiet place.</li>
                <li>Use headphones if possible.</li>
                <li>Speak naturally.</li>
                <li>Do not close this window during the interview.</li>
              </ul>
              {err ? <p className="text-sm text-red-300">{err}</p> : null}
              <div className="flex flex-wrap gap-3 pt-2">
                <Button type="button" variant="secondary" onClick={() => void checkMic()}>
                  Check microphone
                </Button>
              </div>
            </CardContent>
          </Card>
        ) : null}

        {step === "mic" ? (
          <Card className="border-white/10 bg-white/5 text-white shadow-none">
            <CardHeader>
              <CardTitle className="text-lg text-white">Micrófono listo</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <p className="text-sm text-slate-200">Cuando estés preparado, inicia la conversación con el entrevistador virtual.</p>
              {err ? <p className="text-sm text-red-300">{err}</p> : null}
              <div className="flex gap-3">
                <Button type="button" onClick={() => void beginInterview()}>
                  Start interview
                </Button>
                <Button type="button" variant="ghost" className="text-slate-300" onClick={() => setStep("welcome")}>
                  Volver
                </Button>
              </div>
            </CardContent>
          </Card>
        ) : null}

        {step === "room" ? (
          <div className="flex flex-col items-center gap-6 text-center">
            <div className="evalia-orb flex h-40 w-40 items-center justify-center rounded-full bg-gradient-to-br from-violet-600 to-indigo-800 shadow-[0_0_40px_rgba(99,71,209,0.55)]">
              <Mic2 className="h-14 w-14 text-white/90" />
            </div>
            <div>
              <p className="text-sm uppercase tracking-wide text-slate-400">Estado</p>
              <p className="text-lg font-medium capitalize text-white">{status}</p>
              <p className="text-xs text-slate-400">Modo agente: {mode}</p>
            </div>
            <div className="flex flex-wrap justify-center gap-3">
              <Button type="button" variant="secondary" onClick={() => setMuted(!isMuted)}>
                {isMuted ? "Unmute" : "Mute"}
              </Button>
              <Button type="button" variant="destructive" onClick={() => void finish()}>
                Finalizar entrevista
              </Button>
            </div>
            <p className="max-w-md text-xs text-slate-500">
              La conversación es oral; no verás un chat completo. Mantén esta ventana abierta.
            </p>
          </div>
        ) : null}

        {step === "done" ? (
          <Card className="border-white/10 bg-white/5 text-white shadow-none">
            <CardHeader>
              <CardTitle className="text-lg text-white">Entrevista finalizada</CardTitle>
            </CardHeader>
            <CardContent className="text-sm text-slate-200">
              <p>Thank you for completing the interview. The evaluation team will review your results.</p>
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
