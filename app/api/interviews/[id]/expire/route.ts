import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";

export async function POST(_req: Request, ctx: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session?.user || (session.user.role !== "EVALUATOR" && session.user.role !== "ADMIN")) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }
  const { id } = await ctx.params;
  const interview = await prisma.interview.update({
    where: { id },
    data: {
      status: "EXPIRED",
      expiresAt: new Date(),
    },
  });
  return NextResponse.json(interview);
}
