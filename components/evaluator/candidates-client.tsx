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
    { bg: "bg-primary-container/30", text: "text-primary" },
    { bg: "bg-secondary-container/25", text: "text-secondary" },
    { bg: "bg-tertiary-container/30", text: "text-tertiary" },
    { bg: "bg-surface-variant", text: "text-on-surface" },
  ];
  let n = 0;
  for (let i = 0; i < seed.length; i++) n += seed.charCodeAt(i);
  return palette[n % palette.length]!;
}

function TrendPill({ value }: { value: number | null }) {
  if (value == null) {
    return <span className="text-body-sm font-medium text-outline">Sin comparación</span>;
  }
  const up = value >= 0;
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 rounded-full px-2 py-0.5 font-label-mono text-label-mono-sm font-semibold",
        up ? "bg-secondary-container/20 text-secondary" : "bg-error-container/40 text-error",
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
      <span className="inline-flex rounded-full bg-secondary-container/25 px-2.5 py-1 font-label-mono text-[11px] font-bold uppercase tracking-wide text-secondary">
        Activo
      </span>
    );
  }
  if (badge === "invitado") {
    return (
      <span className="inline-flex rounded-full bg-tertiary-container/30 px-2.5 py-1 font-label-mono text-[11px] font-bold uppercase tracking-wide text-tertiary">
        Invitado
      </span>
    );
  }
  return (
    <span className="inline-flex rounded-full bg-surface-variant px-2.5 py-1 font-label-mono text-[11px] font-bold uppercase tracking-wide text-on-surface-variant">
      Inactivo
    </span>
  );
}

