"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  ClipboardList,
  PlusCircle,
  FileBarChart,
  BookOpen,
  Users,
  Settings,
} from "lucide-react";
import { cn } from "@/lib/utils";

const items: {
  href: string;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  exact?: boolean;
}[] = [
  { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard, exact: true },
  { href: "/interviews/new", label: "Nueva evaluación", icon: PlusCircle },
  { href: "/interviews", label: "Entrevistas", icon: ClipboardList },
  { href: "/candidates", label: "Candidatos", icon: Users },
  { href: "/evaluation-profiles", label: "Perfiles", icon: BookOpen },
  { href: "/reports", label: "Reportes", icon: FileBarChart },
  { href: "/settings", label: "Configuración", icon: Settings },
];

function isActive(pathname: string, href: string, exact?: boolean) {
  if (exact) return pathname === href;
  return pathname === href || pathname.startsWith(`${href}/`);
}

export function EvaluatorNav() {
  const pathname = usePathname();

  return (
    <nav className="flex flex-1 flex-col gap-0.5 px-3 py-4 text-[15px]">
      {items.map(({ href, label, icon: Icon, exact }) => {
        const active = isActive(pathname, href, exact);
        return (
          <Link
            key={href + label}
            href={href}
            className={cn(
              "flex items-center gap-3 rounded-xl px-3 py-2.5 font-medium transition-colors",
              active
                ? "bg-blue-50 text-blue-700 shadow-sm ring-1 ring-blue-100"
                : "text-slate-600 hover:bg-slate-50 hover:text-slate-900",
            )}
          >
            <Icon className={cn("h-[18px] w-[18px] shrink-0", active ? "text-blue-600" : "text-slate-400")} />
            {label}
          </Link>
        );
      })}
    </nav>
  );
}
