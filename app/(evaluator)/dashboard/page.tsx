import { StitchTalentHubDashboard } from "@/components/stitch/talent-hub-dashboard";
import { requireOrgContext } from "@/lib/org-context";

/** Dashboard = markup Stitch Talent Hub (HTML portado), no layout reinventado. */
export default async function DashboardPage() {
  await requireOrgContext({ evaluator: true });
  return <StitchTalentHubDashboard />;
}
