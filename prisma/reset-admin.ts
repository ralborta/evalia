/**
 * Crea o actualiza solo el usuario admin (útil si en producción no pudiste correr el seed completo).
 *
 * Uso (con la DATABASE_URL de Railway en el entorno):
 *   DATABASE_URL="postgresql://..." pnpm db:reset-admin
 */
import "dotenv/config";
import { PrismaClient, UserRole } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

async function main() {
  const passwordAdmin = await bcrypt.hash("admin", 10);
  await prisma.user.upsert({
    where: { email: "admin@evalia.app" },
    update: {
      password: passwordAdmin,
      role: UserRole.ADMIN,
      name: "Admin EvalIA",
    },
    create: {
      email: "admin@evalia.app",
      name: "Admin EvalIA",
      password: passwordAdmin,
      role: UserRole.ADMIN,
    },
  });
  console.log("Listo: admin@evalia.app / admin");
}

main()
  .then(() => prisma.$disconnect())
  .catch(async (e) => {
    console.error(e);
    await prisma.$disconnect();
    process.exit(1);
  });
