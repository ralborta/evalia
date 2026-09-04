import Link from "next/link";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { requireEvaluatorPage } from "@/lib/require-evaluator-page";
import { PipelineKanban } from "@/components/talent/pipeline-kanban";
import { CvUploadPanel } from "@/components/talent/cv-upload-panel";
import { CvAnalysisPanel } from "@/components/talent/cv-analysis-panel";
import { canWriteOrg } from "@/lib/org-context";

export default async function ApplicationDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const ctx = await requireEvaluatorPage();
  const { id } = await params;
  const application = await prisma.application.findFirst({
    where: { id, organizationId: ctx.organizationId },
    include: {
      candidate: true,
      job: { include: { stages: { orderBy: { sortOrder: "asc" } } } },
      stage: true,
      scorecard: { include: { criteria: { orderBy: { sortOrder: "asc" } } } },
      history: {
        orderBy: { createdAt: "asc" },
        include: { fromStage: true, toStage: true, actor: { select: { name: true } } },
      },
    },
  });
  if (!application) notFound();
  const canWrite = canWriteOrg(ctx.memberRole);

  return (
    <div className="mx-auto flex w-full max-w-4xl flex-col gap-space-md">
      <Link
        href={`/jobs/${application.jobId}`}
        className="text-body-sm font-semibold text-primary hover:text-primary-fixed-dim"
      >
        ← {application.job.title}
      </Link>
      <div>
        <h1 className="font-headline text-headline-xl font-bold text-on-surface">{application.candidate.name}</h1>
        <p className="mt-1 text-body-md text-on-surface-variant">
          {application.candidate.email || "Sin email"} · etapa actual: {application.stage.name}
        </p>
      </div>

      <section className="rounded-xl border border-outline-variant/30 bg-surface-container p-5 shadow-md">
        <h2 className="font-headline text-headline-md font-semibold text-on-surface">CV y análisis</h2>
        <div className="mt-4 space-y-6 rounded-xl bg-white p-4 text-slate-900 shadow-inner">
          <CvUploadPanel applicationId={application.id} canWrite={canWrite} />
          <div className="border-t border-slate-100 pt-5">
            <CvAnalysisPanel applicationId={application.id} canWrite={canWrite} />
          </div>
        </div>
      </section>

      <section className="rounded-xl border border-outline-variant/30 bg-surface-container p-5 shadow-md">
        <h2 className="font-headline text-headline-md font-semibold text-on-surface">Mover de etapa</h2>
        <div className="mt-3 rounded-xl bg-white p-3 text-slate-900">
          <PipelineKanban
            jobId={application.jobId}
            canWrite={canWrite}
            stages={application.job.stages}
            applications={[
              { id: application.id, candidateName: application.candidate.name, stageId: application.stageId },
            ]}
          />
        </div>
      </section>

      <section className="rounded-xl border border-outline-variant/30 bg-surface-container p-5 shadow-md">
        <h2 className="font-headline text-headline-md font-semibold text-on-surface">Historial inmutable</h2>
        <ol className="mt-4 space-y-3">
          {application.history.map((item) => (
            <li key={item.id} className="border-l-2 border-outline-variant/50 pl-4 text-body-sm">
              <p className="font-medium text-on-surface">
                {item.fromStage?.name ?? "Inicio"} → {item.toStage.name}
              </p>
              <p className="text-on-surface-variant">
                {item.actor?.name ?? "Sistema"} · {item.createdAt.toLocaleString("es")}
              </p>
              {item.note ? <p className="mt-1 text-on-surface-variant">{item.note}</p> : null}
            </li>
          ))}
        </ol>
      </section>

      <section className="rounded-xl border border-outline-variant/30 bg-surface-container p-5 shadow-md">
        <h2 className="font-headline text-headline-md font-semibold text-on-surface">Scorecard de esta candidatura</h2>
        {application.scorecard ? (
          <p className="mt-2 text-body-sm text-on-surface-variant">
            {application.scorecard.name} · v{application.scorecard.version} ·{" "}
            {application.scorecard.criteria.length} criterios
          </p>
        ) : (
          <p className="mt-2 text-body-sm text-on-surface-variant">
            No había scorecard publicado cuando se creó. Los cambios futuros no se aplican hacia atrás.
          </p>
        )}
      </section>
    </div>
  );
}
