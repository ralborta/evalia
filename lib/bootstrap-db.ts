import { prisma } from "./prisma";

let bootstrapOnce: Promise<void> | null = null;

function demoSeedEnabled(): boolean {
  return process.env.ALLOW_DEMO_SEED === "true";
}

function bootstrapDisabled(): boolean {
  return process.env.DISABLE_DB_BOOTSTRAP === "1" || process.env.DISABLE_DB_BOOTSTRAP === "true";
}

/**
 * Una sola ejecución por instancia. En producción no crea usuarios ni cambia contraseñas.
 * El seed demo solo corre si ALLOW_DEMO_SEED=true y la tabla User está vacía.
 */
export function ensureDatabaseBootstrapped(): Promise<void> {
  if (bootstrapDisabled()) return Promise.resolve();
  bootstrapOnce ??= bootstrapDatabaseIfNeeded();
  return bootstrapOnce;
}

export async function bootstrapDatabaseIfNeeded(): Promise<void> {
  if (bootstrapDisabled()) return;

  try {
    await prisma.$queryRaw`SELECT 1`;
  } catch (e) {
    console.warn("[bootstrap-db] Sin conexión a la base");
    console.warn(e instanceof Error ? e.message : "error de conexión");
    return;
  }

  if (!demoSeedEnabled()) {
    return;
  }

  try {
    const n = await prisma.user.count();
    if (n > 0) {
      console.info("[bootstrap-db] Base con usuarios; seed demo omitido.");
      return;
    }

    const { runSeed } = await import("../prisma/seed-logic");
    await runSeed();
    console.info("[bootstrap-db] Seed demo aplicado (ALLOW_DEMO_SEED=true, base vacía).");
  } catch (e) {
    console.error("[bootstrap-db] Falló el seed demo");
    console.error(e instanceof Error ? e.message : "error");
  }
}
