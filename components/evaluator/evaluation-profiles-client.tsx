"use client";

import type { ReactNode } from "react";
import Link from "next/link";
import { useMemo, useState } from "react";
import {
  BarChart3,
  BookOpen,
  ExternalLink,
  Pencil,
  Search,
  Sparkles,
  Star,
  Target,
  Users,
} from "lucide-react";
import { cn } from "@/lib/utils";
import {
  FILTER_CHIPS,
  getProfileUiMeta,
  themeClasses,
  type ProfileFilterChip,
} from "@/lib/evaluation-profile-ui";

export type ProfileCardRow = {
  id: string;
  key: string;
  name: string;
  description: string | null;
  interviewCount: number;
  index: number;
  mostUsed: boolean;
};

export type ProfilesMetrics = {
  activeCount: number;
  recommendedCount: number;
  interviewsThisWeek: number;
  areasCount: number;
};

export function EvaluationProfilesClient({ metrics, rows }: { metrics: ProfilesMetrics; rows: ProfileCardRow[] }) {
  const [search, setSearch] = useState("");
  const [chip, setChip] = useState<ProfileFilterChip>("Todos");

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return rows.filter((r) => {
      const meta = getProfileUiMeta(r.key, r.index);
      const hay = [r.name, r.key, r.description ?? "", meta.chip].join(" ").toLowerCase();
      if (q && !hay.includes(q)) return false;
      if (chip === "Todos") return true;
      return meta.chip === chip;
    });
  }, [rows, search, chip]);

  return (
    <div className="mx-auto max-w-6xl pb-10">
      <div className="grid gap-8 lg:grid-cols-[minmax(0,1fr)_300px] xl:grid-cols-[minmax(0,1fr)_320px]">
        <div className="space-y-6">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
            <div className="flex gap-4">
              <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-blue-50 text-blue-600 ring-1 ring-blue-100">
                <BookOpen className="h-6 w-6" strokeWidth={2} />
              </div>
              <div>
                <h1 className="text-2xl font-bold tracking-tight text-slate-900">Perfiles de evaluación</h1>
                <p className="mt-1 max-w-xl text-sm text-slate-600">
                  Cada perfil orienta preguntas y el análisis hacia un contexto laboral específico.
                </p>
              </div>
            </div>
            <Link
              href="/evaluation-profiles/new"
              className="inline-flex shrink-0 items-center justify-center gap-2 self-start rounded-xl bg-blue-600 px-5 py-2.5 text-sm font-semibold text-white shadow-md shadow-blue-600/20 transition hover:bg-blue-700"
            >
              + Nuevo perfil
            </Link>
          </div>

          <div className="space-y-3">
            <div className="relative">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
              <input
                type="search"
                placeholder="Buscar por nombre, área o key"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="h-11 w-full rounded-xl border border-slate-200 bg-white py-2 pl-10 pr-3 text-sm text-slate-900 shadow-sm placeholder:text-slate-400 focus:border-blue-400 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
              />
            </div>
            <div className="flex flex-wrap gap-2">
              {FILTER_CHIPS.map((c) => (
                <button
                  key={c}
                  type="button"
                  onClick={() => setChip(c)}
                  className={cn(
                    "rounded-full border px-4 py-2 text-sm font-semibold transition",
                    chip === c
                      ? "border-blue-600 bg-blue-600 text-white shadow-sm"
                      : "border-slate-200 bg-white text-slate-600 hover:border-slate-300 hover:bg-slate-50",
                  )}
                >
                  {c}
                </button>
              ))}
            </div>
          </div>

          <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
            <MetricMini
              icon={<BookOpen className="h-4 w-4 text-blue-600" />}
              iconBg="bg-blue-50"
              text={<span className="text-slate-800">{metrics.activeCount} perfiles activos</span>}
            />
            <MetricMini
              icon={<Star className="h-4 w-4 text-emerald-600" />}
              iconBg="bg-emerald-50"
              text={
                <span className="text-slate-800">
                  {metrics.recommendedCount} recomendado{metrics.recommendedCount === 1 ? "" : "s"}
                </span>
              }
            />
            <MetricMini
              icon={<BarChart3 className="h-4 w-4 text-violet-600" />}
              iconBg="bg-violet-50"
              text={<span className="text-slate-800">{metrics.interviewsThisWeek} entrevistas esta semana</span>}
            />
            <MetricMini
              icon={<Users className="h-4 w-4 text-amber-600" />}
              iconBg="bg-amber-50"
              text={<span className="text-slate-800">{metrics.areasCount} áreas cubiertas</span>}
            />
          </div>

          <div className="grid gap-5 sm:grid-cols-2">
            {filtered.map((row) => (
              <ProfileCard key={row.id} row={row} />
            ))}
          </div>

          {filtered.length === 0 ? (
            <p className="rounded-xl border border-slate-200 bg-slate-50 px-4 py-8 text-center text-sm text-slate-600">
              No hay perfiles que coincidan con la búsqueda o el filtro.
            </p>
          ) : null}
        </div>

        <aside className="lg:sticky lg:top-24 lg:self-start">
          <div className="rounded-xl border border-slate-200/90 bg-white p-5 shadow-sm">
            <h2 className="text-base font-semibold text-slate-900">¿Para qué sirven los perfiles?</h2>
            <ul className="mt-4 space-y-4">
              <InfoRow
                icon={<Target className="h-4 w-4 text-blue-600" />}
                boxClass="bg-blue-50 ring-blue-100"
                title="Enfocan la entrevista"
                desc="Definen el tono y los criterios que el agente de voz prioriza en la conversación."
              />
              <InfoRow
                icon={<BarChart3 className="h-4 w-4 text-emerald-600" />}
                boxClass="bg-emerald-50 ring-emerald-100"
                title="Contextualizan el puntaje"
                desc="El informe interpreta el desempeño según el rol y el nivel esperado."
              />
              <InfoRow
                icon={<Sparkles className="h-4 w-4 text-violet-600" />}
                boxClass="bg-violet-50 ring-violet-100"
                title="Mejoran las recomendaciones"
                desc="Las fortalezas, riesgos y próximos pasos quedan alineados al perfil elegido."
              />
            </ul>
            <Link
              href="/settings"
              className="mt-6 inline-flex items-center gap-2 text-sm font-semibold text-blue-600 hover:text-blue-700"
            >
              Más información sobre perfiles
              <ExternalLink className="h-3.5 w-3.5" />
            </Link>
          </div>
        </aside>
      </div>
    </div>
  );
}

