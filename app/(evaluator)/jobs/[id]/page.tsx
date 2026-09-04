import Link from "next/link";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { requireEvaluatorPage } from "@/lib/require-evaluator-page";
import { JobForm } from "@/components/talent/job-form";
import { PipelineKanban } from "@/components/talent/pipeline-kanban";
import { ApplicationCreateForm } from "@/components/talent/application-create-form";
import { JobRankingPanel } from "@/components/talent/job-ranking-panel";
import { Badge } from "@/components/ui/badge";
import { canWriteOrg } from "@/lib/org-context";

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
  const canWrite = canWriteOrg(ctx.memberRole);

  return (
    <div className="mx-auto flex w-full max-w-6xl flex-col gap-space-lg">
      <div className="flex flex-col gap-space-sm sm:flex-row sm:items-start sm:justify-between">
        <div>
          <Link href="/jobs" className="text-body-sm font-semibold text-primary hover:text-primary-fixed-dim">
            ← Vacantes
          </Link>
          <h1 className="mt-space-2xs font-headline text-headline-xl font-bold text-on-surface">{job.title}</h1>
          <p className="mt-1 text-body-md text-on-surface-variant">{job.location || "Sin ubicación"}</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Link
            href={`/jobs/${job.id}/scorecard`}
            className="inline-flex rounded-lg border border-outline-variant/40 bg-surface-container px-4 py-2 text-body-sm font-semibold text-on-surface hover:bg-surface-container-high"
          >
            Editar scorecard
          </Link>
        </div>
      </div>

      <div className="grid gap-space-md lg:grid-cols-2">
        <JobForm
          jobId={job.id}
          canWrite={canWrite}
          initial={{
            title: job.title,
            description: job.description,
            location: job.location,
            status: job.status,
          }}
        />
        <div className="rounded-xl border border-outline-variant/30 bg-surface-container p-6 shadow-md">
          <h2 className="font-headline text-headline-md font-semibold text-on-surface">Scorecard publicado</h2>
          {job.publishedScorecard ? (
            <div className="mt-3 space-y-2 text-body-sm text-on-surface">
              <p>
                {job.publishedScorecard.name} · v{job.publishedScorecard.version}
              </p>
              <p className="text-on-surface-variant">
                {job.publishedScorecard.criteria.filter((c) => c.type === "EXCLUDING").length} excluyentes ·{" "}
                {job.publishedScorecard.criteria.filter((c) => c.type === "SCORED").length} criterios con peso
              </p>
            </div>
          ) : (
            <p className="mt-3 text-body-sm text-on-surface-variant">
              Aún no hay una versión publicada. Las candidaturas nuevas no quedan atadas a un scorecard histórico.
            </p>
          )}
          <ApplicationCreateForm jobId={job.id} canWrite={canWrite} />
        </div>
      </div>

      <section className="space-y-space-sm">
        <h2 className="font-headline text-headline-lg font-semibold text-on-surface">Ranking por CV</h2>
        <JobRankingPanel jobId={job.id} />
      </section>

      <section className="space-y-space-sm">
        <div className="flex items-center justify-between">
          <h2 className="font-headline text-headline-lg font-semibold text-on-surface">Pipeline</h2>
          <Badge variant="secondary">{job.applications.length} candidaturas</Badge>
        </div>
        <PipelineKanban
          jobId={job.id}
          canWrite={canWrite}
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
