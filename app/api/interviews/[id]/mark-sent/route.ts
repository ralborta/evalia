import { fail } from "@/lib/api-response";
import { requireInterviewInOrg } from "@/lib/require-org-interview";
import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";

export async function POST(_req: Request, ctx: { params: Promise<{ id: string }> }) {
  try {
  const { id } = await ctx.params;
  await requireInterviewInOrg(id);
  const interview = await prisma.interview.update({
    where: { id },
    data: { sentManuallyAt: new Date() },
  });
  return NextResponse.json(interview);
  } catch (error) {
    return fail(error);
  }
}
