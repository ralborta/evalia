"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import {
  ArrowDownRight,
  ArrowUpRight,
  BookOpen,
  ChevronLeft,
  ChevronRight,
  ClipboardList,
  Download,
  Filter,
  MoreHorizontal,
  Search,
  Sparkles,
  UserPlus,
  Users,
} from "lucide-react";
import type { CandidateBadge, CandidatesDashboardPayload } from "@/lib/candidates-dashboard-data";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";

const PAGE_SIZE = 8;

function avatarColors(seed: string) {
  const palette = [
    { bg: "bg-blue-100", text: "text-blue-800" },
    { bg: "bg-violet-100", text: "text-violet-800" },
    { bg: "bg-emerald-100", text: "text-emerald-800" },
    { bg: "bg-amber-100", text: "text-amber-900" },
    { bg: "bg-sky-100", text: "text-sky-800" },
    { bg: "bg-rose-100", text: "text-rose-800" },
  ];
  let n = 0;
  for (let i = 0; i < seed.length; i++) n += seed.charCodeAt(i);
  return palette[n % palette.length]!;
}

function TrendPill({ value }: { value: number | null }) {
  if (value == null) {
    return <span className="text-xs font-medium text-slate-400">Sin comparación</span>;
  }
  const up = value >= 0;
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-semibold",
        up ? "bg-emerald-50 text-emerald-700 ring-1 ring-emerald-100" : "bg-red-50 text-red-700 ring-1 ring-red-100",
      )}
    >
      {up ? <ArrowUpRight className="h-3 w-3" /> : <ArrowDownRight className="h-3 w-3" />}
      {up ? "+" : ""}
      {value}% vs. mes anterior
    </span>
  );
}

function StatusBadge({ badge }: { badge: CandidateBadge }) {
  if (badge === "activo") {
    return (
      <span className="inline-flex rounded-full bg-emerald-100 px-2.5 py-1 text-[11px] font-bold uppercase tracking-wide text-emerald-800 ring-1 ring-emerald-200/80">
        Activo
      </span>
    );
  }
  if (badge === "invitado") {
    return (
      <span className="inline-flex rounded-full bg-amber-100 px-2.5 py-1 text-[11px] font-bold uppercase tracking-wide text-amber-900 ring-1 ring-amber-200/80">
        Invitado
      </span>
    );
  }
  return (
    <span className="inline-flex rounded-full bg-slate-100 px-2.5 py-1 text-[11px] font-bold uppercase tracking-wide text-slate-600 ring-1 ring-slate-200/80">
      Inactivo
    </span>
  );
}

function ScoreBar({ score }: { score: number }) {
  const w = Math.min(100, Math.max(0, score));
  const barClass =
    w >= 80 ? "from-emerald-500 to-teal-500" : w >= 60 ? "from-violet-500 to-indigo-500" : "from-red-400 to-rose-500";
  return (
    <div className="flex min-w-[120px] items-center gap-2">
      <span className="w-8 text-right text-sm font-bold tabular-nums text-slate-900">{score}</span>
      <div className="h-2 min-w-0 flex-1 overflow-hidden rounded-full bg-slate-100 ring-1 ring-slate-200/60">
        <div
          className={cn("h-full rounded-full bg-gradient-to-r transition-all", barClass)}
          style={{ width: `${w}%` }}
        />
      </div>
    </div>
  );
}

type Tab = "todos" | "activos" | "inactivos";

