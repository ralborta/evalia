import type { ReactNode } from "react";
import { prisma } from "@/lib/prisma";
import { personInitials } from "@/lib/initials";
import Link from "next/link";
import { ClipboardList, FileText, Link2, Loader2, TrendingUp } from "lucide-react";
import { RecentEvaluationsTable, type RecentRow } from "@/components/evaluator/recent-evaluations-table";
import type { VariantProps } from "class-variance-authority";
import { badgeVariants } from "@/components/ui/badge";

function startOfWeekMonday(ref: Date = new Date()) {
  const d = new Date(ref);
  const day = d.getDay();
  const diff = day === 0 ? -6 : 1 - day;
  d.setDate(d.getDate() + diff);
  d.setHours(0, 0, 0, 0);
  return d;
}

function addDays(d: Date, n: number) {
  const x = new Date(d);
  x.setDate(x.getDate() + n);
  return x;
}

function trendCopy(thisCount: number, prevCount: number) {
  const delta = thisCount - prevCount;
  if (delta === 0) return { text: "= Sin cambios", up: null as boolean | null };
  if (delta > 0) return { text: `+${delta} esta semana`, up: true };
  return { text: `${delta} esta semana`, up: false };
}

function statusLabelUpper(status: string) {
  const map: Record<string, string> = {
    CREATED: "CREADA",
    LINK_READY: "LINK ENVIADO",
    IN_PROGRESS: "EN CURSO",
    PROCESSING: "PROCESANDO",
    COMPLETED: "COMPLETADA",
    FAILED: "FALLIDA",
    EXPIRED: "EXPIRADA",
  };
  return map[status] ?? status;
}

function rowBadgeVariant(status: string): VariantProps<typeof badgeVariants>["variant"] {
  if (status === "COMPLETED") return "success";
  if (status === "FAILED" || status === "EXPIRED") return "danger";
  if (status === "PROCESSING" || status === "IN_PROGRESS") return "warning";
  if (status === "LINK_READY") return "info";
  return "secondary";
}

const DAY_LABELS = ["Lun", "Mar", "Mié", "Jue", "Vie", "Sáb", "Dom"];

function ScoreDonut({ value, max = 100 }: { value: number; max?: number }) {
  const pct = Math.min(100, Math.max(0, Math.round((value / max) * 100)));
  const r = 44;
  const c = 2 * Math.PI * r;
  const dash = (pct / 100) * c;
  const gap = c - dash;
  return (
    <div className="relative flex h-44 w-44 items-center justify-center">
      <svg viewBox="0 0 112 112" className="h-full w-full -rotate-90">
        <circle cx="56" cy="56" r={r} fill="none" stroke="#e2e8f0" strokeWidth="12" />
        <circle
          cx="56"
          cy="56"
          r={r}
          fill="none"
          stroke="#2563eb"
          strokeWidth="12"
          strokeLinecap="round"
          strokeDasharray={`${dash} ${gap}`}
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span className="text-3xl font-bold tabular-nums text-slate-900">{value}</span>
        <span className="text-sm text-slate-500">/ {max}</span>
      </div>
    </div>
  );
}

function WeeklyActivityChart({
  created,
  finished,
}: {
  created: number[];
  finished: number[];
}) {
  const w = 320;
  const h = 140;
  const pad = 28;
  const maxVal = Math.max(1, ...created, ...finished);
  const innerW = w - pad * 2;
  const innerH = h - pad - 8;
  const step = innerW / (created.length - 1 || 1);

  const line = (series: number[]) =>
    series
      .map((v, i) => {
        const x = pad + i * step;
        const y = pad + innerH - (v / maxVal) * innerH;
        return `${x},${y}`;
      })
      .join(" ");

  const createdPts = line(created);
  const finishedPts = line(finished);

  return (
    <svg viewBox={`0 0 ${w} ${h}`} className="h-auto w-full max-w-full" preserveAspectRatio="xMidYMid meet">
      {[0, 0.25, 0.5, 0.75, 1].map((t) => {
        const y = pad + innerH * (1 - t);
        return (
          <line key={t} x1={pad} y1={y} x2={w - pad} y2={y} stroke="#f1f5f9" strokeWidth="1" />
        );
      })}
      <polyline fill="none" stroke="#2563eb" strokeWidth="2.5" points={createdPts} strokeLinejoin="round" />
      <polyline fill="none" stroke="#22c55e" strokeWidth="2.5" points={finishedPts} strokeLinejoin="round" />
      {created.map((_, i) => {
        const x = pad + i * step;
        return (
          <text key={i} x={x} y={h - 2} textAnchor="middle" className="fill-slate-400 text-[10px] font-medium">
            {DAY_LABELS[i]}
          </text>
        );
      })}
    </svg>
  );
}

