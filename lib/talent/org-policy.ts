import type { OrgMemberRole } from "@prisma/client";

export function canWriteOrg(role: OrgMemberRole) {
  return role !== "VIEWER";
}

export function pickOrganizationId(
  memberships: { organizationId: string }[],
  options: { cookie?: string | null; jwt?: string | null },
): string | null {
  if (memberships.length === 0) return null;
  const allowed = (id?: string | null) => !!id && memberships.some((m) => m.organizationId === id);
  // La cookie es la elección explícita del selector; el JWT es solo fallback.
  if (allowed(options.cookie)) return options.cookie!;
  if (allowed(options.jwt)) return options.jwt!;
  return memberships[0]!.organizationId;
}
