import bcrypt from "bcryptjs";
import { UserRole } from "@prisma/client";
import { prisma } from "./prisma";

/**
 * En el primer arranque del servidor (Railway/Vercel), si la BD está vacía aplica el seed completo.
 * Si ya hay usuarios, solo asegura admin@evalia.app / admin (por si el pre-deploy no corrió).
 * Desactivar: DISABLE_DB_BOOTSTRAP=1
 */
export async function bootstrapDatabaseIfNeeded(): Promise<void> {
  if (process.env.DISABLE_DB_BOOTSTRAP === "1") return;

  try {
    await prisma.$queryRaw`SELECT 1`;
  } catch (e) {
    console.warn("[bootstrap-db] Sin conexión a la base:", e);
    return;
  }

  try {
    const n = await prisma.user.count();
    if (n === 0) {
      const { runSeed } = await import("../prisma/seed-logic");
      await runSeed();
      console.info("[bootstrap-db] Seed aplicado (base vacía).");
      return;
    }

    const passwordAdmin = await bcrypt.hash("admin", 10);
    await prisma.user.upsert({
      where: { email: "admin@evalia.app" },
      update: { password: passwordAdmin, role: UserRole.ADMIN },
      create: {
        email: "admin@evalia.app",
        name: "Admin EvalIA",
        password: passwordAdmin,
        role: UserRole.ADMIN,
      },
    });
    console.info("[bootstrap-db] Usuario admin verificado.");
  } catch (e) {
    console.error("[bootstrap-db]", e);
  }
}
