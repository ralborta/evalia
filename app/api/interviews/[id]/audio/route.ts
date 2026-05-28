import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { fetchElevenLabsConversationAudio } from "@/lib/elevenlabs-conversation";
import { NextResponse } from "next/server";

export const runtime = "nodejs";
export const maxDuration = 60;

export async function GET(_req: Request, ctx: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session?.user || (session.user.role !== "EVALUATOR" && session.user.role !== "ADMIN")) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }

  const { id } = await ctx.params;
  const interview = await prisma.interview.findUnique({
    where: { id },
    select: {
      audioUrl: true,
      elevenlabsConversationId: true,
      candidate: { select: { name: true } },
    },
  });
  if (!interview) return NextResponse.json({ error: "not_found" }, { status: 404 });

  if (interview.audioUrl) {
    try {
      const upstream = await fetch(interview.audioUrl, { cache: "no-store" });
      if (!upstream.ok || !upstream.body) {
        return NextResponse.json({ error: "audio_unavailable" }, { status: 502 });
      }
      return new NextResponse(upstream.body, {
        headers: {
          "Content-Type": upstream.headers.get("content-type") ?? "audio/mpeg",
          "Cache-Control": "private, max-age=0, no-store",
        },
      });
    } catch (e) {
      console.error("[audio] fetch stored url failed", e);
    }
  }

  const convId = interview.elevenlabsConversationId?.trim();
  if (!convId) {
    return NextResponse.json({ error: "no_conversation_id" }, { status: 404 });
  }

  try {
    const audio = await fetchElevenLabsConversationAudio(convId);
    if (!audio.body) {
      return NextResponse.json({ error: "empty_audio" }, { status: 502 });
    }
    const headers: Record<string, string> = {
      "Content-Type": audio.contentType,
      "Cache-Control": "private, max-age=0, no-store",
    };
    if (audio.contentLength) headers["Content-Length"] = audio.contentLength;
    return new NextResponse(audio.body, { headers });
  } catch (e) {
    console.error("[audio] proxy failed", e);
    return NextResponse.json({ error: "audio_unavailable" }, { status: 502 });
  }
}
