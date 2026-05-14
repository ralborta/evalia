import { getAppBaseUrl } from "@/lib/app-url";
import { prisma } from "@/lib/prisma";
import { notFound } from "next/navigation";
import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ReprocessEvaluation } from "./reprocess";

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
    <div className="mx-auto max-w-5xl space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <p className="text-xs text-slate-500">
            <Link href="/interviews" className="hover:underline">
              Entrevistas
            </Link>{" "}
            / Detalle
          </p>
          <h1 className="mt-1 text-2xl font-semibold text-slate-900">{interview.candidate.name}</h1>
          <p className="text-slate-600">{interview.jobPosition.title}</p>
          <div className="mt-2 flex flex-wrap gap-2 text-xs text-slate-500">
            <span>Estado: {interview.status}</span>
            <span>•</span>
            <span>Perfil: {interview.evaluationProfile.name}</span>
            {interview.durationSeconds ? (
              <>
                <span>•</span>
                <span>Duración: {Math.round(interview.durationSeconds / 60)} min</span>
              </>
            ) : null}
          </div>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button variant="outline" size="sm" asChild>
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
        <Card>
          <CardContent className="py-10 text-center text-sm text-slate-500">
            Aún no hay evaluación generada. Cuando ElevenLabs envíe el webhook post-call o pulses reprocesar (si ya hay
            transcripción), aparecerá el informe aquí.
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
          <Badge variant="outline">{interview.elevenlabsConversationId ?? "sin conversation id"}</Badge>
        </CardHeader>
        <CardContent>
          <pre className="max-h-96 overflow-auto whitespace-pre-wrap rounded-lg bg-slate-900 p-4 text-xs text-slate-100">
            {interview.transcript ?? "Sin transcripción todavía."}
          </pre>
        </CardContent>
      </Card>
    </div>
  );
}
