"use client";

import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";

export function OrgSwitcher({
  organizations,
  activeOrganizationId,
}: {
  organizations: { organizationId: string; organizationName: string }[];
  activeOrganizationId: string;
}) {
  const router = useRouter();
  const { update } = useSession();
  const [pending, startTransition] = useTransition();
  const [value, setValue] = useState(activeOrganizationId);

  if (organizations.length === 0) return null;

  return (
    <label className="min-w-[9rem] text-left">
      <span className="sr-only">Organización</span>
      <select
        data-testid="org-switcher"
        value={value}
        disabled={pending || organizations.length === 1}
        onChange={(event) => {
          const organizationId = event.target.value;
          setValue(organizationId);
          startTransition(async () => {
            await fetch("/api/organizations/active", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ organizationId }),
            });
            await update({ organizationId });
            router.refresh();
          });
        }}
        className="h-10 max-w-[14rem] truncate rounded-xl border border-slate-200 bg-white px-3 text-sm font-medium text-slate-800 shadow-sm disabled:opacity-80"
      >
        {organizations.map((org) => (
          <option key={org.organizationId} value={org.organizationId}>
            {org.organizationName}
          </option>
        ))}
      </select>
    </label>
  );
}
