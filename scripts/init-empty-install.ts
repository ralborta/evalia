/**
 * Inicializa una instalación vacía: aplica esquema y crea un único admin.
 * No inserta candidatos, entrevistas ni usuarios demo.
 *
 *   DATABASE_URL="..." INIT_ADMIN_EMAIL="..." INIT_ADMIN_PASSWORD="..." pnpm db:init-empty
 */
import "dotenv/config";
import { execSync } from "node:child_process";
import bcrypt from "bcryptjs";
import { UserRole } from "@prisma/client";
import { prisma } from "../lib/prisma";

async function main() {
  if (!process.env.DATABASE_URL) {
    throw new Error("DATABASE_URL es obligatorio");
  }

  const email = process.env.INIT_ADMIN_EMAIL?.trim().toLowerCase();
  const password = process.env.INIT_ADMIN_PASSWORD ?? "";

  if (!email || !password) {
    throw new Error("INIT_ADMIN_EMAIL e INIT_ADMIN_PASSWORD son obligatorios");
  }
  if (password === "admin" && process.env.ALLOW_DEMO_SEED !== "true") {
    throw new Error("INIT_ADMIN_PASSWORD no puede ser la contraseña demo 'admin'");
  }

  execSync("pnpm exec prisma generate", { stdio: "inherit" });
  execSync("pnpm exec prisma db push", { stdio: "inherit" });

  const existing = await prisma.user.count();
  if (existing > 0) {
    console.log("La base ya tiene usuarios. No se crea admin ni se modifican contraseñas.");
    return;
  }

  const passwordHash = await bcrypt.hash(password, 10);
  const admin = await prisma.user.create({
    data: {
      email,
      name: process.env.INIT_ADMIN_NAME?.trim() || "Admin EvalIA",
      password: passwordHash,
      role: UserRole.ADMIN,
    },
  });
  const org = await prisma.organization.upsert({
    where: { slug: "evalia" },
    update: {},
    create: { id: "org_evalia_inicial", name: "EvalIA", slug: "evalia" },
  });
  await prisma.organizationMember.create({
    data: { organizationId: org.id, userId: admin.id, role: "OWNER" },
  });
  console.log("Instalación vacía lista: se creó un único usuario ADMIN y la organización inicial.");
}

main()
  .then(() => prisma.$disconnect())
  .catch(async (e) => {
    console.error(e);
    await prisma.$disconnect();
    process.exit(1);
  });
