import { prisma } from "@/lib/prisma";
import { personInitials } from "@/lib/initials";

export type CandidateBadge = "activo" | "invitado" | "inactivo";

export type CandidateDashboardRow = {
  id: string;
  name: string;
  email: string | null;
  initials: string;
  interviewCount: number;
  avgScore: number | null;
  level: string | null;
  lastActivityIso: string | null;
  lastActivityLabel: string;
  primaryInterviewId: string;
  filterBucket: "activo" | "inactivo";
  badge: CandidateBadge;
};

export type CandidatesDashboardPayload = {
  rows: CandidateDashboardRow[];
  totals: {
    totalCandidates: number;
    activeCandidates: number;
    inactiveCandidates: number;
    totalInterviews: number;
    avgScoreOverall: number | null;
    levelMode: string | null;
    lastActivityGlobalLabel: string;
    lastActivityGlobalIso: string | null;
  };
  trends: {
    activeCandidatesPct: number | null;
    interviewsCompletedPct: number | null;
  };
  insights: {
    pendingPipeline: number;
    pendingToday: number;
  };
};

function addDays(d: Date, n: number) {
  const x = new Date(d);
  x.setDate(x.getDate() + n);
  return x;
}

function startOfToday() {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  return d;
}

export function formatActivityRelative(iso: string): string {
  const d = new Date(iso);
  const now = new Date();
  const startToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const startThat = new Date(d.getFullYear(), d.getMonth(), d.getDate());
  const diffDays = Math.round((startToday.getTime() - startThat.getTime()) / 86400000);
  const time = new Intl.DateTimeFormat("es", { hour: "2-digit", minute: "2-digit" }).format(d);
  if (diffDays === 0) return `Hoy, ${time}`;
  if (diffDays === 1) return `Ayer, ${time}`;
  return new Intl.DateTimeFormat("es", {
    day: "numeric",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  }).format(d);
}

function activityTs(interview: {
  updatedAt: Date;
  finishedAt: Date | null;
  evaluation: { createdAt: Date } | null;
}): Date {
  return interview.evaluation?.createdAt ?? interview.finishedAt ?? interview.updatedAt;
}

function rowBadge(
  interviews: {
    status: string;
  }[],
  hasActive: boolean,
): CandidateBadge {
  if (hasActive) return "activo";
  const open = interviews.some((i) =>
    ["CREATED", "LINK_READY", "IN_PROGRESS", "PROCESSING"].includes(i.status),
  );
  if (open) return "invitado";
  return "inactivo";
}

function modeLevel(levels: string[]): string | null {
  if (!levels.length) return null;
  const m = new Map<string, number>();
  for (const x of levels) m.set(x, (m.get(x) ?? 0) + 1);
  let best = levels[0]!;
  let n = 0;
  for (const [k, v] of m) {
    if (v > n) {
      n = v;
      best = k;
    }
  }
  return best;
}

async function countDistinctCandidatesWithEvalBetween(from: Date, toExclusive: Date) {
  const evals = await prisma.evaluation.findMany({
    where: { createdAt: { gte: from, lt: toExclusive } },
    select: { interview: { select: { candidateId: true } } },
  });
  return new Set(evals.map((e) => e.interview.candidateId)).size;
}

async function countCompletedInterviewsBetween(from: Date, toExclusive: Date) {
  return prisma.interview.count({
    where: {
      status: "COMPLETED",
      finishedAt: { gte: from, lt: toExclusive },
    },
  });
}

