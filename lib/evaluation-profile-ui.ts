import type { LucideIcon } from "lucide-react";
import { BarChart3, BookOpen, Globe2, Headphones, Monitor } from "lucide-react";

export type ProfileTheme = "blue" | "green" | "purple" | "orange";

export type ProfileUiMeta = {
  chip: string;
  theme: ProfileTheme;
  Icon: LucideIcon;
  tags: string[];
  recommended?: boolean;
};

const DEFAULT_META: ProfileUiMeta = {
  chip: "General",
  theme: "blue",
  Icon: BookOpen,
  tags: ["Evaluación", "B1-B2", "8 min", "—"],
};

/** Metadatos de presentación por `key` de seed; perfiles nuevos usan heurística + default. */
const BY_KEY: Record<string, ProfileUiMeta> = {
  customer_support: {
    chip: "Atención al cliente",
    theme: "blue",
    Icon: Headphones,
    tags: ["Atención al cliente", "B1-B2", "8-10 min", "~12 preguntas"],
    recommended: true,
  },
  general_english: {
    chip: "General",
    theme: "green",
    Icon: Globe2,
    tags: ["General", "B1-C1", "8 min", "~10 preguntas"],
  },
  tech_support: {
    chip: "Soporte",
    theme: "purple",
    Icon: Monitor,
    tags: ["Soporte", "B2", "10 min", "~14 preguntas"],
  },
  sales_english: {
    chip: "Ventas",
    theme: "orange",
    Icon: BarChart3,
    tags: ["Ventas", "B1-B2", "8-10 min", "~12 preguntas"],
  },
};

const THEMES: ProfileTheme[] = ["blue", "green", "purple", "orange"];
const FALLBACK_ICONS: LucideIcon[] = [BookOpen, Globe2, Monitor, BarChart3];

export function getProfileUiMeta(key: string, index: number): ProfileUiMeta {
  if (BY_KEY[key]) return BY_KEY[key]!;
  const theme = THEMES[index % THEMES.length]!;
  return {
    ...DEFAULT_META,
    chip: inferChip(key),
    theme,
    Icon: FALLBACK_ICONS[index % FALLBACK_ICONS.length]!,
  };
}

function inferChip(key: string): string {
  const k = key.toLowerCase();
  if (k.includes("tech") || k.includes("backoffice")) return "Soporte";
  if (k.includes("customer") || (k.includes("support") && !k.includes("tech"))) return "Atención al cliente";
  if (k.includes("sales") || k.includes("venta")) return "Ventas";
  if (k.includes("general")) return "General";
  return "General";
}

export const FILTER_CHIPS = ["Todos", "Atención al cliente", "General", "Soporte", "Ventas"] as const;
export type ProfileFilterChip = (typeof FILTER_CHIPS)[number];

export function themeClasses(theme: ProfileTheme): {
  iconBox: string;
  icon: string;
  tagMuted: string;
  tagAccent: string;
} {
  switch (theme) {
    case "blue":
      return {
        iconBox: "bg-blue-50 ring-1 ring-blue-100",
        icon: "text-blue-600",
        tagMuted: "bg-slate-100 text-slate-700 ring-1 ring-slate-200/80",
        tagAccent: "bg-blue-50 text-blue-800 ring-1 ring-blue-100",
      };
    case "green":
      return {
        iconBox: "bg-emerald-50 ring-1 ring-emerald-100",
        icon: "text-emerald-600",
        tagMuted: "bg-slate-100 text-slate-700 ring-1 ring-slate-200/80",
        tagAccent: "bg-emerald-50 text-emerald-800 ring-1 ring-emerald-100",
      };
    case "purple":
      return {
        iconBox: "bg-violet-50 ring-1 ring-violet-100",
        icon: "text-violet-600",
        tagMuted: "bg-slate-100 text-slate-700 ring-1 ring-slate-200/80",
        tagAccent: "bg-violet-50 text-violet-800 ring-1 ring-violet-100",
      };
    case "orange":
      return {
        iconBox: "bg-amber-50 ring-1 ring-amber-100",
        icon: "text-amber-700",
        tagMuted: "bg-slate-100 text-slate-700 ring-1 ring-slate-200/80",
        tagAccent: "bg-amber-50 text-amber-900 ring-1 ring-amber-100",
      };
  }
}
