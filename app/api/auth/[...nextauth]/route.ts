import { handlers } from "@/auth";

/** Prisma y NextAuth requieren Node (no Edge). */
export const runtime = "nodejs";

export const { GET, POST } = handlers;
