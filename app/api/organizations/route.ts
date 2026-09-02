import { NextResponse } from "next/server";
import { fail } from "@/lib/api-response";
import { requireOrgContext } from "@/lib/org-context";

export async function GET() {
  try {
    const ctx = await requireOrgContext({ evaluator: true });
    return NextResponse.json({
      organizationId: ctx.organizationId,
      memberRole: ctx.memberRole,
      organizations: ctx.memberships,
    });
  } catch (error) {
    return fail(error);
  }
}
