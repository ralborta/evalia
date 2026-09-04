"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";

/** Labels e iconos Material del shell Stitch (Talent Hub). */
const items: {
  href: string;
  label: string;
  icon: string;
  exact?: boolean;
}[] = [
  { href: "/dashboard", label: "Talent Dashboard", icon: "space_dashboard", exact: true },
  { href: "/interviews", label: "AI Assessments & Interviews", icon: "mic" },
  { href: "/jobs", label: "Candidate Pipeline", icon: "group" },
  { href: "/candidates", label: "Candidatos & Scores", icon: "badge" },
  { href: "/evaluation-profiles", label: "Voice Agents Studio", icon: "graphic_eq" },
  { href: "/reports", label: "Analytics & Benchmarks", icon: "monitoring" },
  { href: "/settings", label: "Settings", icon: "settings" },
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
                "shrink-0 rounded-xl px-3 py-1.5 font-body-sm text-body-sm font-semibold transition-all",
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
    <nav className="flex flex-col gap-space-2xs" data-active-classes="bg-primary-container text-on-primary-container font-bold rounded-xl">
      {items.map(({ href, label, icon, exact }) => {
        const active = isActive(pathname, href, exact);
        return (
          <Link
            key={href + label}
            href={href}
            aria-current={active ? "page" : undefined}
            className={cn(
              "flex items-center gap-space-sm rounded-xl px-space-sm py-space-xs transition-all",
              active
                ? "bg-primary-container font-bold text-on-primary-container"
                : "text-on-surface-variant hover:bg-surface-container-high hover:text-on-surface",
            )}
          >
            <span className="material-symbols-outlined text-[20px]">{icon}</span>
            <span className="font-body-md text-body-md">{label}</span>
          </Link>
        );
      })}
    </nav>
  );
}
