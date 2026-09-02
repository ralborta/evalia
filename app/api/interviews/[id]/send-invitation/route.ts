import { fail } from "@/lib/api-response";
import { requireInterviewInOrg } from "@/lib/require-org-interview";
import { getAppBaseUrl } from "@/lib/app-url";
import {
  buildInvitationEmailHtml,
  buildInvitationEmailText,
  defaultInvitationSubject,
} from "@/lib/email/invitation-template";
import { sendEmail } from "@/lib/email/send";
import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";
import { z } from "zod";

export const runtime = "nodejs";

const bodySchema = z.object({
  subject: z.string().min(3).max(200).optional(),
  personalMessage: z.string().max(1000).optional().nullable(),
});

export async function POST(req: Request, ctx: { params: Promise<{ id: string }> }) {
  try {
  const { id } = await ctx.params;
  await requireInterviewInOrg(id);
  const json = await req.json().catch(() => ({}));
  const parsed = bodySchema.safeParse(json);
  if (!parsed.success) {
    return NextResponse.json({ error: "Payload inválido" }, { status: 400 });
  }

  const interview = await prisma.interview.findUnique({
    where: { id },
    include: {
      candidate: { select: { name: true, email: true } },
      jobPosition: { select: { title: true } },
    },
  });
  if (!interview) return NextResponse.json({ error: "not_found" }, { status: 404 });

  const to = interview.candidate.email?.trim();
  if (!to) {
    return NextResponse.json(
      { error: "no_email", message: "El candidato no tiene email cargado." },
      { status: 422 },
    );
  }

  const appUrl = getAppBaseUrl();
  const publicUrl = `${appUrl}/interview/${interview.publicToken}`;
  const subject = parsed.data.subject?.trim() || defaultInvitationSubject(interview.jobPosition.title);

  const emailData = {
    candidateName: interview.candidate.name,
    jobTitle: interview.jobPosition.title,
    durationMinutes: interview.durationMinutes,
    publicUrl,
    personalMessage: parsed.data.personalMessage,
    appUrl,
  };

  const result = await sendEmail({
    to,
    subject,
    html: buildInvitationEmailHtml(emailData),
    text: buildInvitationEmailText(emailData),
  });

  if (!result.ok) {
    if (result.error === "not_configured") {
      return NextResponse.json(
        {
          error: "email_not_configured",
          message:
            "El envío de correo no está configurado. Agregá SMTP_HOST, SMTP_USER, SMTP_PASS y EMAIL_FROM en las variables de entorno.",
        },
        { status: 503 },
      );
    }
    return NextResponse.json(
      { error: "send_failed", message: result.detail ?? "No se pudo enviar el correo." },
      { status: 502 },
    );
  }

  await prisma.interview.update({
    where: { id },
    data: { sentManuallyAt: new Date() },
  });

  return NextResponse.json({
    ok: true,
    to,
    subject,
    messageId: result.id,
  });
  } catch (error) {
    return fail(error);
  }
}
