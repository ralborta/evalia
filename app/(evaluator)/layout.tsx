import type { ReactNode } from "react";
import Link from "next/link";
import { auth, signOut } from "@/auth";
import { LayoutDashboard, ClipboardList, PlusCircle, FileBarChart, BookOpen, LogOut } from "lucide-react";

export default async function EvaluatorLayout({ children }: { children: ReactNode }) {
  const session = await auth();
  const name = session?.user?.name ?? "Evaluador";

  return (
    <div className="flex min-h-full">
      <aside className="hidden w-60 flex-col bg-[#1a1a2e] text-slate-100 md:flex">
        <div className="border-b border-white/10 p-6">
          <p className="text-lg font-semibold text-white">EvalIA</p>
          <p className="text-xs text-slate-400">Panel evaluador</p>
        </div>
        <nav className="flex flex-1 flex-col gap-1 p-3 text-sm">
          <Nav href="/dashboard" icon={<LayoutDashboard className="h-4 w-4" />} label="Inicio" />
          <Nav href="/interviews/new" icon={<PlusCircle className="h-4 w-4" />} label="Nueva entrevista" />
          <Nav href="/interviews" icon={<ClipboardList className="h-4 w-4" />} label="Entrevistas" />
          <Nav href="/evaluation-profiles" icon={<BookOpen className="h-4 w-4" />} label="Perfiles de evaluación" />
          <Nav href="/reports" icon={<FileBarChart className="h-4 w-4" />} label="Reportes" />
        </nav>
        <div className="border-t border-white/10 p-4">
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
      <div className="flex min-h-full flex-1 flex-col">
        <header className="flex items-center justify-between border-b border-slate-200 bg-white px-6 py-4">
          <div>
            <p className="text-xs uppercase tracking-wide text-slate-400">Sesión</p>
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
