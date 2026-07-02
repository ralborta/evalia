import { getAppBaseUrl } from "@/lib/app-url";

export type InvitationEmailData = {
  candidateName: string;
  jobTitle: string;
  durationMinutes: number;
  publicUrl: string;
  personalMessage?: string | null;
  appUrl?: string;
};

export function defaultInvitationSubject(jobTitle: string): string {
  return `Invitación a entrevista — ${jobTitle} | EvalIA`;
}

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function formatPersonalMessage(message: string): string {
  return escapeHtml(message.trim()).replace(/\n/g, "<br />");
}

export function buildInvitationEmailHtml(data: InvitationEmailData): string {
  const appUrl = data.appUrl ?? getAppBaseUrl();
  const logoUrl = `${appUrl}/logo-evalia.png`;
  const name = escapeHtml(data.candidateName);
  const job = escapeHtml(data.jobTitle);
  const url = escapeHtml(data.publicUrl);
  const personalBlock = data.personalMessage?.trim()
    ? `<p style="margin:0 0 20px;font-size:15px;line-height:1.6;color:#475569;background:#f8fafc;border-left:4px solid #7c3aed;padding:14px 16px;border-radius:0 8px 8px 0;">${formatPersonalMessage(data.personalMessage)}</p>`
    : "";

  return `<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>Invitación a entrevista</title>
</head>
<body style="margin:0;padding:0;background:#f1f5f9;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;">
  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background:linear-gradient(180deg,#ede9fe 0%,#f1f5f9 42%);padding:32px 16px;">
    <tr>
      <td align="center">
        <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="max-width:560px;">
          <tr>
            <td align="center" style="padding-bottom:24px;">
              <img src="${logoUrl}" alt="EvalIA" width="180" height="60" style="display:block;height:auto;max-width:180px;border:0;" />
            </td>
          </tr>
          <tr>
            <td style="background:#ffffff;border-radius:16px;border:1px solid #e2e8f0;box-shadow:0 4px 24px rgba(15,23,42,0.06);overflow:hidden;">
              <div style="height:4px;background:linear-gradient(90deg,#7c3aed,#6366f1);"></div>
              <div style="padding:32px 28px;">
                <p style="margin:0 0 8px;font-size:12px;font-weight:700;letter-spacing:0.08em;text-transform:uppercase;color:#7c3aed;">Invitación a entrevista</p>
                <h1 style="margin:0 0 16px;font-size:22px;line-height:1.3;font-weight:700;color:#0f172a;">Hola, ${name}</h1>
                <p style="margin:0 0 20px;font-size:15px;line-height:1.65;color:#475569;">
                  Te invitamos a completar una <strong style="color:#334155;">entrevista conversacional por voz</strong> para el rol de
                  <strong style="color:#334155;">${job}</strong>. Podés hacerla cuando te convenga, desde tu computadora o celular con micrófono.
                </p>
                ${personalBlock}
                <table role="presentation" cellspacing="0" cellpadding="0" style="margin:0 0 24px;width:100%;background:#f8fafc;border-radius:12px;border:1px solid #e2e8f0;">
                  <tr>
                    <td style="padding:16px 18px;">
                      <p style="margin:0 0 6px;font-size:12px;font-weight:600;color:#64748b;text-transform:uppercase;letter-spacing:0.05em;">Detalles</p>
                      <p style="margin:0;font-size:14px;line-height:1.6;color:#334155;">
                        <strong>Rol:</strong> ${job}<br />
                        <strong>Duración estimada:</strong> ${data.durationMinutes} minutos<br />
                        <strong>Modalidad:</strong> Conversación por voz en línea
                      </p>
                    </td>
                  </tr>
                </table>
                <table role="presentation" cellspacing="0" cellpadding="0" style="margin:0 0 24px;">
                  <tr>
                    <td style="border-radius:12px;background:linear-gradient(135deg,#7c3aed,#6366f1);">
                      <a href="${url}" target="_blank" rel="noopener noreferrer" style="display:inline-block;padding:14px 28px;font-size:15px;font-weight:700;color:#ffffff;text-decoration:none;border-radius:12px;">
                        Comenzar entrevista
                      </a>
                    </td>
                  </tr>
                </table>
                <p style="margin:0 0 8px;font-size:13px;line-height:1.6;color:#64748b;">
                  Si el botón no funciona, copiá y pegá este enlace en tu navegador:
                </p>
                <p style="margin:0;font-size:12px;line-height:1.5;word-break:break-all;color:#7c3aed;">
                  <a href="${url}" style="color:#7c3aed;text-decoration:underline;">${url}</a>
                </p>
              </div>
            </td>
          </tr>
          <tr>
            <td align="center" style="padding:24px 12px 8px;">
              <p style="margin:0;font-size:12px;line-height:1.5;color:#94a3b8;">
                EvalIA — Centro de evaluación conversacional<br />
                Este enlace es personal e intransferible.
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;
}

export function buildInvitationEmailText(data: InvitationEmailData): string {
  const lines = [
    `Hola, ${data.candidateName},`,
    "",
    `Te invitamos a completar una entrevista conversacional por voz para el rol de ${data.jobTitle}.`,
    `Duración estimada: ${data.durationMinutes} minutos.`,
    "",
  ];
  if (data.personalMessage?.trim()) {
    lines.push(data.personalMessage.trim(), "");
  }
  lines.push(`Comenzá acá: ${data.publicUrl}`, "", "— EvalIA");
  return lines.join("\n");
}
