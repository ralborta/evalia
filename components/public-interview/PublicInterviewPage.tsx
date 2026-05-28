"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Image from "next/image";
import { ConversationProvider, useConversation } from "@elevenlabs/react";
import type { DisconnectionDetails } from "@elevenlabs/react";
import { EvaliaLogo } from "@/components/brand/evalia-logo";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Activity,
  Check,
  Clock,
  Globe,
  Lock,
  MessageCircle,
  Mic2,
  Mic,
  PhoneOff,
  Shield,
  Sparkles,
  Wifi,
} from "lucide-react";
import type { ReactNode } from "react";

type Meta =
  | { ok: true; candidateName: string; jobTitle: string; durationMinutes: number; status: string }
  | { ok: false; code: string };

function firstName(full: string) {
  const p = full.trim().split(/\s+/)[0];
  return p || full;
}

function describeDisconnect(d: DisconnectionDetails): string {
  if (d.reason === "user") {
    return "La conversación se cerró.";
  }
  if (d.reason === "agent") {
    const reason = d.closeReason ?? "";
    if (/inactivity|silence|timeout/i.test(reason)) {
      return "No se detectó tu voz durante unos segundos. Revisá el micrófono y volvé a intentar.";
    }
    return "La conversación se interrumpió antes de tiempo. Probá nuevamente en unos minutos.";
  }
  if (d.reason === "error") {
    if (d.closeCode === 1006) {
      return "Se perdió la conexión. Verificá tu internet y volvé a intentar.";
    }
    return "Hubo un problema con la conexión. Volvé a intentar en unos minutos.";
  }
  return "La conversación se interrumpió. Volvé a intentar en unos minutos.";
}

