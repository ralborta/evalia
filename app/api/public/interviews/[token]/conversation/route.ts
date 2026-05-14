import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";
import { z } from "zod";
import { InterviewStatus } from "@prisma/client";

const bodySchema = z.object({
  conversationId: z.string().min(1),
});

export async function POST(req: Request, ctx: { params: Promise<{ token: string }> }) {
  const { token } = await ctx.params;
  const interview = await prisma.interview.findUnique({ where: { publicToken: token } });
  if (!interview) return NextResponse.json({ error: "invalid_token" }, { status: 404 });

  const json = await req.json().catch(() => null);
  const parsed = bodySchema.safeParse(json);
  if (!parsed.success) return NextResponse.json({ error: "invalid_body" }, { status: 400 });

  await prisma.interview.update({
    where: { id: interview.id },
    data: {
      elevenlabsConversationId: parsed.data.conversationId,
      status: InterviewStatus.IN_PROGRESS,
      startedAt: interview.startedAt ?? new Date(),
    },
  });

  return NextResponse.json({ ok: true });
}
