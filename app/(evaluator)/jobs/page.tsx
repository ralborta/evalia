import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { requireEvaluatorPage } from "@/lib/require-evaluator-page";
import { Badge } from "@/components/ui/badge";
import { canWriteOrg } from "@/lib/org-context";

const statusLabel: Record<string, string> = {
  DRAFT: "Borrador",
  OPEN: "Abierta",
  PAUSED: "Pausada",
  CLOSED: "Cerrada",
  ARCHIVED: "Archivada",
};

export default async function JobsPage() {
  const ctx = await requireEvaluatorPage();
  const canWrite = canWriteOrg(ctx.memberRole);
  const jobs = await prisma.job.findMany({
    where: { organizationId: ctx.organizationId },
    orderBy: { updatedAt: "desc" },
    include: {
      publishedScorecard: { select: { version: true, status: true } },
      _count: { select: { applications: true } },
    },
  });

  return (
    <div className="mx-auto max-w-6xl space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Vacantes</h1>
          <p className="mt-1 text-sm text-slate-600">Búsquedas de EvalIA Talent, aisladas por organización.</p>
        </div>
        {canWrite ? (
          <Link
            href="/jobs/new"
            className="inline-flex items-center justify-center rounded-xl bg-blue-600 px-4 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-blue-700"
          >
            Nueva vacante
          </Link>
        ) : null}
      </div>
      {jobs.length === 0 ? (
        <div className="rounded-xl border border-dashed border-slate-300 bg-white p-10 text-center text-sm text-slate-500">
          Todavía no hay vacantes. Crea la primera para definir scorecard y pipeline.
        </div>
      ) : (
        <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
          <table className="w-full text-left text-sm">
            <thead className="bg-slate-50 text-xs uppercase tracking-wide text-slate-500">
              <tr>
                <th className="px-4 py-3">Vacante</th>
                <th className="px-4 py-3">Estado</th>
                <th className="px-4 py-3">Candidaturas</th>
                <th className="px-4 py-3">Scorecard</th>
              </tr>
            </thead>
            <tbody>
              {jobs.map((job) => (
                <tr key={job.id} className="border-t border-slate-100">
                  <td className="px-4 py-3">
                    <Link href={`/jobs/${job.id}`} className="font-semibold text-slate-900 hover:text-blue-700">
                      {job.title}
                    </Link>
                    {job.location ? <p className="text-xs text-slate-500">{job.location}</p> : null}
                  </td>
                  <td className="px-4 py-3">
                    <Badge variant="secondary">{statusLabel[job.status] ?? job.status}</Badge>
                  </td>
                  <td className="px-4 py-3 tabular-nums">{job._count.applications}</td>
                  <td className="px-4 py-3 text-slate-600">
                    {job.publishedScorecard
                      ? `Publicado v${job.publishedScorecard.version}`
                      : "Borrador"}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
