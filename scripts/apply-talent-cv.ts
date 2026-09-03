/**
 * Aplica Fase 2 Talent (CV) de forma aditiva.
 * No borra tablas, no usa migrate reset, no acepta pérdida de datos.
 *
 * Uso:
 *   DATABASE_URL=... pnpm db:apply-talent-cv
 */
import { PrismaClient } from "@prisma/client";
import { execFileSync } from "node:child_process";
import { readFileSync } from "node:fs";
import { join } from "node:path";

const prisma = new PrismaClient();

function assertSafeEnv() {
  if (!process.env.DATABASE_URL) {
    throw new Error("DATABASE_URL es obligatorio");
  }
  if (process.env.ALLOW_DEMO_SEED === "true") {
    throw new Error("No aplicar Talent CV con ALLOW_DEMO_SEED=true");
  }
}

async function enumExists(name: string) {
  const rows = await prisma.$queryRaw<Array<{ exists: boolean }>>`
    SELECT EXISTS (
      SELECT 1 FROM pg_type t
      JOIN pg_namespace n ON n.oid = t.typnamespace
      WHERE n.nspname = 'public' AND t.typname = ${name}
    ) AS "exists"
  `;
  return Boolean(rows[0]?.exists);
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

async function applySqlFile() {
  const sqlPath = join(process.cwd(), "scripts", "talent-cv.sql");
  const sql = readFileSync(sqlPath, "utf8");
  // Ejecutar por bloques seguros: el archivo ya usa IF NOT EXISTS / DO blocks.
  await prisma.$executeRawUnsafe(sql);
}

async function pushSchema() {
  execFileSync("pnpm", ["exec", "prisma", "db", "push", "--skip-generate"], {
    stdio: "inherit",
    env: process.env,
  });
}

async function verify() {
  const checks = [
    "CandidateDocument",
    "DocumentExtraction",
    "CvStructuredProfile",
    "CvEvaluation",
    "CvCriterionResult",
    "CvSuggestedQuestion",
  ];
  for (const name of checks) {
    const ok = await tableExists(name);
    console.info(`[talent-cv] tabla ${name}: ${ok ? "ok" : "faltante"}`);
    if (!ok) throw new Error(`Falta la tabla ${name}`);
  }
  for (const name of ["DocumentKind", "DocumentProcessingStatus", "CriterionMatchStatus", "ExcludingOutcome"]) {
    const ok = await enumExists(name);
    console.info(`[talent-cv] enum ${name}: ${ok ? "ok" : "faltante"}`);
  }
}

async function main() {
  assertSafeEnv();
  console.info("[talent-cv] aplicando schema CV aditivo");
  try {
    await applySqlFile();
  } catch (error) {
    // Si el SQL crudo falla parcialmente (p. ej. ADD VALUE en txn), db push cubre el resto.
    console.info(
      "[talent-cv] SQL crudo con aviso; continuando con db push",
      error instanceof Error ? error.message : error,
    );
  }
  await pushSchema();
  execFileSync("pnpm", ["exec", "prisma", "generate"], { stdio: "inherit", env: process.env });
  await verify();
  console.info("[talent-cv] listo");
}

main()
  .catch((error) => {
    console.error("[talent-cv] error", error instanceof Error ? error.message : error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
