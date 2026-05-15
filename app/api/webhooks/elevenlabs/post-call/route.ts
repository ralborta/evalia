import { prisma } from "@/lib/prisma";
import { revalidatePath } from "next/cache";
import { NextResponse } from "next/server";
import { verifyElevenLabsWebhookSignature } from "@/lib/webhook-security";
import {
  extractAudioUrl,
  extractConversationId,
  extractDurationSeconds,
  extractInterviewIdFromPayload,
  extractSummary,
  extractTranscript,
} from "@/lib/webhook-extract";
import { runInterviewEvaluation } from "@/lib/evaluation";
import { InterviewStatus } from "@prisma/client";

export async function POST(req: Request) {
  const rawBody = await req.text();
  const signature =
    req.headers.get("elevenlabs-signature") ??
    req.headers.get("ElevenLabs-Signature") ??
    req.headers.get("x-elevenlabs-signature");

  if (!verifyElevenLabsWebhookSignature(rawBody, signature)) {
    return NextResponse.json({ error: "invalid_signature" }, { status: 401 });
  }

  let payload: unknown;
  try {
    payload = JSON.parse(rawBody);
  } catch {
    return NextResponse.json({ error: "invalid_json" }, { status: 400 });
  }

  const conversationId = extractConversationId(payload);
  const externalId = conversationId ?? `anon_${crypto.randomUUID()}`;

  let event;
  try {
    event = await prisma.webhookEvent.create({
      data: {
        provider: "elevenlabs",
        eventType: typeof (payload as { type?: unknown }).type === "string" ? String((payload as { type: string }).type) : "post_call",
        externalId,
        payload: payload as object,
        processed: false,
      },
    });
  } catch {
    return NextResponse.json({ ok: true, duplicate: true });
  }

  const markProcessed = () =>
    prisma.webhookEvent.update({ where: { id: event.id }, data: { processed: true } });

  if (!conversationId) {
    await markProcessed();
    return NextResponse.json({ ok: true, ignored: true });
  }

  let interview = await prisma.interview.findFirst({
    where: { elevenlabsConversationId: conversationId },
  });

  if (!interview) {
    const iid = extractInterviewIdFromPayload(payload);
    if (iid) {
      interview = await prisma.interview.findUnique({ where: { id: iid } });
    }
  }

  if (!interview) {
    await markProcessed();
    return NextResponse.json({ ok: true, interview_not_found: true });
  }

  const transcript = extractTranscript(payload) ?? interview.transcript;
  const summary = extractSummary(payload) ?? interview.summary;
  const audioUrl = extractAudioUrl(payload) ?? interview.audioUrl;
  const durationSeconds = extractDurationSeconds(payload) ?? interview.durationSeconds;

  await prisma.interview.update({
    where: { id: interview.id },
    data: {
      elevenlabsConversationId: conversationId,
      transcript: transcript ?? undefined,
      summary: summary ?? undefined,
      audioUrl: audioUrl ?? undefined,
      durationSeconds: durationSeconds ?? undefined,
      rawWebhookPayload: payload as object,
      status: InterviewStatus.PROCESSING,
    },
  });

  try {
    if (transcript?.trim()) {
      await runInterviewEvaluation(interview.id);
    } else {
      await prisma.interview.update({
        where: { id: interview.id },
        data: { status: InterviewStatus.FAILED },
      });
    }
  } catch (e) {
    console.error("evaluation_error", e);
    await prisma.interview.update({
      where: { id: interview.id },
      data: { status: InterviewStatus.FAILED },
    });
  }

  await markProcessed();

  revalidatePath("/dashboard");
  revalidatePath("/interviews");
  revalidatePath(`/interviews/${interview.id}`);

  return NextResponse.json({ ok: true });
}