function Inner({ token }: { token: string }) {
  const stepRef = useRef<"welcome" | "room" | "done">("welcome");
  const [step, setStepState] = useState<"welcome" | "room" | "done">("welcome");
  const setStep = useCallback((s: "welcome" | "room" | "done") => {
    stepRef.current = s;
    setStepState(s);
  }, []);
  const [meta, setMeta] = useState<Meta | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const savedConvRef = useRef(false);
  const [micReady, setMicReady] = useState(false);
  const [micChecking, setMicChecking] = useState(false);
  const [disconnectNote, setDisconnectNote] = useState<string | null>(null);
  const startingRef = useRef(false);

  const onConnect = useCallback(() => {
    setDisconnectNote(null);
    setErr(null);
  }, []);
  const onDisconnect = useCallback(
    (details: DisconnectionDetails) => {
      startingRef.current = false;
      if (stepRef.current !== "room") return;
      const note = describeDisconnect(details);
      setDisconnectNote(note);
      if (details.reason !== "user") setErr(note);
      console.warn("[public-interview] disconnect", details);
    },
    [],
  );
  const onError = useCallback((message: string, context?: unknown) => {
    console.error("[public-interview] conversation error", message, context);
    setErr("Hubo un problema con la conexión. Volvé a intentar en unos minutos.");
  }, []);

  const { startSession, endSession, status, getId, setMuted, isMuted, mode } = useConversation({
    onConnect,
    onDisconnect,
    onError,
    useWakeLock: true,
  });

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
    if (status !== "connected" || savedConvRef.current) return;
    const id = getId();
    if (!id) return;
    savedConvRef.current = true;
    void fetch(`/api/public/interviews/${token}/conversation`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ conversationId: id }),
    });
  }, [status, getId, token]);

  const greeting = useMemo(() => {
    if (!meta || !meta.ok) return "";
    return firstName(meta.candidateName);
  }, [meta]);

  const latencyLabel = useMemo(() => `${95 + (token.length % 50)} ms`, [token]);

  async function checkMic() {
    setErr(null);
    setMicChecking(true);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      stream.getTracks().forEach((t) => t.stop());
      setMicReady(true);
    } catch {
      setMicReady(false);
      setErr("No pudimos acceder al micrófono. Revisá los permisos del navegador e intentá de nuevo.");
    } finally {
      setMicChecking(false);
    }
  }

  async function beginInterview() {
    setErr(null);
    setDisconnectNote(null);
    if (startingRef.current || status === "connected" || status === "connecting") return;
    if (!micReady) {
      setErr("Probá el micrófono antes de comenzar.");
      return;
    }
    startingRef.current = true;
    try {
      const res = await fetch(`/api/public/interviews/${token}/session`, { method: "POST" });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        startingRef.current = false;
        console.error("[public-interview] start session failed", data);
        setErr("No pudimos iniciar la entrevista en este momento. Volvé a intentar en unos minutos.");
        return;
      }
      startSession({
        signedUrl: data.signedUrl,
        dynamicVariables: data.dynamicVariables,
        useWakeLock: true,
      });
      setStep("room");
    } catch (e) {
      startingRef.current = false;
      console.error("[public-interview] start session error", e);
      setErr("No pudimos iniciar la entrevista en este momento. Volvé a intentar en unos minutos.");
    }
  }

  const [finishNote, setFinishNote] = useState<string | null>(null);

  async function finish() {
    setFinishNote(null);
    startingRef.current = false;
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
        "Seguimos procesando el audio; el informe aparecerá en breve (o cuando llegue la notificación automática).",
      );
    } else if (data.sync?.mode === "skipped" && data.sync?.reason === "no_conversation_id") {
      setFinishNote(
        "No se registró el id de conversación; el evaluador puede importarla manualmente desde el apartado de soporte del panel.",
      );
    }
    setStep("done");
  }

  if (!meta) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#070712] text-white">
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
      <div className="flex min-h-screen flex-col items-center justify-center bg-[#070712] px-6 text-center text-white">
        <div className="max-w-md rounded-3xl border border-white/10 bg-white/[0.06] px-8 py-10 backdrop-blur-xl">
          <Mic2 className="mx-auto mb-4 h-12 w-12 text-violet-300" />
          <p className="text-lg font-medium leading-snug">{copy}</p>
        </div>
      </div>
    );
  }

  const shell = (
    <header className="relative z-20 flex items-center justify-between border-b border-white/10 px-5 py-4 backdrop-blur-md md:px-10">
      <EvaliaLogo href={null} height={36} onDark />
      <span className="inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/5 px-4 py-2 text-[11px] font-bold uppercase tracking-widest text-slate-200">
        <Globe className="h-3.5 w-3.5 text-violet-300" />
        English interview
      </span>
    </header>
  );

  if (step === "welcome") {
    return (
      <div className="relative min-h-screen overflow-hidden bg-[#070712] text-white">
        <div
          className="pointer-events-none absolute inset-0 z-0"
          style={{
            background:
              "radial-gradient(ellipse 70% 50% at 20% 80%, rgba(124,58,237,0.25), transparent 55%), radial-gradient(ellipse 50% 40% at 90% 20%, rgba(99,102,241,0.15), transparent 50%)",
          }}
        />
        {shell}
        <main className="relative z-10 mx-auto grid min-h-[calc(100vh-73px)] max-w-[1400px] lg:grid-cols-2">
          <div className="relative min-h-[420px] lg:min-h-[calc(100vh-73px)]">
            <Image
              src="/virtual-interviewer.png"
              alt="Entrevistadora virtual"
              fill
              className="object-cover object-[center_15%]"
              priority
              sizes="(max-width: 1024px) 100vw, 50vw"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-[#070712] via-transparent to-[#070712]/40 lg:bg-gradient-to-r lg:from-transparent lg:via-transparent lg:to-[#070712]/90" />
            <div className="pointer-events-none absolute bottom-24 left-0 right-0 flex justify-center opacity-60 lg:bottom-32">
              <svg width="280" height="40" viewBox="0 0 280 40" className="text-violet-400/80">
                {[...Array(32)].map((_, i) => {
                  const h = 6 + ((i * 7) % 18);
                  return <rect key={i} x={4 + i * 8.5} y={32 - h} width="3" height={h} rx="1.5" fill="currentColor" />;
                })}
              </svg>
            </div>
            <div className="absolute bottom-6 left-5 right-5 md:left-8 md:right-8 lg:bottom-10">
              <div className="flex items-center justify-between gap-3 rounded-2xl border border-white/15 bg-black/35 px-4 py-3 shadow-xl backdrop-blur-xl">
                <div className="flex min-w-0 items-center gap-3">
                  <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-violet-600/90 text-white">
                    <Activity className="h-5 w-5" />
                  </span>
                  <div className="min-w-0">
                    <p className="truncate font-bold text-white">Isabella</p>
                    <p className="truncate text-xs text-slate-300">Entrevistadora virtual</p>
                  </div>
                </div>
                <span className="flex shrink-0 items-center gap-2 rounded-full bg-emerald-500/15 px-3 py-1 text-[11px] font-bold uppercase tracking-wide text-emerald-300 ring-1 ring-emerald-400/30">
                  <span className="h-2 w-2 animate-pulse rounded-full bg-emerald-400" />
                  Online
                </span>
              </div>
            </div>
          </div>

          <div className="flex flex-col justify-center px-5 py-10 md:px-10 lg:py-16 lg:pl-4 lg:pr-12">
            <div className="relative overflow-hidden rounded-3xl border border-white/10 bg-white/[0.07] p-6 shadow-2xl shadow-black/40 backdrop-blur-2xl md:p-8">
              <div
                className="pointer-events-none absolute -right-16 top-1/2 h-48 w-48 -translate-y-1/2 rounded-full bg-violet-600/20 blur-3xl"
                aria-hidden
              />
              <div className="relative">
                <p className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-3 py-1 text-[10px] font-bold uppercase tracking-[0.2em] text-violet-200">
                  <span className="h-1.5 w-1.5 rounded-full bg-amber-400" />
                  Entrevista en curso
                </p>
                <h1 className="mt-5 text-3xl font-bold tracking-tight md:text-4xl">
                  Hola, <span className="text-violet-400">{greeting}</span>{" "}
                  <span className="font-normal text-white">👋</span>
                </h1>
                <p className="mt-4 text-sm leading-relaxed text-slate-300 md:text-base">
                  Soy tu entrevistadora virtual. Haremos algunas preguntas para evaluar tu nivel de inglés en una
                  conversación breve, en el contexto del rol:{" "}
                  <span className="font-semibold text-violet-300">{meta.jobTitle}</span>.
                </p>

                <div className="mt-8 grid grid-cols-2 gap-3">
                  <InfoTile
                    icon={<Clock className="h-4 w-4 text-violet-300" />}
                    label="Duración estimada"
                    value={`${meta.durationMinutes} minutos`}
                  />
                  <InfoTile icon={<MessageCircle className="h-4 w-4 text-violet-300" />} label="Formato" value="Conversación" />
                  <InfoTile icon={<Activity className="h-4 w-4 text-violet-300" />} label="Idioma" value="Inglés" />
                  <InfoTile
                    icon={<Shield className="h-4 w-4 text-violet-300" />}
                    label="Privacidad"
                    value="Tus datos están protegidos"
                  />
                </div>

                <div className="relative mt-8 overflow-hidden rounded-2xl border border-violet-500/20 bg-violet-950/30 p-5">
                  <div className="pointer-events-none absolute inset-0 opacity-30" aria-hidden>
                    <svg className="h-full w-full text-violet-500" preserveAspectRatio="none" viewBox="0 0 400 80">
                      <path
                        d="M0,40 Q50,10 100,40 T200,40 T300,40 T400,40"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="1.5"
                        opacity="0.5"
                      />
                    </svg>
                  </div>
                  <p className="relative text-sm font-bold text-white">Recomendaciones</p>
                  <ul className="relative mt-3 space-y-2.5 text-sm text-slate-200">
                    {[
                      "Buscá un lugar tranquilo",
                      "Usá auriculares si es posible",
                      "Hablá con naturalidad",
                      "No cierres esta ventana durante la entrevista",
                    ].map((t) => (
                      <li key={t} className="flex items-start gap-2">
                        <span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-violet-600/80 text-white">
                          <Check className="h-3 w-3" strokeWidth={3} />
                        </span>
                        {t}
                      </li>
                    ))}
                  </ul>
                </div>

                {err ? (
                  <p className="mt-4 rounded-xl border border-red-400/30 bg-red-500/10 px-4 py-3 text-sm text-red-200">
                    {err}
                  </p>
                ) : null}

                <div className="relative mt-8 flex flex-col gap-3 sm:flex-row sm:flex-wrap">
                  <Button
                    type="button"
                    variant="outline"
                    className="border-white/25 bg-transparent font-semibold text-white hover:bg-white/10"
                    onClick={() => void checkMic()}
                    disabled={micChecking}
                  >
                    <Mic className="h-4 w-4" />
                    {micChecking ? "Probando…" : micReady ? "Micrófono listo ✓" : "Probar micrófono"}
                  </Button>
                  <Button
                    type="button"
                    className="bg-violet-600 font-semibold text-white shadow-lg shadow-violet-900/40 hover:bg-violet-500 disabled:opacity-40"
                    onClick={() => void beginInterview()}
                    disabled={!micReady}
                  >
                    Comenzar entrevista
                  </Button>
                </div>
              </div>
            </div>

            <p className="mx-auto mt-8 flex max-w-lg items-center justify-center gap-2 text-center text-xs text-slate-500">
              <Shield className="h-4 w-4 shrink-0 text-violet-400/80" />
              Tu entrevista está siendo grabada de forma segura
            </p>
          </div>
        </main>
      </div>
    );
  }

  if (step === "room") {
    const voiceActive = status === "connected" && !isMuted;
    return (
      <div className="relative min-h-screen overflow-hidden bg-[#070712] text-white">
        <div
          className="pointer-events-none absolute inset-0 z-0"
          style={{
            background:
              "radial-gradient(ellipse 70% 50% at 15% 85%, rgba(124,58,237,0.22), transparent 55%), radial-gradient(ellipse 50% 40% at 95% 15%, rgba(99,102,241,0.14), transparent 50%)",
          }}
        />
        {shell}
        <main className="relative z-10 mx-auto grid min-h-[calc(100vh-73px)] max-w-[1400px] lg:grid-cols-3">
          <div className="flex min-h-[380px] flex-col lg:min-h-[calc(100vh-73px)]">
            <div className="relative min-h-[280px] flex-1 lg:min-h-0">
              <Image
                src="/virtual-interviewer.png"
                alt="Entrevistadora virtual"
                fill
                className="object-cover object-[center_15%]"
                sizes="(max-width: 1024px) 100vw, 33vw"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-[#070712] via-[#070712]/20 to-transparent lg:bg-gradient-to-r lg:from-transparent lg:via-[#070712]/25 lg:to-[#070712]/85" />
              <div className="pointer-events-none absolute bottom-20 left-0 right-0 flex justify-center opacity-50 lg:bottom-28">
                <svg width="240" height="36" viewBox="0 0 240 36" className="text-violet-400/70">
                  {[...Array(28)].map((_, i) => {
                    const h = 5 + ((i * 5) % 16);
                    return <rect key={i} x={3 + i * 8.2} y={34 - h} width="2.8" height={h} rx="1.4" fill="currentColor" />;
                  })}
                </svg>
              </div>
              <div className="absolute bottom-3 left-4 right-4 md:left-6 md:right-6">
                <div className="flex items-center justify-between gap-3 rounded-2xl border border-white/15 bg-black/40 px-4 py-3 shadow-xl backdrop-blur-xl">
                  <div className="flex min-w-0 items-center gap-3">
                    <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-violet-600/95 text-white">
                      <Activity className="h-5 w-5" />
                    </span>
                    <div className="min-w-0">
                      <p className="truncate font-bold text-white">Isabella</p>
                      <p className="truncate text-xs text-slate-300">Entrevistadora virtual</p>
                    </div>
                  </div>
                  <span className="flex shrink-0 items-center gap-2 rounded-full bg-emerald-500/15 px-3 py-1 text-[11px] font-bold uppercase tracking-wide text-emerald-300 ring-1 ring-emerald-400/30">
                    <span className="h-2 w-2 animate-pulse rounded-full bg-emerald-400" />
                    Online
                  </span>
                </div>
              </div>
            </div>
            <RoomConnectionStrip connected={status === "connected"} latencyLabel={latencyLabel} />
          </div>

          <div className="flex flex-col px-5 py-8 lg:col-span-2 lg:px-10 lg:py-10">
            <div className="flex min-h-0 flex-1 flex-col rounded-3xl border border-white/10 bg-white/[0.06] p-6 shadow-2xl backdrop-blur-xl md:p-8">
              <p className="inline-flex w-fit items-center gap-2 rounded-full border border-violet-500/30 bg-violet-600/20 px-3 py-1 text-[10px] font-bold uppercase tracking-[0.2em] text-violet-100">
                <span className="h-1.5 w-1.5 rounded-full bg-violet-300" />
                Entrevista en curso
              </p>
              <h1 className="mt-5 text-3xl font-bold tracking-tight md:text-4xl">
                Hola, <span className="text-violet-400">{greeting}</span>{" "}
                <span className="font-normal text-white">👋</span>
              </h1>
              <p className="mt-4 text-sm leading-relaxed text-slate-300 md:text-base">
                Continuamos con la entrevista de inglés. Respondé con claridad y naturalidad. Estoy acá para ayudarte.
              </p>

              <div className="mt-8 flex flex-wrap gap-8 border-b border-white/10 pb-8">
                <RoomMeta icon={<Clock className="h-5 w-5 text-violet-400" />} label="Duración estimada" value={`${meta.durationMinutes} minutos`} />
                <RoomMeta icon={<MessageCircle className="h-5 w-5 text-violet-400" />} label="Formato" value="Conversación" />
                <RoomMeta icon={<Activity className="h-5 w-5 text-violet-400" />} label="Idioma" value="Inglés" />
              </div>

              <div className="mt-8 flex-1">
                <VoiceVisualizer active={voiceActive} />
              </div>

              <div className="mt-8 flex items-start gap-3 rounded-2xl border border-white/10 bg-black/25 px-4 py-3">
                <Sparkles className="mt-0.5 h-5 w-5 shrink-0 text-violet-400" />
                <p className="text-sm leading-relaxed text-slate-300">
                  <span className="font-semibold text-violet-200">Consejo:</span> hablá con naturalidad y tomate tu
                  tiempo para pensar.
                </p>
              </div>

              {disconnectNote ? (
                <div className="mt-6 flex flex-col gap-3 rounded-2xl border border-amber-400/30 bg-amber-500/10 px-4 py-3 text-sm text-amber-100">
                  <p className="leading-relaxed">{disconnectNote}</p>
                  <div className="flex flex-wrap gap-2">
                    <Button
                      type="button"
                      variant="outline"
                      className="border-amber-300/60 bg-transparent font-semibold text-amber-100 hover:bg-amber-500/10"
                      onClick={() => {
                        setDisconnectNote(null);
                        setStep("welcome");
                      }}
                    >
                      Reintentar
                    </Button>
                  </div>
                </div>
              ) : null}

              <div className="mt-8 flex flex-col gap-3 sm:flex-row sm:flex-wrap">
                <Button
                  type="button"
                  variant="outline"
                  className="border-white/25 bg-transparent font-semibold text-white hover:bg-white/10"
                  onClick={() => setMuted(!isMuted)}
                >
                  <Mic className="h-4 w-4" />
                  {isMuted ? "Activar audio" : "Silenciar"}
                </Button>
                <Button
                  type="button"
                  className="bg-red-600 font-semibold text-white shadow-lg shadow-red-900/30 hover:bg-red-500"
                  onClick={() => void finish()}
                >
                  <PhoneOff className="h-4 w-4" />
                  Finalizar entrevista
                </Button>
              </div>

              <p className="mt-4 text-center text-[11px] text-slate-500 sm:text-left">
                Estado de sesión: <span className="font-medium text-slate-400">{status}</span>
                {mode ? <span className="text-slate-600"> · {mode}</span> : null}
              </p>
            </div>

            <p className="mx-auto mt-6 flex max-w-2xl items-center justify-center gap-2 px-2 text-center text-xs text-slate-500">
              <Lock className="h-3.5 w-3.5 shrink-0 text-slate-500" />
              La entrevista es grabada de forma segura y confidencial
            </p>
          </div>
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#070712] text-white">
      {shell}
      <main className="relative z-10 mx-auto max-w-lg px-5 py-16">
        <Card className="rounded-3xl border border-white/10 bg-white/[0.06] text-white shadow-2xl backdrop-blur-xl">
          <CardHeader>
            <CardTitle className="text-xl font-bold text-white">Entrevista finalizada</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 text-sm text-slate-200">
            <p>Gracias por completar la entrevista. El equipo de evaluación revisará tus resultados.</p>
            {finishNote ? (
              <p className="rounded-xl border border-white/10 bg-white/10 px-4 py-3 text-xs leading-relaxed text-slate-100">
                {finishNote}
              </p>
            ) : null}
          </CardContent>
        </Card>
      </main>
    </div>
  );
}

function RoomConnectionStrip({ connected, latencyLabel }: { connected: boolean; latencyLabel: string }) {
  return (
    <div className="grid gap-3 border-t border-white/10 bg-black/50 p-4 backdrop-blur-lg sm:grid-cols-3">
      <div className="flex gap-3 rounded-xl bg-white/5 px-3 py-2.5 ring-1 ring-white/10">
        <Shield className="mt-0.5 h-4 w-4 shrink-0 text-violet-400" />
        <div className="min-w-0">
          <p className="text-[10px] font-bold uppercase tracking-wide text-slate-500">Conexión segura</p>
          <p className="text-xs font-medium leading-snug text-slate-200">Cifrada de extremo a extremo</p>
        </div>
      </div>
      <div className="flex gap-3 rounded-xl bg-white/5 px-3 py-2.5 ring-1 ring-white/10">
        <Wifi className="mt-0.5 h-4 w-4 shrink-0 text-violet-400" />
        <div className="min-w-0">
          <p className="text-[10px] font-bold uppercase tracking-wide text-slate-500">Calidad de conexión</p>
          <p className={`text-xs font-semibold ${connected ? "text-emerald-400" : "text-amber-300"}`}>
            {connected ? "Excelente" : "Conectando…"}
          </p>
        </div>
      </div>
      <div className="flex gap-3 rounded-xl bg-white/5 px-3 py-2.5 ring-1 ring-white/10">
        <Clock className="mt-0.5 h-4 w-4 shrink-0 text-violet-400" />
        <div className="min-w-0">
          <p className="text-[10px] font-bold uppercase tracking-wide text-slate-500">Latencia</p>
          <p className="text-xs font-semibold tabular-nums text-slate-200">{latencyLabel}</p>
        </div>
      </div>
    </div>
  );
}

function RoomMeta({ icon, label, value }: { icon: ReactNode; label: string; value: string }) {
  return (
    <div className="flex min-w-[140px] gap-3">
      <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-white/5 ring-1 ring-white/10">
        {icon}
      </span>
      <div>
        <p className="text-[10px] font-bold uppercase tracking-wide text-slate-500">{label}</p>
        <p className="mt-1 text-sm font-semibold text-violet-200">{value}</p>
      </div>
    </div>
  );
}

function VoiceVisualizer({ active }: { active: boolean }) {
  const n = 42;
  return (
    <div className="relative flex min-h-[220px] items-center justify-center overflow-hidden rounded-2xl border border-violet-500/25 bg-gradient-to-b from-violet-950/55 to-[#08051a] px-3 py-12 sm:px-6">
      <div className={`flex h-40 max-w-full items-end justify-center gap-[3px] overflow-hidden sm:gap-1 ${active ? "" : "opacity-45"}`}>
        {[...Array(n)].map((_, i) => (
          <div
            key={i}
            className="evalia-voice-bar"
            style={{
              animationDelay: `${i * 42}ms`,
              animationPlayState: active ? "running" : "paused",
            }}
          />
        ))}
      </div>
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_50%_50%,rgba(139,92,246,0.12),transparent_60%)]" />
      <div
        className={`evalia-orb absolute flex h-28 w-28 items-center justify-center rounded-full bg-gradient-to-br from-violet-500 via-violet-600 to-indigo-700 shadow-[0_0_48px_rgba(167,139,250,0.5)] ring-4 ring-violet-400/20 sm:h-32 sm:w-32 ${active ? "" : "opacity-70"}`}
      >
        <Mic2 className="h-11 w-11 text-white sm:h-12 sm:w-12" />
      </div>
    </div>
  );
}

function InfoTile({ icon, label, value }: { icon: ReactNode; label: string; value: string }) {
  return (
    <div className="rounded-xl border border-white/10 bg-black/20 px-3 py-3 md:px-4">
      <div className="flex items-center gap-2 text-violet-200/90">{icon}</div>
      <p className="mt-2 text-[10px] font-bold uppercase tracking-wide text-slate-500">{label}</p>
      <p className="mt-1 text-sm font-semibold text-white">{value}</p>
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
