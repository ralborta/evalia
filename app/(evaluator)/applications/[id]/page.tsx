import Link from "next/link";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { requireEvaluatorPage } from "@/lib/require-evaluator-page";
import { PipelineKanban } from "@/components/talent/pipeline-kanban";

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

  return (
    <div className="mx-auto max-w-4xl space-y-6">
      <Link href={`/jobs/${application.jobId}`} className="text-sm font-semibold text-blue-600 hover:text-blue-700">
        ← {application.job.title}
      </Link>
      <div>
        <h1 className="text-2xl font-bold text-slate-900">{application.candidate.name}</h1>
        <p className="mt-1 text-sm text-slate-600">
          {application.candidate.email || "Sin email"} · etapa actual: {application.stage.name}
        </p>
      </div>

      <section className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
        <h2 className="text-base font-semibold text-slate-900">Mover de etapa</h2>
        <div className="mt-3">
          <PipelineKanban
            jobId={application.jobId}
            stages={application.job.stages}
            applications={[{ id: application.id, candidateName: application.candidate.name, stageId: application.stageId }]}
          />
        </div>
      </section>

      <section className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
        <h2 className="text-base font-semibold text-slate-900">Historial inmutable</h2>
        <ol className="mt-4 space-y-3">
          {application.history.map((item) => (
            <li key={item.id} className="border-l-2 border-slate-200 pl-4 text-sm">
              <p className="font-medium text-slate-900">
                {item.fromStage?.name ?? "Inicio"} → {item.toStage.name}
              </p>
              <p className="text-slate-500">
                {item.actor?.name ?? "Sistema"} · {item.createdAt.toLocaleString("es")}
              </p>
              {item.note ? <p className="mt-1 text-slate-600">{item.note}</p> : null}
            </li>
          ))}
        </ol>
      </section>

      <section className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
        <h2 className="text-base font-semibold text-slate-900">Scorecard de esta candidatura</h2>
        {application.scorecard ? (
          <p className="mt-2 text-sm text-slate-600">
            {application.scorecard.name} · v{application.scorecard.version} · {application.scorecard.criteria.length} criterios
          </p>
        ) : (
          <p className="mt-2 text-sm text-slate-500">
            No había scorecard publicado cuando se creó. Los cambios futuros no se aplican hacia atrás.
          </p>
        )}
      </section>
    </div>
  );
}
