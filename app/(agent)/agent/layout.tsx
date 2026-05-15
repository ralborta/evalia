import type { ReactNode } from "react";
import { auth, signOut } from "@/auth";
import { LogOut } from "lucide-react";
import { EvaliaLogo } from "@/components/brand/evalia-logo";
import { AgentNav } from "@/components/app-shell/agent-nav";

export default async function AgentSectionLayout({ children }: { children: ReactNode }) {
  const session = await auth();
  const name = session?.user?.name ?? "Agente";

  return (
    <div className="flex min-h-full">
      <aside className="evalia-sidebar hidden w-[248px] flex-col text-slate-100 md:flex">
        <div className="relative border-b border-white/10 px-5 py-6">
          <EvaliaLogo href="/agent" height={40} onDark priority />
          <p className="mt-3 text-[11px] font-semibold uppercase tracking-wider text-cyan-200/90">Área agente</p>
        </div>
        <AgentNav />
        <div className="mt-auto border-t border-white/10 p-4">
          <form
            action={async () => {
              "use server";
              await signOut({ redirectTo: "/login" });
            }}
          >
            <button
              type="submit"
              className="flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left text-sm font-medium text-slate-300 transition-colors hover:bg-white/[0.08] hover:text-white"
            >
              <LogOut className="h-4 w-4 opacity-70" />
              Cerrar sesión
            </button>
          </form>
        </div>
      </aside>
      <div className="flex min-h-full min-w-0 flex-1 flex-col">
        <header className="sticky top-0 z-10 flex items-center justify-between gap-4 border-b border-slate-200/80 bg-white/85 px-5 py-4 shadow-sm shadow-slate-200/30 backdrop-blur-md md:px-8">
          <div className="flex min-w-0 flex-1 items-center gap-4">
            <div className="shrink-0 md:hidden">
              <EvaliaLogo href="/agent" height={32} />
            </div>
            <div className="min-w-0">
              <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-cyan-700/90">Agente</p>
              <p className="text-base font-semibold text-slate-900">Hola, {name}</p>
            </div>
          </div>
        </header>
        <main className="evalia-page-bg flex-1 p-5 md:p-8">{children}</main>
      </div>
    </div>
  );
}
