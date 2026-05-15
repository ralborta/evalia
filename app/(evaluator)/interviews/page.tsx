import { prisma } from "@/lib/prisma";
import { personInitials } from "@/lib/initials";
import { InterviewsListClient } from "@/components/evaluator/interviews-list-client";

export default async function InterviewsListPage() {
  const [interviews, total, completed, linkSent, processing] = await Promise.all([
    prisma.interview.findMany({
      orderBy: { createdAt: "desc" },
      take: 500,
      include: {
        candidate: true,
        jobPosition: true,
        evaluationProfile: true,
        evaluation: true,
      },
    }),
    prisma.interview.count(),
    prisma.interview.count({ where: { status: "COMPLETED" } }),
    prisma.interview.count({ where: { status: "LINK_READY" } }),
    prisma.interview.count({
      where: { status: { in: ["PROCESSING", "IN_PROGRESS"] } },
    }),
  ]);

  const rows = interviews.map((i) => ({
    id: i.id,
    candidateName: i.candidate.name,
    initials: personInitials(i.candidate.name),
    jobTitle: i.jobPosition.title,
    profileName: i.evaluationProfile.name,
    status: i.status,
    level: i.evaluation?.estimatedLevel ?? null,
    score: i.evaluation?.overallScore ?? null,
    dateIso: i.createdAt.toISOString(),
  }));

  return <InterviewsListClient metrics={{ total, completed, linkSent, processing }} rows={rows} />;
}
