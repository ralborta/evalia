import type { ReactNode } from "react";
import { prisma } from "@/lib/prisma";
import { requireOrgContext } from "@/lib/org-context";
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
        <circle cx="56" cy="56" r={r} fill="none" stroke="#2d3449" strokeWidth="12" />
        <circle
          cx="56"
          cy="56"
          r={r}
          fill="none"
          stroke="#4f46e5"
          strokeWidth="12"
          strokeLinecap="round"
          strokeDasharray={`${dash} ${gap}`}
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span className="text-3xl font-bold tabular-nums text-on-surface">{value}</span>
        <span className="text-sm text-on-surface-variant">/ {max}</span>
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
          <line key={t} x1={pad} y1={y} x2={w - pad} y2={y} stroke="#2d3449" strokeWidth="1" />
        );
      })}
      <polyline fill="none" stroke="#c3c0ff" strokeWidth="2.5" points={createdPts} strokeLinejoin="round" />
      <polyline fill="none" stroke="#4edea3" strokeWidth="2.5" points={finishedPts} strokeLinejoin="round" />
      {created.map((_, i) => {
        const x = pad + i * step;
        return (
          <text key={i} x={x} y={h - 2} textAnchor="middle" className="fill-on-surface-variant text-[10px] font-medium">
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
          <div className="mb-1 flex justify-between text-xs font-medium text-on-surface-variant">
            <span>{level}</span>
            <span>{pct}%</span>
          </div>
          <div className="h-2 overflow-hidden rounded-full bg-surface-container-lowest">
            <div className="h-full rounded-full bg-primary-container transition-all" style={{ width: `${pct}%` }} />
          </div>
        </div>
      ))}
    </div>
  );
}

