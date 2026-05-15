"use client";

import type { LucideIcon } from "lucide-react";
import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import Link from "next/link";
import { InterviewAudience } from "@prisma/client";
import {
  Briefcase,
  CirclePlus,
  Clock,
  ExternalLink,
  Eye,
  FileText,
  Mail,
  Phone,
  Shield,
  Signal,
  Sparkles,
  User,
  UserPlus,
  Zap,
} from "lucide-react";

const selectClass = cn(
  "flex h-10 w-full rounded-xl border border-slate-200 bg-white pl-10 pr-3 text-sm text-slate-900 shadow-sm transition-shadow",
  "focus:border-blue-400 focus:outline-none focus:ring-2 focus:ring-blue-500/20",
);

const inputIconClass = cn(
  "h-10 w-full rounded-xl border border-slate-200 bg-white pl-10 pr-3 text-sm text-slate-900 shadow-sm transition-shadow",
  "placeholder:text-slate-400 focus-visible:border-blue-400 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500/20",
);

const textareaClass = cn(
  "min-h-[120px] w-full resize-y rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-900 shadow-sm",
  "placeholder:text-slate-400 focus-visible:border-blue-400 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500/20",
);

type Profile = { id: string; name: string; key: string };
type Agent = { id: string; name: string; email: string | null };

