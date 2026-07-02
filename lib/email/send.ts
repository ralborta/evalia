import nodemailer from "nodemailer";

export type SendEmailInput = {
  to: string;
  subject: string;
  html: string;
  text: string;
};

export type SendEmailResult =
  | { ok: true; id: string }
  | { ok: false; error: "not_configured" | "send_failed"; detail?: string };

function smtpConfig() {
  const host = process.env.SMTP_HOST?.trim();
  const user = process.env.SMTP_USER?.trim();
  const pass = process.env.SMTP_PASS?.trim();
  const from = process.env.EMAIL_FROM?.trim();
  if (!host || !user || !pass || !from) return null;

  const port = Number(process.env.SMTP_PORT?.trim() || "587");
  const secure =
    process.env.SMTP_SECURE?.trim() === "true" || process.env.SMTP_SECURE?.trim() === "1" || port === 465;

  return { host, user, pass, from, port, secure };
}

export function isEmailConfigured(): boolean {
  return smtpConfig() !== null;
}

export async function sendEmail(input: SendEmailInput): Promise<SendEmailResult> {
  const cfg = smtpConfig();
  if (!cfg) {
    return { ok: false, error: "not_configured" };
  }

  try {
    const transport = nodemailer.createTransport({
      host: cfg.host,
      port: cfg.port,
      secure: cfg.secure,
      auth: {
        user: cfg.user,
        pass: cfg.pass,
      },
    });

    const info = await transport.sendMail({
      from: cfg.from,
      to: input.to,
      subject: input.subject,
      html: input.html,
      text: input.text,
    });

    return { ok: true, id: info.messageId || "sent" };
  } catch (e) {
    const detail = e instanceof Error ? e.message : String(e);
    console.error("[email] SMTP send failed", detail);
    return { ok: false, error: "send_failed", detail };
  }
}
