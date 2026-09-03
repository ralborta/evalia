"use client";

import { useCallback, useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

type Criterion = {
  id: string;
  criterionKey: string;
  criterionLabel: string;
  criterionType: string;
  weight: number;
  status: string;
  partialScore: number;
  confidence: number;
  evidence: string;
  explanation: string;
};

type Question = {
  id: string;
  criterionKey: string | null;
  question: string;
  reason: string | null;
};

type AnalysisPayload = {
  document: {
    id: string;
    processingStatus: string;
    originalFileName: string;
  } | null;
  evaluation: {
    id: string;
    overallScore: number | null;
    excludingOutcome: string;
    rankingExplanation: string | null;
    status: string;
    version: number;
    criteriaResults: Criterion[];
    suggestedQuestions: Question[];
  } | null;
};

const STATUS_ES: Record<string, string> = {
  MEETS: "Cumple",
  DOES_NOT_MEET: "No cumple",
  NOT_FOUND: "No encontrado",
  NEEDS_VALIDATION: "Pendiente validación",
};

export function CvAnalysisPanel({
  applicationId,
  canWrite = true,
}: {
  applicationId: string;
  canWrite?: boolean;
}) {
  const [data, setData] = useState<AnalysisPayload | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    const res = await fetch(`/api/applications/${applicationId}/cv-analysis`);
    const json = await res.json().catch(() => ({}));
    if (!res.ok) {
      setError(json.error ?? "No se pudo cargar el análisis");
      return;
    }
    setData(json);
    setError(null);
  }, [applicationId]);

  useEffect(() => {
    const boot = setTimeout(() => {
      void load();
    }, 0);
    const t = setInterval(() => void load(), 5000);
    return () => {
      clearTimeout(boot);
      clearInterval(t);
    };
  }, [load]);

  async function reprocess() {
    if (!data?.document?.id || !canWrite) return;
    setBusy(true);
    setError(null);
    const res = await fetch(`/api/documents/${data.document.id}/reprocess`, { method: "POST" });
    const json = await res.json().catch(() => ({}));
    setBusy(false);
    if (!res.ok) {
      setError(json.error ?? "No se pudo reprocesar");
      return;
    }
    await load();
  }

  const evaluation = data?.evaluation;
  const excluding = evaluation?.criteriaResults.filter((c) => c.criterionType === "EXCLUDING") ?? [];
  const scored = evaluation?.criteriaResults.filter((c) => c.criterionType === "SCORED") ?? [];
  const pending =
    evaluation?.criteriaResults.filter((c) => c.status === "NEEDS_VALIDATION" || c.status === "NOT_FOUND") ?? [];

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="text-3xl font-bold tabular-nums text-slate-900">
            {evaluation?.overallScore != null ? evaluation.overallScore.toFixed(1) : "—"}
            <span className="ml-1 text-base font-medium text-slate-500">/ 100</span>
          </p>
          <p className="mt-1 text-sm text-slate-600">
            Excluyentes:{" "}
            <Badge variant={evaluation?.excludingOutcome === "FAIL" ? "danger" : "secondary"}>
              {evaluation?.excludingOutcome ?? "UNKNOWN"}
            </Badge>
          </p>
        </div>
        {canWrite && data?.document ? (
          <Button type="button" variant="outline" disabled={busy} onClick={() => void reprocess()}>
            {busy ? "Reprocesando…" : "Reprocesar"}
          </Button>
        ) : null}
      </div>

      {evaluation?.rankingExplanation ? (
        <p className="text-sm text-slate-600">{evaluation.rankingExplanation}</p>
      ) : null}
      {error ? <p className="text-sm text-red-600">{error}</p> : null}
      {!evaluation ? (
        <p className="text-sm text-slate-500">
          {data?.document
            ? `Estado del documento: ${data.document.processingStatus}`
            : "Sube un CV para generar el análisis."}
        </p>
      ) : null}

      {excluding.length > 0 ? (
        <div>
          <h3 className="text-sm font-semibold text-slate-900">Criterios excluyentes</h3>
          <ul className="mt-2 space-y-2">
            {excluding.map((c) => (
              <li key={c.id} className="rounded-lg border border-slate-100 p-3 text-sm">
                <div className="flex items-center justify-between gap-2">
                  <span className="font-medium">{c.criterionLabel}</span>
                  <Badge variant="outline">{STATUS_ES[c.status] ?? c.status}</Badge>
                </div>
                <p className="mt-1 text-slate-600">{c.explanation}</p>
                <p className="mt-1 text-xs text-slate-500">Evidencia: {c.evidence}</p>
              </li>
            ))}
          </ul>
        </div>
      ) : null}

      {scored.length > 0 ? (
        <div>
          <h3 className="text-sm font-semibold text-slate-900">Criterios con peso</h3>
          <ul className="mt-2 space-y-2">
            {scored.map((c) => (
              <li key={c.id} className="rounded-lg border border-slate-100 p-3 text-sm">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <span className="font-medium">
                    {c.criterionLabel}{" "}
                    <span className="text-slate-400">({c.weight}%)</span>
                  </span>
                  <span className="tabular-nums text-slate-800">{c.partialScore.toFixed(0)}</span>
                </div>
                <p className="mt-1 text-slate-600">{c.explanation}</p>
                <p className="mt-1 text-xs text-slate-500">
                  {STATUS_ES[c.status] ?? c.status} · confianza {(c.confidence * 100).toFixed(0)}% · {c.evidence}
                </p>
              </li>
            ))}
          </ul>
        </div>
      ) : null}

      {pending.length > 0 ? (
        <div>
          <h3 className="text-sm font-semibold text-slate-900">Pendiente de validación</h3>
          <ul className="mt-2 list-disc space-y-1 pl-5 text-sm text-slate-600">
            {pending.map((c) => (
              <li key={c.id}>
                {c.criterionLabel}: {STATUS_ES[c.status] ?? c.status}
              </li>
            ))}
          </ul>
        </div>
      ) : null}

      {evaluation?.suggestedQuestions?.length ? (
        <div>
          <h3 className="text-sm font-semibold text-slate-900">Preguntas sugeridas</h3>
          <ol className="mt-2 list-decimal space-y-2 pl-5 text-sm text-slate-700">
            {evaluation.suggestedQuestions.map((q) => (
              <li key={q.id}>
                {q.question}
                {q.reason ? <span className="block text-xs text-slate-500">{q.reason}</span> : null}
              </li>
            ))}
          </ol>
        </div>
      ) : null}
    </div>
  );
}
