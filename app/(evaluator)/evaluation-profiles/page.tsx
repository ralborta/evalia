import { prisma } from "@/lib/prisma";
import { EvaluationProfilesClient } from "@/components/evaluator/evaluation-profiles-client";
import { getProfileUiMeta } from "@/lib/evaluation-profile-ui";

function startOfWeekMonday() {
  const d = new Date();
  const day = d.getDay();
  const diff = day === 0 ? -6 : 1 - day;
  d.setDate(d.getDate() + diff);
  d.setHours(0, 0, 0, 0);
  return d;
}

export default async function EvaluationProfilesPage() {
  const weekStart = startOfWeekMonday();

  const [profiles, interviewsThisWeek] = await Promise.all([
    prisma.evaluationProfile.findMany({
      orderBy: { name: "asc" },
      include: { _count: { select: { interviews: true } } },
    }),
    prisma.interview.count({ where: { createdAt: { gte: weekStart } } }),
  ]);

  const maxCount = Math.max(0, ...profiles.map((p) => p._count.interviews));
  const topProfiles = profiles.filter((p) => p._count.interviews === maxCount && maxCount > 0);
  const mostUsedId =
    topProfiles.length > 0 ? topProfiles.slice().sort((a, b) => a.name.localeCompare(b.name))[0]!.id : null;

  const rows = profiles.map((p, index) => ({
    id: p.id,
    key: p.key,
    name: p.name,
    description: p.description,
    interviewCount: p._count.interviews,
    index,
    mostUsed: p.id === mostUsedId,
  }));

  const recommendedCount = profiles.filter((p, i) => getProfileUiMeta(p.key, i).recommended).length;

  const areasCount = new Set(profiles.map((p, i) => getProfileUiMeta(p.key, i).chip)).size;

  const metrics = {
    activeCount: profiles.length,
    recommendedCount,
    interviewsThisWeek,
    areasCount,
  };

  return <EvaluationProfilesClient metrics={metrics} rows={rows} />;
}