function MetricMini({ icon, iconBg, text }: { icon: ReactNode; iconBg: string; text: ReactNode }) {
  return (
    <div className="flex items-center gap-3 rounded-xl border border-slate-100 bg-white px-3 py-3 shadow-sm">
      <span className={cn("flex h-9 w-9 shrink-0 items-center justify-center rounded-lg ring-1", iconBg)}>{icon}</span>
      <p className="text-sm font-medium leading-snug">{text}</p>
    </div>
  );
}

function InfoRow({
  icon,
  boxClass,
  title,
  desc,
}: {
  icon: ReactNode;
  boxClass: string;
  title: string;
  desc: string;
}) {
  return (
    <li className="flex gap-3">
      <span className={cn("flex h-10 w-10 shrink-0 items-center justify-center rounded-lg ring-1", boxClass)}>{icon}</span>
      <div>
        <p className="text-sm font-semibold text-slate-900">{title}</p>
        <p className="mt-1 text-xs leading-relaxed text-slate-600">{desc}</p>
      </div>
    </li>
  );
}

function ProfileCard({ row }: { row: ProfileCardRow }) {
  const meta = getProfileUiMeta(row.key, row.index);
  const tc = themeClasses(meta.theme);
  const Icon = meta.Icon;

  return (
    <div className="flex flex-col rounded-xl border border-slate-200/90 bg-white p-5 shadow-sm">
      <div className="flex items-start justify-between gap-3">
        <div className="flex min-w-0 gap-3">
          <span className={cn("flex h-11 w-11 shrink-0 items-center justify-center rounded-xl ring-1", tc.iconBox)}>
            <Icon className={cn("h-5 w-5", tc.icon)} strokeWidth={2} />
          </span>
          <div className="min-w-0">
            <h3 className="font-semibold leading-snug text-slate-900">{row.name}</h3>
            <div className="mt-1.5 flex flex-wrap gap-1.5">
              {meta.recommended ? (
                <span className="rounded-full bg-emerald-100 px-2 py-0.5 text-[11px] font-semibold uppercase tracking-wide text-emerald-800">
                  Recomendado
                </span>
              ) : null}
              {row.mostUsed ? (
                <span className="rounded-full bg-amber-100 px-2 py-0.5 text-[11px] font-semibold uppercase tracking-wide text-amber-900">
                  Más usado
                </span>
              ) : null}
            </div>
          </div>
        </div>
      </div>
      <p className="mt-3 text-sm leading-relaxed text-slate-600">{row.description ?? "Sin descripción."}</p>
      <div className="mt-4 flex flex-wrap gap-2">
        {meta.tags.map((t, i) => (
          <span
            key={`${t}-${i}`}
            className={cn(
              "rounded-full px-2.5 py-1 text-[11px] font-semibold",
              i === 0 ? tc.tagAccent : tc.tagMuted,
            )}
          >
            {t}
          </span>
        ))}
      </div>
      <div className="mt-auto flex flex-wrap items-center justify-between gap-3 border-t border-slate-100 pt-4">
        <p className="text-xs font-medium text-slate-500">
          Usado en <span className="font-semibold text-slate-800">{row.interviewCount}</span> entrevistas
        </p>
        <div className="flex flex-wrap items-center gap-3 text-sm font-semibold">
          <Link href={`/evaluation-profiles/${row.id}`} className="text-blue-600 hover:text-blue-700">
            Ver detalle
          </Link>
          <Link href={`/evaluation-profiles/${row.id}`} className="inline-flex items-center gap-1 text-blue-600 hover:text-blue-700">
            <Pencil className="h-3.5 w-3.5" />
            Editar
          </Link>
        </div>
      </div>
    </div>
  );
}
