import { auth } from "@/auth";
import { NextResponse } from "next/server";
import { requireOrgContext } from "@/lib/org-context";

export async function GET() {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ user: null }, { status: 401 });
  try {
    const ctx = await requireOrgContext();
    return NextResponse.json({
      user: {
        id: ctx.user.id,
        email: ctx.user.email,
        name: ctx.user.name,
        role: ctx.user.role,
        organizationId: ctx.organizationId,
        memberRole: ctx.memberRole,
      },
      organizations: ctx.memberships,
    });
  } catch {
    return NextResponse.json({
      user: {
        id: session.user.id,
        email: session.user.email,
        name: session.user.name,
        role: session.user.role,
        organizationId: session.user.organizationId ?? null,
        memberRole: null,
      },
      organizations: [],
    });
  }
}
