"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import type { VariantProps } from "class-variance-authority";
import { badgeVariants } from "@/components/ui/badge";

export type RecentRow = {
  id: string;
  candidateName: string;
  initials: string;
  jobTitle: string;
  profileName: string;
  status: string;
  statusLabel: string;
  badgeVariant: VariantProps<typeof badgeVariants>["variant"];
  score: number | null;
  level: string | null;
};

const FILTERS: { value: string; label: string }[] = [
  { value: "ALL", label: "Todos los estados" },
  { value: "CREATED", label: "Creada" },
  { value: "LINK_READY", label: "Link listo" },
  { value: "IN_PROGRESS", label: "En progreso" },
  { value: "PROCESSING", label: "Procesando" },
  { value: "COMPLETED", label: "Completada" },
  { value: "FAILED", label: "Fallida" },
  { value: "EXPIRED", label: "Expirada" },
];

export function RecentEvaluationsTable({ rows }: { rows: RecentRow[] }) {
  const [filter, setFilter] = useState("ALL");

  const filtered = useMemo(() => {
    if (filter === "ALL") return rows;
    return rows.filter((r) => r.status === filter);
  }, [rows, filter]);

  return (
    <div>
      <div className="mb-space-md flex flex-wrap items-center justify-between gap-space-sm">
        <h2 className="font-headline text-headline-md font-semibold text-on-surface">Evaluaciones recientes</h2>
        <select
          value={filter}
          onChange={(e) => setFilter(e.target.value)}
          className="rounded-lg border border-outline-variant/40 bg-surface-container-lowest px-space-sm py-2 text-body-sm text-on-surface outline-none focus:ring-1 focus:ring-primary"
        >
          {FILTERS.map((f) => (
            <option key={f.value} value={f.value}>
              {f.label}
            </option>
          ))}
        </select>
      </div>
      <div className="overflow-x-auto rounded-xl border border-outline-variant/30">
        <table className="w-full min-w-[720px] text-left text-body-sm">
          <thead className="border-b border-outline-variant/30 bg-surface-container-lowest font-label-mono text-label-mono-sm uppercase tracking-wider text-on-surface-variant">
            <tr>
              <th className="px-4 py-3">Candidato</th>
              <th className="px-4 py-3">Cargo</th>
              <th className="px-4 py-3">Perfil</th>
              <th className="px-4 py-3">Estado</th>
              <th className="px-4 py-3">Score</th>
              <th className="px-4 py-3">Nivel</th>
              <th className="px-4 py-3 text-right">Acción</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map((row) => (
              <tr
                key={row.id}
                className="border-b border-outline-variant/20 last:border-0 hover:bg-surface-container-high/60"
              >
                <td className="px-4 py-3">
                  <div className="flex items-center gap-3">
                    <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-primary-container/30 text-xs font-bold text-primary">
                      {row.initials}
                    </span>
                    <span className="font-medium text-on-surface">{row.candidateName}</span>
                  </div>
                </td>
                <td className="px-4 py-3 text-on-surface-variant">{row.jobTitle}</td>
                <td className="px-4 py-3 text-on-surface-variant">{row.profileName}</td>
                <td className="px-4 py-3">
                  <Badge variant={row.badgeVariant}>{row.statusLabel}</Badge>
                </td>
                <td className="px-4 py-3 font-medium tabular-nums text-on-surface">{row.score ?? "—"}</td>
                <td className="px-4 py-3 text-on-surface-variant">{row.level ?? "—"}</td>
                <td className="px-4 py-3 text-right">
                  <Link
                    href={`/interviews/${row.id}`}
                    className="text-body-sm font-semibold text-primary hover:text-primary-fixed-dim"
                  >
                    Ver evaluación &gt;
                  </Link>
                </td>
              </tr>
            ))}
            {filtered.length === 0 ? (
              <tr>
                <td colSpan={7} className="px-4 py-12 text-center text-on-surface-variant">
                  No hay filas con este estado.
                </td>
              </tr>
            ) : null}
          </tbody>
        </table>
      </div>
    </div>
  );
}