export async function getCandidatesDashboardData(): Promise<CandidatesDashboardPayload> {
  const now = new Date();
  const d30 = addDays(now, -30);
  const d60 = addDays(now, -60);
  const today = startOfToday();

  const [list, lastEval, pendingPipeline, pendingToday, activeLast30, activePrev30, intLast30, intPrev30] =
    await Promise.all([
      prisma.candidate.findMany({
        where: { interviews: { some: {} } },
        orderBy: { name: "asc" },
        take: 500,
        include: {
          interviews: {
            include: {
              evaluation: { select: { overallScore: true, estimatedLevel: true, createdAt: true } },
            },
            orderBy: { updatedAt: "desc" },
          },
        },
      }),
      prisma.evaluation.findFirst({
        orderBy: { createdAt: "desc" },
        select: {
          createdAt: true,
          interview: { select: { candidate: { select: { name: true } } } },
        },
      }),
      prisma.interview.count({
        where: { status: { in: ["CREATED", "LINK_READY", "IN_PROGRESS", "PROCESSING"] } },
      }),
      prisma.interview.count({
        where: {
          status: { in: ["LINK_READY", "IN_PROGRESS"] },
          OR: [{ updatedAt: { gte: today } }, { createdAt: { gte: today } }],
        },
      }),
      countDistinctCandidatesWithEvalBetween(d30, now),
      countDistinctCandidatesWithEvalBetween(d60, d30),
      countCompletedInterviewsBetween(d30, now),
      countCompletedInterviewsBetween(d60, d30),
    ]);

  const rows: CandidateDashboardRow[] = [];
  let sumScores = 0;
  let nScores = 0;
  const levelSamples: string[] = [];

  for (const c of list) {
    const ints = c.interviews;
    const completed = ints.filter((i) => i.status === "COMPLETED" && i.evaluation);
    const hasActive = completed.length > 0;
    const scores = completed.map((i) => i.evaluation!.overallScore);
    if (scores.length) {
      const avg = Math.round(scores.reduce((a, b) => a + b, 0) / scores.length);
      sumScores += avg;
      nScores += 1;
    }
    const latestEval = [...completed].sort((a, b) => activityTs(b).getTime() - activityTs(a).getTime())[0];
    const level = latestEval?.evaluation?.estimatedLevel ? String(latestEval.evaluation.estimatedLevel) : null;
    if (level) levelSamples.push(level);

    let last: Date | null = null;
    let primaryId = ints[0]?.id ?? "";
    for (const i of ints) {
      const ts = activityTs(i);
      if (!last || ts.getTime() > last.getTime()) {
        last = ts;
        primaryId = i.id;
      }
    }
    const lastActivityIso = last ? last.toISOString() : null;
    const badge = rowBadge(ints, hasActive);

    rows.push({
      id: c.id,
      name: c.name,
      email: c.email,
      initials: personInitials(c.name),
      interviewCount: ints.length,
      avgScore: scores.length ? Math.round(scores.reduce((a, b) => a + b, 0) / scores.length) : null,
      level,
      lastActivityIso,
      lastActivityLabel: lastActivityIso ? formatActivityRelative(lastActivityIso) : "—",
      primaryInterviewId: primaryId,
      filterBucket: hasActive ? "activo" : "inactivo",
      badge,
    });
  }

  const activeCandidates = rows.filter((r) => r.filterBucket === "activo").length;
  const totalCandidates = rows.length;
  const inactiveCandidates = totalCandidates - activeCandidates;
  const totalInterviews = rows.reduce((a, r) => a + r.interviewCount, 0);
  const avgScoreOverall = nScores === 0 ? null : Math.round(sumScores / nScores);
  const levelMode = modeLevel(levelSamples);

  const lastActivityGlobalIso = lastEval?.createdAt.toISOString() ?? null;
  const lastActivityGlobalLabel = lastActivityGlobalIso
    ? `${formatActivityRelative(lastActivityGlobalIso)} · Informe generado`
    : "Sin actividad reciente";

  const activeCandidatesPct =
    activePrev30 === 0 ? (activeLast30 > 0 ? 100 : null) : Math.round(((activeLast30 - activePrev30) / activePrev30) * 100);
  const interviewsCompletedPct =
    intPrev30 === 0 ? (intLast30 > 0 ? 100 : null) : Math.round(((intLast30 - intPrev30) / intPrev30) * 100);

  return {
    rows,
    totals: {
      totalCandidates,
      activeCandidates,
      inactiveCandidates,
      totalInterviews,
      avgScoreOverall,
      levelMode,
      lastActivityGlobalLabel,
      lastActivityGlobalIso,
    },
    trends: {
      activeCandidatesPct,
      interviewsCompletedPct,
    },
    insights: {
      pendingPipeline,
      pendingToday,
    },
  };
}
