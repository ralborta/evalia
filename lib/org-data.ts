import { prisma } from "@/lib/prisma";

export function interviewOrgWhere(organizationId: string) {
  return { organizationId };
}

export async function getInterviewInOrg(id: string, organizationId: string) {
  return prisma.interview.findFirst({
    where: { id, organizationId },
    include: {
      candidate: true,
      jobPosition: true,
      evaluationProfile: true,
      evaluation: { include: { metrics: true } },
    },
  });
}
