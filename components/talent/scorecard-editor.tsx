"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  SCORE_WEIGHT_TOTAL,
  slugifyCriterionKey,
  validateScorecardWeights,
  type ScorecardCriterionInput,
} from "@/lib/talent/scorecard";

type Criterion = ScorecardCriterionInput;

function emptyCriterion(index: number): Criterion {
  return {
    key: `criterio_${index + 1}`,
    label: "",
    description: "",
    weight: 0,
    type: "SCORED",
    required: true,
    evidenceRequired: false,
    scoringRule: "",
    sortOrder: index,
  };
}

export function ScorecardEditor({
  jobId,
  initialName,
  initialSourcePrompt,
  initialCriteria,
  status,
  version,
  canWrite = true,
}: {
  jobId: string;
  initialName: string;
  initialSourcePrompt?: string | null;
  initialCriteria: Criterion[];
  status: string;
  version: number;
  canWrite?: boolean;
}) {
  const router = useRouter();
  const [name, setName] = useState(initialName);
  const [sourcePrompt, setSourcePrompt] = useState(initialSourcePrompt ?? "");
  const [criteria, setCriteria] = useState<Criterion[]>(
    initialCriteria.length ? initialCriteria : [emptyCriterion(0)],
  );
  const [aiText, setAiText] = useState("");
  const [proposalReady, setProposalReady] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [info, setInfo] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const weights = useMemo(() => validateScorecardWeights(criteria), [criteria]);

  function update(index: number, patch: Partial<Criterion>) {
    setCriteria((current) =>
      current.map((c, i) => {
        if (i !== index) return c;
        const next = { ...c, ...patch };
        if (patch.label && !patch.key) next.key = slugifyCriterionKey(patch.label, index);
        if (next.type === "EXCLUDING") next.weight = 0;
        return next;
      }),
    );
    setProposalReady(false);
  }

  async function generate() {
    setBusy(true);
    setError(null);
    setInfo(null);
    const res = await fetch(`/api/jobs/${jobId}/scorecard/generate`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ freeText: aiText }),
    });
    const json = await res.json().catch(() => ({}));
    setBusy(false);
    if (!res.ok) {
      setError(json.error ?? "No se pudo generar la propuesta");
      return;
    }
    setName(json.proposal.name);
    setSourcePrompt(aiText);
    setCriteria(json.proposal.criteria.map((c: Criterion, index: number) => ({ ...c, sortOrder: index })));
    setProposalReady(true);
    setInfo("La IA propuso criterios. Revísalos y guarda el borrador antes de publicar.");
  }

  async function saveDraft() {
    setBusy(true);
    setError(null);
    setInfo(null);
    const res = await fetch(`/api/jobs/${jobId}/scorecard`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name, sourcePrompt, criteria }),
    });
    const json = await res.json().catch(() => ({}));
    setBusy(false);
    if (!res.ok) {
      setError(json.error ?? "No se pudo guardar");
      return;
    }
    setProposalReady(false);
    setInfo("Borrador guardado. Publica solo cuando los pesos y excluyentes estén correctos.");
    router.refresh();
  }

  async function publish() {
    setBusy(true);
    setError(null);
    const saved = await fetch(`/api/jobs/${jobId}/scorecard`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name, sourcePrompt, criteria }),
    });
    if (!saved.ok) {
      const json = await saved.json().catch(() => ({}));
      setBusy(false);
      setError(json.error ?? "No se pudo guardar el borrador");
      return;
    }
    const res = await fetch(`/api/jobs/${jobId}/scorecard`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "publish" }),
    });
    const json = await res.json().catch(() => ({}));
    setBusy(false);
    if (!res.ok) {
      setError(json.error ?? "No se pudo publicar");
      return;
    }
    setInfo("Scorecard publicado. Las candidaturas nuevas usarán esta versión.");
    router.refresh();
  }

  return (
    <div className="space-y-6">
      <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
        <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
          Versión {version} · {status === "PUBLISHED" ? "Publicado" : status === "ARCHIVED" ? "Histórico" : "Borrador"}
        </p>
        <div className="mt-3 space-y-2">
          <Label htmlFor="sc-name">Nombre del scorecard</Label>
          <Input id="sc-name" value={name} onChange={(e) => setName(e.target.value)} />
        </div>
      </div>

      <div className="rounded-xl border border-violet-200 bg-violet-50/40 p-5">
        <h2 className="text-base font-semibold text-slate-900">Asistente de perfil</h2>
        <p className="mt-1 text-sm text-slate-600">
          Pega una descripción libre. OpenAI propone criterios en JSON validado. Tú revisas y confirmas.
        </p>
        <textarea
          value={aiText}
          onChange={(e) => setAiText(e.target.value)}
          disabled={!canWrite}
          className="mt-3 min-h-28 w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm"
          placeholder="Ej: Buscamos un CSM bilingüe, con experiencia en SaaS B2B, que cierre renovaciones y no tenga restricciones para viajar."
        />
        <Button type="button" className="mt-3" variant="secondary" disabled={!canWrite || busy || aiText.trim().length < 20} onClick={generate}>
          Proponer criterios
        </Button>
      </div>

      <div
        className={`rounded-xl border p-4 text-sm ${
          weights.ok ? "border-emerald-200 bg-emerald-50 text-emerald-900" : "border-amber-200 bg-amber-50 text-amber-950"
        }`}
      >
        Pesos puntuables: {weights.scoredTotal}/{SCORE_WEIGHT_TOTAL}. Excluyentes: {weights.excludingCount}.
        {weights.errors.length ? (
          <ul className="mt-2 list-disc pl-5">
            {weights.errors.map((err) => (
              <li key={err}>{err}</li>
            ))}
          </ul>
        ) : (
          <p className="mt-1">Listo para publicar si revisaste cada criterio.</p>
        )}
      </div>

      <div className="space-y-4">
        {criteria.map((c, index) => (
          <div
            key={`${c.key}-${index}`}
            className={`rounded-xl border bg-white p-4 shadow-sm ${
              c.type === "EXCLUDING" ? "border-red-300 ring-1 ring-red-100" : "border-slate-200"
            }`}
          >
            <div className="mb-3 flex items-center justify-between gap-3">
              <p className="text-sm font-semibold text-slate-900">
                {c.type === "EXCLUDING" ? "Excluyente" : `Criterio ${index + 1}`}
              </p>
              <button
                type="button"
                className="text-xs text-red-600"
                onClick={() => setCriteria((current) => current.filter((_, i) => i !== index))}
              >
                Quitar
              </button>
            </div>
            <div className="grid gap-3 md:grid-cols-2">
              <div className="space-y-1.5">
                <Label>Etiqueta</Label>
                <Input value={c.label} onChange={(e) => update(index, { label: e.target.value })} />
              </div>
              <div className="space-y-1.5">
                <Label>Peso</Label>
                <Input
                  type="number"
                  min={0}
                  max={100}
                  disabled={c.type === "EXCLUDING"}
                  value={c.weight}
                  onChange={(e) => update(index, { weight: Number(e.target.value) })}
                />
              </div>
              <div className="space-y-1.5 md:col-span-2">
                <Label>Descripción</Label>
                <textarea
                  value={c.description}
                  onChange={(e) => update(index, { description: e.target.value })}
                  className="min-h-16 w-full rounded-xl border border-slate-200 px-3 py-2 text-sm"
                />
              </div>
              <div className="space-y-1.5 md:col-span-2">
                <Label>Regla de puntuación</Label>
                <textarea
                  value={c.scoringRule}
                  onChange={(e) => update(index, { scoringRule: e.target.value })}
                  className="min-h-16 w-full rounded-xl border border-slate-200 px-3 py-2 text-sm"
                />
              </div>
            </div>
            <div className="mt-3 flex flex-wrap gap-4 text-sm">
              <label className="flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={c.type === "EXCLUDING"}
                  onChange={(e) => update(index, { type: e.target.checked ? "EXCLUDING" : "SCORED" })}
                />
                Excluyente
              </label>
              <label className="flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={c.required}
                  onChange={(e) => update(index, { required: e.target.checked })}
                />
                Obligatorio
              </label>
              <label className="flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={c.evidenceRequired}
                  onChange={(e) => update(index, { evidenceRequired: e.target.checked })}
                />
                Requiere evidencia
              </label>
            </div>
          </div>
        ))}
      </div>

      <Button type="button" variant="outline" onClick={() => setCriteria((c) => [...c, emptyCriterion(c.length)])}>
        Añadir criterio
      </Button>

      {error ? <p className="text-sm text-red-600">{error}</p> : null}
      {!canWrite ? <p className="text-sm text-slate-500">Tu rol de visor no permite publicar ni editar el scorecard.</p> : null}
      {info ? <p className="text-sm text-slate-600">{info}</p> : null}
      {proposalReady ? (
        <p className="rounded-lg bg-amber-50 px-3 py-2 text-sm text-amber-950">
          Hay una propuesta de IA sin confirmar. Guarda el borrador o publícala solo después de revisarla.
        </p>
      ) : null}

      <div className="flex flex-wrap gap-3">
        <Button type="button" variant="secondary" disabled={!canWrite || busy} onClick={saveDraft}>
          Guardar borrador
        </Button>
        <Button type="button" disabled={!canWrite || busy || !weights.ok} onClick={publish} data-testid="publish-scorecard">
          Publicar versión
        </Button>
      </div>
    </div>
  );
}
