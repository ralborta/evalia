"use client";

import type { ReactNode } from "react";
import Link from "next/link";
import { useEffect, useMemo, useRef, useState } from "react";
import {
  Check,
  ChevronLeft,
  ChevronRight,
  ClipboardList,
  Clock,
  Download,
  Headphones,
  Link2,
  Pause,
  Play,
  Search,
  SlidersHorizontal,
  ArrowDownWideNarrow,
  Send,
  X,
} from "lucide-react";
import { cn } from "@/lib/utils";

export type InterviewListRow = {
  id: string;
  candidateName: string;
  initials: string;
  jobTitle: string;
  profileName: string;
  status: string;
  level: string | null;
  score: number | null;
  dateIso: string;
  hasAudio: boolean;
};

export type InterviewMetrics = {
  total: number;
  completed: number;
  linkSent: number;
  processing: number;
};

const STATUSES = [
  "ALL",
  "CREATED",
  "LINK_READY",
  "IN_PROGRESS",
  "PROCESSING",
  "COMPLETED",
  "FAILED",
  "EXPIRED",
] as const;

const LEVELS = ["ALL", "A1", "A2", "B1", "B2", "C1", "C2"] as const;

function avatarColors(seed: string) {
  const palette = [
    { bg: "bg-blue-100", text: "text-blue-800" },
    { bg: "bg-violet-100", text: "text-violet-800" },
    { bg: "bg-emerald-100", text: "text-emerald-800" },
    { bg: "bg-amber-100", text: "text-amber-900" },
    { bg: "bg-sky-100", text: "text-sky-800" },
    { bg: "bg-rose-100", text: "text-rose-800" },
  ];
  let n = 0;
  for (let i = 0; i < seed.length; i++) n += seed.charCodeAt(i);
  return palette[n % palette.length]!;
}

