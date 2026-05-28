import type { ReactNode } from "react";
import { getAppBaseUrl } from "@/lib/app-url";
import { prisma } from "@/lib/prisma";
import { notFound } from "next/navigation";
import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ReprocessEvaluation } from "./reprocess";
import { ImportElevenLabsForm } from "./import-elevenlabs-form";
import { StaleProcessingActions } from "./stale-processing-actions";
import {
  ChevronDown,
  Clock,
  ExternalLink,
  Headphones,
  Info,
  Link2,
  Loader2,
} from "lucide-react";

export const dynamic = "force-dynamic";

const recLabel: Record<string, string> = {
  RECOMMENDED: "Recomendado",
  RECOMMENDED_WITH_OBSERVATIONS: "Recomendado con observaciones",
  NEEDS_HUMAN_REVIEW: "Requiere revisión humana",
  NOT_RECOMMENDED_FOR_ROLE: "No recomendado para este rol",
};

function StatusBadge({ status }: { status: string }) {
  const busy = status === "PROCESSING" || status === "IN_PROGRESS";
  return (
    <span className="inline-flex items-center gap-2 rounded-full bg-slate-100 px-3 py-1.5 text-[11px] font-bold uppercase tracking-wide text-slate-700 ring-1 ring-slate-200/90">
      {busy ? <Loader2 className="h-3.5 w-3.5 shrink-0 animate-spin text-slate-600" aria-hidden /> : null}
      {status}
    </span>
  );
}

function SectionIcon({ children }: { children: ReactNode }) {
  return (
    <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-violet-100 text-violet-600 ring-1 ring-violet-200/60">
      {children}
    </span>
  );
}

function ReportPendingIllustration() {
  return (
    <div className="hidden shrink-0 sm:block" aria-hidden>
      <svg width="120" height="100" viewBox="0 0 120 100" className="text-violet-200">
        <rect x="28" y="18" width="64" height="72" rx="8" fill="currentColor" opacity="0.35" />
        <rect x="36" y="28" width="48" height="6" rx="2" fill="currentColor" opacity="0.5" />
        <rect x="36" y="40" width="40" height="5" rx="2" fill="currentColor" opacity="0.35" />
        <rect x="36" y="50" width="44" height="5" rx="2" fill="currentColor" opacity="0.35" />
        <circle cx="88" cy="32" r="18" fill="#ede9fe" stroke="#a78bfa" strokeWidth="2" />
        <path d="M88 24v10M82 32h12" stroke="#7c3aed" strokeWidth="2" strokeLinecap="round" />
      </svg>
    </div>
  );
}