export function CandidatesClient({ data }: { data: CandidatesDashboardPayload }) {
  const [tab, setTab] = useState<Tab>("todos");
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return data.rows.filter((r) => {
      if (tab === "activos" && r.filterBucket !== "activo") return false;
      if (tab === "inactivos" && r.filterBucket === "activo") return false;
      if (!q) return true;
      const name = r.name.toLowerCase();
      const email = (r.email ?? "").toLowerCase();
      return name.includes(q) || email.includes(q);
    });
  }, [data.rows, tab, search]);

  const totalFiltered = filtered.length;
  const pageCount = Math.max(1, Math.ceil(totalFiltered / PAGE_SIZE));
  const currentPage = Math.min(Math.max(1, page), pageCount);
  const sliceStart = (currentPage - 1) * PAGE_SIZE;
  const pageRows = filtered.slice(sliceStart, sliceStart + PAGE_SIZE);

  function exportCsv() {
    const header = ["Candidato", "Email", "Entrevistas", "Nivel", "Score promedio", "Última actividad", "Estado"];
    const lines = filtered.map((r) =>
      [r.name, r.email ?? "", String(r.interviewCount), r.level ?? "", String(r.avgScore ?? ""), r.lastActivityLabel, r.badge]
        .map((c) => `"${String(c).replace(/"/g, '""')}"`)
        .join(","),
    );
    const blob = new Blob([[header.join(","), ...lines].join("\n")], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `candidatos-evalia-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }

  const { totals, trends, insights } = data;

  return (
    <div className="mx-auto max-w-[1400px] space-y-8 pb-12">
      <div className="relative overflow-hidden rounded-2xl border border-slate-200/80 bg-gradient-to-br from-white via-slate-50/80 to-violet-50/30 p-6 shadow-sm md:p-8">
        <div className="pointer-events-none absolute -right-20 -top-20 h-56 w-56 rounded-full bg-violet-200/25 blur-3xl" />
        <div className="relative flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
          <div className="flex gap-4">
            <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-blue-600 to-violet-700 text-white shadow-lg shadow-violet-600/25">
              <Users className="h-7 w-7" strokeWidth={2} />
            </div>
            <div>
              <h1 className="text-2xl font-bold tracking-tight text-slate-900 md:text-3xl">Candidatos</h1>
              <p className="mt-2 max-w-xl text-sm leading-relaxed text-slate-600">
                Personas con al menos una entrevista asociada en EvalIA. El estado refleja si ya tienen un informe
                completado o siguen en el flujo de invitación.
              </p>
            </div>
          </div>
          <div className="flex flex-wrap items-center gap-3">
            <Button type="button" variant="outline" size="sm" className="font-semibold text-slate-700" asChild>
              <Link href="/evaluation-profiles">
                <BookOpen className="h-4 w-4 text-violet-600" />
                Perfiles
              </Link>
            </Button>
            <Button type="button" className="font-semibold shadow-md shadow-violet-600/20" asChild>
              <Link href="/interviews/new">
                <UserPlus className="h-4 w-4" />
                Nuevo candidato
              </Link>
            </Button>
          </div>
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <div className="rounded-2xl border border-slate-200/90 bg-white p-5 shadow-sm">
          <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">Candidatos activos</p>
          <p className="mt-2 text-3xl font-bold tabular-nums text-slate-900">{totals.activeCandidates}</p>
          <div className="mt-2">
            <TrendPill value={trends.activeCandidatesPct} />
          </div>
        </div>
        <div className="rounded-2xl border border-slate-200/90 bg-white p-5 shadow-sm">
          <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">Entrevistas asociadas</p>
          <p className="mt-2 text-3xl font-bold tabular-nums text-slate-900">{totals.totalInterviews}</p>
          <div className="mt-2">
            <TrendPill value={trends.interviewsCompletedPct} />
          </div>
        </div>
        <div className="rounded-2xl border border-slate-200/90 bg-white p-5 shadow-sm">
          <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">Promedio general</p>
          <p className="mt-2 text-3xl font-bold tabular-nums text-violet-700">
            {totals.avgScoreOverall ?? "—"}
            <span className="text-lg font-semibold text-slate-400">/100</span>
          </p>
          {totals.levelMode ? (
            <p className="mt-2 text-xs font-medium text-slate-500">
              Nivel predominante en informes:{" "}
              <span className="font-bold text-slate-800">{totals.levelMode}</span>
            </p>
          ) : (
            <p className="mt-2 text-xs text-slate-400">Aún sin informes para promediar.</p>
          )}
        </div>
        <div className="rounded-2xl border border-violet-200/70 bg-gradient-to-br from-violet-50/80 to-white p-5 shadow-sm ring-1 ring-violet-100/60">
          <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">Última actividad</p>
          <p className="mt-2 text-sm font-semibold leading-snug text-slate-900">{totals.lastActivityGlobalLabel}</p>
          <p className="mt-2 text-xs text-slate-500">Basada en la última evaluación registrada.</p>
        </div>
      </div>

      <div className="grid gap-8 xl:grid-cols-[1fr_320px]">
        <div className="min-w-0 space-y-4">
          <div className="flex flex-col gap-4 rounded-2xl border border-slate-200/90 bg-white p-4 shadow-sm md:flex-row md:items-center md:justify-between md:p-5">
            <div className="relative min-w-0 flex-1">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
              <input
                type="search"
                placeholder="Buscar por nombre o email"
                value={search}
                onChange={(e) => {
                  setSearch(e.target.value);
                  setPage(1);
                }}
                className="h-11 w-full rounded-xl border border-slate-200 bg-slate-50/50 pl-10 pr-3 text-sm text-slate-900 shadow-inner outline-none transition focus:border-violet-400 focus:bg-white focus:ring-2 focus:ring-violet-500/15"
              />
            </div>
            <div className="flex flex-wrap items-center gap-2">
              {(
                [
                  { id: "todos" as const, label: "Todos" },
                  { id: "activos" as const, label: "Activos" },
                  { id: "inactivos" as const, label: "Inactivos" },
                ] as const
              ).map((t) => (
                <button
                  key={t.id}
                  type="button"
                  onClick={() => {
                    setTab(t.id);
                    setPage(1);
                  }}
                  className={cn(
                    "rounded-xl px-4 py-2 text-sm font-semibold transition",
                    tab === t.id
                      ? "bg-slate-900 text-white shadow-md"
                      : "bg-slate-100 text-slate-600 hover:bg-slate-200/80",
                  )}
                >
                  {t.label}
                </button>
              ))}
              <Button type="button" variant="outline" size="sm" className="font-semibold text-slate-700">
                <Filter className="h-4 w-4" />
                Filtros
              </Button>
            </div>
          </div>

          <div className="overflow-hidden rounded-2xl border border-slate-200/90 bg-white shadow-sm">
            <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 px-4 py-4 md:px-6">
              <div>
                <h2 className="text-base font-semibold text-slate-900">Lista de candidatos</h2>
                <p className="mt-0.5 text-xs text-slate-500">{totalFiltered} resultados</p>
              </div>
              <div className="flex items-center gap-2">
                <Button type="button" variant="outline" size="sm" className="font-semibold" onClick={() => exportCsv()}>
                  <Download className="h-4 w-4" />
                  Exportar
                </Button>
                <Button type="button" variant="ghost" size="icon" className="shrink-0 text-slate-500" aria-label="Más opciones">
                  <MoreHorizontal className="h-5 w-5" />
                </Button>
              </div>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full min-w-[860px] text-left text-sm">
                <thead className="border-b border-slate-100 bg-slate-50/80 text-[11px] font-semibold uppercase tracking-wider text-slate-500">
                  <tr>
                    <th className="px-4 py-3 pl-5 md:pl-6">Candidato</th>
                    <th className="px-4 py-3">Email</th>
                    <th className="px-4 py-3">Entrevistas</th>
                    <th className="px-4 py-3">Nivel</th>
                    <th className="px-4 py-3">Score promedio</th>
                    <th className="px-4 py-3">Última entrevista</th>
                    <th className="px-4 py-3">Estado</th>
                    <th className="px-4 py-3 pr-5 text-right md:pr-6">Acción</th>
                  </tr>
                </thead>
                <tbody>
                  {pageRows.length === 0 ? (
                    <tr>
                      <td colSpan={8} className="px-6 py-16 text-center">
                        <div className="mx-auto flex max-w-md flex-col items-center gap-2">
                          <ClipboardList className="h-10 w-10 text-slate-300" />
                          <p className="font-semibold text-slate-800">No hay candidatos con estos criterios</p>
                          <p className="text-sm text-slate-500">Probá otra búsqueda o cambiá el filtro de estado.</p>
                        </div>
                      </td>
                    </tr>
                  ) : (
                    pageRows.map((r) => {
                      const av = avatarColors(r.id);
                      return (
                        <tr
                          key={r.id}
                          className="border-b border-slate-50 transition-colors last:border-0 hover:bg-violet-50/35"
                        >
                          <td className="px-4 py-3.5 pl-5 md:pl-6">
                            <div className="flex items-center gap-3">
                              <span
                                className={cn(
                                  "flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-xs font-bold ring-1 ring-black/5",
                                  av.bg,
                                  av.text,
                                )}
                              >
                                {r.initials}
                              </span>
                              <span className="font-medium text-slate-900">{r.name}</span>
                            </div>
                          </td>
                          <td className="max-w-[200px] truncate px-4 py-3.5 text-slate-600" title={r.email ?? ""}>
                            {r.email ?? "—"}
                          </td>
                          <td className="px-4 py-3.5 tabular-nums text-slate-800">{r.interviewCount}</td>
                          <td className="px-4 py-3.5">
                            {r.level ? (
                              <span className="inline-flex rounded-full bg-sky-100 px-2.5 py-0.5 text-xs font-bold text-sky-800 ring-1 ring-sky-200/80">
                                {r.level}
                              </span>
                            ) : (
                              <span className="text-slate-400">—</span>
                            )}
                          </td>
                          <td className="px-4 py-3.5">
                            {r.avgScore != null ? <ScoreBar score={r.avgScore} /> : <span className="text-slate-400">—</span>}
                          </td>
                          <td className="whitespace-nowrap px-4 py-3.5 text-slate-600">{r.lastActivityLabel}</td>
                          <td className="px-4 py-3.5">
                            <StatusBadge badge={r.badge} />
                          </td>
                          <td className="px-4 py-3.5 pr-5 text-right md:pr-6">
                            <Link
                              href={`/interviews/${r.primaryInterviewId}`}
                              className="text-sm font-semibold text-violet-600 underline-offset-2 hover:text-violet-700 hover:underline"
                            >
                              Ver perfil
                            </Link>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
            {totalFiltered > 0 ? (
              <div className="flex flex-col gap-3 border-t border-slate-100 px-4 py-4 sm:flex-row sm:items-center sm:justify-between md:px-6">
                <p className="text-sm text-slate-500">
                  Mostrando{" "}
                  <span className="font-semibold text-slate-800">
                    {sliceStart + 1} a {Math.min(sliceStart + PAGE_SIZE, totalFiltered)}
                  </span>{" "}
                  de <span className="font-semibold text-slate-800">{totalFiltered}</span> candidatos
                </p>
                <div className="flex items-center gap-2">
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    className="font-semibold"
                    disabled={currentPage <= 1}
                    onClick={() => setPage((p) => Math.max(1, p - 1))}
                  >
                    <ChevronLeft className="h-4 w-4" />
                    Anterior
                  </Button>
                  <span className="text-xs font-medium text-slate-500">
                    Página {currentPage} / {pageCount}
                  </span>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    className="font-semibold"
                    disabled={currentPage >= pageCount}
                    onClick={() => setPage((p) => Math.min(pageCount, p + 1))}
                  >
                    Siguiente
                    <ChevronRight className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            ) : null}
          </div>
        </div>

        <aside className="space-y-5">
          <div className="rounded-2xl border border-slate-200/90 bg-white p-5 shadow-sm">
            <h3 className="flex items-center gap-2 text-sm font-bold text-slate-900">
              <Sparkles className="h-4 w-4 text-amber-500" />
              Insights rápidos
            </h3>
            <ul className="mt-4 space-y-3 text-sm leading-relaxed text-slate-600">
              <li className="flex gap-2">
                <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-violet-500" />
                <span>
                  Hay <strong className="text-slate-900">{insights.pendingPipeline}</strong> entrevistas en flujo
                  (creada, link enviado o en curso).
                </span>
              </li>
              <li className="flex gap-2">
                <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-emerald-500" />
                <span>
                  Hoy hay <strong className="text-slate-900">{insights.pendingToday}</strong> con actividad reciente
                  (link o sesión abierta).
                </span>
              </li>
              <li className="flex gap-2">
                <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-sky-500" />
                <span>
                  Compará tendencias y scores en{" "}
                  <Link href="/reports" className="font-semibold text-violet-600 hover:underline">
                    Reportes
                  </Link>
                  .
                </span>
              </li>
            </ul>
          </div>

          <div className="overflow-hidden rounded-2xl border border-violet-200/60 bg-gradient-to-br from-violet-50 via-white to-indigo-50/50 p-5 shadow-md ring-1 ring-violet-100/50">
            <h3 className="text-sm font-bold text-violet-950">Mejorá la evaluación</h3>
            <p className="mt-2 text-sm leading-relaxed text-slate-600">
              Ajustá criterios y ponderaciones con perfiles de evaluación alineados a cada rol o cliente.
            </p>
            <Button type="button" className="mt-4 w-full font-semibold shadow-sm" variant="default" asChild>
              <Link href="/evaluation-profiles">Ir a perfiles</Link>
            </Button>
          </div>
        </aside>
      </div>
    </div>
  );
}
