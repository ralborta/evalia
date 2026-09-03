import { cookies } from "next/headers";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import type { OrgMemberRole, UserRole } from "@prisma/client";
import { canWriteOrg, pickOrganizationId } from "@/lib/talent/org-policy";

export { canWriteOrg, pickOrganizationId } from "@/lib/talent/org-policy";

export const ORG_COOKIE = "evalia-organization-id";

export class OrgAccessError extends Error {
  constructor(
    message: string,
    readonly status: number,
  ) {
    super(message);
    this.name = "OrgAccessError";
  }
}

export type OrgMembership = {
  organizationId: string;
  organizationName: string;
  organizationSlug: string;
  memberRole: OrgMemberRole;
};

export type OrgContext = {
  user: { id: string; email: string; name: string; role: UserRole };
  organizationId: string;
  memberships: OrgMembership[];
  memberRole: OrgMemberRole;
};

const EVALUATOR_ROLES: UserRole[] = ["EVALUATOR", "ADMIN"];

export async function listMemberships(userId: string): Promise<OrgMembership[]> {
  const rows = await prisma.organizationMember.findMany({
    where: { userId },
    include: { organization: { select: { id: true, name: true, slug: true } } },
    orderBy: { createdAt: "asc" },
  });
  return rows.map((m) => ({
    organizationId: m.organizationId,
    organizationName: m.organization.name,
    organizationSlug: m.organization.slug,
    memberRole: m.role,
  }));
}

export async function resolveOrganizationId(userId: string, requested?: string | null): Promise<string | null> {
  const memberships = await listMemberships(userId);
  const jar = await cookies();
  return pickOrganizationId(memberships, {
    cookie: jar.get(ORG_COOKIE)?.value,
    jwt: requested,
  });
}

export async function requireOrgContext(options?: {
  evaluator?: boolean;
  write?: boolean;
}): Promise<OrgContext> {
  const session = await auth();
  if (!session?.user?.id) throw new OrgAccessError("No autorizado", 401);

  if (options?.evaluator && !EVALUATOR_ROLES.includes(session.user.role)) {
    throw new OrgAccessError("No autorizado", 403);
  }

  const memberships = await listMemberships(session.user.id);
  if (memberships.length === 0) throw new OrgAccessError("Sin organización asignada", 403);

  const jar = await cookies();
  const organizationId = pickOrganizationId(memberships, {
    cookie: jar.get(ORG_COOKIE)?.value,
    jwt: session.user.organizationId,
  });
  const current = memberships.find((m) => m.organizationId === organizationId);
  if (!current) throw new OrgAccessError("Organización no permitida", 403);

  if (options?.write && !canWriteOrg(current.memberRole)) {
    throw new OrgAccessError("Sin permiso de escritura", 403);
  }

  return {
    user: {
      id: session.user.id,
      email: session.user.email ?? "",
      name: session.user.name ?? "",
      role: session.user.role,
    },
    organizationId: current.organizationId,
    memberships,
    memberRole: current.memberRole,
  };
}

export function jsonOrgError(error: unknown) {
  if (error instanceof OrgAccessError) {
    return { body: { error: error.message }, status: error.status };
  }
  throw error;
}

export function orgFilter(organizationId: string) {
  return { organizationId };
}

export async function assertOwned<T extends { organizationId: string } | null>(
  record: T,
  organizationId: string,
  notFoundMessage = "No encontrado",
): Promise<NonNullable<T>> {
  if (!record || record.organizationId !== organizationId) {
    throw new OrgAccessError(notFoundMessage, 404);
  }
  return record;
}