export default async function InterviewDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const interview = await prisma.interview.findUnique({
    where: { id },
    include: {
      candidate: true,
      jobPosition: true,
      evaluationProfile: true,
      evaluation: { include: { metrics: true } },
    },
  });
  if (!interview) notFound();

  const appUrl = getAppBaseUrl();
  const publicLink = `${appUrl}/interview/${interview.publicToken}`;
  const hasTranscript = !!interview.transcript?.trim();
  const linked = !!interview.elevenlabsConversationId;

  const isStuck =
    (interview.status === "PROCESSING" || interview.status === "IN_PROGRESS") && !interview.evaluation;
  const referenceTime = interview.finishedAt ?? interview.updatedAt;
  const referenceIso = new Date(referenceTime).toISOString();

  return (
    <div className="mx-auto max-w-4xl space-y-6 pb-10">
      <nav className="text-[11px] font-semibold uppercase tracking-[0.18em] text-violet-600">
        <Link href="/interviews" className="transition hover:text-violet-800 hover:underline">
          Entrevistas
        </Link>
        <span className="mx-2 text-violet-300">/</span>
        <span className="text-violet-500">Detalle</span>
      </nav>

      <div className="flex flex-col gap-6 lg:flex-row lg:items-start lg:justify-between">
        <div className="min-w-0">
          <h1 className="text-3xl font-bold tracking-tight text-slate-900">{interview.candidate.name}</h1>
          <p className="mt-1 text-base text-slate-500">{interview.jobPosition.title}</p>
          <div className="mt-4 flex flex-wrap items-center gap-2">
            <StatusBadge status={interview.status} />
            <span className="inline-flex rounded-full bg-violet-100 px-3 py-1.5 text-sm font-semibold text-violet-800 ring-1 ring-violet-200/80">
              {interview.evaluationProfile.name}
            </span>
            {interview.durationSeconds ? (
              <span className="rounded-full bg-slate-100 px-3 py-1.5 text-xs font-medium text-slate-600 ring-1 ring-slate-200/80">
                ~{Math.round(interview.durationSeconds / 60)} min
              </span>
            ) : null}
          </div>
        </div>
        <div className="flex shrink-0 flex-col items-stretch gap-2 sm:items-end">
          <div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap sm:justify-end">
            <Button
              variant="outline"
              size="sm"
              className="border-violet-200 bg-white font-semibold text-violet-800 shadow-sm hover:bg-violet-50"
              asChild
            >
              <a href={publicLink} target="_blank" rel="noreferrer" className="inline-flex items-center gap-2">
                <ExternalLink className="h-4 w-4" />
                Abrir sala pública
              </a>
            </Button>
            <ReprocessEvaluation interviewId={interview.id} hasTranscript={hasTranscript} />
          </div>
          {!hasTranscript ? (
            <p className="flex items-center justify-end gap-1.5 text-xs text-slate-500">
              <Info className="h-3.5 w-3.5 shrink-0 text-violet-500" />
              Requiere transcripción
            </p>
          ) : null}
        </div>
      </div>

      {interview.evaluation ? (
        <>
          <div className="grid gap-4 md:grid-cols-3">
            <Card className="overflow-hidden rounded-xl border border-violet-200/80 bg-gradient-to-b from-violet-50/90 to-white shadow-sm md:col-span-1">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-semibold text-violet-900">Puntaje general</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-4xl font-bold tabular-nums text-violet-700">{interview.evaluation.overallScore}</p>
                <p className="mt-1 text-sm font-medium text-violet-900/85">
                  Nivel estimado: {interview.evaluation.estimatedLevel}
                </p>
                <p className="mt-3 text-sm font-semibold text-slate-800">
                  {recLabel[interview.evaluation.recommendation] ?? interview.evaluation.recommendation}
                </p>
                {interview.evaluation.operationalRisk ? (
                  <p className="mt-2 text-xs leading-relaxed text-slate-600">
                    Riesgo operativo: {interview.evaluation.operationalRisk}
                  </p>
                ) : null}
              </CardContent>
            </Card>
            <Card className="rounded-xl border border-slate-200/90 shadow-sm md:col-span-2">
              <CardHeader className="border-b border-slate-100 pb-3">
                <CardTitle className="text-base font-semibold text-slate-900">Resumen ejecutivo</CardTitle>
              </CardHeader>
              <CardContent className="pt-4">
                <p className="text-sm leading-relaxed text-slate-700">{interview.evaluation.executiveSummary}</p>
              </CardContent>
            </Card>
          </div>

          <Card className="rounded-xl border border-slate-200/90 shadow-sm">
            <CardHeader className="border-b border-slate-100">
              <CardTitle className="text-base font-semibold text-slate-900">Métricas</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4 pt-4">
              {interview.evaluation.metrics.map((m) => (
                <div key={m.id}>
                  <div className="mb-1 flex justify-between text-sm">
                    <span className="font-medium text-slate-800">{m.label}</span>
                    <span className="tabular-nums text-slate-600">{m.score}/100</span>
                  </div>
                  <div className="h-2 overflow-hidden rounded-full bg-slate-100">
                    <div className="h-full rounded-full bg-violet-600" style={{ width: `${m.score}%` }} />
                  </div>
                  {m.comment ? <p className="mt-1 text-xs text-slate-500">{m.comment}</p> : null}
                </div>
              ))}
            </CardContent>
          </Card>

          <div className="grid gap-4 md:grid-cols-3">
            <Card className="rounded-xl border border-emerald-100 bg-emerald-50/30 shadow-sm md:col-span-1">
              <CardHeader>
                <CardTitle className="text-base font-semibold text-emerald-900">Fortalezas</CardTitle>
              </CardHeader>
              <CardContent>
                <ul className="list-inside list-disc space-y-1 text-sm leading-relaxed text-slate-700">
                  {(interview.evaluation.strengths as string[]).map((s, i) => (
                    <li key={i}>{s}</li>
                  ))}
                </ul>
              </CardContent>
            </Card>
            <Card className="rounded-xl border border-amber-100 bg-amber-50/25 shadow-sm md:col-span-1">
              <CardHeader>
                <CardTitle className="text-base font-semibold text-amber-900">Áreas de mejora</CardTitle>
              </CardHeader>
              <CardContent>
                <ul className="list-inside list-disc space-y-1 text-sm leading-relaxed text-slate-700">
                  {(interview.evaluation.weaknesses as string[]).map((s, i) => (
                    <li key={i}>{s}</li>
                  ))}
                </ul>
              </CardContent>
            </Card>
            <Card className="rounded-xl border border-red-100 bg-red-50/25 shadow-sm md:col-span-1">
              <CardHeader>
                <CardTitle className="text-base font-semibold text-red-900">Riesgos</CardTitle>
              </CardHeader>
              <CardContent>
                <ul className="list-inside list-disc space-y-1 text-sm leading-relaxed text-slate-700">
                  {(interview.evaluation.risks as string[]).map((s, i) => (
                    <li key={i}>{s}</li>
                  ))}
                </ul>
              </CardContent>
            </Card>
          </div>
        </>
      ) : isStuck ? (
        <StaleProcessingActions
          interviewId={interview.id}
          referenceIso={referenceIso}
          hasConversationId={linked}
        />
      ) : (
        <div className="overflow-hidden rounded-xl border border-slate-200/90 bg-white p-6 shadow-sm md:p-8">
          <div className="flex flex-col gap-6 md:flex-row md:items-center md:justify-between">
            <div className="flex min-w-0 gap-4">
              <SectionIcon>
                <Clock className="h-5 w-5" strokeWidth={2} />
              </SectionIcon>
              <div className="min-w-0">
                <h2 className="text-lg font-semibold text-slate-900">Informe en preparación</h2>
                <p className="mt-2 max-w-xl text-sm leading-relaxed text-slate-600">
                  El informe suele generarse en pocos minutos cuando ya hay transcripción. Si pasó más tiempo y sigue
                  vacío, probá <strong className="font-semibold text-slate-800">Reprocesar evaluación</strong> (con
                  transcripción) o importá la conversación con el id que te indique soporte, en el apartado más abajo.
                </p>
              </div>
            </div>
            <ReportPendingIllustration />
          </div>
        </div>
      )}

      <div className="overflow-hidden rounded-xl border border-slate-200/90 bg-white shadow-sm">
        <div className="flex items-start gap-4 border-b border-slate-100 p-5 md:p-6">
          <SectionIcon>
            <Headphones className="h-5 w-5" strokeWidth={2} />
          </SectionIcon>
          <div className="min-w-0 flex-1">
            <h2 className="text-base font-semibold text-slate-900">Audio</h2>
            {interview.audioUrl || linked ? (
              <div className="mt-4 flex flex-col gap-3">
                <audio controls preload="metadata" className="w-full max-w-lg" src={`/api/interviews/${interview.id}/audio`}>
                  Tu navegador no soporta audio embebido.
                </audio>
                <a
                  href={`/api/interviews/${interview.id}/audio`}
                  download
                  className="inline-flex w-fit items-center gap-1.5 text-xs font-semibold text-violet-700 underline-offset-2 hover:underline"
                >
                  Descargar grabación
                </a>
                <p className="text-xs text-slate-500">
                  El audio se carga bajo demanda. Si ves un error de reproducción, la grabación aún puede no estar lista
                  del lado del proveedor; volvé a intentar en unos minutos.
                </p>
              </div>
            ) : (
              <p className="mt-3 text-sm text-slate-600">
                Todavía no hay grabación disponible para esta entrevista.
              </p>
            )}
          </div>
        </div>
      </div>

      <div className="overflow-hidden rounded-xl border border-slate-200/90 bg-white shadow-sm">
        <div className="flex flex-wrap items-start justify-between gap-4 border-b border-slate-100 p-5 md:px-6 md:pt-6">
          <div className="flex gap-4">
            <SectionIcon>
              <span className="text-lg font-bold tracking-tight text-violet-700">T</span>
            </SectionIcon>
            <h2 className="pt-2 text-base font-semibold text-slate-900">Transcripción</h2>
          </div>
          {linked ? (
            <span className="inline-flex items-center gap-1.5 rounded-full bg-violet-50 px-3 py-1 text-[11px] font-bold uppercase tracking-wide text-violet-700 ring-1 ring-violet-100">
              <Link2 className="h-3.5 w-3.5" />
              Conversación vinculada
            </span>
          ) : (
            <Badge variant="outline" className="border-slate-200 text-slate-600">
              Pendiente
            </Badge>
          )}
        </div>
        <div className="p-5 md:p-6 md:pt-0">
          <pre className="max-h-[28rem] overflow-auto whitespace-pre-wrap rounded-xl border border-slate-800 bg-slate-950 p-5 font-mono text-xs leading-relaxed text-slate-100 shadow-inner">
            {interview.transcript ?? "Sin transcripción todavía."}
          </pre>
        </div>
      </div>

      <details className="group overflow-hidden rounded-xl border border-slate-200/90 bg-white shadow-sm open:ring-1 open:ring-violet-100">
        <summary className="flex cursor-pointer list-none items-center justify-between gap-4 px-5 py-4 text-sm font-semibold text-slate-800 transition hover:bg-slate-50 md:px-6 [&::-webkit-details-marker]:hidden">
          <span className="flex items-center gap-3">
            <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-blue-50 text-blue-600 ring-1 ring-blue-100">
              <Info className="h-4 w-4" strokeWidth={2} />
            </span>
            Soporte: recuperar conversación manualmente
          </span>
          <ChevronDown className="h-5 w-5 shrink-0 text-slate-400 transition group-open:rotate-180" />
        </summary>
        <div className="border-t border-slate-100 px-5 pb-5 pt-2 md:px-6">
          <ImportElevenLabsForm interviewId={interview.id} compact />
        </div>
      </details>
    </div>
  );
}
