import { getAppBaseUrl } from "@/lib/app-url";
import { prisma } from "@/lib/prisma";
import { notFound } from "next/navigation";
import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ReprocessEvaluation } from "./reprocess";
import { ImportElevenLabsForm } from "./import-elevenlabs-form";

const recLabel: Record<string, string> = {
  RECOMMENDED: "Recomendado",
  RECOMMENDED_WITH_OBSERVATIONS: "Recomendado con observaciones",
  NEEDS_HUMAN_REVIEW: "Requiere revisión humana",
  NOT_RECOMMENDED_FOR_ROLE: "No recomendado para este rol",
};

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

  return (
    <div className="mx-auto max-w-5xl space-y-8">
      <div className="flex flex-col gap-6 lg:flex-row lg:items-start lg:justify-between">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wider text-violet-600">
            <Link href="/interviews" className="hover:underline">
              Entrevistas
            </Link>{" "}
            / Detalle
          </p>
          <h1 className="mt-2 text-3xl font-bold tracking-tight text-slate-900">{interview.candidate.name}</h1>
          <p className="mt-1 text-lg text-slate-600">{interview.jobPosition.title}</p>
          <div className="mt-4 flex flex-wrap gap-2 text-sm text-slate-500">
            <span className="rounded-full bg-slate-100 px-3 py-1 font-medium text-slate-700">{interview.status}</span>
            <span className="rounded-full bg-violet-50 px-3 py-1 font-medium text-violet-800">
              {interview.evaluationProfile.name}
            </span>
            {interview.durationSeconds ? (
              <span className="rounded-full bg-slate-100 px-3 py-1 font-medium text-slate-700">
                ~{Math.round(interview.durationSeconds / 60)} min
              </span>
            ) : null}
          </div>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button variant="secondary" size="sm" asChild>
            <a href={publicLink} target="_blank" rel="noreferrer">
              Abrir sala pública
            </a>
          </Button>
          <ReprocessEvaluation interviewId={interview.id} hasTranscript={!!interview.transcript?.trim()} />
        </div>
      </div>

      {interview.evaluation ? (
        <>
          <div className="grid gap-4 md:grid-cols-3">
            <Card className="md:col-span-1 border-violet-200 bg-violet-50/60">
              <CardHeader>
                <CardTitle className="text-base text-violet-900">Puntaje general</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-4xl font-bold text-violet-800">{interview.evaluation.overallScore}</p>
                <p className="mt-1 text-sm text-violet-900/80">Nivel estimado: {interview.evaluation.estimatedLevel}</p>
                <p className="mt-3 text-sm font-medium text-slate-800">
                  {recLabel[interview.evaluation.recommendation] ?? interview.evaluation.recommendation}
                </p>
                {interview.evaluation.operationalRisk ? (
                  <p className="mt-1 text-xs text-slate-600">Riesgo operativo: {interview.evaluation.operationalRisk}</p>
                ) : null}
              </CardContent>
            </Card>
            <Card className="md:col-span-2">
              <CardHeader>
                <CardTitle className="text-base">Resumen ejecutivo</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm leading-relaxed text-slate-700">{interview.evaluation.executiveSummary}</p>
              </CardContent>
            </Card>
          </div>

          <Card>
            <CardHeader>
              <CardTitle className="text-base">Métricas</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {interview.evaluation.metrics.map((m) => (
                <div key={m.id}>
                  <div className="mb-1 flex justify-between text-sm">
                    <span className="font-medium text-slate-800">{m.label}</span>
                    <span className="text-slate-600">{m.score}/100</span>
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
            <Card className="md:col-span-1">
              <CardHeader>
                <CardTitle className="text-base text-emerald-800">Fortalezas</CardTitle>
              </CardHeader>
              <CardContent>
                <ul className="list-inside list-disc text-sm text-slate-700">
                  {(interview.evaluation.strengths as string[]).map((s, i) => (
                    <li key={i}>{s}</li>
                  ))}
                </ul>
              </CardContent>
            </Card>
            <Card className="md:col-span-1">
              <CardHeader>
                <CardTitle className="text-base text-amber-800">Áreas de mejora</CardTitle>
              </CardHeader>
              <CardContent>
                <ul className="list-inside list-disc text-sm text-slate-700">
                  {(interview.evaluation.weaknesses as string[]).map((s, i) => (
                    <li key={i}>{s}</li>
                  ))}
                </ul>
              </CardContent>
            </Card>
            <Card className="md:col-span-1">
              <CardHeader>
                <CardTitle className="text-base text-red-800">Riesgos</CardTitle>
              </CardHeader>
              <CardContent>
                <ul className="list-inside list-disc text-sm text-slate-700">
                  {(interview.evaluation.risks as string[]).map((s, i) => (
                    <li key={i}>{s}</li>
                  ))}
                </ul>
              </CardContent>
            </Card>
          </div>
        </>
      ) : (
        <Card className="border-dashed border-slate-200 bg-slate-50/50">
          <CardContent className="space-y-2 py-12 text-center text-sm leading-relaxed text-slate-600">
            <p className="text-base font-medium text-slate-800">Informe en preparación</p>
            <p>
              Cuando el candidato termina la entrevista, el informe suele aparecer solo en unos minutos. Si pasó más
              tiempo y sigue vacío, probá <strong>Reprocesar evaluación</strong> arriba (si ya hay transcripción) o
              contactá al administrador.
            </p>
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Audio</CardTitle>
        </CardHeader>
        <CardContent>
          {interview.audioUrl ? (
            <audio controls className="w-full" src={interview.audioUrl}>
              Tu navegador no soporta audio embebido.
            </audio>
          ) : (
            <p className="text-sm text-slate-500">No hay URL de audio disponible para esta entrevista.</p>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="text-base">Transcripción</CardTitle>
          <Badge variant="outline">{interview.elevenlabsConversationId ? "Conversación vinculada" : "Pendiente"}</Badge>
        </CardHeader>
        <CardContent>
          <pre className="max-h-96 overflow-auto whitespace-pre-wrap rounded-2xl border border-slate-700/80 bg-slate-950 p-5 text-xs leading-relaxed text-slate-100 shadow-inner">
            {interview.transcript ?? "Sin transcripción todavía."}
          </pre>
        </CardContent>
      </Card>

      <details className="group rounded-2xl border border-slate-200 bg-white shadow-sm open:shadow-md">
        <summary className="cursor-pointer list-none rounded-2xl px-5 py-4 text-sm font-medium text-slate-600 transition hover:bg-slate-50 [&::-webkit-details-marker]:hidden">
          <span className="flex items-center justify-between gap-3">
            <span>Soporte: recuperar conversación manualmente</span>
            <span className="text-slate-400 transition group-open:rotate-180">▼</span>
          </span>
        </summary>
        <div className="border-t border-slate-100 px-5 pb-5 pt-2">
          <ImportElevenLabsForm interviewId={interview.id} compact />
        </div>
      </details>
    </div>
  );
}
