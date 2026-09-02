/**
 * Crea o actualiza solo el usuario administrador.
 *
 * Requiere:
 *   ALLOW_ADMIN_PASSWORD_RESET=true
 *   ADMIN_EMAIL (opcional, default admin@evalia.app)
 *   ADMIN_PASSWORD (obligatorio; no puede ser "admin" salvo ALLOW_DEMO_SEED=true)
 *
 *   ALLOW_ADMIN_PASSWORD_RESET=true ADMIN_PASSWORD='...' pnpm db:reset-admin
 */
import "dotenv/config";
import { UserRole } from "@prisma/client";
import bcrypt from "bcryptjs";
import { prisma } from "../lib/prisma";

async function main() {
  if (process.env.ALLOW_ADMIN_PASSWORD_RESET !== "true") {
    console.error("Bloqueado: define ALLOW_ADMIN_PASSWORD_RESET=true para resetear el admin.");
    process.exit(1);
  }

  const email = (process.env.ADMIN_EMAIL?.trim() || "admin@evalia.app").toLowerCase();
  const password = process.env.ADMIN_PASSWORD ?? "";
  const allowDemo = process.env.ALLOW_DEMO_SEED === "true";

  if (!password) {
    console.error("Bloqueado: ADMIN_PASSWORD es obligatorio.");
    process.exit(1);
  }

  if (password === "admin" && !allowDemo) {
    console.error("Bloqueado: no se permite la contraseña demo 'admin' sin ALLOW_DEMO_SEED=true.");
    process.exit(1);
  }

  const passwordHash = await bcrypt.hash(password, 10);
  await prisma.user.upsert({
    where: { email },
    update: {
      password: passwordHash,
      role: UserRole.ADMIN,
    },
    create: {
      email,
      name: "Admin EvalIA",
      password: passwordHash,
      role: UserRole.ADMIN,
    },
  });
  console.log(`Listo: usuario admin actualizado (${email}).`);
}

main()
  .then(() => prisma.$disconnect())
  .catch(async (e) => {
    console.error(e);
    await prisma.$disconnect();
    process.exit(1);
  });
