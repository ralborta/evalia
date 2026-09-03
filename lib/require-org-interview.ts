import { OrgAccessError, requireOrgContext } from "@/lib/org-context";
import { prisma } from "@/lib/prisma";

export async function requireInterviewInOrg(interviewId: string) {
  const ctx = await requireOrgContext({ evaluator: true });
  const interview = await prisma.interview.findFirst({
    where: { id: interviewId, organizationId: ctx.organizationId },
  });
  if (!interview) throw new OrgAccessError("No encontrada", 404);
  return { ctx, interview };
}
