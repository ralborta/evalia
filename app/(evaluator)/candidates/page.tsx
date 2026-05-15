import { getCandidatesDashboardData } from "@/lib/candidates-dashboard-data";
import { CandidatesClient } from "@/components/evaluator/candidates-client";

export const dynamic = "force-dynamic";

export default async function CandidatesPage() {
  const data = await getCandidatesDashboardData();
  return <CandidatesClient data={data} />;
}
