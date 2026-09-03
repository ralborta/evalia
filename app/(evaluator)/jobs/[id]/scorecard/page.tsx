import Link from "next/link";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { requireEvaluatorPage } from "@/lib/require-evaluator-page";
import { getLatestScorecard } from "@/lib/talent/jobs";
import { ScorecardEditor } from "@/components/talent/scorecard-editor";
import { canWriteOrg } from "@/lib/org-context";

export default async function JobScorecardPage({ params }: { params: Promise<{ id: string }> }) {
  const ctx = await requireEvaluatorPage();
  const { id } = await params;
  const job = await prisma.job.findFirst({
    where: { id, organizationId: ctx.organizationId },
    select: { id: true, title: true },
  });
  if (!job) notFound();
  const scorecard = await getLatestScorecard(job.id, ctx.organizationId);
  const canWrite = canWriteOrg(ctx.memberRole);

  return (
    <div className="mx-auto max-w-4xl space-y-6">
      <Link href={`/jobs/${job.id}`} className="text-sm font-semibold text-blue-600 hover:text-blue-700">
        ← {job.title}
      </Link>
      <div>
        <h1 className="text-2xl font-bold text-slate-900">Scorecard</h1>
        <p className="mt-1 text-sm text-slate-600">
          Publicar crea una versión inmutable. Los cambios posteriores no alteran evaluaciones históricas.
        </p>
      </div>
      <ScorecardEditor
        jobId={job.id}
        canWrite={canWrite}
        initialName={scorecard?.name ?? `Scorecard · ${job.title}`}
        initialSourcePrompt={scorecard?.sourcePrompt}
        status={scorecard?.status ?? "DRAFT"}
        version={scorecard?.version ?? 1}
        initialCriteria={
          scorecard?.criteria.map((c) => ({
            key: c.key,
            label: c.label,
            description: c.description,
            weight: c.weight,
            type: c.type,
            required: c.required,
            evidenceRequired: c.evidenceRequired,
            scoringRule: c.scoringRule,
            sortOrder: c.sortOrder,
          })) ?? []
        }
      />
    </div>
  );
}
