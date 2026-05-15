"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";
import {
  ArrowDownRight,
  ArrowUpRight,
  BarChart3,
  CalendarDays,
  Download,
  Sparkles,
  Target,
  TrendingUp,
  Star,
} from "lucide-react";
import type { ReportsDashboardPayload } from "@/lib/reports-data";
import { formatReportDayLabel } from "@/lib/reports-data";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";

function isoDateOnly(iso: string) {
  return iso.slice(0, 10);
}

function localYmd(d: Date) {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

function pct(part: number, total: number) {
  if (total <= 0) return 0;
  return Math.round((part / total) * 100);
}

function filledAvgs(daily: { avg: number | null }[]) {
  let last = 72;
  return daily.map((d) => {
    if (d.avg != null) {
      last = d.avg;
      return d.avg;
    }
    return last;
  });
}

function scoreBandClass(score: number) {
  if (score >= 80) return "bg-emerald-50 text-emerald-800 ring-emerald-200/80";
  if (score >= 60) return "bg-slate-100 text-slate-800 ring-slate-200/80";
  return "bg-red-50 text-red-800 ring-red-200/80";
}

export function ReportsClient({ data }: { data: ReportsDashboardPayload }) {
  const router = useRouter();
  const [from, setFrom] = useState(isoDateOnly(data.fromIso));
  const [to, setTo] = useState(isoDateOnly(data.toIso));
  const [hoverIdx, setHoverIdx] = useState<number | null>(null);

  const trend = useMemo(() => {
    if (data.avgScore == null || data.prevAvgScore == null) return null;
    return data.avgScore - data.prevAvgScore;
  }, [data.avgScore, data.prevAvgScore]);

  const dailyExtremes = useMemo(() => {
    const withAvg = data.daily
      .map((d) => ({ dayIso: d.dayIso, avg: d.avg }))
      .filter((d): d is { dayIso: string; avg: number } => d.avg != null);
    if (withAvg.length === 0)
      return { best: null as null | { dayIso: string; avg: number }, worst: null as null | { dayIso: string; avg: number } };
    let best = withAvg[0]!;
    let worst = withAvg[0]!;
    for (const d of withAvg) {
      if (d.avg > best.avg) best = d;
      if (d.avg < worst.avg) worst = d;
    }
    return { best, worst };
  }, [data.daily]);

  const highPct = pct(data.highPerformers, data.total);
  const poorPct = pct(data.poor, data.total);

  const series = filledAvgs(data.daily);
  const sparkPts = sparklinePoints(series.length >= 2 ? series : [...series, ...series], 88, 28);
  const areaPts = areaChartPoints(series, 380, 120, 44, 16);

  const donutStyle = useMemo(() => {
    const t = data.total;
    if (t === 0) return { background: "#e2e8f0" as const };
    let a = 0;
    const segs: string[] = [];
    const push = (count: number, color: string) => {
      if (count <= 0) return;
      const deg = (count / t) * 360;
      const start = a;
      a += deg;
      segs.push(`${color} ${start}deg ${a}deg`);
    };
    push(data.excellent, "#10b981");
    push(data.good, "#6366f1");
    push(data.regular, "#94a3b8");
    push(data.poor, "#ef4444");
    if (segs.length === 0) return { background: "#e2e8f0" as const };
    return { background: `conic-gradient(${segs.join(", ")})` as const };
  }, [data]);

  function applyRange() {
    router.push(`/reports?from=${encodeURIComponent(from)}&to=${encodeURIComponent(to)}`);
  }

  function applyPreset(kind: "7d" | "30d" | "month") {
    const end = new Date();
    const toStr = localYmd(end);
    let start = new Date(end);
    if (kind === "7d") start.setDate(start.getDate() - 6);
    else if (kind === "30d") start.setDate(start.getDate() - 29);
    else start = new Date(end.getFullYear(), end.getMonth(), 1);
    const fromStr = localYmd(start);
    router.push(`/reports?from=${encodeURIComponent(fromStr)}&to=${encodeURIComponent(toStr)}`);
  }

  function exportCsv() {
    const header = ["Candidato", "Cargo", "Score", "Nivel", "Fecha"];
    const lines = data.exportRows.map((r) =>
      [r.candidateName, r.jobTitle, String(r.score), r.level, isoDateOnly(r.dateIso)]
        .map((c) => `"${String(c).replace(/"/g, '""')}"`)
        .join(","),
    );
    const blob = new Blob([[header.join(","), ...lines].join("\n")], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `reportes-evalia-${from}_${to}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }

  const donutGreenPct = pct(data.excellent, data.total);
  const donutBluePct = pct(data.good, data.total);
  const donutRedPct = pct(data.poor, data.total);

  const formatLongDay = (iso: string) =>
    new Intl.DateTimeFormat("es", { day: "numeric", month: "short", year: "numeric" }).format(new Date(iso));

  return (
    <div className="mx-auto max-w-6xl space-y-8 pb-12">
      <div className="relative overflow-hidden rounded-2xl border border-slate-200/80 bg-gradient-to-br from-white via-violet-50/40 to-indigo-50/30 p-6 shadow-sm md:p-8">
        <div className="pointer-events-none absolute -right-16 -top-16 h-48 w-48 rounded-full bg-violet-200/30 blur-3xl" />
        <div className="relative flex flex-col gap-6 lg:flex-row lg:items-start lg:justify-between">
          <div className="flex gap-4">
            <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-violet-600 to-indigo-700 text-white shadow-lg shadow-violet-600/25">
              <BarChart3 className="h-7 w-7" strokeWidth={2} />
            </div>
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-2">
                <h1 className="text-2xl font-bold tracking-tight text-slate-900 md:text-3xl">Reportes</h1>
                <span className="inline-flex items-center gap-1 rounded-full bg-white/90 px-3 py-1 text-xs font-semibold text-violet-800 ring-1 ring-violet-200/80 shadow-sm">
                  <Sparkles className="h-3.5 w-3.5 text-violet-500" aria-hidden />
                  {data.total} {data.total === 1 ? "evaluación" : "evaluaciones"}
                </span>
              </div>
              <p className="mt-2 max-w-xl text-sm leading-relaxed text-slate-600">
                Vista agregada de entrevistas completadas con informe. Período:{" "}
                <span className="font-semibold text-slate-800">
                  {data.fromLabel} — {data.toLabel}
                </span>
                .
              </p>
            </div>
          </div>

          <div className="flex w-full flex-col gap-3 lg:max-w-md">
            <div className="flex flex-wrap gap-2">
              <Button type="button" variant="secondary" size="sm" className="font-semibold" onClick={() => applyPreset("7d")}>
                7 días
              </Button>
              <Button type="button" variant="secondary" size="sm" className="font-semibold" onClick={() => applyPreset("30d")}>
                30 días
              </Button>
              <Button type="button" variant="secondary" size="sm" className="font-semibold" onClick={() => applyPreset("month")}>
                Mes en curso
              </Button>
            </div>
            <div className="flex flex-col gap-3 sm:flex-row sm:items-stretch">
              <div className="flex flex-1 flex-wrap items-center gap-2 rounded-xl border border-slate-200/90 bg-white/90 px-3 py-2 shadow-sm backdrop-blur-sm">
                <CalendarDays className="h-4 w-4 shrink-0 text-slate-400" />
                <input
                  type="date"
                  value={from}
                  onChange={(e) => setFrom(e.target.value)}
                  className="min-w-0 flex-1 rounded-lg border-0 bg-transparent text-sm text-slate-800 outline-none"
                  aria-label="Fecha desde"
                />
                <span className="text-slate-300">—</span>
                <input
                  type="date"
                  value={to}
                  onChange={(e) => setTo(e.target.value)}
                  className="min-w-0 flex-1 rounded-lg border-0 bg-transparent text-sm text-slate-800 outline-none"
                  aria-label="Fecha hasta"
                />
                <Button type="button" size="sm" className="shrink-0 font-semibold" onClick={() => applyRange()}>
                  Aplicar
                </Button>
              </div>
              <Button
                type="button"
                variant="outline"
                className="shrink-0 border-violet-200 font-semibold text-violet-700 hover:bg-violet-50"
                onClick={() => exportCsv()}
              >
                <Download className="h-4 w-4" />
                Exportar CSV
              </Button>
            </div>
          </div>
        </div>
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        <div className="relative overflow-hidden rounded-2xl border border-violet-200/60 bg-gradient-to-br from-white to-violet-50/50 p-5 shadow-md shadow-violet-100/40 ring-1 ring-violet-100/50">
          <div className="flex items-start justify-between gap-3">
            <div className="flex gap-3">
              <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-violet-100 text-violet-600 ring-1 ring-violet-200/80">
                <TrendingUp className="h-5 w-5" />
              </span>
              <div>
                <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">Promedio general</p>
                <p className="mt-1 text-3xl font-bold tabular-nums text-violet-700">{data.avgScore ?? "—"}</p>
                {trend != null ? (
                  <p
                    className={cn(
                      "mt-1 flex items-center gap-1 text-xs font-semibold",
                      trend >= 0 ? "text-emerald-600" : "text-red-600",
                    )}
                  >
                    {trend >= 0 ? <ArrowUpRight className="h-3.5 w-3.5" /> : <ArrowDownRight className="h-3.5 w-3.5" />}
                    {trend >= 0 ? "+" : ""}
                    {trend} pts vs. período anterior
                  </p>
                ) : (
                  <p className="mt-1 text-xs text-slate-400">Sin datos del período anterior para comparar.</p>
                )}
              </div>
            </div>
            <svg viewBox="0 0 88 28" className="h-14 w-28 shrink-0 text-violet-500" aria-hidden>
              <polyline
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinejoin="round"
                points={sparkPts}
              />
            </svg>
          </div>
        </div>

        <div className="rounded-2xl border border-slate-200/90 bg-white p-5 shadow-sm transition-shadow hover:shadow-md">
          <div className="flex items-start justify-between gap-3">
            <div className="flex gap-3">
              <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-emerald-100 text-emerald-600 ring-1 ring-emerald-200/70">
                <Star className="h-5 w-5" />
              </span>
              <div>
                <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">
                  Excelente / Bueno (≥80)
                </p>
                <p className="mt-1 text-3xl font-bold tabular-nums text-emerald-600">{data.highPerformers}</p>
                <p className="mt-1 text-xs font-medium text-slate-500">{highPct}% del total</p>
              </div>
            </div>
            <MiniDonut pct={highPct} colorClass="text-emerald-500" trackClass="text-emerald-100" />
          </div>
        </div>

        <div className="rounded-2xl border border-slate-200/90 bg-white p-5 shadow-sm transition-shadow hover:shadow-md">
          <div className="flex items-start justify-between gap-3">
            <div className="flex gap-3">
              <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-red-100 text-red-600 ring-1 ring-red-200/70">
                <Target className="h-5 w-5" />
              </span>
              <div>
                <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">Necesita mejora (&lt;60)</p>
                <p className="mt-1 text-3xl font-bold tabular-nums text-red-600">{data.poor}</p>
                <p className="mt-1 text-xs font-medium text-slate-500">{poorPct}% del total</p>
              </div>
            </div>
            <MiniDonut pct={poorPct} colorClass="text-red-500" trackClass="text-red-100" />
          </div>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-5">
        <div className="overflow-hidden rounded-2xl border border-slate-200/90 bg-white shadow-sm lg:col-span-3">
          <div className="border-b border-slate-100 bg-slate-50/50 px-5 py-4 md:px-6">
            <h2 className="text-base font-semibold text-slate-900">Detalle reciente</h2>
            <p className="mt-1 text-xs text-slate-500">
              Hasta 12 informes más recientes en el rango (fecha = generación del informe).
            </p>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full min-w-[560px] text-left text-sm">
              <thead className="border-b border-slate-100 bg-white text-[11px] font-semibold uppercase tracking-wider text-slate-500">
                <tr>
                  <th className="px-4 py-3 pl-5 md:pl-6">Candidato</th>
                  <th className="px-4 py-3">Cargo</th>
                  <th className="px-4 py-3">Score</th>
                  <th className="px-4 py-3">Nivel</th>
                  <th className="px-4 py-3">Fecha</th>
                  <th className="px-4 py-3 pr-5 text-right md:pr-6">Acción</th>
                </tr>
              </thead>
              <tbody>
                {data.rows.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="px-6 py-16 text-center">
                      <div className="mx-auto flex max-w-sm flex-col items-center gap-3">
                        <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-slate-100 text-slate-500">
                          <CalendarDays className="h-6 w-6" />
                        </span>
                        <p className="font-semibold text-slate-800">No hay evaluaciones en este rango</p>
                        <p className="text-sm leading-relaxed text-slate-500">
                          Ampliá las fechas o revisá cuando se generaron los informes. Las entrevistas en curso no
                          aparecen aquí hasta quedar completadas.
                        </p>
                      </div>
                    </td>
                  </tr>
                ) : (
                  data.rows.map((r) => (
                    <tr
                      key={r.interviewId}
                      className="border-b border-slate-50 transition-colors last:border-0 hover:bg-violet-50/40"
                    >
                      <td className="px-4 py-3.5 pl-5 md:pl-6">
                        <div className="flex items-center gap-3">
                          <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-violet-100 to-indigo-100 text-xs font-bold text-violet-900 ring-1 ring-violet-200/60">
                            {r.initials}
                          </span>
                          <span className="font-medium text-slate-900">{r.candidateName}</span>
                        </div>
                      </td>
                      <td className="max-w-[140px] truncate px-4 py-3.5 text-slate-600" title={r.jobTitle}>
                        {r.jobTitle}
                      </td>
                      <td className="px-4 py-3.5">
                        <span
                          className={cn(
                            "inline-flex min-w-[2.75rem] justify-center rounded-lg px-2.5 py-1 text-sm font-bold tabular-nums ring-1",
                            scoreBandClass(r.score),
                          )}
                        >
                          {r.score}
                        </span>
                      </td>
                      <td className="px-4 py-3.5">
                        <span className="inline-flex rounded-full bg-sky-100 px-2.5 py-0.5 text-xs font-semibold text-sky-800 ring-1 ring-sky-200/80">
                          {r.level}
                        </span>
                      </td>
                      <td className="whitespace-nowrap px-4 py-3.5 text-slate-600">
                        {new Intl.DateTimeFormat("es", { day: "numeric", month: "short", year: "numeric" }).format(
                          new Date(r.dateIso),
                        )}
                      </td>
                      <td className="px-4 py-3.5 pr-5 text-right md:pr-6">
                        <Link
                          href={`/interviews/${r.interviewId}`}
                          className="inline-flex text-sm font-semibold text-violet-600 underline-offset-2 hover:text-violet-700 hover:underline"
                        >
                          Ver detalle
                        </Link>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
          <div className="border-t border-slate-100 bg-slate-50/30 px-5 py-4 text-center md:px-6">
            <Link
              href="/interviews"
              className="text-sm font-semibold text-violet-600 underline-offset-2 hover:text-violet-700 hover:underline"
            >
              Ver todas las entrevistas
            </Link>
          </div>
        </div>

        <div className="flex flex-col rounded-2xl border border-slate-200/90 bg-white p-5 shadow-sm lg:col-span-2">
          <h2 className="text-base font-semibold text-slate-900">Distribución de scores</h2>
          <p className="mt-1 text-xs text-slate-500">Solo evaluaciones con informe en el período seleccionado.</p>
          {data.total === 0 ? (
            <div className="mt-10 flex flex-1 flex-col items-center justify-center gap-2 text-center text-sm text-slate-500">
              <div className="h-32 w-32 rounded-full bg-slate-100 ring-4 ring-slate-50" />
              <p className="font-medium text-slate-700">Sin datos para graficar</p>
            </div>
          ) : (
            <div className="mt-6 flex flex-col items-center gap-8 sm:flex-row sm:items-center sm:justify-between sm:gap-6">
              <div className="relative h-44 w-44 shrink-0">
                <div
                  className="absolute inset-0 rounded-full ring-4 ring-white shadow-inner"
                  style={donutStyle}
                />
                <div className="absolute inset-4 flex flex-col items-center justify-center rounded-full bg-white text-center shadow-sm ring-1 ring-slate-100">
                  <span className="text-3xl font-bold tabular-nums text-slate-900">{data.total}</span>
                  <span className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">Total</span>
                </div>
              </div>
              <ul className="w-full max-w-[220px] space-y-3 text-sm">
                <li className="flex items-center justify-between gap-4">
                  <span className="flex items-center gap-2 text-slate-600">
                    <span className="h-2.5 w-2.5 rounded-full bg-emerald-500" />
                    Excelente (≥90)
                  </span>
                  <span className="font-semibold tabular-nums text-slate-900">
                    {donutGreenPct}% <span className="font-normal text-slate-500">({data.excellent})</span>
                  </span>
                </li>
                <li className="flex items-center justify-between gap-4">
                  <span className="flex items-center gap-2 text-slate-600">
                    <span className="h-2.5 w-2.5 rounded-full bg-violet-500" />
                    Bueno (80-89)
                  </span>
                  <span className="font-semibold tabular-nums text-slate-900">
                    {donutBluePct}% <span className="font-normal text-slate-500">({data.good})</span>
                  </span>
                </li>
                {data.regular > 0 ? (
                  <li className="flex items-center justify-between gap-4">
                    <span className="flex items-center gap-2 text-slate-600">
                      <span className="h-2.5 w-2.5 rounded-full bg-slate-400" />
                      Regular (60-79)
                    </span>
                    <span className="font-semibold tabular-nums text-slate-900">
                      {pct(data.regular, data.total)}% <span className="font-normal text-slate-500">({data.regular})</span>
                    </span>
                  </li>
                ) : null}
                <li className="flex items-center justify-between gap-4">
                  <span className="flex items-center gap-2 text-slate-600">
                    <span className="h-2.5 w-2.5 rounded-full bg-red-500" />
                    Necesita mejora (&lt;60)
                  </span>
                  <span className="font-semibold tabular-nums text-slate-900">
                    {donutRedPct}% <span className="font-normal text-slate-500">({data.poor})</span>
                  </span>
                </li>
              </ul>
            </div>
          )}
        </div>
      </div>

      <div className="overflow-hidden rounded-2xl border border-slate-200/90 bg-white shadow-sm">
        <div className="border-b border-slate-100 bg-slate-50/40 px-5 py-4 md:px-6">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div>
              <h2 className="text-base font-semibold text-slate-900">Tendencia de promedio</h2>
              <p className="mt-1 text-xs text-slate-500">
                Promedio diario por fecha de informe. Días sin datos mantienen la línea continua con el último valor
                conocido (solo visualización).
              </p>
            </div>
            <span className="inline-flex items-center rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 shadow-sm">
              <BarChart3 className="mr-1.5 h-3.5 w-3.5 text-violet-500" aria-hidden />
              Serie diaria
            </span>
          </div>
          <div className="min-h-[2.75rem] border-b border-slate-50 px-5 py-2 md:px-6">
            {hoverIdx != null ? (
              <p className="text-sm text-slate-700">
                <span className="font-semibold text-slate-900">{formatReportDayLabel(data.daily[hoverIdx]!.dayIso)}</span>
                {data.daily[hoverIdx]!.avg != null ? (
                  <>
                    {" "}
                    · Promedio: <span className="font-bold text-violet-700">{data.daily[hoverIdx]!.avg}</span>
                  </>
                ) : (
                  <span className="text-slate-500"> · Sin evaluaciones ese día</span>
                )}
              </p>
            ) : (
              <p className="text-sm text-slate-400">Pasá el cursor por los puntos del gráfico para ver el detalle.</p>
            )}
          </div>
        </div>

        <div className="grid gap-6 p-5 md:grid-cols-[1fr_minmax(0,200px)] md:gap-8 md:p-6">
          <div className="min-w-0 overflow-x-auto">
            <svg
              viewBox="0 0 380 140"
              className="h-auto w-full min-w-[320px]"
              preserveAspectRatio="xMidYMid meet"
              role="img"
              aria-label="Gráfico de tendencia de promedio de scores"
            >
              <defs>
                <linearGradient id="repAreaFill" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#8b5cf6" stopOpacity="0.35" />
                  <stop offset="100%" stopColor="#8b5cf6" stopOpacity="0" />
                </linearGradient>
              </defs>
              {[0, 25, 50, 75, 100].map((t) => {
                const padY = 16;
                const innerH = 120 - padY * 2;
                const y = padY + innerH - (t / 100) * innerH;
                return (
                  <g key={t}>
                    <line x1="44" y1={y} x2="336" y2={y} stroke="#f1f5f9" strokeWidth="1" />
                    <text x="6" y={y + 4} className="fill-slate-400 text-[10px] font-medium">
                      {t}
                    </text>
                  </g>
                );
              })}
              {areaPts.fill ? <path d={areaPts.fill} fill="url(#repAreaFill)" /> : null}
              {areaPts.line ? (
                <path d={areaPts.line} fill="none" stroke="#7c3aed" strokeWidth="2.5" strokeLinejoin="round" />
              ) : null}
              {areaPts.circles.map((c, i) => (
                <g
                  key={data.daily[i]?.dayIso ?? i}
                  className="cursor-pointer"
                  onMouseEnter={() => setHoverIdx(i)}
                  onMouseLeave={() => setHoverIdx(null)}
                >
                  <circle cx={c.x} cy={c.y} r="14" fill="transparent" />
                  <circle
                    cx={c.x}
                    cy={c.y}
                    r={hoverIdx === i ? 5 : 3.5}
                    fill="white"
                    stroke="#7c3aed"
                    strokeWidth={hoverIdx === i ? 2.5 : 2}
                    className="transition-all duration-150"
                  />
                </g>
              ))}
              {data.daily.map((d, i) => {
                const innerW = 380 - 44 * 2;
                const step = data.daily.length > 1 ? innerW / (data.daily.length - 1) : 0;
                const x = 44 + i * step;
                return (
                  <text key={d.dayIso} x={x} y="135" textAnchor="middle" className="fill-slate-400 text-[10px] font-medium">
                    {formatReportDayLabel(d.dayIso)}
                  </text>
                );
              })}
            </svg>
          </div>

          <div className="flex flex-col justify-center gap-4 rounded-xl border border-slate-100 bg-slate-50/60 p-4 text-sm">
            <div>
              <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">Promedio del período</p>
              <p className="mt-1 text-2xl font-bold tabular-nums text-violet-700">{data.avgScore ?? "—"}</p>
            </div>
            <div className="h-px bg-slate-200/80" />
            <div>
              <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">Mejor día</p>
              {dailyExtremes.best ? (
                <p className="mt-1 font-semibold text-emerald-700">
                  {dailyExtremes.best.avg}{" "}
                  <span className="block text-xs font-normal text-slate-600">{formatLongDay(dailyExtremes.best.dayIso)}</span>
                </p>
              ) : (
                <p className="mt-1 text-slate-500">—</p>
              )}
            </div>
            <div>
              <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">Día más bajo</p>
              {dailyExtremes.worst ? (
                <p className="mt-1 font-semibold text-red-700">
                  {dailyExtremes.worst.avg}{" "}
                  <span className="block text-xs font-normal text-slate-600">{formatLongDay(dailyExtremes.worst.dayIso)}</span>
                </p>
              ) : (
                <p className="mt-1 text-slate-500">—</p>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function sparklinePoints(values: number[], w: number, h: number) {
  if (values.length < 2) return `0,${h / 2} ${w},${h / 2}`;
  const min = Math.min(...values) - 5;
  const max = Math.max(...values) + 5;
  const pad = 4;
  return values
    .map((v, i) => {
      const x = pad + (i / (values.length - 1)) * (w - pad * 2);
      const y = pad + (1 - (v - min) / (max - min || 1)) * (h - pad * 2);
      return `${x.toFixed(1)},${y.toFixed(1)}`;
    })
    .join(" ");
}

function areaChartPoints(values: number[], w: number, h: number, padX: number, padY: number) {
  const min = 0;
  const max = 100;
  const innerW = w - padX * 2;
  const innerH = h - padY * 2;
  const n = values.length;
  if (n === 0) return { fill: "", line: "", circles: [] as { x: number; y: number }[] };
  const step = n > 1 ? innerW / (n - 1) : 0;
  const pts = values.map((v, i) => {
    const x = n > 1 ? padX + i * step : padX + innerW / 2;
    const clamped = Math.min(100, Math.max(0, v));
    const y = padY + innerH - ((clamped - min) / (max - min)) * innerH;
    return { x, y };
  });
  const baseY = padY + innerH;
  const lineD = pts.map((p) => `${p.x.toFixed(1)},${p.y.toFixed(1)}`).join(" L ");
  const fill = `M ${pts[0]!.x.toFixed(1)} ${baseY.toFixed(1)} L ${lineD} L ${pts[pts.length - 1]!.x.toFixed(1)} ${baseY.toFixed(1)} Z`;
  const line = `M ${lineD}`;
  return { fill, line, circles: pts };
}

function MiniDonut({ pct, colorClass, trackClass }: { pct: number; colorClass: string; trackClass: string }) {
  const r = 18;
  const c = 2 * Math.PI * r;
  const dash = (Math.min(100, pct) / 100) * c;
  return (
    <svg viewBox="0 0 48 48" className="h-14 w-14 shrink-0 -rotate-90">
      <circle cx="24" cy="24" r={r} className={trackClass} fill="none" stroke="currentColor" strokeWidth="6" />
      <circle
        cx="24"
        cy="24"
        r={r}
        className={colorClass}
        fill="none"
        stroke="currentColor"
        strokeWidth="6"
        strokeLinecap="round"
        strokeDasharray={`${dash} ${c - dash}`}
      />
    </svg>
  );
}
