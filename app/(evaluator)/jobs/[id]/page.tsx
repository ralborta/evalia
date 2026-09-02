import Link from "next/link";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { requireEvaluatorPage } from "@/lib/require-evaluator-page";
import { JobForm } from "@/components/talent/job-form";
import { PipelineKanban } from "@/components/talent/pipeline-kanban";
import { ApplicationCreateForm } from "@/components/talent/application-create-form";
import { Badge } from "@/components/ui/badge";

export default async function JobDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const ctx = await requireEvaluatorPage();
  const { id } = await params;
  const job = await prisma.job.findFirst({
    where: { id, organizationId: ctx.organizationId },
    include: {
      stages: { orderBy: { sortOrder: "asc" } },
      publishedScorecard: { include: { criteria: true } },
      applications: {
        include: { candidate: true, stage: true },
        orderBy: { updatedAt: "desc" },
      },
    },
  });
  if (!job) notFound();

  return (
    <div className="mx-auto max-w-6xl space-y-8">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <Link href="/jobs" className="text-sm font-semibold text-blue-600 hover:text-blue-700">
            ← Vacantes
          </Link>
          <h1 className="mt-2 text-2xl font-bold text-slate-900">{job.title}</h1>
          <p className="mt-1 text-sm text-slate-600">{job.location || "Sin ubicación"}</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Link
            href={`/jobs/${job.id}/scorecard`}
            className="inline-flex rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-800 hover:bg-slate-50"
          >
            Editar scorecard
          </Link>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <JobForm
          jobId={job.id}
          initial={{
            title: job.title,
            description: job.description,
            location: job.location,
            status: job.status,
          }}
        />
        <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
          <h2 className="text-base font-semibold text-slate-900">Scorecard publicado</h2>
          {job.publishedScorecard ? (
            <div className="mt-3 space-y-2 text-sm">
              <p>
                {job.publishedScorecard.name} · v{job.publishedScorecard.version}
              </p>
              <p className="text-slate-500">
                {job.publishedScorecard.criteria.filter((c) => c.type === "EXCLUDING").length} excluyentes ·{" "}
                {job.publishedScorecard.criteria.filter((c) => c.type === "SCORED").length} criterios con peso
              </p>
            </div>
          ) : (
            <p className="mt-3 text-sm text-slate-500">
              Aún no hay una versión publicada. Las candidaturas nuevas no quedan atadas a un scorecard histórico.
            </p>
          )}
          <ApplicationCreateForm jobId={job.id} />
        </div>
      </div>

      <section className="space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold text-slate-900">Pipeline</h2>
          <Badge variant="secondary">{job.applications.length} candidaturas</Badge>
        </div>
        <PipelineKanban
          jobId={job.id}
          stages={job.stages}
          applications={job.applications.map((a) => ({
            id: a.id,
            candidateName: a.candidate.name,
            stageId: a.stageId,
          }))}
        />
      </section>
    </div>
  );
}
