"use client";

import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import Link from "next/link";
import { InterviewAudience } from "@prisma/client";

const selectClass =
  "flex h-10 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm text-slate-900 shadow-sm transition-shadow focus:border-violet-300 focus:outline-none focus:ring-2 focus:ring-violet-500/25";

type Profile = { id: string; name: string; key: string };
type Agent = { id: string; name: string; email: string | null };

export default function NewInterviewPage() {
  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [agents, setAgents] = useState<Agent[]>([]);
  const [mode, setMode] = useState<"external" | "agent">("external");
  const [loading, setLoading] = useState(false);
  const [publicUrl, setPublicUrl] = useState<string | null>(null);
  const [createdInterviewId, setCreatedInterviewId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const [form, setForm] = useState({
    candidateName: "",
    candidateEmail: "",
    candidatePhone: "",
    jobTitle: "",
    targetLevel: "" as "" | "A1" | "A2" | "B1" | "B2" | "C1" | "C2",
    evaluationProfileId: "",
    durationMinutes: 8,
    internalNotes: "",
    agentUserId: "",
  });

  useEffect(() => {
    void fetch("/api/evaluation-profiles")
      .then((r) => r.json())
      .then(setProfiles)
      .catch(() => setProfiles([]));
    void fetch("/api/users/agents")
      .then((r) => r.json())
      .then(setAgents)
      .catch(() => setAgents([]));
  }, []);

  useEffect(() => {
    if (!form.agentUserId) return;
    const a = agents.find((x) => x.id === form.agentUserId);
    if (a) setForm((f) => ({ ...f, candidateName: a.name }));
  }, [form.agentUserId, agents]);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setPublicUrl(null);
    setCreatedInterviewId(null);
    const body =
      mode === "agent"
        ? {
            audience: InterviewAudience.INTERNAL_AGENT,
            agentUserId: form.agentUserId,
            candidateName: form.candidateName,
            jobTitle: form.jobTitle,
            evaluationProfileId: form.evaluationProfileId,
            durationMinutes: form.durationMinutes,
            internalNotes: form.internalNotes || null,
            targetLevel: form.targetLevel || null,
          }
        : {
            audience: InterviewAudience.EXTERNAL_CANDIDATE,
            candidateName: form.candidateName,
            candidateEmail: form.candidateEmail || null,
            candidatePhone: form.candidatePhone || null,
            jobTitle: form.jobTitle,
            evaluationProfileId: form.evaluationProfileId,
            durationMinutes: form.durationMinutes,
            internalNotes: form.internalNotes || null,
            targetLevel: form.targetLevel || null,
          };

    const res = await fetch("/api/interviews", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    const data = await res.json().catch(() => ({}));
    setLoading(false);
    if (!res.ok) {
      setError(data.error ?? "No se pudo crear la entrevista");
      return;
    }
    setPublicUrl(data.publicUrl as string);
    setCreatedInterviewId(data.interview?.id ?? null);
  }

  async function copyLink() {
    if (!publicUrl) return;
    await navigator.clipboard.writeText(publicUrl);
  }

  return (
    <div className="mx-auto max-w-2xl space-y-10">
      <div>
        <h1 className="text-3xl font-bold tracking-tight text-slate-900">Nueva entrevista</h1>
        <p className="mt-2 text-slate-600">Genera un enlace único para el candidato o para un agente interno.</p>
      </div>
      <form
        className="space-y-8 rounded-3xl border border-slate-200/90 bg-white p-8 shadow-xl shadow-slate-200/50 ring-1 ring-slate-100"
        onSubmit={onSubmit}
      >
        <div className="flex rounded-2xl bg-slate-100/90 p-1.5">
          <button
            type="button"
            onClick={() => setMode("external")}
            className={`flex-1 rounded-xl px-4 py-2.5 text-sm font-semibold transition-all ${
              mode === "external" ? "bg-white text-violet-900 shadow-sm" : "text-slate-600 hover:text-slate-900"
            }`}
          >
            Candidato externo
          </button>
          <button
            type="button"
            onClick={() => setMode("agent")}
            className={`flex-1 rounded-xl px-4 py-2.5 text-sm font-semibold transition-all ${
              mode === "agent" ? "bg-white text-violet-900 shadow-sm" : "text-slate-600 hover:text-slate-900"
            }`}
          >
            Agente interno
          </button>
        </div>

        {mode === "agent" ? (
          <div className="space-y-2">
            <Label>Agente</Label>
            <select
              className={selectClass}
              value={form.agentUserId}
              onChange={(e) => setForm((f) => ({ ...f, agentUserId: e.target.value }))}
              required
            >
              <option value="">Selecciona…</option>
              {agents.map((a) => (
                <option key={a.id} value={a.id}>
                  {a.name} ({a.email})
                </option>
              ))}
            </select>
          </div>
        ) : null}

        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-2 sm:col-span-2">
            <Label>{mode === "agent" ? "Nombre para mostrar" : "Nombre del candidato"}</Label>
            <Input
              value={form.candidateName}
              onChange={(e) => setForm((f) => ({ ...f, candidateName: e.target.value }))}
              required
            />
          </div>
          {mode === "external" ? (
            <>
              <div className="space-y-2">
                <Label>Email</Label>
                <Input
                  type="email"
                  value={form.candidateEmail}
                  onChange={(e) => setForm((f) => ({ ...f, candidateEmail: e.target.value }))}
                />
              </div>
              <div className="space-y-2">
                <Label>Teléfono (opcional)</Label>
                <Input
                  value={form.candidatePhone}
                  onChange={(e) => setForm((f) => ({ ...f, candidatePhone: e.target.value }))}
                />
              </div>
            </>
          ) : null}
          <div className="space-y-2 sm:col-span-2">
            <Label>Cargo / rol evaluado</Label>
            <Input value={form.jobTitle} onChange={(e) => setForm((f) => ({ ...f, jobTitle: e.target.value }))} required />
          </div>
          <div className="space-y-2">
            <Label>Nivel esperado</Label>
            <select
              className={selectClass}
              value={form.targetLevel}
              onChange={(e) => setForm((f) => ({ ...f, targetLevel: e.target.value as typeof form.targetLevel }))}
            >
              <option value="">—</option>
              {(["A1", "A2", "B1", "B2", "C1", "C2"] as const).map((l) => (
                <option key={l} value={l}>
                  {l}
                </option>
              ))}
            </select>
          </div>
          <div className="space-y-2">
            <Label>Duración estimada (min)</Label>
            <Input
              type="number"
              min={3}
              max={60}
              value={form.durationMinutes}
              onChange={(e) => setForm((f) => ({ ...f, durationMinutes: Number(e.target.value) }))}
            />
          </div>
          <div className="space-y-2 sm:col-span-2">
            <Label>Perfil de evaluación</Label>
            <select
              className={selectClass}
              value={form.evaluationProfileId}
              onChange={(e) => setForm((f) => ({ ...f, evaluationProfileId: e.target.value }))}
              required
            >
              <option value="">Selecciona…</option>
              {profiles.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name}
                </option>
              ))}
            </select>
          </div>
          <div className="space-y-2 sm:col-span-2">
            <Label>Notas internas</Label>
            <Input value={form.internalNotes} onChange={(e) => setForm((f) => ({ ...f, internalNotes: e.target.value }))} />
          </div>
        </div>

        {error ? (
          <p className="rounded-xl border border-red-100 bg-red-50 px-4 py-3 text-sm text-red-800">{error}</p>
        ) : null}

        <div className="flex flex-wrap items-center gap-4 border-t border-slate-100 pt-6">
          <Button type="submit" className="min-w-[160px] font-semibold" disabled={loading}>
            {loading ? "Creando…" : "Crear entrevista"}
          </Button>
          <Link href="/dashboard" className="text-sm font-medium text-slate-500 underline-offset-2 hover:text-violet-700 hover:underline">
            Volver al panel
          </Link>
        </div>
      </form>

      {publicUrl ? (
        <div className="rounded-3xl border border-emerald-200/80 bg-gradient-to-br from-emerald-50 to-teal-50/80 p-6 shadow-lg shadow-emerald-900/5">
          <p className="text-lg font-bold text-emerald-950">Link generado</p>
          <p className="mt-3 break-all rounded-xl bg-white/80 px-4 py-3 font-mono text-xs text-emerald-900 shadow-inner">
            {publicUrl}
          </p>
          <div className="mt-5 flex flex-wrap gap-2">
            <Button type="button" variant="secondary" size="sm" className="font-semibold" onClick={() => void copyLink()}>
              Copiar link
            </Button>
            <Button type="button" variant="outline" size="sm" className="font-semibold" asChild>
              <a href={publicUrl} target="_blank" rel="noreferrer">
                Abrir link
              </a>
            </Button>
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="font-semibold"
              disabled={!createdInterviewId}
              onClick={async () => {
                if (!createdInterviewId) return;
                await fetch(`/api/interviews/${createdInterviewId}/mark-sent`, { method: "POST" });
              }}
            >
              Marcar enviado
            </Button>
          </div>
        </div>
      ) : null}
    </div>
  );
}
