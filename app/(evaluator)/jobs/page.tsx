import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { requireEvaluatorPage } from "@/lib/require-evaluator-page";
import { Badge } from "@/components/ui/badge";
import { canWriteOrg } from "@/lib/org-context";
import { Briefcase } from "lucide-react";

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

  const openCount = jobs.filter((j) => j.status === "OPEN").length;
  const appsTotal = jobs.reduce((a, j) => a + j._count.applications, 0);

  return (
    <div className="mx-auto flex w-full max-w-6xl flex-col gap-space-lg">
      <section className="relative flex flex-col gap-space-md overflow-hidden rounded-xl bg-surface-container p-space-lg shadow-xl lg:flex-row lg:items-center lg:justify-between">
        <div className="pointer-events-none absolute -right-12 -top-12 h-56 w-56 rounded-full bg-primary/10 blur-3xl" />
        <div className="relative z-10 max-w-2xl">
          <span className="font-label-mono text-label-mono-sm uppercase text-primary">Talent · Vacantes</span>
          <h1 className="mt-space-2xs font-headline text-headline-xl font-bold tracking-tight text-on-surface">
            Gestión de Vacantes &amp; Búsquedas Activas
          </h1>
          <p className="mt-space-2xs text-body-md text-on-surface-variant">
            Búsquedas de EvalIA Talent, aisladas por organización.
          </p>
        </div>
        {canWrite ? (
          <Link
            href="/jobs/new"
            className="relative z-10 inline-flex h-9 items-center justify-center rounded-lg bg-primary-container px-space-md text-body-sm font-semibold text-on-primary-container shadow-md hover:bg-primary-container/90"
          >
            Nueva vacante
          </Link>
        ) : null}
      </section>

      <section className="grid grid-cols-1 gap-space-md sm:grid-cols-3">
        <div className="rounded-xl bg-surface-container-low p-space-md shadow-sm">
          <span className="font-label-mono text-label-mono-sm uppercase text-on-surface-variant">Vacantes</span>
          <p className="mt-space-sm font-headline text-stat-metric font-bold text-on-surface">{jobs.length}</p>
        </div>
        <div className="rounded-xl bg-surface-container-low p-space-md shadow-sm">
          <span className="font-label-mono text-label-mono-sm uppercase text-on-surface-variant">Abiertas</span>
          <p className="mt-space-sm font-headline text-stat-metric font-bold text-secondary">{openCount}</p>
        </div>
        <div className="rounded-xl bg-surface-container-low p-space-md shadow-sm">
          <span className="font-label-mono text-label-mono-sm uppercase text-on-surface-variant">Candidaturas</span>
          <p className="mt-space-sm font-headline text-stat-metric font-bold text-tertiary">{appsTotal}</p>
        </div>
      </section>

      {jobs.length === 0 ? (
        <div className="rounded-xl border border-dashed border-outline-variant/50 bg-surface-container p-10 text-center text-body-sm text-on-surface-variant">
          <Briefcase className="mx-auto mb-3 h-8 w-8 text-outline" />
          Todavía no hay vacantes. Crea la primera para definir scorecard y pipeline.
        </div>
      ) : (
        <div className="overflow-hidden rounded-xl border border-outline-variant/30 bg-surface-container shadow-md">
          <table className="w-full text-left text-body-sm">
            <thead className="bg-surface-container-lowest font-label-mono text-label-mono-sm uppercase tracking-wide text-on-surface-variant">
              <tr>
                <th className="px-4 py-3">Vacante</th>
                <th className="px-4 py-3">Estado</th>
                <th className="px-4 py-3">Candidaturas</th>
                <th className="px-4 py-3">Scorecard</th>
              </tr>
            </thead>
            <tbody>
              {jobs.map((job) => (
                <tr key={job.id} className="border-t border-outline-variant/20 hover:bg-surface-container-high/50">
                  <td className="px-4 py-3">
                    <Link
                      href={`/jobs/${job.id}`}
                      className="font-semibold text-on-surface hover:text-primary"
                    >
                      {job.title}
                    </Link>
                    {job.location ? <p className="text-body-sm text-on-surface-variant">{job.location}</p> : null}
                  </td>
                  <td className="px-4 py-3">
                    <Badge variant="secondary">{statusLabel[job.status] ?? job.status}</Badge>
                  </td>
                  <td className="px-4 py-3 tabular-nums text-on-surface">{job._count.applications}</td>
                  <td className="px-4 py-3 text-on-surface-variant">
                    {job.publishedScorecard ? `Publicado v${job.publishedScorecard.version}` : "Borrador"}
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
