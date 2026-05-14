import "dotenv/config";
import { runSeed } from "./seed-logic";
import { prisma } from "../lib/prisma";

runSeed()
  .then(async () => {
    await prisma.$disconnect();
  })
  .catch(async (e) => {
    console.error(e);
    await prisma.$disconnect();
    process.exit(1);
  });
