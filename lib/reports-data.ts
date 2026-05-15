import { prisma } from "@/lib/prisma";
import { personInitials } from "@/lib/initials";

export type ReportTableRow = {
  interviewId: string;
  candidateName: string;
  initials: string;
  jobTitle: string;
  score: number;
  level: string;
  dateIso: string;
};

export type ReportDailyPoint = { dayIso: string; avg: number | null };

export type ReportsDashboardPayload = {
  fromIso: string;
  toIso: string;
  fromLabel: string;
  toLabel: string;
  prevFromIso: string;
  prevToIso: string;
  avgScore: number | null;
  prevAvgScore: number | null;
  /** ≥90 */
  excellent: number;
  /** 80–89 */
  good: number;
  /** 60–79 */
  regular: number;
  /** <60 */
  poor: number;
  /** Con evaluación en el rango */
  total: number;
  /** ≥80 (para tarjeta resumen) */
  highPerformers: number;
  rows: ReportTableRow[];
  /** Todas las filas del periodo (exportación CSV) */
  exportRows: ReportTableRow[];
  daily: ReportDailyPoint[];
};

function startOfDay(d: Date) {
  const x = new Date(d);
  x.setHours(0, 0, 0, 0);
  return x;
}

function endOfDay(d: Date) {
  const x = new Date(d);
  x.setHours(23, 59, 59, 999);
  return x;
}

function addDays(d: Date, n: number) {
  const x = new Date(d);
  x.setDate(x.getDate() + n);
  return x;
}

function daysInclusive(from: Date, to: Date) {
  const a = startOfDay(from).getTime();
  const b = startOfDay(to).getTime();
  return Math.max(1, Math.round((b - a) / 86400000) + 1);
}

function formatShortDate(d: Date) {
  return new Intl.DateTimeFormat("es", { day: "numeric", month: "short", year: "numeric" }).format(d);
}

function formatDayMonth(d: Date) {
  return new Intl.DateTimeFormat("es", { day: "numeric", month: "short" }).format(d);
}

function defaultRange(): { from: Date; to: Date } {
  const to = new Date();
  const from = addDays(startOfDay(to), -6);
  return { from, to: endOfDay(to) };
}

function parseIso(s: string | undefined): Date | null {
  if (!s) return null;
  const d = new Date(s);
  return Number.isNaN(d.getTime()) ? null : d;
}

function bucket(score: number) {
  if (score >= 90) return "excellent" as const;
  if (score >= 80) return "good" as const;
  if (score >= 60) return "regular" as const;
  return "poor" as const;
}

function mapRow(e: {
  interviewId: string;
  overallScore: number;
  estimatedLevel: string;
  createdAt: Date;
  interview: { candidate: { name: string }; jobPosition: { title: string } };
}): ReportTableRow {
  return {
    interviewId: e.interviewId,
    candidateName: e.interview.candidate.name,
    initials: personInitials(e.interview.candidate.name),
    jobTitle: e.interview.jobPosition.title,
    score: e.overallScore,
    level: e.estimatedLevel,
    dateIso: e.createdAt.toISOString(),
  };
}

export async function getReportsDashboardData(params: {
  fromStr?: string;
  toStr?: string;
}): Promise<ReportsDashboardPayload> {
  const def = defaultRange();
  let from = parseIso(params.fromStr) ?? def.from;
  let to = parseIso(params.toStr) ?? def.to;
  from = startOfDay(from);
  to = endOfDay(to);
  if (from > to) {
    const t = from;
    from = startOfDay(to);
    to = endOfDay(t);
  }

  const n = daysInclusive(from, to);
  const prevTo = endOfDay(addDays(from, -1));
  const prevFrom = startOfDay(addDays(prevTo, -(n - 1)));

  const [current, previous] = await Promise.all([
    prisma.evaluation.findMany({
      where: {
        createdAt: { gte: from, lte: to },
        interview: { status: "COMPLETED" },
      },
      include: {
        interview: { include: { candidate: true, jobPosition: true } },
      },
      orderBy: { createdAt: "desc" },
    }),
    prisma.evaluation.findMany({
      where: {
        createdAt: { gte: prevFrom, lte: prevTo },
        interview: { status: "COMPLETED" },
      },
      select: { overallScore: true },
    }),
  ]);

  const total = current.length;
  let excellent = 0;
  let good = 0;
  let regular = 0;
  let poor = 0;
  for (const e of current) {
    const b = bucket(e.overallScore);
    if (b === "excellent") excellent++;
    else if (b === "good") good++;
    else if (b === "regular") regular++;
    else poor++;
  }

  const avgScore =
    total === 0 ? null : Math.round(current.reduce((a, e) => a + e.overallScore, 0) / total);
  const prevAvgScore =
    previous.length === 0
      ? null
      : Math.round(previous.reduce((a, e) => a + e.overallScore, 0) / previous.length);

  const highPerformers = excellent + good;

  const exportRows: ReportTableRow[] = current.map(mapRow);
  const rows = exportRows.slice(0, 12);

  const daily: ReportDailyPoint[] = [];
  for (let i = 0; i < n; i++) {
    const day = startOfDay(addDays(from, i));
    const dayEnd = endOfDay(day);
    const evs = current.filter((e) => e.createdAt >= day && e.createdAt <= dayEnd);
    const avg =
      evs.length === 0 ? null : Math.round(evs.reduce((a, e) => a + e.overallScore, 0) / evs.length);
    daily.push({ dayIso: day.toISOString(), avg });
  }

  return {
    fromIso: from.toISOString(),
    toIso: to.toISOString(),
    fromLabel: formatShortDate(from),
    toLabel: formatShortDate(to),
    prevFromIso: prevFrom.toISOString(),
    prevToIso: prevTo.toISOString(),
    avgScore,
    prevAvgScore,
    excellent,
    good,
    regular,
    poor,
    total,
    highPerformers,
    rows,
    exportRows,
    daily,
  };
}

export function formatReportDayLabel(iso: string) {
  return formatDayMonth(new Date(iso));
}
