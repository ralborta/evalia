"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { Badge } from "@/components/ui/badge";

type RankRow = {
  rank: number;
  applicationId: string;
  candidateName: string;
  overallScore: number | null;
  excludingOutcome: string;
  eligible: boolean;
  warnings: string[];
  explanationVsNeighbor: string;
  documentStatus: string | null;
};

export function JobRankingPanel({ jobId }: { jobId: string }) {
  const [rows, setRows] = useState<RankRow[]>([]);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    const res = await fetch(`/api/jobs/${jobId}/ranking`);
    const json = await res.json().catch(() => ({}));
    if (!res.ok) {
      setError(json.error ?? "No se pudo cargar el ranking");
      return;
    }
    setRows(json.ranking ?? []);
    setError(null);
  }, [jobId]);

  useEffect(() => {
    const boot = setTimeout(() => {
      void load();
    }, 0);
    return () => clearTimeout(boot);
  }, [load]);

  return (
    <div className="space-y-space-sm">
      {error ? <p className="text-body-sm text-error">{error}</p> : null}
      {rows.length === 0 ? (
        <p className="text-body-sm text-on-surface-variant">Todavía no hay candidaturas para rankear.</p>
      ) : (
        <div className="overflow-x-auto rounded-xl border border-outline-variant/30 bg-surface-container shadow-md">
          <table className="min-w-full text-left text-body-sm">
            <thead className="bg-surface-container-lowest font-label-mono text-label-mono-sm uppercase tracking-wide text-on-surface-variant">
              <tr>
                <th className="px-4 py-3">#</th>
                <th className="px-4 py-3">Candidato</th>
                <th className="px-4 py-3">Score</th>
                <th className="px-4 py-3">Estado</th>
                <th className="px-4 py-3">Avisos</th>
                <th className="px-4 py-3">Por qué este orden</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((row) => (
                <tr key={row.applicationId} className="border-t border-outline-variant/20 hover:bg-surface-container-high/50">
                  <td className="px-4 py-3 tabular-nums text-on-surface-variant">{row.rank}</td>
                  <td className="px-4 py-3 font-medium text-on-surface">
                    <Link href={`/applications/${row.applicationId}`} className="hover:text-primary">
                      {row.candidateName}
                    </Link>
                  </td>
                  <td className="px-4 py-3 tabular-nums text-on-surface">
                    {row.overallScore != null ? row.overallScore.toFixed(1) : "—"}
                  </td>
                  <td className="px-4 py-3">
                    <Badge variant={row.excludingOutcome === "FAIL" ? "danger" : "secondary"}>
                      {row.excludingOutcome}
                    </Badge>
                  </td>
                  <td className="px-4 py-3 text-body-sm text-tertiary">
                    {row.warnings.length ? row.warnings.join(" · ") : "—"}
                  </td>
                  <td className="px-4 py-3 text-on-surface-variant">{row.explanationVsNeighbor}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
