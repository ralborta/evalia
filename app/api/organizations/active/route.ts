import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { z } from "zod";
import { fail } from "@/lib/api-response";
import { ORG_COOKIE, requireOrgContext } from "@/lib/org-context";

const bodySchema = z.object({
  organizationId: z.string().min(1),
});

export async function POST(req: Request) {
  try {
    const ctx = await requireOrgContext({ evaluator: true });
    const parsed = bodySchema.safeParse(await req.json().catch(() => null));
    if (!parsed.success) {
      return NextResponse.json({ error: "Payload inválido" }, { status: 400 });
    }
    if (!ctx.memberships.some((m) => m.organizationId === parsed.data.organizationId)) {
      return NextResponse.json({ error: "Organización no permitida" }, { status: 403 });
    }
    const jar = await cookies();
    jar.set(ORG_COOKIE, parsed.data.organizationId, {
      httpOnly: true,
      sameSite: "lax",
      path: "/",
      secure: process.env.NODE_ENV === "production",
      maxAge: 60 * 60 * 24 * 30,
    });
    return NextResponse.json({ organizationId: parsed.data.organizationId });
  } catch (error) {
    return fail(error);
  }
}