function ScoreBar({ score }: { score: number }) {
  const w = Math.min(100, Math.max(0, score));
  const barClass =
    w >= 80 ? "from-secondary to-secondary-container" : w >= 60 ? "from-primary to-primary-container" : "from-error to-error-container";
  return (
    <div className="flex min-w-[120px] items-center gap-2">
      <span className="w-8 text-right text-body-sm font-bold tabular-nums text-on-surface">{score}</span>
      <div className="h-2 min-w-0 flex-1 overflow-hidden rounded-full bg-surface-container-lowest">
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
    <div className="mx-auto flex w-full max-w-[1400px] flex-col gap-space-lg pb-12">
      <section className="relative overflow-hidden rounded-xl bg-surface-container p-space-lg shadow-xl">
        <div className="pointer-events-none absolute -right-20 -top-20 h-56 w-56 rounded-full bg-primary/10 blur-3xl" />
        <div className="relative flex flex-col gap-space-md lg:flex-row lg:items-end lg:justify-between">
          <div className="flex gap-space-md">
            <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-xl bg-primary-container text-on-primary-container shadow-md">
              <Users className="h-7 w-7" strokeWidth={2} />
            </div>
            <div>
              <h1 className="font-headline text-headline-xl font-bold tracking-tight text-on-surface">
                Directorio de Candidatos &amp; Scores
              </h1>
              <p className="mt-space-2xs max-w-xl text-body-md text-on-surface-variant">
                Personas con al menos una entrevista asociada. El estado refleja informe completado o flujo de
                invitación.
              </p>
            </div>
          </div>
          <div className="flex flex-wrap items-center gap-space-sm">
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="border-outline-variant/50 bg-surface-container-high font-semibold text-on-surface hover:bg-surface-variant"
              asChild
            >
              <Link href="/evaluation-profiles">
                <BookOpen className="h-4 w-4 text-primary" />
                Perfiles
              </Link>
            </Button>
            <Button
              type="button"
              className="bg-primary-container font-semibold text-on-primary-container hover:bg-primary-container/90"
              asChild
            >
              <Link href="/interviews/new">
                <UserPlus className="h-4 w-4" />
                Nuevo candidato
              </Link>
            </Button>
          </div>
        </div>
      </section>

      <div className="grid gap-space-md sm:grid-cols-2 xl:grid-cols-4">
        <div className="rounded-xl bg-surface-container p-space-md shadow-md">
          <p className="font-label-mono text-label-mono-sm uppercase tracking-wide text-on-surface-variant">
            Candidatos activos
          </p>
          <p className="mt-space-sm font-headline text-stat-metric font-bold tabular-nums text-on-surface">
            {totals.activeCandidates}
          </p>
          <div className="mt-space-2xs">
            <TrendPill value={trends.activeCandidatesPct} />
          </div>
        </div>
        <div className="rounded-xl bg-surface-container p-space-md shadow-md">
          <p className="font-label-mono text-label-mono-sm uppercase tracking-wide text-on-surface-variant">
            Entrevistas asociadas
          </p>
          <p className="mt-space-sm font-headline text-stat-metric font-bold tabular-nums text-on-surface">
            {totals.totalInterviews}
          </p>
          <div className="mt-space-2xs">
            <TrendPill value={trends.interviewsCompletedPct} />
          </div>
        </div>
        <div className="rounded-xl bg-surface-container p-space-md shadow-md">
          <p className="font-label-mono text-label-mono-sm uppercase tracking-wide text-on-surface-variant">
            Promedio general
          </p>
          <p className="mt-space-sm font-headline text-stat-metric font-bold tabular-nums text-primary">
            {totals.avgScoreOverall ?? "—"}
            <span className="text-headline-md font-semibold text-on-surface-variant">/100</span>
          </p>
          {totals.levelMode ? (
            <p className="mt-space-2xs text-body-sm text-on-surface-variant">
              Nivel predominante: <span className="font-bold text-on-surface">{totals.levelMode}</span>
            </p>
          ) : (
            <p className="mt-space-2xs text-body-sm text-outline">Aún sin informes para promediar.</p>
          )}
        </div>
        <div className="rounded-xl bg-surface-container-high p-space-md shadow-md ring-1 ring-primary-container/30">
          <p className="font-label-mono text-label-mono-sm uppercase tracking-wide text-on-surface-variant">
            Última actividad
          </p>
          <p className="mt-space-sm text-body-md font-semibold leading-snug text-on-surface">
            {totals.lastActivityGlobalLabel}
          </p>
          <p className="mt-space-2xs text-body-sm text-on-surface-variant">Basada en la última evaluación registrada.</p>
        </div>
      </div>

      <div className="grid gap-space-lg xl:grid-cols-[1fr_320px]">
        <div className="min-w-0 space-y-space-md">
          <div className="flex flex-col gap-space-md rounded-xl bg-surface-container p-space-md shadow-md md:flex-row md:items-center md:justify-between">
            <div className="relative min-w-0 flex-1">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-on-surface-variant" />
              <input
                type="search"
                placeholder="Buscar por nombre o email"
                value={search}
                onChange={(e) => {
                  setSearch(e.target.value);
                  setPage(1);
                }}
                className="h-11 w-full rounded-lg border border-outline-variant/40 bg-surface-container-lowest pl-10 pr-3 text-body-sm text-on-surface outline-none transition focus:ring-1 focus:ring-primary"
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
                    "rounded-xl px-4 py-2 text-body-sm font-semibold transition",
                    tab === t.id
                      ? "bg-primary-container text-on-primary-container shadow-md"
                      : "bg-surface-container-high text-on-surface-variant hover:bg-surface-variant hover:text-on-surface",
                  )}
                >
                  {t.label}
                </button>
              ))}
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="border-outline-variant/50 bg-transparent font-semibold text-on-surface-variant hover:bg-surface-container-high hover:text-on-surface"
              >
                <Filter className="h-4 w-4" />
                Filtros
              </Button>
            </div>
          </div>

          <div className="overflow-hidden rounded-xl border border-outline-variant/30 bg-surface-container shadow-md">
            <div className="flex flex-wrap items-center justify-between gap-3 border-b border-outline-variant/30 px-4 py-4 md:px-6">
              <div>
                <h2 className="font-headline text-headline-md font-semibold text-on-surface">Lista de candidatos</h2>
                <p className="mt-0.5 text-body-sm text-on-surface-variant">{totalFiltered} resultados</p>
              </div>
              <div className="flex items-center gap-2">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  className="border-outline-variant/50 bg-transparent font-semibold text-on-surface hover:bg-surface-container-high"
                  onClick={() => exportCsv()}
                >
                  <Download className="h-4 w-4" />
                  Exportar
                </Button>
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="shrink-0 text-on-surface-variant hover:bg-surface-container-high hover:text-on-surface"
                  aria-label="Más opciones"
                >
                  <MoreHorizontal className="h-5 w-5" />
                </Button>
              </div>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full min-w-[860px] text-left text-body-sm">
                <thead className="border-b border-outline-variant/30 bg-surface-container-lowest font-label-mono text-label-mono-sm uppercase tracking-wider text-on-surface-variant">
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
                          <ClipboardList className="h-10 w-10 text-outline" />
                          <p className="font-semibold text-on-surface">No hay candidatos con estos criterios</p>
                          <p className="text-body-sm text-on-surface-variant">
                            Probá otra búsqueda o cambiá el filtro de estado.
                          </p>
                        </div>
                      </td>
                    </tr>
                  ) : (
                    pageRows.map((r) => {
                      const av = avatarColors(r.id);
                      return (
                        <tr
                          key={r.id}
                          className="border-b border-outline-variant/20 transition-colors last:border-0 hover:bg-surface-container-high/60"
                        >
                          <td className="px-4 py-3.5 pl-5 md:pl-6">
                            <div className="flex items-center gap-3">
                              <span
                                className={cn(
                                  "flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-xs font-bold",
                                  av.bg,
                                  av.text,
                                )}
                              >
                                {r.initials}
                              </span>
                              <span className="font-medium text-on-surface">{r.name}</span>
                            </div>
                          </td>
                          <td className="max-w-[200px] truncate px-4 py-3.5 text-on-surface-variant" title={r.email ?? ""}>
                            {r.email ?? "—"}
                          </td>
                          <td className="px-4 py-3.5 tabular-nums text-on-surface">{r.interviewCount}</td>
                          <td className="px-4 py-3.5">
                            {r.level ? (
                              <span className="inline-flex rounded-full bg-tertiary-container/25 px-2.5 py-0.5 text-xs font-bold text-tertiary">
                                {r.level}
                              </span>
                            ) : (
                              <span className="text-outline">—</span>
                            )}
                          </td>
                          <td className="px-4 py-3.5">
                            {r.avgScore != null ? <ScoreBar score={r.avgScore} /> : <span className="text-outline">—</span>}
                          </td>
                          <td className="whitespace-nowrap px-4 py-3.5 text-on-surface-variant">{r.lastActivityLabel}</td>
                          <td className="px-4 py-3.5">
                            <StatusBadge badge={r.badge} />
                          </td>
                          <td className="px-4 py-3.5 pr-5 text-right md:pr-6">
                            <Link
                              href={`/interviews/${r.primaryInterviewId}`}
                              className="text-body-sm font-semibold text-primary underline-offset-2 hover:text-primary-fixed-dim hover:underline"
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
              <div className="flex flex-col gap-3 border-t border-outline-variant/30 px-4 py-4 sm:flex-row sm:items-center sm:justify-between md:px-6">
                <p className="text-body-sm text-on-surface-variant">
                  Mostrando{" "}
                  <span className="font-semibold text-on-surface">
                    {sliceStart + 1} a {Math.min(sliceStart + PAGE_SIZE, totalFiltered)}
                  </span>{" "}
                  de <span className="font-semibold text-on-surface">{totalFiltered}</span> candidatos
                </p>
                <div className="flex items-center gap-2">
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    className="border-outline-variant/50 bg-transparent font-semibold text-on-surface hover:bg-surface-container-high"
                    disabled={currentPage <= 1}
                    onClick={() => setPage((p) => Math.max(1, p - 1))}
                  >
                    <ChevronLeft className="h-4 w-4" />
                    Anterior
                  </Button>
                  <span className="font-label-mono text-label-mono-sm text-on-surface-variant">
                    Página {currentPage} / {pageCount}
                  </span>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    className="border-outline-variant/50 bg-transparent font-semibold text-on-surface hover:bg-surface-container-high"
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

        <aside className="space-y-space-md">
          <div className="rounded-xl bg-surface-container p-space-md shadow-md">
            <h3 className="flex items-center gap-2 font-headline text-body-md font-bold text-on-surface">
              <Sparkles className="h-4 w-4 text-tertiary" />
              Insights rápidos
            </h3>
            <ul className="mt-space-md space-y-3 text-body-sm leading-relaxed text-on-surface-variant">
              <li className="flex gap-2">
                <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-primary" />
                <span>
                  Hay <strong className="text-on-surface">{insights.pendingPipeline}</strong> entrevistas en flujo
                  (creada, link enviado o en curso).
                </span>
              </li>
              <li className="flex gap-2">
                <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-secondary" />
                <span>
                  Hoy hay <strong className="text-on-surface">{insights.pendingToday}</strong> con actividad reciente
                  (link o sesión abierta).
                </span>
              </li>
              <li className="flex gap-2">
                <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-tertiary" />
                <span>
                  Compará tendencias y scores en{" "}
                  <Link href="/reports" className="font-semibold text-primary hover:underline">
                    Reportes
                  </Link>
                  .
                </span>
              </li>
            </ul>
          </div>

          <div className="overflow-hidden rounded-xl bg-primary-container/20 p-space-md shadow-md ring-1 ring-primary-container/40">
            <h3 className="font-headline text-body-md font-bold text-on-primary-container">Mejorá la evaluación</h3>
            <p className="mt-space-2xs text-body-sm leading-relaxed text-on-surface-variant">
              Ajustá criterios y ponderaciones con perfiles de evaluación alineados a cada rol o cliente.
            </p>
            <Button
              type="button"
              className="mt-space-md w-full bg-primary-container font-semibold text-on-primary-container hover:bg-primary-container/90"
              variant="default"
              asChild
            >
              <Link href="/evaluation-profiles">Ir a perfiles</Link>
            </Button>
          </div>
        </aside>
      </div>
    </div>
  );
}
