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
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <h2 className="text-base font-semibold text-slate-900">Evaluaciones recientes</h2>
        <select
          value={filter}
          onChange={(e) => setFilter(e.target.value)}
          className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-700 shadow-sm outline-none ring-blue-500/30 focus:ring-2"
        >
          {FILTERS.map((f) => (
            <option key={f.value} value={f.value}>
              {f.label}
            </option>
          ))}
        </select>
      </div>
      <div className="overflow-x-auto rounded-xl border border-slate-100">
        <table className="w-full min-w-[720px] text-left text-sm">
          <thead className="border-b border-slate-100 bg-slate-50/80 text-[11px] font-semibold uppercase tracking-wider text-slate-500">
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
              <tr key={row.id} className="border-b border-slate-50 last:border-0 hover:bg-slate-50/60">
                <td className="px-4 py-3">
                  <div className="flex items-center gap-3">
                    <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-slate-200 text-xs font-bold text-slate-700">
                      {row.initials}
                    </span>
                    <span className="font-medium text-slate-900">{row.candidateName}</span>
                  </div>
                </td>
                <td className="px-4 py-3 text-slate-600">{row.jobTitle}</td>
                <td className="px-4 py-3 text-slate-600">{row.profileName}</td>
                <td className="px-4 py-3">
                  <Badge variant={row.badgeVariant}>{row.statusLabel}</Badge>
                </td>
                <td className="px-4 py-3 font-medium tabular-nums text-slate-800">{row.score ?? "—"}</td>
                <td className="px-4 py-3 text-slate-600">{row.level ?? "—"}</td>
                <td className="px-4 py-3 text-right">
                  <Link href={`/interviews/${row.id}`} className="text-sm font-semibold text-blue-600 hover:text-blue-700">
                    Ver evaluación &gt;
                  </Link>
                </td>
              </tr>
            ))}
            {filtered.length === 0 ? (
              <tr>
                <td colSpan={7} className="px-4 py-12 text-center text-slate-500">
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
