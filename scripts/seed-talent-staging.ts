/**
 * Fixtures Talent solo para staging/tests.
 * No se ejecuta en bootstrap. Requiere ALLOW_TALENT_STAGING_SEED=true.
 */
import { PrismaClient, JobStatus, ScorecardStatus, CriterionType } from "@prisma/client";

const prisma = new PrismaClient();

function assertStagingOnly() {
  if (process.env.ALLOW_TALENT_STAGING_SEED !== "true") {
    throw new Error("Definí ALLOW_TALENT_STAGING_SEED=true para cargar fixtures Talent");
  }
  if (process.env.ALLOW_DEMO_SEED === "true") {
    throw new Error("No mezclar fixtures Talent con el seed demo");
  }
}

async function main() {
  assertStagingOnly();

  const orgA =
    (await prisma.organization.findUnique({ where: { slug: "evalia" } })) ??
    (await prisma.organization.create({ data: { name: "EvalIA", slug: "evalia" } }));
  const orgB =
    (await prisma.organization.findUnique({ where: { slug: "acme-talent-test" } })) ??
    (await prisma.organization.create({ data: { name: "Acme Talent Test", slug: "acme-talent-test" } }));

  const jobA = await prisma.job.upsert({
    where: { id: "job_evalia_demo_csm" },
    update: { title: "CSM bilingüe" },
    create: {
      id: "job_evalia_demo_csm",
      organizationId: orgA.id,
      title: "CSM bilingüe",
      description: "Fixture staging org A",
      status: JobStatus.OPEN,
      stages: {
        create: [
          { organizationId: orgA.id, key: "applied", name: "Aplicado", sortOrder: 0 },
          { organizationId: orgA.id, key: "screen", name: "Screening", sortOrder: 1 },
          { organizationId: orgA.id, key: "rejected", name: "Descartado", sortOrder: 2, isTerminal: true, isRejected: true },
        ],
      },
    },
  });

  await prisma.scorecard.upsert({
    where: { jobId_version: { jobId: jobA.id, version: 1 } },
    update: {},
    create: {
      organizationId: orgA.id,
      jobId: jobA.id,
      familyId: "scf_evalia_demo",
      version: 1,
      status: ScorecardStatus.PUBLISHED,
      name: "Scorecard CSM",
      publishedAt: new Date(),
      criteria: {
        create: [
          {
            key: "idioma",
            label: "Inglés",
            description: "Comunicación profesional",
            weight: 40,
            type: CriterionType.SCORED,
            required: true,
            evidenceRequired: true,
            scoringRule: "0-100 según claridad",
            sortOrder: 0,
          },
          {
            key: "saas",
            label: "Experiencia SaaS",
            description: "Ciclo de renovación",
            weight: 60,
            type: CriterionType.SCORED,
            required: true,
            evidenceRequired: false,
            scoringRule: "0-100 según evidencia de renovaciones",
            sortOrder: 1,
          },
        ],
      },
    },
  });

  await prisma.job.upsert({
    where: { id: "job_acme_demo_ops" },
    update: { title: "Ops Lead" },
    create: {
      id: "job_acme_demo_ops",
      organizationId: orgB.id,
      title: "Ops Lead",
      description: "Fixture staging org B — no visible para EvalIA",
      status: JobStatus.OPEN,
      stages: {
        create: [{ organizationId: orgB.id, key: "applied", name: "Aplicado", sortOrder: 0 }],
      },
    },
  });

  console.info("[talent-staging-seed] org A", orgA.slug, "org B", orgB.slug);
}

main()
  .catch((error) => {
    console.error(error instanceof Error ? error.message : error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
