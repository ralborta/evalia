"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { LayoutDashboard, ClipboardList, PlusCircle, FileBarChart, BookOpen } from "lucide-react";
import { cn } from "@/lib/utils";

const items = [
  { href: "/dashboard", label: "Inicio", icon: LayoutDashboard },
  { href: "/interviews/new", label: "Nueva entrevista", icon: PlusCircle },
  { href: "/interviews", label: "Entrevistas", icon: ClipboardList },
  { href: "/evaluation-profiles", label: "Perfiles", icon: BookOpen },
  { href: "/reports", label: "Reportes", icon: FileBarChart },
] as const;

function navActive(pathname: string, href: string) {
  if (href === "/dashboard") return pathname === "/dashboard";
  return pathname === href || pathname.startsWith(`${href}/`);
}

export function EvaluatorNav() {
  const pathname = usePathname();

  return (
    <nav className="flex flex-1 flex-col gap-0.5 p-3 text-sm">
      {items.map(({ href, label, icon: Icon }) => {
        const active = navActive(pathname, href);
        return (
          <Link
            key={href}
            href={href}
            className={cn(
              "flex items-center gap-3 rounded-xl px-3 py-2.5 font-medium transition-all duration-200",
              active
                ? "bg-white/[0.12] text-white shadow-inner ring-1 ring-white/10"
                : "text-slate-400 hover:bg-white/[0.06] hover:text-white",
            )}
          >
            <Icon className={cn("h-4 w-4 shrink-0", active ? "text-violet-300" : "text-slate-500")} />
            {label}
          </Link>
        );
      })}
    </nav>
  );
}
