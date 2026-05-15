import type { ReactNode } from "react";
import Link from "next/link";
import { auth, signOut } from "@/auth";
import { Bell, Layers, LogOut } from "lucide-react";
import { EvaluatorNav } from "@/components/app-shell/evaluator-nav";
import { prisma } from "@/lib/prisma";
import { personInitials } from "@/lib/initials";

export default async function EvaluatorLayout({ children }: { children: ReactNode }) {
  const session = await auth();
  const name = session?.user?.name ?? "Evaluador";
  const processingCount = await prisma.interview.count({
    where: { status: { in: ["PROCESSING", "IN_PROGRESS"] } },
  });

  return (
    <div className="flex min-h-full bg-[#f4f6f9]">
      <aside className="hidden w-[260px] shrink-0 flex-col border-r border-slate-200/90 bg-white shadow-sm md:flex">
        <div className="border-b border-slate-100 px-5 py-6">
          <Link href="/dashboard" className="flex items-center gap-3">
            <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-blue-600 text-white shadow-md shadow-blue-600/25">
              <Layers className="h-5 w-5" />
            </span>
            <div>
              <p className="text-lg font-bold tracking-tight text-slate-900">EvalIA</p>
              <p className="text-[11px] font-medium uppercase tracking-wider text-slate-500">Centro de evaluación</p>
            </div>
          </Link>
        </div>
        <EvaluatorNav />
        <div className="mt-auto border-t border-slate-100 p-4">
          <form
            action={async () => {
              "use server";
              await signOut({ redirectTo: "/login" });
            }}
          >
            <button
              type="submit"
              className="flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left text-sm font-medium text-slate-600 transition-colors hover:bg-slate-50 hover:text-slate-900"
            >
              <LogOut className="h-4 w-4 text-slate-400" />
              Cerrar sesión
            </button>
          </form>
        </div>
      </aside>
      <div className="flex min-h-full min-w-0 flex-1 flex-col">
        <header className="sticky top-0 z-10 flex items-center justify-between gap-4 border-b border-slate-200/80 bg-white/95 px-5 py-4 backdrop-blur-md md:px-8">
          <div>
            <p className="text-lg font-semibold text-slate-900">
              ¡Hola, {name}! <span className="font-normal">👋</span>
            </p>
            <p className="mt-0.5 text-sm text-slate-500">Aquí tienes el resumen de tus evaluaciones de idioma.</p>
          </div>
          <div className="flex shrink-0 items-center gap-4">
            <Link
              href="/dashboard"
              className="relative flex h-10 w-10 items-center justify-center rounded-xl border border-slate-200 bg-white text-slate-600 transition hover:bg-slate-50"
              aria-label="Notificaciones"
            >
              <Bell className="h-5 w-5" />
              {processingCount > 0 ? (
                <span className="absolute -right-1 -top-1 flex h-5 min-w-5 items-center justify-center rounded-full bg-red-500 px-1 text-[10px] font-bold text-white">
                  {processingCount > 9 ? "9+" : processingCount}
                </span>
              ) : null}
            </Link>
            <div className="flex items-center gap-3 rounded-xl border border-slate-200 bg-slate-50/80 py-1.5 pl-1.5 pr-4">
              <span className="flex h-10 w-10 items-center justify-center rounded-lg bg-blue-600 text-sm font-bold text-white">
                {personInitials(name)}
              </span>
              <div className="hidden min-w-0 sm:block">
                <p className="truncate text-sm font-semibold text-slate-900">{name}</p>
                <p className="truncate text-xs text-slate-500">Evaluador</p>
              </div>
            </div>
          </div>
        </header>
        <main className="flex-1 p-5 md:p-8">{children}</main>
      </div>
    </div>
  );
}