function FieldIcon({
  label,
  icon: Icon,
  children,
  iconTop,
}: {
  label: string;
  icon: LucideIcon;
  children: React.ReactNode;
  iconTop?: boolean;
}) {
  return (
    <div className="space-y-2">
      <Label className="text-sm font-medium text-slate-700">{label}</Label>
      <div className="relative">
        <Icon
          className={cn(
            "pointer-events-none absolute left-3 h-4 w-4 text-slate-400",
            iconTop ? "top-3" : "top-1/2 -translate-y-1/2",
          )}
          aria-hidden
        />
        {children}
      </div>
    </div>
  );
}

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
            internalNotes: form.internalNotes.trim() || null,
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
            internalNotes: form.internalNotes.trim() || null,
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
    <div className="mx-auto max-w-6xl pb-10">
      <div className="grid gap-8 lg:grid-cols-[minmax(0,1fr)_340px]">
        <div>
          <div className="mb-6 flex gap-4">
            <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-blue-50 text-blue-600 ring-1 ring-blue-100">
              <UserPlus className="h-6 w-6" strokeWidth={2} />
            </div>
            <div>
              <h1 className="text-2xl font-bold tracking-tight text-slate-900">Nueva entrevista</h1>
              <p className="mt-1 text-sm text-slate-600">
                Generá un enlace único para el candidato o para un agente interno.
              </p>
            </div>
          </div>

          <form
            className="space-y-6 rounded-xl border border-slate-200/90 bg-white p-6 shadow-sm md:p-8"
            onSubmit={onSubmit}
          >
            <div className="flex gap-0 border-b border-slate-200">
              <button
                type="button"
                onClick={() => setMode("external")}
                className={cn(
                  "-mb-px flex-1 border-b-2 px-1 py-3 text-sm font-semibold transition-colors",
                  mode === "external"
                    ? "border-blue-600 text-blue-600"
                    : "border-transparent text-slate-500 hover:text-slate-800",
                )}
              >
                Candidato externo
              </button>
              <button
                type="button"
                onClick={() => setMode("agent")}
                className={cn(
                  "-mb-px flex-1 border-b-2 px-1 py-3 text-sm font-semibold transition-colors",
                  mode === "agent"
                    ? "border-blue-600 text-blue-600"
                    : "border-transparent text-slate-500 hover:text-slate-800",
                )}
              >
                Agente interno
              </button>
            </div>

            {mode === "agent" ? (
              <FieldIcon label="Agente interno" icon={User}>
                <select
                  className={selectClass}
                  value={form.agentUserId}
                  onChange={(e) => setForm((f) => ({ ...f, agentUserId: e.target.value }))}
                  required
                >
                  <option value="">Seleccioná un agente…</option>
                  {agents.map((a) => (
                    <option key={a.id} value={a.id}>
                      {a.name} {a.email ? `(${a.email})` : ""}
                    </option>
                  ))}
                </select>
              </FieldIcon>
            ) : null}

            <div className="grid gap-5 sm:grid-cols-2">
              <div className="sm:col-span-2">
                <FieldIcon label={mode === "agent" ? "Nombre para mostrar" : "Nombre del candidato"} icon={User}>
                  <Input
                    className={inputIconClass}
                    value={form.candidateName}
                    onChange={(e) => setForm((f) => ({ ...f, candidateName: e.target.value }))}
                    required
                    placeholder="Ej. María González"
                  />
                </FieldIcon>
              </div>

              {mode === "external" ? (
                <>
                  <FieldIcon label="Email" icon={Mail}>
                    <Input
                      className={inputIconClass}
                      type="email"
                      value={form.candidateEmail}
                      onChange={(e) => setForm((f) => ({ ...f, candidateEmail: e.target.value }))}
                      placeholder="correo@empresa.com"
                    />
                  </FieldIcon>
                  <FieldIcon label="Teléfono (opcional)" icon={Phone}>
                    <Input
                      className={inputIconClass}
                      value={form.candidatePhone}
                      onChange={(e) => setForm((f) => ({ ...f, candidatePhone: e.target.value }))}
                      placeholder="+54 …"
                    />
                  </FieldIcon>
                </>
              ) : null}

              <div className="sm:col-span-2">
                <FieldIcon label="Cargo / rol evaluado" icon={Briefcase}>
                  <Input
                    className={inputIconClass}
                    value={form.jobTitle}
                    onChange={(e) => setForm((f) => ({ ...f, jobTitle: e.target.value }))}
                    required
                    placeholder="Ej. Customer Success"
                  />
                </FieldIcon>
              </div>

              <FieldIcon label="Nivel esperado" icon={Signal}>
                <select
                  className={selectClass}
                  value={form.targetLevel}
                  onChange={(e) => setForm((f) => ({ ...f, targetLevel: e.target.value as typeof form.targetLevel }))}
                >
                  <option value="">Sin indicar</option>
                  {(["A1", "A2", "B1", "B2", "C1", "C2"] as const).map((l) => (
                    <option key={l} value={l}>
                      {l}
                    </option>
                  ))}
                </select>
              </FieldIcon>

              <FieldIcon label="Duración estimada (min)" icon={Clock}>
                <Input
                  className={inputIconClass}
                  type="number"
                  min={3}
                  max={60}
                  value={form.durationMinutes}
                  onChange={(e) => setForm((f) => ({ ...f, durationMinutes: Number(e.target.value) }))}
                />
              </FieldIcon>

              <div className="sm:col-span-2">
                <FieldIcon label="Perfil de evaluación" icon={FileText}>
                  <select
                    className={selectClass}
                    value={form.evaluationProfileId}
                    onChange={(e) => setForm((f) => ({ ...f, evaluationProfileId: e.target.value }))}
                    required
                  >
                    <option value="">Seleccioná un perfil…</option>
                    {profiles.map((p) => (
                      <option key={p.id} value={p.id}>
                        {p.name}
                      </option>
                    ))}
                  </select>
                </FieldIcon>
              </div>

              <div className="sm:col-span-2 space-y-2">
                <Label className="text-sm font-medium text-slate-700">Notas internas</Label>
                <textarea
                  className={textareaClass}
                  maxLength={500}
                  value={form.internalNotes}
                  onChange={(e) => setForm((f) => ({ ...f, internalNotes: e.target.value.slice(0, 500) }))}
                  placeholder="Contexto para el equipo evaluador (no visible para el candidato)."
                  rows={4}
                />
                <p className="text-right text-xs text-slate-400">{form.internalNotes.length}/500</p>
              </div>
            </div>

            {error ? (
              <p className="rounded-xl border border-red-100 bg-red-50 px-4 py-3 text-sm text-red-800">{error}</p>
            ) : null}

            <div className="flex flex-wrap items-center gap-4 border-t border-slate-100 pt-6">
              <button
                type="submit"
                disabled={loading}
                className="inline-flex h-11 min-w-[200px] items-center justify-center gap-2 rounded-xl bg-blue-600 px-5 text-sm font-semibold text-white shadow-md shadow-blue-600/20 transition hover:bg-blue-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50"
              >
                <CirclePlus className="h-4 w-4" />
                {loading ? "Creando…" : "Crear entrevista"}
              </button>
              <Link
                href="/dashboard"
                className="text-sm font-semibold text-slate-600 underline-offset-2 hover:text-blue-600 hover:underline"
              >
                Volver al panel
              </Link>
            </div>
          </form>
        </div>

        <aside className="space-y-6 lg:sticky lg:top-24 lg:self-start">
          <Card className="border-slate-200/90 shadow-sm">
            <CardHeader className="border-b border-slate-100 pb-4">
              <CardTitle className="flex items-center gap-2 text-base font-semibold text-slate-900">
                <FileText className="h-4 w-4 text-blue-600" />
                Resumen de la evaluación
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3 pt-4">
              <SummaryRow
                icon={Mail}
                title="El candidato recibirá por email"
                desc="Un enlace seguro para completar la conversación cuando le convenga."
              />
              <SummaryRow
                icon={Sparkles}
                title="Evaluación adaptativa"
                desc="La entrevista se ajusta al perfil y al rol que definiste."
              />
              <SummaryRow
                icon={Zap}
                title="Resultados instantáneos"
                desc="Al finalizar, podés ver el informe y el score en el panel."
              />
              <SummaryRow
                icon={Shield}
                title="Seguro y confidencial"
                desc="Cada sesión usa un token único y caducidad configurable."
              />
            </CardContent>
          </Card>

          <div className="rounded-xl border border-sky-100 bg-sky-50/80 p-4 shadow-sm">
            <p className="text-sm font-semibold text-slate-900">¿Qué recibirá el candidato?</p>
            <p className="mt-2 flex items-start gap-2 text-sm leading-relaxed text-slate-600">
              <Mail className="mt-0.5 h-4 w-4 shrink-0 text-blue-600" />
              Un correo con el enlace a la sala de voz (si cargás email) o el link para compartir por el canal que prefieras.
            </p>
            <button
              type="button"
              className="mt-3 inline-flex items-center gap-1.5 text-sm font-semibold text-blue-600 hover:text-blue-700"
              onClick={() => {
                window.alert("Próximamente: vista previa del correo de invitación.");
              }}
            >
              <Eye className="h-4 w-4" />
              Ver ejemplo de email
            </button>
          </div>

          <div className="rounded-xl border border-slate-200 bg-white px-4 py-4 text-sm text-slate-600 shadow-sm">
            <p className="font-medium text-slate-800">¿Necesitás ayuda?</p>
            <Link
              href="/settings"
              className="mt-2 inline-flex items-center gap-1.5 font-semibold text-blue-600 hover:text-blue-700"
            >
              Ir al centro de ayuda
              <ExternalLink className="h-3.5 w-3.5" />
            </Link>
          </div>
        </aside>
      </div>

      {publicUrl ? (
        <div className="mt-8 rounded-xl border border-blue-100 bg-blue-50/50 p-6 shadow-sm">
          <p className="text-base font-bold text-slate-900">Enlace generado</p>
          <p className="mt-3 break-all rounded-lg border border-white bg-white px-4 py-3 font-mono text-xs text-slate-800 shadow-inner">
            {publicUrl}
          </p>
          <div className="mt-4 flex flex-wrap gap-2">
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

function SummaryRow({
  icon: Icon,
  title,
  desc,
}: {
  icon: LucideIcon;
  title: string;
  desc: string;
}) {
  return (
    <div className="flex gap-3 rounded-lg border border-slate-100 bg-slate-50/40 p-3">
      <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg border border-blue-200 bg-blue-50 text-blue-600">
        <Icon className="h-4 w-4" strokeWidth={2} />
      </span>
      <div className="min-w-0">
        <p className="text-sm font-semibold text-slate-900">{title}</p>
        <p className="mt-0.5 text-xs leading-relaxed text-slate-600">{desc}</p>
      </div>
    </div>
  );
}
