import NextAuth from "next-auth";
import Credentials from "next-auth/providers/credentials";
import bcrypt from "bcryptjs";
import { z } from "zod";
import { ensureDatabaseBootstrapped } from "@/lib/bootstrap-db";
import { prisma } from "@/lib/prisma";

const credentialsSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
});

const authSecret = process.env.AUTH_SECRET ?? process.env.NEXTAUTH_SECRET;

export const { handlers, auth, signIn, signOut } = NextAuth({
  trustHost: true,
  secret: authSecret,
  session: { strategy: "jwt", maxAge: 60 * 60 * 24 * 7 },
  pages: { signIn: "/login" },
  providers: [
    Credentials({
      name: "Credenciales",
      credentials: {
        email: { label: "Correo", type: "email" },
        password: { label: "Contraseña", type: "password" },
      },
      authorize: async (raw) => {
        try {
          const parsed = credentialsSchema.safeParse(raw);
          if (!parsed.success) return null;
          await ensureDatabaseBootstrapped();
          const email = parsed.data.email.trim().toLowerCase();
          const { password } = parsed.data;
          const user = await prisma.user.findUnique({ where: { email } });
          if (!user) return null;
          const ok = await bcrypt.compare(password, user.password);
          if (!ok) return null;
          const membership = await prisma.organizationMember.findFirst({
            where: { userId: user.id },
            orderBy: { createdAt: "asc" },
            select: { organizationId: true },
          });
          return {
            id: user.id,
            email: user.email,
            name: user.name,
            role: user.role,
            organizationId: membership?.organizationId,
          };
        } catch (e) {
          console.error("[auth] authorize", e);
          return null;
        }
      },
    }),
  ],
  callbacks: {
    jwt({ token, user, trigger, session }) {
      if (user) {
        token.id = user.id;
        token.role = user.role;
        token.organizationId = user.organizationId;
      }
      if (trigger === "update" && session && typeof session === "object" && "organizationId" in session) {
        const nextOrg = (session as { organizationId?: string }).organizationId;
        if (typeof nextOrg === "string" && nextOrg.length > 0) {
          token.organizationId = nextOrg;
        }
      }
      return token;
    },
    session({ session, token }) {
      if (session.user) {
        session.user.id = token.id as string;
        session.user.role = token.role as typeof session.user.role;
        session.user.organizationId = token.organizationId;
      }
      return session;
    },
  },
});
