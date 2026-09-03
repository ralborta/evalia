import { getCandidatesDashboardData } from "@/lib/candidates-dashboard-data";
import { CandidatesClient } from "@/components/evaluator/candidates-client";
import { requireOrgContext } from "@/lib/org-context";

export const dynamic = "force-dynamic";

export default async function CandidatesPage() {
  const ctx = await requireOrgContext({ evaluator: true });
  const data = await getCandidatesDashboardData(ctx.organizationId);
  return <CandidatesClient data={data} />;
}
