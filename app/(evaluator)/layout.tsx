import type { ReactNode } from "react";
import Link from "next/link";
import { auth, signOut } from "@/auth";
import { Bell, LogOut, Plus, Search } from "lucide-react";
import { EvaliaLogo } from "@/components/brand/evalia-logo";
import { EvaluatorNav } from "@/components/app-shell/evaluator-nav";
import { RefreshOnFocus } from "@/components/evaluator/refresh-on-focus";
import { prisma } from "@/lib/prisma";
import { personInitials } from "@/lib/initials";
import { requireOrgContext } from "@/lib/org-context";
import { OrgSwitcher } from "@/components/app-shell/org-switcher";

export default async function EvaluatorLayout({ children }: { children: ReactNode }) {
  const session = await auth();
  const name = session?.user?.name ?? "Evaluador";
  let processingCount = 0;
  let orgName = "EvalIA";
  let orgs: { organizationId: string; organizationName: string }[] = [];
  let activeOrgId: string | undefined;
  try {
    const ctx = await requireOrgContext({ evaluator: true });
    activeOrgId = ctx.organizationId;
    orgName = ctx.memberships.find((m) => m.organizationId === ctx.organizationId)?.organizationName ?? "EvalIA";
    orgs = ctx.memberships.map((m) => ({
      organizationId: m.organizationId,
      organizationName: m.organizationName,
    }));
    processingCount = await prisma.interview.count({
      where: { organizationId: ctx.organizationId, status: { in: ["PROCESSING", "IN_PROGRESS"] } },
    });
  } catch {
    processingCount = 0;
  }

  return (
    <div className="evalia-stitch-shell dark flex min-h-full bg-surface text-on-surface">
      <aside className="fixed left-0 top-0 z-50 hidden h-full w-sidebar-width flex-col justify-between bg-surface-container-low p-space-md shadow-[0_1px_8px_rgba(0,0,0,0.04)] md:flex">
        <div className="flex flex-col gap-space-lg">
          <div className="flex items-center gap-space-sm px-space-xs py-space-2xs">
            <EvaliaLogo href="/dashboard" height={36} priority onDark />
          </div>
          <EvaluatorNav />
        </div>
        <div className="flex flex-col gap-space-sm">
          <div className="flex flex-col gap-space-xs rounded-xl bg-surface-container p-space-sm">
            <div className="flex items-center justify-between">
              <span className="font-label-mono text-label-mono-sm uppercase text-on-surface-variant">Org activa</span>
              <span className="h-2 w-2 animate-pulse rounded-full bg-secondary" />
            </div>
            <p className="truncate font-label-mono text-label-mono-sm text-on-surface-variant">{orgName}</p>
          </div>
          <form
            action={async () => {
              "use server";
              await signOut({ redirectTo: "/login" });
            }}
          >
            <button
              type="submit"
              className="flex w-full items-center gap-space-sm rounded-xl px-space-sm py-space-xs text-left text-body-md text-on-surface-variant transition-all hover:bg-surface-container-high hover:text-on-surface"
            >
              <LogOut className="h-4 w-4 shrink-0" />
              Cerrar sesión
            </button>
          </form>
        </div>
      </aside>

      <div className="flex min-h-full min-w-0 flex-1 flex-col md:pl-sidebar-width">
        <header className="sticky top-0 z-40 flex h-16 items-center justify-between gap-space-md border-b border-outline-variant/30 bg-surface/80 px-space-md backdrop-blur-xl md:px-space-lg">
          <div className="flex min-w-0 flex-1 items-center gap-space-md">
            <div className="shrink-0 md:hidden">
              <EvaliaLogo href="/dashboard" height={28} onDark />
            </div>
            <div className="relative hidden max-w-xl flex-1 sm:block">
              <Search className="pointer-events-none absolute left-space-sm top-1/2 h-[18px] w-[18px] -translate-y-1/2 text-on-surface-variant" />
              <input
                readOnly
                tabIndex={-1}
                placeholder="Buscar candidatos, vacantes, evaluaciones…"
                className="h-9 w-full rounded-lg bg-surface-container-lowest pl-9 pr-space-md font-body text-body-sm text-on-surface placeholder:text-outline focus:outline-none focus:ring-1 focus:ring-primary"
                aria-label="Buscar"
              />
            </div>
            <div className="hidden items-center gap-space-xs rounded-full bg-secondary-container/20 px-space-sm py-space-2xs text-secondary xl:flex">
              <span className="h-1.5 w-1.5 rounded-full bg-secondary" />
              <span className="font-label-mono text-label-mono-sm font-medium">Motor IA activo</span>
            </div>
          </div>
          <div className="flex shrink-0 items-center gap-space-sm md:gap-space-md">
            {activeOrgId ? <OrgSwitcher organizations={orgs} activeOrganizationId={activeOrgId} /> : null}
            <Link
              href="/interviews/new"
              className="hidden h-9 items-center gap-space-xs rounded-lg bg-primary-container px-space-md text-body-sm font-medium text-on-primary-container shadow-sm transition-colors hover:bg-primary-container/90 sm:inline-flex"
            >
              <Plus className="h-[18px] w-[18px]" />
              Nueva evaluación
            </Link>
            <Link
              href="/dashboard"
              className="relative flex h-9 w-9 items-center justify-center rounded-lg text-on-surface-variant transition-colors hover:bg-surface-container-high hover:text-on-surface"
              aria-label="Notificaciones"
            >
              <Bell className="h-5 w-5" />
              {processingCount > 0 ? (
                <span className="absolute right-1.5 top-1.5 h-2 w-2 rounded-full bg-tertiary" />
              ) : null}
            </Link>
            <div className="flex items-center gap-space-sm pl-space-xs">
              <span className="flex h-8 w-8 items-center justify-center rounded-full bg-primary-container text-xs font-bold text-on-primary-container">
                {personInitials(name)}
              </span>
              <div className="hidden min-w-0 md:flex md:flex-col">
                <span className="truncate text-body-sm font-medium leading-tight text-on-surface">{name}</span>
                <span className="truncate font-label-mono text-label-mono-sm leading-tight text-on-surface-variant">
                  Evaluador
                </span>
              </div>
            </div>
          </div>
        </header>
        <EvaluatorNav variant="mobile" />
        <main className="relative min-h-screen flex-1 bg-surface px-space-md py-space-lg md:px-space-lg">
          <RefreshOnFocus />
          {children}
        </main>
      </div>
    </div>
  );
}