export default async function DashboardPage() {
  const ctx = await requireOrgContext({ evaluator: true });
  const orgWhere = { organizationId: ctx.organizationId };
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
    prisma.interview.count({ where: orgWhere }),
    prisma.interview.count({ where: { ...orgWhere, status: "COMPLETED" } }),
    prisma.interview.count({ where: { ...orgWhere, status: { in: ["IN_PROGRESS", "PROCESSING"] } } }),
    prisma.interview.count({ where: { ...orgWhere, NOT: { status: "CREATED" } } }),
    prisma.interview.count({ where: { ...orgWhere, createdAt: { gte: weekStart, lt: weekEnd } } }),
    prisma.interview.count({ where: { ...orgWhere, createdAt: { gte: prevWeekStart, lt: weekStart } } }),
    prisma.interview.count({
      where: { ...orgWhere, status: "COMPLETED", updatedAt: { gte: weekStart, lt: weekEnd } },
    }),
    prisma.interview.count({
      where: { ...orgWhere, status: "COMPLETED", updatedAt: { gte: prevWeekStart, lt: weekStart } },
    }),
    prisma.interview.count({
      where: {
        ...orgWhere,
        NOT: { status: "CREATED" },
        updatedAt: { gte: weekStart, lt: weekEnd },
      },
    }),
    prisma.interview.count({
      where: {
        ...orgWhere,
        NOT: { status: "CREATED" },
        updatedAt: { gte: prevWeekStart, lt: weekStart },
      },
    }),
    prisma.interview.count({
      where: {
        ...orgWhere,
        status: { in: ["IN_PROGRESS", "PROCESSING"] },
        updatedAt: { gte: weekStart, lt: weekEnd },
      },
    }),
    prisma.interview.count({
      where: {
        ...orgWhere,
        status: { in: ["IN_PROGRESS", "PROCESSING"] },
        updatedAt: { gte: prevWeekStart, lt: weekStart },
      },
    }),
    prisma.interview.findMany({
      where: orgWhere,
      orderBy: { createdAt: "desc" },
      take: 15,
      include: {
        candidate: true,
        jobPosition: true,
        evaluationProfile: true,
        evaluation: true,
      },
    }),
    prisma.evaluation.aggregate({
      where: { interview: orgWhere },
      _avg: { overallScore: true },
    }),
    prisma.evaluation.groupBy({
      by: ["estimatedLevel"],
      where: { interview: orgWhere },
      _count: true,
    }),
  ]);

  const dayBuckets = await Promise.all(
    [0, 1, 2, 3, 4, 5, 6].map(async (i) => {
      const d0 = addDays(weekStart, i);
      const d1 = addDays(weekStart, i + 1);
      const [c, f] = await Promise.all([
        prisma.interview.count({ where: { ...orgWhere, createdAt: { gte: d0, lt: d1 } } }),
        prisma.interview.count({
          where: { ...orgWhere, status: "COMPLETED", updatedAt: { gte: d0, lt: d1 } },
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
    <div className="mx-auto flex w-full max-w-6xl flex-col gap-space-lg">
      <section className="relative flex flex-col gap-space-md overflow-hidden rounded-xl bg-surface-container p-space-lg shadow-xl lg:flex-row lg:items-center lg:justify-between">
        <div className="pointer-events-none absolute -right-16 -top-16 h-80 w-80 rounded-full bg-primary/10 blur-3xl" />
        <div className="pointer-events-none absolute -bottom-20 -left-20 h-60 w-60 rounded-full bg-tertiary/10 blur-2xl" />
        <div className="relative z-10 flex max-w-2xl flex-col gap-space-2xs">
          <div className="flex items-center gap-space-xs">
            <span className="inline-flex items-center gap-1.5 rounded-full bg-primary-container/30 px-space-xs py-0.5 font-label-mono text-label-mono-sm text-primary">
              <span className="h-1.5 w-1.5 animate-ping rounded-full bg-secondary" />
              TALENT HUB
            </span>
            <span className="font-label-mono text-label-mono-sm text-on-surface-variant">| Evaluaciones &amp; vacantes</span>
          </div>
          <h1 className="font-headline text-headline-xl font-bold tracking-tight text-on-surface">
            Panel de Control de Talento &amp; IA
          </h1>
          <p className="text-body-md text-on-surface-variant">
            Resumen de evaluaciones orales, vacantes Talent y predicción de desempeño.
          </p>
        </div>
        <div className="relative z-10 flex flex-wrap items-center gap-space-xs">
          <Link
            href="/reports"
            className="inline-flex h-9 items-center gap-1.5 rounded-lg bg-surface-container-high px-space-sm text-body-sm text-on-surface shadow-sm transition-all hover:bg-surface-variant"
          >
            Reportes
          </Link>
          <Link
            href="/jobs"
            className="inline-flex h-9 items-center gap-1.5 rounded-lg bg-surface-container-high px-space-sm text-body-sm text-on-surface shadow-sm transition-all hover:bg-surface-variant"
          >
            Vacantes
          </Link>
          <Link
            href="/interviews/new"
            className="inline-flex h-9 items-center gap-1.5 rounded-lg bg-primary-container px-space-md text-body-sm font-semibold text-on-primary-container shadow-md transition-all hover:bg-primary-container/90"
          >
            + Nueva evaluación
          </Link>
        </div>
      </section>

      <section className="grid grid-cols-1 gap-space-md sm:grid-cols-2 xl:grid-cols-4">
        <MetricCard
          accent="primary"
          icon={<ClipboardList className="h-5 w-5" />}
          title="Evaluaciones creadas"
          value={totalInterviews}
          trend={t1}
        />
        <MetricCard
          accent="secondary"
          icon={<FileText className="h-5 w-5" />}
          title="Finalizadas"
          value={totalCompleted}
          trend={t2}
        />
        <MetricCard
          accent="tertiary"
          icon={<Link2 className="h-5 w-5" />}
          title="Con link / en curso"
          value={linksSentTotal}
          trend={t3}
        />
        <MetricCard
          accent="primary"
          icon={<Loader2 className="h-5 w-5" />}
          title="En evaluación"
          value={inEvaluation}
          trend={t4}
        />
      </section>

      <div className="grid gap-space-md lg:grid-cols-3">
        <div className="rounded-xl bg-surface-container p-space-md shadow-md lg:col-span-2">
          <RecentEvaluationsTable rows={rows} />
        </div>
        <div className="flex flex-col items-center justify-center rounded-xl bg-surface-container p-space-lg shadow-md">
          <p className="mb-2 font-headline text-headline-md font-semibold text-on-surface">Score medio</p>
          {avgScore != null ? <ScoreDonut value={avgScore} /> : <p className="text-on-surface-variant">Sin datos aún</p>}
          <span className="mt-4 inline-flex rounded-full bg-primary-container/30 px-3 py-1 font-label-mono text-label-mono-sm font-semibold text-primary">
            Nivel más frecuente: {topLevel}
          </span>
        </div>
      </div>

      <div className="grid gap-space-md lg:grid-cols-3">
        <div className="rounded-xl bg-surface-container p-space-md shadow-md lg:col-span-2">
          <div className="mb-space-md flex flex-wrap items-center justify-between gap-2">
            <h2 className="font-headline text-headline-md font-semibold text-on-surface">Actividad semanal</h2>
            <div className="flex flex-wrap gap-4 text-body-sm">
              <span className="flex items-center gap-1.5 text-on-surface-variant">
                <span className="h-2 w-6 rounded-full bg-primary" /> Creadas
              </span>
              <span className="flex items-center gap-1.5 text-on-surface-variant">
                <span className="h-2 w-6 rounded-full bg-secondary" /> Finalizadas
              </span>
            </div>
          </div>
          <WeeklyActivityChart created={createdSeries} finished={finishedSeries} />
        </div>
        <div className="rounded-xl bg-surface-container p-space-md shadow-md">
          <div className="mb-space-md flex items-center gap-2">
            <TrendingUp className="h-4 w-4 text-on-surface-variant" />
            <h2 className="font-headline text-headline-md font-semibold text-on-surface">Distribución por nivel</h2>
          </div>
          <LevelBars distribution={distribution} />
        </div>
      </div>
    </div>
  );
}

function MetricCard({
  accent,
  icon,
  title,
  value,
  trend,
}: {
  accent: "primary" | "secondary" | "tertiary";
  icon: ReactNode;
  title: string;
  value: number;
  trend: { text: string; up: boolean | null };
}) {
  const bar =
    accent === "secondary"
      ? "from-secondary to-secondary-container"
      : accent === "tertiary"
        ? "from-tertiary to-tertiary-container"
        : "from-primary to-primary-container";
  const iconTone =
    accent === "secondary"
      ? "bg-secondary-container/20 text-secondary"
      : accent === "tertiary"
        ? "bg-tertiary-container/20 text-tertiary"
        : "bg-primary-container/20 text-primary";

  return (
    <div className="group relative flex flex-col justify-between overflow-hidden rounded-xl bg-surface-container p-space-md shadow-md transition-all hover:bg-surface-container-high">
      <div className={`absolute inset-x-0 top-0 h-1 bg-gradient-to-r ${bar}`} />
      <div className="flex items-start justify-between">
        <span className="font-label-mono text-label-mono-sm uppercase tracking-wider text-on-surface-variant">
          {title}
        </span>
        <div className={`rounded-lg p-1.5 ${iconTone}`}>{icon}</div>
      </div>
      <div className="mt-space-sm flex items-baseline justify-between">
        <span className="font-headline text-stat-metric font-bold tracking-tight text-on-surface">{value}</span>
        <span
          className={`inline-flex items-center font-label-mono text-label-mono-sm font-medium ${
            trend.up === true ? "text-secondary" : trend.up === false ? "text-error" : "text-on-surface-variant"
          }`}
        >
          {trend.text}
        </span>
      </div>
    </div>
  );
}
