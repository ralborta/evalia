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
  Briefcase,
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
  { href: "/jobs", label: "Vacantes", icon: Briefcase },
  { href: "/candidates", label: "Candidatos", icon: Users },
  { href: "/evaluation-profiles", label: "Perfiles", icon: BookOpen },
  { href: "/reports", label: "Reportes", icon: FileBarChart },
  { href: "/settings", label: "Configuración", icon: Settings },
];

function isActive(pathname: string, href: string, exact?: boolean) {
  if (exact) return pathname === href;
  return pathname === href || pathname.startsWith(`${href}/`);
}

export function EvaluatorNav({ variant = "sidebar" }: { variant?: "sidebar" | "mobile" }) {
  const pathname = usePathname();

  if (variant === "mobile") {
    return (
      <nav
        data-testid="mobile-nav"
        className="flex gap-1 overflow-x-auto border-b border-outline-variant/40 bg-surface-container-low px-3 py-2 md:hidden"
      >
        {items.map(({ href, label, exact }) => {
          const active = isActive(pathname, href, exact);
          return (
            <Link
              key={href + label}
              href={href}
              className={cn(
                "shrink-0 rounded-xl px-3 py-1.5 text-xs font-semibold transition-all",
                active
                  ? "bg-primary-container font-bold text-on-primary-container"
                  : "text-on-surface-variant hover:bg-surface-container-high hover:text-on-surface",
              )}
            >
              {label}
            </Link>
          );
        })}
      </nav>
    );
  }

  return (
    <nav className="flex flex-col gap-space-2xs text-body-md">
      {items.map(({ href, label, icon: Icon, exact }) => {
        const active = isActive(pathname, href, exact);
        return (
          <Link
            key={href + label}
            href={href}
            className={cn(
              "flex items-center gap-space-sm rounded-xl px-space-sm py-space-xs transition-all",
              active
                ? "bg-primary-container font-bold text-on-primary-container"
                : "text-on-surface-variant hover:bg-surface-container-high hover:text-on-surface",
            )}
          >
            <Icon className="h-5 w-5 shrink-0" />
            <span>{label}</span>
          </Link>
        );
      })}
    </nav>
  );
}
