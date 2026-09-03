import { fail } from "@/lib/api-response";
import { requireOrgContext } from "@/lib/org-context";
import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";

export async function GET() {
  try {
    const ctx = await requireOrgContext({ evaluator: true });
    const agents = await prisma.user.findMany({
      where: {
        role: "AGENT",
        memberships: { some: { organizationId: ctx.organizationId } },
      },
      orderBy: { name: "asc" },
      select: { id: true, name: true, email: true },
    });
    return NextResponse.json(agents);
  } catch (error) {
    return fail(error);
  }
}