function LevelBars({ distribution }: { distribution: { level: string; pct: number }[] }) {
  return (
    <div className="space-y-3">
      {distribution.map(({ level, pct }) => (
        <div key={level}>
          <div className="mb-1 flex justify-between text-xs font-medium text-slate-600">
            <span>{level}</span>
            <span>{pct}%</span>
          </div>
          <div className="h-2 overflow-hidden rounded-full bg-slate-100">
            <div className="h-full rounded-full bg-blue-600 transition-all" style={{ width: `${pct}%` }} />
          </div>
        </div>
      ))}
    </div>
  );
}

export default async function DashboardPage() {
  const weekStart = startOfWeekMonday();
  const weekEnd = addDays(weekStart, 7);
  const prevWeekStart = addDays(weekStart, -7);

  const [
    totalInterviews,
    totalCompleted,
    inEvaluation,
    linksSentTotal,
    createdThisWeek,
    createdPrevWeek,
    completedThisWeek,
    completedPrevWeek,
    linksThisWeek,
    linksPrevWeek,
    inEvalThisWeek,
    inEvalPrevWeek,
    interviews,
    evaluationsAgg,
    byLevel,
  ] = await Promise.all([
    prisma.interview.count(),
    prisma.interview.count({ where: { status: "COMPLETED" } }),
    prisma.interview.count({ where: { status: { in: ["IN_PROGRESS", "PROCESSING"] } } }),
    prisma.interview.count({ where: { NOT: { status: "CREATED" } } }),
    prisma.interview.count({ where: { createdAt: { gte: weekStart, lt: weekEnd } } }),
    prisma.interview.count({ where: { createdAt: { gte: prevWeekStart, lt: weekStart } } }),
    prisma.interview.count({
      where: { status: "COMPLETED", updatedAt: { gte: weekStart, lt: weekEnd } },
    }),
    prisma.interview.count({
      where: { status: "COMPLETED", updatedAt: { gte: prevWeekStart, lt: weekStart } },
    }),
    prisma.interview.count({
      where: {
        NOT: { status: "CREATED" },
        updatedAt: { gte: weekStart, lt: weekEnd },
      },
    }),
    prisma.interview.count({
      where: {
        NOT: { status: "CREATED" },
        updatedAt: { gte: prevWeekStart, lt: weekStart },
      },
    }),
    prisma.interview.count({
      where: {
        status: { in: ["IN_PROGRESS", "PROCESSING"] },
        updatedAt: { gte: weekStart, lt: weekEnd },
      },
    }),
    prisma.interview.count({
      where: {
        status: { in: ["IN_PROGRESS", "PROCESSING"] },
        updatedAt: { gte: prevWeekStart, lt: weekStart },
      },
    }),
    prisma.interview.findMany({
      orderBy: { createdAt: "desc" },
      take: 15,
      include: {
        candidate: true,
        jobPosition: true,
        evaluationProfile: true,
        evaluation: true,
      },
    }),
    prisma.evaluation.aggregate({ _avg: { overallScore: true } }),
    prisma.evaluation.groupBy({
      by: ["estimatedLevel"],
      _count: true,
    }),
  ]);

  const dayBuckets = await Promise.all(
    [0, 1, 2, 3, 4, 5, 6].map(async (i) => {
      const d0 = addDays(weekStart, i);
      const d1 = addDays(weekStart, i + 1);
      const [c, f] = await Promise.all([
        prisma.interview.count({ where: { createdAt: { gte: d0, lt: d1 } } }),
        prisma.interview.count({
          where: { status: "COMPLETED", updatedAt: { gte: d0, lt: d1 } },
        }),
      ]);
      return { created: c, finished: f };
    }),
  );
  const createdSeries = dayBuckets.map((b) => b.created);
  const finishedSeries = dayBuckets.map((b) => b.finished);

  const avgScore = evaluationsAgg._avg.overallScore != null ? Math.round(evaluationsAgg._avg.overallScore) : null;

  const levelOrder = ["A1", "A2", "B1", "B2", "C1", "C2"];
  const levelTotal = byLevel.reduce((a, b) => a + b._count, 0) || 1;
  const distribution = levelOrder.map((level) => {
    const row = byLevel.find((x) => x.estimatedLevel === level);
    const n = row?._count ?? 0;
    return { level, pct: Math.round((n / levelTotal) * 100) };
  });

  const topLevelRow = [...byLevel].sort((a, b) => b._count - a._count)[0];
  const topLevel = topLevelRow?.estimatedLevel ?? "B2";

  const rows: RecentRow[] = interviews.map((row) => ({
    id: row.id,
    candidateName: row.candidate.name,
    initials: personInitials(row.candidate.name),
    jobTitle: row.jobPosition.title,
    profileName: row.evaluationProfile.name,
    status: row.status,
    statusLabel: statusLabelUpper(row.status),
    badgeVariant: rowBadgeVariant(row.status),
    score: row.evaluation?.overallScore ?? null,
    level: row.evaluation?.estimatedLevel ?? null,
  }));

  const t1 = trendCopy(createdThisWeek, createdPrevWeek);
  const t2 = trendCopy(completedThisWeek, completedPrevWeek);
  const t3 = trendCopy(linksThisWeek, linksPrevWeek);
  const t4 = trendCopy(inEvalThisWeek, inEvalPrevWeek);

  return (
    <div className="mx-auto max-w-6xl space-y-8">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900">Panel de evaluación</h1>
          <p className="mt-1 text-sm text-slate-600">Resumen de actividad, resultados recientes y tendencias de la semana.</p>
        </div>
        <Link
          href="/interviews/new"
          className="inline-flex shrink-0 items-center justify-center gap-2 rounded-xl bg-blue-600 px-5 py-2.5 text-sm font-semibold text-white shadow-md shadow-blue-600/25 transition hover:bg-blue-700"
        >
          + Nueva evaluación
        </Link>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <MetricCard
          icon={<ClipboardList className="h-5 w-5 text-blue-600" />}
          iconBg="bg-blue-50"
          title="Evaluaciones creadas"
          value={totalInterviews}
          trend={t1}
        />
        <MetricCard
          icon={<FileText className="h-5 w-5 text-emerald-600" />}
          iconBg="bg-emerald-50"
          title="Finalizadas"
          value={totalCompleted}
          trend={t2}
        />
        <MetricCard
          icon={<Link2 className="h-5 w-5 text-violet-600" />}
          iconBg="bg-violet-50"
          title="Con link / en curso"
          value={linksSentTotal}
          trend={t3}
        />
        <MetricCard
          icon={<Loader2 className="h-5 w-5 text-amber-600" />}
          iconBg="bg-amber-50"
          title="En evaluación"
          value={inEvaluation}
          trend={t4}
        />
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="rounded-xl border border-slate-100 bg-white p-5 shadow-sm lg:col-span-2">
          <RecentEvaluationsTable rows={rows} />
        </div>
        <div className="flex flex-col items-center justify-center rounded-xl border border-slate-100 bg-white p-6 shadow-sm">
          <p className="mb-2 text-sm font-semibold text-slate-900">Score medio</p>
          {avgScore != null ? <ScoreDonut value={avgScore} /> : <p className="text-slate-500">Sin datos aún</p>}
          <span className="mt-4 inline-flex rounded-full bg-blue-50 px-3 py-1 text-xs font-semibold text-blue-700 ring-1 ring-blue-100">
            Nivel más frecuente: {topLevel}
          </span>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="rounded-xl border border-slate-100 bg-white p-5 shadow-sm lg:col-span-2">
          <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
            <h2 className="text-base font-semibold text-slate-900">Actividad semanal</h2>
            <div className="flex flex-wrap gap-4 text-xs font-medium">
              <span className="flex items-center gap-1.5 text-slate-600">
                <span className="h-2 w-6 rounded-full bg-blue-600" /> Creadas
              </span>
              <span className="flex items-center gap-1.5 text-slate-600">
                <span className="h-2 w-6 rounded-full bg-emerald-500" /> Finalizadas
              </span>
            </div>
          </div>
          <WeeklyActivityChart created={createdSeries} finished={finishedSeries} />
        </div>
        <div className="rounded-xl border border-slate-100 bg-white p-5 shadow-sm">
          <div className="mb-4 flex items-center gap-2">
            <TrendingUp className="h-4 w-4 text-slate-500" />
            <h2 className="text-base font-semibold text-slate-900">Distribución por nivel</h2>
          </div>
          <LevelBars distribution={distribution} />
        </div>
      </div>
    </div>
  );
}

function MetricCard({
  icon,
  iconBg,
  title,
  value,
  trend,
}: {
  icon: ReactNode;
  iconBg: string;
  title: string;
  value: number;
  trend: { text: string; up: boolean | null };
}) {
  return (
    <div className="flex gap-4 rounded-xl border border-slate-100 bg-white p-4 shadow-sm">
      <span className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-xl ${iconBg}`}>{icon}</span>
      <div className="min-w-0">
        <p className="text-xs font-medium text-slate-500">{title}</p>
        <p className="mt-0.5 text-2xl font-bold tabular-nums text-slate-900">{value}</p>
        <p
          className={`mt-1 text-xs font-medium ${
            trend.up === true ? "text-emerald-600" : trend.up === false ? "text-rose-600" : "text-slate-500"
          }`}
        >
          {trend.text}
        </p>
      </div>
    </div>
  );
}
