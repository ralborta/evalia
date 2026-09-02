import { fail } from "@/lib/api-response";
import { requireOrgContext } from "@/lib/org-context";
import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";

export async function GET() {
  try {
    const ctx = await requireOrgContext();
    const profiles = await prisma.evaluationProfile.findMany({
      where: { organizationId: ctx.organizationId },
      orderBy: { name: "asc" },
    });
    return NextResponse.json(profiles);
  } catch (error) {
    return fail(error);
  }
}
