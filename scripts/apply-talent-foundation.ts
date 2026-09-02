/**
 * Aplica el cimiento Talent de forma aditiva.
 * No borra tablas, no usa migrate reset, no acepta pérdida de datos.
 *
 * Uso:
 *   DATABASE_URL=... pnpm exec tsx scripts/apply-talent-foundation.ts
 */
import { PrismaClient } from "@prisma/client";
import { execFileSync } from "node:child_process";

const prisma = new PrismaClient();

const DEFAULT_ORG_ID = "org_evalia_inicial";
const DEFAULT_ORG_SLUG = "evalia";
const DEFAULT_ORG_NAME = "EvalIA";

function assertSafeEnv() {
  if (!process.env.DATABASE_URL) {
    throw new Error("DATABASE_URL es obligatorio");
  }
  if (process.env.ALLOW_DEMO_SEED === "true") {
    throw new Error("No aplicar Talent con ALLOW_DEMO_SEED=true");
  }
}

async function tableExists(name: string) {
  const rows = await prisma.$queryRaw<Array<{ exists: boolean }>>`
    SELECT EXISTS (
      SELECT 1 FROM information_schema.tables
      WHERE table_schema = 'public' AND table_name = ${name}
    ) AS "exists"
  `;
  return Boolean(rows[0]?.exists);
}

async function columnExists(table: string, column: string) {
  const rows = await prisma.$queryRaw<Array<{ exists: boolean }>>`
    SELECT EXISTS (
      SELECT 1 FROM information_schema.columns
      WHERE table_schema = 'public' AND table_name = ${table} AND column_name = ${column}
    ) AS "exists"
  `;
  return Boolean(rows[0]?.exists);
}

async function ensureOrganization() {
  if (!(await tableExists("Organization"))) {
    await prisma.$executeRawUnsafe(`
      CREATE TABLE "Organization" (
        "id" TEXT NOT NULL,
        "name" TEXT NOT NULL,
        "slug" TEXT NOT NULL,
        "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
        "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
        CONSTRAINT "Organization_pkey" PRIMARY KEY ("id")
      )
    `);
    await prisma.$executeRawUnsafe(`CREATE UNIQUE INDEX "Organization_slug_key" ON "Organization"("slug")`);
  }

  await prisma.$executeRawUnsafe(
    `
      INSERT INTO "Organization" ("id", "name", "slug", "createdAt", "updatedAt")
      VALUES ($1, $2, $3, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
      ON CONFLICT ("id") DO NOTHING
    `,
    DEFAULT_ORG_ID,
    DEFAULT_ORG_NAME,
    DEFAULT_ORG_SLUG,
  );
}

async function addOrgColumn(table: string) {
  if (!(await columnExists(table, "organizationId"))) {
    await prisma.$executeRawUnsafe(`ALTER TABLE "${table}" ADD COLUMN "organizationId" TEXT`);
  }
  await prisma.$executeRawUnsafe(
    `UPDATE "${table}" SET "organizationId" = $1 WHERE "organizationId" IS NULL`,
    DEFAULT_ORG_ID,
  );
}

async function ensureMembers() {
  const users = await prisma.user.findMany({ select: { id: true, role: true } });
  for (const user of users) {
    const role = user.role === "ADMIN" ? "OWNER" : user.role === "AGENT" ? "VIEWER" : "RECRUITER";
    await prisma.organizationMember.upsert({
      where: { organizationId_userId: { organizationId: DEFAULT_ORG_ID, userId: user.id } },
      update: {},
      create: { organizationId: DEFAULT_ORG_ID, userId: user.id, role },
    });
  }
}

async function dropLegacyProfileKeyUnique() {
  await prisma.$executeRawUnsafe(`ALTER TABLE "EvaluationProfile" DROP CONSTRAINT IF EXISTS "EvaluationProfile_key_key"`);
}

async function pushSchema() {
  execFileSync("pnpm", ["exec", "prisma", "db", "push", "--skip-generate"], {
    stdio: "inherit",
    env: process.env,
  });
}

async function verify() {
  const [orgs, members, candidates, interviews] = await Promise.all([
    prisma.organization.count(),
    prisma.organizationMember.count(),
    prisma.candidate.count({ where: { organizationId: DEFAULT_ORG_ID } }),
    prisma.interview.count({ where: { organizationId: DEFAULT_ORG_ID } }),
  ]);
  const orphanCandidates = await prisma.candidate.count({ where: { organizationId: { not: DEFAULT_ORG_ID } } });
  console.info("[talent-foundation] orgs", orgs, "members", members, "candidates", candidates, "interviews", interviews);
  if (orphanCandidates > 0) {
    console.info("[talent-foundation] candidatos fuera de la org inicial:", orphanCandidates);
  }
}

async function main() {
  assertSafeEnv();
  console.info("[talent-foundation] aplicando cimientos aditivos");
  await ensureOrganization();
  await addOrgColumn("Candidate");
  await addOrgColumn("JobPosition");
  await addOrgColumn("EvaluationProfile");
  await addOrgColumn("Interview");
  await dropLegacyProfileKeyUnique();
  await pushSchema();
  execFileSync("pnpm", ["exec", "prisma", "generate"], { stdio: "inherit", env: process.env });
  await ensureMembers();
  await verify();
  console.info("[talent-foundation] listo");
}

main()
  .catch((error) => {
    console.error("[talent-foundation] error", error instanceof Error ? error.message : error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
