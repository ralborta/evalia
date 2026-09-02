import { redirect } from "next/navigation";
import { OrgAccessError, requireOrgContext } from "@/lib/org-context";

export async function requireEvaluatorPage() {
  try {
    return await requireOrgContext({ evaluator: true });
  } catch (error) {
    if (error instanceof OrgAccessError && error.status === 401) redirect("/login");
    redirect("/login");
  }
}
