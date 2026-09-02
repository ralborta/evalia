import { getReportsDashboardData } from "@/lib/reports-data";
import { ReportsClient } from "@/components/evaluator/reports-client";
import { requireOrgContext } from "@/lib/org-context";

export const dynamic = "force-dynamic";

export default async function ReportsPage({
  searchParams,
}: {
  searchParams: Promise<{ from?: string; to?: string }>;
}) {
  const ctx = await requireOrgContext({ evaluator: true });
  const sp = await searchParams;
  const data = await getReportsDashboardData({
    organizationId: ctx.organizationId,
    fromStr: sp.from,
    toStr: sp.to,
  });
  return <ReportsClient key={`${data.fromIso}-${data.toIso}`} data={data} />;
}