function formatInterviewDate(iso: string) {
  const d = new Date(iso);
  return new Intl.DateTimeFormat("es", {
    timeZone: "UTC",
    day: "numeric",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(d);
}

function StatusPill({ status }: { status: string }) {
  if (status === "COMPLETED") {
    return (
      <span className="inline-flex items-center gap-1 rounded-full bg-emerald-100 px-2.5 py-1 text-[11px] font-semibold uppercase tracking-wide text-emerald-800">
        <Check className="h-3 w-3" strokeWidth={2.5} />
        Completada
      </span>
    );
  }
  if (status === "LINK_READY") {
    return (
      <span className="inline-flex items-center gap-1 rounded-full bg-sky-100 px-2.5 py-1 text-[11px] font-semibold uppercase tracking-wide text-sky-800">
        <Send className="h-3 w-3" strokeWidth={2.5} />
        Link enviado
      </span>
    );
  }
  if (status === "PROCESSING" || status === "IN_PROGRESS") {
    return (
      <span className="inline-flex items-center gap-1 rounded-full bg-amber-100 px-2.5 py-1 text-[11px] font-semibold uppercase tracking-wide text-amber-900">
        <Clock className="h-3 w-3" strokeWidth={2.5} />
        {status === "PROCESSING" ? "Procesando" : "En curso"}
      </span>
    );
  }
  if (status === "CREATED") {
    return (
      <span className="inline-flex items-center gap-1 rounded-full bg-slate-100 px-2.5 py-1 text-[11px] font-semibold uppercase tracking-wide text-slate-700">
        Creada
      </span>
    );
  }
  if (status === "FAILED" || status === "EXPIRED") {
    return (
      <span className="inline-flex items-center gap-1 rounded-full bg-red-100 px-2.5 py-1 text-[11px] font-semibold uppercase tracking-wide text-red-800">
        {status === "FAILED" ? "Fallida" : "Expirada"}
      </span>
    );
  }
  return (
    <span className="inline-flex rounded-full bg-slate-100 px-2.5 py-1 text-[11px] font-semibold uppercase tracking-wide text-slate-700">
      {status}
    </span>
  );
}

export function InterviewsListClient({ metrics, rows }: { metrics: InterviewMetrics; rows: InterviewListRow[] }) {
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<(typeof STATUSES)[number]>("ALL");
  const [levelFilter, setLevelFilter] = useState<(typeof LEVELS)[number]>("ALL");
  const [sort, setSort] = useState<"recent" | "oldest" | "score">("recent");
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [listeningId, setListeningId] = useState<string | null>(null);

  const filtered = useMemo(() => {
    let list = [...rows];
    const q = search.trim().toLowerCase();
    if (q) {
      list = list.filter(
        (r) =>
          r.candidateName.toLowerCase().includes(q) ||
          r.jobTitle.toLowerCase().includes(q) ||
          r.profileName.toLowerCase().includes(q),
      );
    }
    if (statusFilter !== "ALL") list = list.filter((r) => r.status === statusFilter);
    if (levelFilter !== "ALL") list = list.filter((r) => r.level === levelFilter);

    list.sort((a, b) => {
      if (sort === "recent") return new Date(b.dateIso).getTime() - new Date(a.dateIso).getTime();
      if (sort === "oldest") return new Date(a.dateIso).getTime() - new Date(b.dateIso).getTime();
      const sa = a.score ?? -1;
      const sb = b.score ?? -1;
      return sb - sa;
    });
    return list;
  }, [rows, search, statusFilter, levelFilter, sort]);

  const totalFiltered = filtered.length;
  const totalPages = Math.max(1, Math.ceil(totalFiltered / pageSize));
  const currentPage = Math.min(page, totalPages);
  const start = (currentPage - 1) * pageSize;
  const pageRows = filtered.slice(start, start + pageSize);
  const from = totalFiltered === 0 ? 0 : start + 1;
  const to = Math.min(start + pageSize, totalFiltered);

  const selectClass =
    "h-10 rounded-lg border border-slate-200 bg-white px-3 text-sm text-slate-800 shadow-sm outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-500/20";

  return (
    <div className="mx-auto max-w-6xl space-y-6 pb-8">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
        <div className="flex gap-4">
          <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-blue-50 text-blue-600 ring-1 ring-blue-100">
            <ClipboardList className="h-6 w-6" strokeWidth={2} />
          </div>
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-slate-900">Entrevistas</h1>
            <p className="mt-1 text-sm text-slate-600">Gestioná el estado, nivel y resultados de cada evaluación.</p>
          </div>
        </div>
        <Link
          href="/interviews/new"
          className="inline-flex shrink-0 items-center justify-center gap-2 self-start rounded-xl bg-blue-600 px-5 py-2.5 text-sm font-semibold text-white shadow-md shadow-blue-600/20 transition hover:bg-blue-700"
        >
          + Nueva entrevista
        </Link>
      </div>

      <div className="flex flex-col gap-3 rounded-xl border border-slate-200/90 bg-white p-4 shadow-sm lg:flex-row lg:items-center lg:gap-3">
        <div className="relative min-w-0 flex-1">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
          <input
            type="search"
            placeholder="Buscar por candidato, cargo o perfil"
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              setPage(1);
            }}
            className="h-10 w-full rounded-lg border border-slate-200 bg-slate-50/50 py-2 pl-10 pr-3 text-sm text-slate-900 placeholder:text-slate-400 focus:border-blue-400 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/20"
          />
        </div>
        <div className="flex flex-wrap items-center gap-2 lg:shrink-0">
          <select
            className={cn(selectClass, "min-w-[150px]")}
            value={statusFilter}
            onChange={(e) => {
              setStatusFilter(e.target.value as (typeof STATUSES)[number]);
              setPage(1);
            }}
          >
            <option value="ALL">Todos los estados</option>
            <option value="CREATED">Creada</option>
            <option value="LINK_READY">Link enviado</option>
            <option value="IN_PROGRESS">En curso</option>
            <option value="PROCESSING">Procesando</option>
            <option value="COMPLETED">Completada</option>
            <option value="FAILED">Fallida</option>
            <option value="EXPIRED">Expirada</option>
          </select>
          <select
            className={cn(selectClass, "min-w-[140px]")}
            value={levelFilter}
            onChange={(e) => {
              setLevelFilter(e.target.value as (typeof LEVELS)[number]);
              setPage(1);
            }}
          >
            <option value="ALL">Todos los niveles</option>
            {LEVELS.filter((l) => l !== "ALL").map((l) => (
              <option key={l} value={l}>
                {l}
              </option>
            ))}
          </select>
          <div className="relative">
            <ArrowDownWideNarrow className="pointer-events-none absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
            <select
              className={cn(selectClass, "min-w-[160px] pl-9")}
              value={sort}
              onChange={(e) => {
                setSort(e.target.value as "recent" | "oldest" | "score");
                setPage(1);
              }}
            >
              <option value="recent">Más recientes</option>
              <option value="oldest">Más antiguas</option>
              <option value="score">Mayor score</option>
            </select>
          </div>
          <button
            type="button"
            className="flex h-10 w-10 items-center justify-center rounded-lg border border-slate-200 bg-white text-slate-500 transition hover:bg-slate-50 hover:text-slate-800"
            title="Filtros"
            aria-label="Filtros"
          >
            <SlidersHorizontal className="h-4 w-4" />
          </button>
        </div>
      </div>

      <div className="flex flex-wrap divide-x divide-slate-200 rounded-xl border border-slate-200/90 bg-white px-2 py-4 shadow-sm sm:flex-nowrap">
        <MetricCell icon={<ClipboardList className="h-5 w-5 text-blue-600" />} label="creadas" value={metrics.total} />
        <MetricCell icon={<Check className="h-5 w-5 text-emerald-600" />} label="finalizadas" value={metrics.completed} />
        <MetricCell icon={<Link2 className="h-5 w-5 text-violet-600" />} label="link enviado" value={metrics.linkSent} />
        <MetricCell icon={<Clock className="h-5 w-5 text-amber-600" />} label="procesando" value={metrics.processing} />
      </div>

      <div className="overflow-hidden rounded-xl border border-slate-200/90 bg-white shadow-sm">
        <div className="border-b border-slate-100 px-5 py-4">
          <h2 className="text-base font-semibold text-slate-900">Todas las entrevistas</h2>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[900px] text-left text-sm">
            <thead className="border-b border-slate-100 bg-slate-50/80 text-[11px] font-semibold uppercase tracking-wider text-slate-500">
              <tr>
                <th className="px-5 py-3">Candidato</th>
                <th className="px-5 py-3">Cargo</th>
                <th className="px-5 py-3">Perfil</th>
                <th className="px-5 py-3">Estado</th>
                <th className="px-5 py-3">Nivel</th>
                <th className="px-5 py-3">Score</th>
                <th className="px-5 py-3">Fecha</th>
                <th className="px-5 py-3 text-right">Acción</th>
              </tr>
            </thead>
            <tbody>
              {pageRows.length === 0 ? (
                <tr>
                  <td colSpan={8} className="px-6 py-14 text-center">
                    {rows.length === 0 ? (
                      <>
                        <p className="font-semibold text-slate-800">No hay entrevistas en esta base de datos.</p>
                        <p className="mx-auto mt-3 max-w-lg text-sm leading-relaxed text-slate-600">
                          Esto no lista conversaciones externas del motor de voz: solo filas creadas aquí (Nueva
                          entrevista) o por el seed. Esas conversaciones se enlazan al abrir el detalle de una entrevista
                          e importar el{" "}
                          <span className="font-mono text-xs text-blue-700">conversation_id</span>.
                        </p>
                        <Link
                          href="/interviews/new"
                          className="mt-6 inline-flex rounded-xl bg-blue-600 px-5 py-2.5 text-sm font-semibold text-white shadow-md hover:bg-blue-700"
                        >
                          Crear nueva entrevista
                        </Link>
                      </>
                    ) : (
                      <>
                        <p className="font-semibold text-slate-800">No hay entrevistas que coincidan.</p>
                        <p className="mx-auto mt-3 max-w-lg text-sm leading-relaxed text-slate-600">
                          Ajustá la búsqueda o los filtros, o creá una entrevista desde{" "}
                          <Link href="/interviews/new" className="font-semibold text-blue-600 hover:underline">
                            Nueva entrevista
                          </Link>
                          .
                        </p>
                      </>
                    )}
                  </td>
                </tr>
              ) : (
                pageRows.map((row) => {
                  const av = avatarColors(row.id);
                  const isListening = listeningId === row.id;
                  return (
                    <tr key={row.id} className="border-b border-slate-50 last:border-0 hover:bg-slate-50/60">
                      <td className="px-5 py-3.5" colSpan={isListening ? 8 : 1}>
                        {isListening ? (
                          <InlineAudioPlayer
                            interviewId={row.id}
                            candidateName={row.candidateName}
                            onClose={() => setListeningId(null)}
                          />
                        ) : (
                          <div className="flex items-center gap-3">
                            <span
                              className={cn(
                                "flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-xs font-bold",
                                av.bg,
                                av.text,
                              )}
                            >
                              {row.initials}
                            </span>
                            <span className="font-medium text-slate-900">{row.candidateName}</span>
                          </div>
                        )}
                      </td>
                      {!isListening ? (
                        <>
                      <td className="px-5 py-3.5 text-slate-600">{row.jobTitle}</td>
                      <td className="px-5 py-3.5 text-slate-600">{row.profileName}</td>
                      <td className="px-5 py-3.5">
                        <StatusPill status={row.status} />
                      </td>
                      <td className="px-5 py-3.5">
                        {row.level ? (
                          <span className="inline-flex rounded-full bg-emerald-50 px-2 py-0.5 text-xs font-semibold text-emerald-800 ring-1 ring-emerald-100">
                            {row.level}
                          </span>
                        ) : (
                          <span className="text-slate-400">—</span>
                        )}
                      </td>
                      <td className="px-5 py-3.5 font-medium tabular-nums text-slate-800">{row.score ?? "—"}</td>
                      <td className="px-5 py-3.5 whitespace-nowrap text-slate-600">{formatInterviewDate(row.dateIso)}</td>
                      <td className="px-5 py-3.5 text-right">
                        <div className="inline-flex items-center justify-end gap-1.5">
                          {row.hasAudio ? (
                            <>
                              <button
                                type="button"
                                onClick={() => setListeningId(row.id)}
                                className="inline-flex items-center gap-1.5 rounded-lg border border-violet-200 bg-violet-50 px-2.5 py-1.5 text-xs font-semibold text-violet-800 transition hover:bg-violet-100"
                                title="Escuchar entrevista"
                              >
                                <Headphones className="h-3.5 w-3.5" />
                                Escuchar
                              </button>
                              <a
                                href={`/api/interviews/${row.id}/audio?download=1`}
                                download
                                className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 text-xs font-semibold text-slate-700 transition hover:bg-slate-50"
                                title="Descargar grabación"
                              >
                                <Download className="h-3.5 w-3.5" />
                                Descargar
                              </a>
                            </>
                          ) : null}
                          <Link
                            href={`/interviews/${row.id}`}
                            className="ml-1 text-sm font-semibold text-blue-600 hover:text-blue-700"
                          >
                            Ver detalle &gt;
                          </Link>
                        </div>
                      </td>
                        </>
                      ) : null}
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        <div className="flex flex-col gap-3 border-t border-slate-100 px-5 py-4 text-sm text-slate-600 sm:flex-row sm:items-center sm:justify-between">
          <p>
            Mostrando <span className="font-semibold text-slate-900">{from}</span> a{" "}
            <span className="font-semibold text-slate-900">{to}</span> de{" "}
            <span className="font-semibold text-slate-900">{totalFiltered}</span> entrevistas
          </p>
          <button
            type="button"
            className="font-semibold text-blue-600 hover:text-blue-700 hover:underline"
            onClick={() => {
              setPageSize(Math.max(totalFiltered, rows.length));
              setPage(1);
            }}
          >
            Ver todas las entrevistas &gt;
          </button>
          <div className="flex items-center justify-center gap-1 sm:justify-end">
            <button
              type="button"
              disabled={currentPage <= 1}
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              className="flex h-9 w-9 items-center justify-center rounded-lg border border-slate-200 bg-white text-slate-600 transition hover:bg-slate-50 disabled:opacity-40"
              aria-label="Página anterior"
            >
              <ChevronLeft className="h-4 w-4" />
            </button>
            <span className="flex h-9 min-w-9 items-center justify-center rounded-lg border border-blue-200 bg-blue-50 px-2 text-sm font-semibold text-blue-800">
              {currentPage}
            </span>
            <button
              type="button"
              disabled={currentPage >= totalPages}
              onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
              className="flex h-9 w-9 items-center justify-center rounded-lg border border-slate-200 bg-white text-slate-600 transition hover:bg-slate-50 disabled:opacity-40"
              aria-label="Página siguiente"
            >
              <ChevronRight className="h-4 w-4" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

function MetricCell({ icon, label, value }: { icon: ReactNode; label: string; value: number }) {
  return (
    <div className="flex min-w-[140px] flex-1 items-center gap-3 px-4 py-1 first:pl-3 last:pr-3 sm:min-w-0">
      <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-slate-50">{icon}</span>
      <div>
        <p className="text-lg font-bold tabular-nums text-slate-900">
          {value} <span className="text-sm font-semibold text-slate-500">{label}</span>
        </p>
      </div>
    </div>
  );
}

function formatClock(seconds: number) {
  if (!Number.isFinite(seconds) || seconds < 0) return "0:00";
  const m = Math.floor(seconds / 60);
  const s = Math.floor(seconds % 60);
  return `${m}:${String(s).padStart(2, "0")}`;
}

function InlineAudioPlayer({
  interviewId,
  candidateName,
  onClose,
}: {
  interviewId: string;
  candidateName: string;
  onClose: () => void;
}) {
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const [playing, setPlaying] = useState(false);
  const [current, setCurrent] = useState(0);
  const [duration, setDuration] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const src = `/api/interviews/${interviewId}/audio`;

  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;

    const onLoaded = () => {
      setDuration(audio.duration || 0);
      setLoading(false);
      void audio.play().then(() => setPlaying(true)).catch(() => setPlaying(false));
    };
    const onTime = () => setCurrent(audio.currentTime || 0);
    const onEnded = () => setPlaying(false);
    const onErr = () => {
      setLoading(false);
      setError("No se pudo cargar el audio. Probá de nuevo en unos minutos o abrí el detalle.");
    };

    audio.addEventListener("loadedmetadata", onLoaded);
    audio.addEventListener("timeupdate", onTime);
    audio.addEventListener("ended", onEnded);
    audio.addEventListener("error", onErr);
    return () => {
      audio.pause();
      audio.removeEventListener("loadedmetadata", onLoaded);
      audio.removeEventListener("timeupdate", onTime);
      audio.removeEventListener("ended", onEnded);
      audio.removeEventListener("error", onErr);
    };
  }, [src]);

  const toggle = () => {
    const audio = audioRef.current;
    if (!audio) return;
    if (audio.paused) {
      void audio.play().then(() => setPlaying(true)).catch(() => setPlaying(false));
    } else {
      audio.pause();
      setPlaying(false);
    }
  };

  return (
    <div className="rounded-xl border border-violet-200 bg-violet-50/70 px-4 py-3">
      <audio ref={audioRef} src={src} preload="metadata" className="hidden" />
      <div className="flex flex-wrap items-center gap-3">
        <button
          type="button"
          onClick={toggle}
          disabled={loading || Boolean(error)}
          className="inline-flex h-10 w-10 items-center justify-center rounded-full bg-violet-600 text-white shadow-sm transition hover:bg-violet-700 disabled:opacity-40"
          aria-label={playing ? "Pausar" : "Reproducir"}
        >
          {playing ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4 translate-x-0.5" />}
        </button>
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-semibold text-slate-900">
            Escuchando: {candidateName}
            {loading ? <span className="ml-2 font-normal text-slate-500">Cargando…</span> : null}
          </p>
          {error ? (
            <p className="mt-1 text-xs text-red-700">{error}</p>
          ) : (
            <div className="mt-2 flex items-center gap-2">
              <span className="w-10 text-right text-[11px] tabular-nums text-slate-500">
                {formatClock(current)}
              </span>
              <input
                type="range"
                min={0}
                max={Math.max(duration, 1)}
                step={0.1}
                value={Math.min(current, duration || 0)}
                onChange={(e) => {
                  const next = Number(e.target.value);
                  const audio = audioRef.current;
                  if (audio) audio.currentTime = next;
                  setCurrent(next);
                }}
                className="h-1.5 w-full accent-violet-600"
                aria-label="Progreso del audio"
              />
              <span className="w-10 text-[11px] tabular-nums text-slate-500">
                {formatClock(duration)}
              </span>
            </div>
          )}
        </div>
        <a
          href={`/api/interviews/${interviewId}/audio?download=1`}
          download
          className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 text-xs font-semibold text-slate-700 transition hover:bg-slate-50"
        >
          <Download className="h-3.5 w-3.5" />
          Descargar
        </a>
        <Link
          href={`/interviews/${interviewId}`}
          className="text-xs font-semibold text-blue-600 hover:underline"
        >
          Ver detalle
        </Link>
        <button
          type="button"
          onClick={onClose}
          className="inline-flex h-8 w-8 items-center justify-center rounded-lg text-slate-500 transition hover:bg-white hover:text-slate-800"
          aria-label="Cerrar reproductor"
        >
          <X className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
}
