import "dotenv/config";
import { runSeed } from "./seed-logic";
import { prisma } from "../lib/prisma";

if (process.env.ALLOW_DEMO_SEED !== "true") {
  console.error(
    "Seed demo bloqueado. Para ejecutarlo de forma explícita: ALLOW_DEMO_SEED=true pnpm db:seed",
  );
  process.exit(1);
}

runSeed()
  .then(async () => {
    await prisma.$disconnect();
  })
  .catch(async (e) => {
    console.error(e);
    await prisma.$disconnect();
    process.exit(1);
  });
