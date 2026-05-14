import type { ReactNode } from "react";
import Link from "next/link";
import { auth, signOut } from "@/auth";
import { Home, ClipboardList, Phone, User, HelpCircle, LogOut } from "lucide-react";

export default async function AgentSectionLayout({ children }: { children: ReactNode }) {
  const session = await auth();
  const name = session?.user?.name ?? "Agente";

  return (
    <div className="flex min-h-full">
      <aside className="hidden w-56 flex-col bg-[#1a1a2e] text-slate-100 md:flex">
        <div className="border-b border-white/10 p-5">
          <p className="text-lg font-semibold text-white">EvalIA</p>
          <p className="text-xs text-slate-400">Área agente</p>
        </div>
        <nav className="flex flex-1 flex-col gap-1 p-2 text-sm">
          <Nav href="/agent" icon={<Home className="h-4 w-4" />} label="Inicio" />
          <Nav href="/agent/evaluations" icon={<ClipboardList className="h-4 w-4" />} label="Mis evaluaciones" />
          <Nav href="/agent/calls" icon={<Phone className="h-4 w-4" />} label="Mis llamadas" />
          <Nav href="/agent/profile" icon={<User className="h-4 w-4" />} label="Perfil" />
          <Nav href="/agent/help" icon={<HelpCircle className="h-4 w-4" />} label="Ayuda" />
        </nav>
        <div className="border-t border-white/10 p-3">
          <form
            action={async () => {
              "use server";
              await signOut({ redirectTo: "/login" });
            }}
          >
            <button
              type="submit"
              className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-left text-sm text-slate-200 hover:bg-white/10"
            >
              <LogOut className="h-4 w-4" />
              Cerrar sesión
            </button>
          </form>
        </div>
      </aside>
      <div className="flex flex-1 flex-col">
        <header className="flex items-center justify-between border-b border-slate-200 bg-white px-6 py-4">
          <div>
            <p className="text-xs uppercase tracking-wide text-slate-400">Agente</p>
            <p className="font-medium text-slate-900">Hola, {name}</p>
          </div>
        </header>
        <main className="flex-1 bg-slate-50 p-6">{children}</main>
      </div>
    </div>
  );
}

function Nav({ href, icon, label }: { href: string; icon: ReactNode; label: string }) {
  return (
    <Link
      href={href}
      className="flex items-center gap-2 rounded-lg px-3 py-2 text-slate-200 hover:bg-white/10 hover:text-white"
    >
      {icon}
      {label}
    </Link>
  );
}
