import type { ReactNode } from "react";
import Link from "next/link";
import { auth, signOut } from "@/auth";
import { Mic2, LogOut } from "lucide-react";
import { AgentNav } from "@/components/app-shell/agent-nav";

export default async function AgentSectionLayout({ children }: { children: ReactNode }) {
  const session = await auth();
  const name = session?.user?.name ?? "Agente";

  return (
    <div className="flex min-h-full">
      <aside className="evalia-sidebar hidden w-[248px] flex-col text-slate-100 md:flex">
        <div className="relative border-b border-white/10 px-5 py-6">
          <Link href="/agent" className="flex items-center gap-3">
            <span className="flex h-11 w-11 items-center justify-center rounded-2xl bg-gradient-to-br from-cyan-500 to-violet-600 shadow-lg shadow-cyan-900/30">
              <Mic2 className="h-5 w-5 text-white" />
            </span>
            <div>
              <p className="text-lg font-bold tracking-tight text-white">EvalIA</p>
              <p className="text-[11px] font-medium uppercase tracking-wider text-cyan-200/90">Área agente</p>
            </div>
          </Link>
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
        <header className="sticky top-0 z-10 flex items-center justify-between border-b border-slate-200/80 bg-white/85 px-5 py-4 shadow-sm shadow-slate-200/30 backdrop-blur-md md:px-8">
          <div>
            <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-cyan-700/90">Agente</p>
            <p className="text-base font-semibold text-slate-900">Hola, {name}</p>
          </div>
        </header>
        <main className="evalia-page-bg flex-1 p-5 md:p-8">{children}</main>
      </div>
    </div>
  );
}
