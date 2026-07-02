"use client";

import { useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { EvaliaLogo } from "@/components/brand/evalia-logo";
import { CheckCircle2, Copy, ExternalLink, Loader2, Mail, Send } from "lucide-react";

function defaultSubject(jobTitle: string) {
  return `Invitación a entrevista — ${jobTitle} | EvalIA`;
}

export function InterviewInvitationPanel({
  interviewId,
  publicUrl,
  candidateName,
  candidateEmail,
  jobTitle,
  durationMinutes,
}: {
  interviewId: string;
  publicUrl: string;
  candidateName: string;
  candidateEmail: string | null;
  jobTitle: string;
  durationMinutes: number;
}) {
  const [subject, setSubject] = useState(() => defaultSubject(jobTitle));
  const [personalMessage, setPersonalMessage] = useState("");
  const [sending, setSending] = useState(false);
  const [sent, setSent] = useState(false);
  const [copied, setCopied] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [sentTo, setSentTo] = useState<string | null>(null);

  const hasEmail = Boolean(candidateEmail?.trim());
  const previewMessage = personalMessage.trim();

  const previewBody = useMemo(() => {
    const intro = `Te invitamos a completar una entrevista conversacional por voz para el rol de ${jobTitle}.`;
  return { intro };
  }, [jobTitle]);

  async function copyLink() {
    await navigator.clipboard.writeText(publicUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  async function sendInvitation() {
    if (!hasEmail) return;
    setSending(true);
    setError(null);
    try {
      const res = await fetch(`/api/interviews/${interviewId}/send-invitation`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          subject: subject.trim() || defaultSubject(jobTitle),
          personalMessage: personalMessage.trim() || null,
        }),
      });
      const data = (await res.json().catch(() => ({}))) as {
        error?: string;
        message?: string;
        to?: string;
      };
      if (!res.ok) {
        setError(data.message ?? "No se pudo enviar la invitación. Probá nuevamente.");
        return;
      }
      setSent(true);
      setSentTo(data.to ?? candidateEmail);
    } catch {
      setError("Error de red al enviar el correo. Volvé a intentar.");
    } finally {
      setSending(false);
    }
  }

  return (
    <div className="mt-8 space-y-6">
      <div className="rounded-xl border border-emerald-200/80 bg-emerald-50/60 p-5 shadow-sm">
        <p className="text-base font-bold text-slate-900">Entrevista creada</p>
        <p className="mt-1 text-sm text-slate-600">
          El enlace ya está listo. Podés enviar la invitación por correo o compartir el link manualmente.
        </p>
        <p className="mt-3 break-all rounded-lg border border-white bg-white px-4 py-3 font-mono text-xs text-slate-800 shadow-inner">
          {publicUrl}
        </p>
        <div className="mt-4 flex flex-wrap gap-2">
          <Button type="button" variant="secondary" size="sm" className="font-semibold" onClick={() => void copyLink()}>
            <Copy className="h-4 w-4" />
            {copied ? "Copiado" : "Copiar link"}
          </Button>
          <Button type="button" variant="outline" size="sm" className="font-semibold" asChild>
            <a href={publicUrl} target="_blank" rel="noreferrer">
              <ExternalLink className="h-4 w-4" />
              Abrir link
            </a>
          </Button>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.1fr)]">
        <div className="rounded-xl border border-slate-200/90 bg-white p-6 shadow-sm">
          <div className="flex items-center gap-3">
            <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-violet-100 text-violet-700">
              <Mail className="h-5 w-5" />
            </span>
            <div>
              <h2 className="text-base font-semibold text-slate-900">Enviar invitación por email</h2>
              <p className="text-sm text-slate-600">
                {hasEmail ? (
                  <>
                    Destinatario: <strong className="text-slate-800">{candidateEmail}</strong>
                  </>
                ) : (
                  "Este candidato no tiene email. Copiá el link y enviáselo por el canal que prefieras."
                )}
              </p>
            </div>
          </div>

          {hasEmail ? (
            <div className="mt-5 space-y-4">
              <div className="space-y-2">
                <Label htmlFor="invite-subject" className="text-sm font-medium text-slate-700">
                  Asunto
                </Label>
                <Input
                  id="invite-subject"
                  value={subject}
                  onChange={(e) => setSubject(e.target.value)}
                  maxLength={200}
                  disabled={sent || sending}
                  className="rounded-xl"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="invite-message" className="text-sm font-medium text-slate-700">
                  Mensaje personal (opcional)
                </Label>
                <textarea
                  id="invite-message"
                  className="min-h-[100px] w-full resize-y rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-900 shadow-sm placeholder:text-slate-400 focus-visible:border-violet-400 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet-500/20"
                  placeholder="Ej. Hola María, quedamos en que completarías la entrevista esta semana. ¡Éxitos!"
                  maxLength={1000}
                  value={personalMessage}
                  onChange={(e) => setPersonalMessage(e.target.value.slice(0, 1000))}
                  disabled={sent || sending}
                />
                <p className="text-right text-xs text-slate-400">{personalMessage.length}/1000</p>
              </div>

              {error ? (
                <p className="rounded-xl border border-red-100 bg-red-50 px-4 py-3 text-sm text-red-800">{error}</p>
              ) : null}

              {sent ? (
                <div className="flex items-start gap-3 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-900">
                  <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0 text-emerald-600" />
                  <p>
                    Invitación enviada a <strong>{sentTo}</strong>. El candidato ya puede acceder desde el correo.
                  </p>
                </div>
              ) : (
                <Button
                  type="button"
                  className="w-full font-semibold sm:w-auto"
                  disabled={sending || !subject.trim()}
                  onClick={() => void sendInvitation()}
                >
                  {sending ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin" />
                      Enviando…
                    </>
                  ) : (
                    <>
                      <Send className="h-4 w-4" />
                      Enviar invitación
                    </>
                  )}
                </Button>
              )}
            </div>
          ) : null}
        </div>

        <div className="overflow-hidden rounded-xl border border-slate-200/90 bg-white shadow-sm">
          <div className="border-b border-slate-100 bg-slate-50/80 px-5 py-3">
            <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Vista previa del correo</p>
          </div>
          <div className="bg-gradient-to-b from-violet-50 to-slate-50 p-5">
            <div className="mx-auto max-w-md overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-md">
              <div className="h-1 bg-gradient-to-r from-violet-600 to-indigo-500" />
              <div className="space-y-4 p-5">
                <EvaliaLogo href={null} height={36} />
                <div>
                  <p className="text-[10px] font-bold uppercase tracking-wider text-violet-600">Invitación a entrevista</p>
                  <h3 className="mt-1 text-lg font-bold text-slate-900">Hola, {candidateName}</h3>
                  <p className="mt-2 text-sm leading-relaxed text-slate-600">{previewBody.intro}</p>
                </div>
                {previewMessage ? (
                  <p className="rounded-r-lg border-l-4 border-violet-500 bg-slate-50 px-3 py-2 text-sm leading-relaxed text-slate-600">
                    {previewMessage}
                  </p>
                ) : null}
                <div className="rounded-xl border border-slate-200 bg-slate-50 p-3 text-xs text-slate-600">
                  <p>
                    <strong>Rol:</strong> {jobTitle}
                  </p>
                  <p className="mt-1">
                    <strong>Duración:</strong> {durationMinutes} min
                  </p>
                </div>
                <span className="inline-flex rounded-xl bg-gradient-to-r from-violet-600 to-indigo-500 px-4 py-2.5 text-sm font-bold text-white">
                  Comenzar entrevista
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
