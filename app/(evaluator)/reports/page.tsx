import { getReportsDashboardData } from "@/lib/reports-data";
import { ReportsClient } from "@/components/evaluator/reports-client";

export default async function ReportsPage({
  searchParams,
}: {
  searchParams: Promise<{ from?: string; to?: string }>;
}) {
  const sp = await searchParams;
  const data = await getReportsDashboardData({ fromStr: sp.from, toStr: sp.to });
  return <ReportsClient data={data} />;
}
