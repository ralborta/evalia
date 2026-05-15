"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import {
  ArrowDownRight,
  ArrowUpRight,
  BarChart3,
  CalendarDays,
  ChevronDown,
  Download,
  Target,
  TrendingUp,
  Star,
} from "lucide-react";
import type { ReportsDashboardPayload } from "@/lib/reports-data";
import { formatReportDayLabel } from "@/lib/reports-data";
import { cn } from "@/lib/utils";

function isoDateOnly(iso: string) {
  return iso.slice(0, 10);
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

export function ReportsClient({ data }: { data: ReportsDashboardPayload }) {
  const router = useRouter();
  const [from, setFrom] = useState(isoDateOnly(data.fromIso));
  const [to, setTo] = useState(isoDateOnly(data.toIso));

  useEffect(() => {
    setFrom(isoDateOnly(data.fromIso));
    setTo(isoDateOnly(data.toIso));
  }, [data.fromIso, data.toIso]);

  const trend = useMemo(() => {
    if (data.avgScore == null || data.prevAvgScore == null) return null;
    return data.avgScore - data.prevAvgScore;
  }, [data.avgScore, data.prevAvgScore]);

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

  return (
    <div className="mx-auto max-w-6xl space-y-8 pb-10">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
        <div className="flex gap-4">
          <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-violet-100 text-violet-600 ring-1 ring-violet-200/80">
            <BarChart3 className="h-6 w-6" strokeWidth={2} />
          </div>
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-slate-900">Reportes</h1>
            <p className="mt-1 text-sm text-slate-600">Vista agregada de entrevistas completadas con evaluación.</p>
          </div>
        </div>
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
          <div className="flex flex-wrap items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 py-2 shadow-sm">
            <CalendarDays className="h-4 w-4 text-slate-400" />
            <input
              type="date"
              value={from}
              onChange={(e) => setFrom(e.target.value)}
              className="rounded-lg border-0 bg-transparent text-sm text-slate-800 outline-none"
            />
            <span className="text-slate-400">—</span>
            <input
              type="date"
              value={to}
              onChange={(e) => setTo(e.target.value)}
              className="rounded-lg border-0 bg-transparent text-sm text-slate-800 outline-none"
            />
            <button
              type="button"
              onClick={() => applyRange()}
              className="rounded-lg bg-violet-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-violet-700"
            >
              Aplicar
            </button>
          </div>
          <button
            type="button"
            onClick={() => exportCsv()}
            className="inline-flex h-10 items-center justify-center gap-2 rounded-xl border border-violet-200 bg-white px-4 text-sm font-semibold text-violet-700 shadow-sm transition hover:bg-violet-50"
          >
            <Download className="h-4 w-4" />
            Exportar
          </button>
        </div>
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        <div className="relative overflow-hidden rounded-xl border border-slate-200/90 bg-white p-5 shadow-sm">
          <div className="flex items-start justify-between gap-3">
            <div className="flex gap-3">
              <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-violet-100 text-violet-600">
                <TrendingUp className="h-5 w-5" />
              </span>
              <div>
                <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">Promedio general</p>
                <p className="mt-1 text-3xl font-bold tabular-nums text-violet-600">{data.avgScore ?? "—"}</p>
                {trend != null ? (
                  <p
                    className={cn(
                      "mt-1 flex items-center gap-1 text-xs font-semibold",
                      trend >= 0 ? "text-emerald-600" : "text-red-600",
                    )}
                  >
                    {trend >= 0 ? <ArrowUpRight className="h-3.5 w-3.5" /> : <ArrowDownRight className="h-3.5 w-3.5" />}
                    {trend >= 0 ? "+" : ""}
                    {trend} pts vs. periodo anterior
                  </p>
                ) : (
                  <p className="mt-1 text-xs text-slate-400">Sin datos del periodo anterior</p>
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

        <div className="rounded-xl border border-slate-200/90 bg-white p-5 shadow-sm">
          <div className="flex items-start justify-between gap-3">
            <div className="flex gap-3">
              <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-emerald-100 text-emerald-600">
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

        <div className="rounded-xl border border-slate-200/90 bg-white p-5 shadow-sm">
          <div className="flex items-start justify-between gap-3">
            <div className="flex gap-3">
              <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-red-100 text-red-600">
                <Target className="h-5 w-5" />
              </span>
              <div>
                <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">Necesita mejora (&lt;60)</p>
                <p className="mt-1 text-3xl font-bold tabular-nums text-red-600">{data.poor}</p>
                <p className="mt-1 text-xs font-medium text-slate-500">{poorPct}% del total</p>
              </div>
            </div>
            <MiniDonut pct={poorPct} colorClass="text-slate-400" trackClass="text-slate-100" />
          </div>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-5">
        <div className="rounded-xl border border-slate-200/90 bg-white shadow-sm lg:col-span-3">
          <div className="border-b border-slate-100 px-5 py-4">
            <h2 className="text-base font-semibold text-slate-900">Detalle reciente</h2>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full min-w-[560px] text-left text-sm">
              <thead className="border-b border-slate-100 bg-slate-50/80 text-[11px] font-semibold uppercase tracking-wider text-slate-500">
                <tr>
                  <th className="px-4 py-3">Candidato</th>
                  <th className="px-4 py-3">Cargo</th>
                  <th className="px-4 py-3">Score</th>
                  <th className="px-4 py-3">Nivel</th>
                  <th className="px-4 py-3">Fecha</th>
                  <th className="px-4 py-3 text-right">Acción</th>
                </tr>
              </thead>
              <tbody>
                {data.rows.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="px-4 py-12 text-center text-slate-500">
                      No hay evaluaciones en este rango de fechas.
                    </td>
                  </tr>
                ) : (
                  data.rows.map((r) => (
                    <tr key={r.interviewId} className="border-b border-slate-50 last:border-0 hover:bg-slate-50/60">
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2">
                          <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-violet-100 text-xs font-bold text-violet-800">
                            {r.initials}
                          </span>
                          <span className="font-medium text-slate-900">{r.candidateName}</span>
                        </div>
                      </td>
                      <td className="px-4 py-3 text-slate-600">{r.jobTitle}</td>
                      <td className="px-4 py-3 font-semibold tabular-nums text-violet-600">{r.score}</td>
                      <td className="px-4 py-3">
                        <span className="inline-flex rounded-full bg-sky-100 px-2 py-0.5 text-xs font-semibold text-sky-800 ring-1 ring-sky-200/80">
                          {r.level}
                        </span>
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap text-slate-600">
                        {new Intl.DateTimeFormat("es", { day: "numeric", month: "short", year: "numeric" }).format(
                          new Date(r.dateIso),
                        )}
                      </td>
                      <td className="px-4 py-3 text-right">
                        <Link
                          href={`/interviews/${r.interviewId}`}
                          className="text-sm font-semibold text-violet-600 hover:text-violet-700"
                        >
                          Ver detalle &gt;
                        </Link>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
          <div className="border-t border-slate-100 px-5 py-4 text-center">
            <Link href="/interviews" className="text-sm font-semibold text-violet-600 hover:text-violet-700">
              Ver todas las entrevistas &gt;
            </Link>
          </div>
        </div>

        <div className="rounded-xl border border-slate-200/90 bg-white p-5 shadow-sm lg:col-span-2">
          <h2 className="text-base font-semibold text-slate-900">Distribución de scores</h2>
          <div className="mt-6 flex flex-col items-center gap-6 sm:flex-row sm:items-center sm:justify-center">
            <div className="relative h-40 w-40 shrink-0">
              <div
                className="absolute inset-0 rounded-full ring-4 ring-white shadow-inner"
                style={donutStyle}
              />
              <div className="absolute inset-3 flex flex-col items-center justify-center rounded-full bg-white text-center shadow-sm">
                <span className="text-2xl font-bold text-slate-900">{data.total}</span>
                <span className="text-xs font-medium text-slate-500">Total</span>
              </div>
            </div>
            <ul className="min-w-[200px] space-y-3 text-sm">
              <li className="flex items-center justify-between gap-4">
                <span className="flex items-center gap-2 text-slate-600">
                  <span className="h-2.5 w-2.5 rounded-full bg-emerald-500" />
                  Excelente (≥90)
                </span>
                <span className="font-semibold text-slate-900">
                  {donutGreenPct}% <span className="text-slate-500">({data.excellent})</span>
                </span>
              </li>
              <li className="flex items-center justify-between gap-4">
                <span className="flex items-center gap-2 text-slate-600">
                  <span className="h-2.5 w-2.5 rounded-full bg-violet-500" />
                  Bueno (80-89)
                </span>
                <span className="font-semibold text-slate-900">
                  {donutBluePct}% <span className="text-slate-500">({data.good})</span>
                </span>
              </li>
              {data.regular > 0 ? (
                <li className="flex items-center justify-between gap-4">
                  <span className="flex items-center gap-2 text-slate-600">
                    <span className="h-2.5 w-2.5 rounded-full bg-slate-400" />
                    Regular (60-79)
                  </span>
                  <span className="font-semibold text-slate-900">
                    {pct(data.regular, data.total)}% <span className="text-slate-500">({data.regular})</span>
                  </span>
                </li>
              ) : null}
              <li className="flex items-center justify-between gap-4">
                <span className="flex items-center gap-2 text-slate-600">
                  <span className="h-2.5 w-2.5 rounded-full bg-red-500" />
                  Necesita mejora (&lt;60)
                </span>
                <span className="font-semibold text-slate-900">
                  {donutRedPct}% <span className="text-slate-500">({data.poor})</span>
                </span>
              </li>
            </ul>
          </div>
        </div>
      </div>

      <div className="rounded-xl border border-slate-200/90 bg-white p-5 shadow-sm">
        <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
          <h2 className="text-base font-semibold text-slate-900">Tendencia de promedio</h2>
          <div className="relative">
            <BarChart3 className="pointer-events-none absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
            <select
              className="h-10 appearance-none rounded-lg border border-slate-200 bg-white pl-9 pr-8 text-sm font-medium text-slate-800 shadow-sm focus:border-violet-400 focus:outline-none focus:ring-2 focus:ring-violet-500/20"
              defaultValue="avg"
              aria-label="Métrica de tendencia"
            >
              <option value="avg">Promedio general</option>
            </select>
            <ChevronDown className="pointer-events-none absolute right-2 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
          </div>
        </div>
        <div className="overflow-x-auto">
          <svg viewBox="0 0 380 140" className="h-auto w-full min-w-[320px]" preserveAspectRatio="xMidYMid meet">
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
              <circle key={i} cx={c.x} cy={c.y} r="3.5" fill="white" stroke="#7c3aed" strokeWidth="2" />
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
