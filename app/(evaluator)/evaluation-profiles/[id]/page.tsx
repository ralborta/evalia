import Link from "next/link";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { ArrowLeft } from "lucide-react";
import { getProfileUiMeta, themeClasses } from "@/lib/evaluation-profile-ui";
import { cn } from "@/lib/utils";

export default async function EvaluationProfileDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const profile = await prisma.evaluationProfile.findUnique({
    where: { id },
    include: { _count: { select: { interviews: true } } },
  });
  if (!profile) notFound();

  const listIdx = (
    await prisma.evaluationProfile.findMany({ orderBy: { name: "asc" }, select: { id: true } })
  ).findIndex((p) => p.id === id);
  const meta = getProfileUiMeta(profile.key, listIdx >= 0 ? listIdx : 0);
  const tc = themeClasses(meta.theme);
  const Icon = meta.Icon;

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <Link
        href="/evaluation-profiles"
        className="inline-flex items-center gap-2 text-sm font-semibold text-blue-600 hover:text-blue-700"
      >
        <ArrowLeft className="h-4 w-4" />
        Volver a perfiles
      </Link>
      <div className="rounded-xl border border-slate-200/90 bg-white p-6 shadow-sm md:p-8">
        <div className="flex gap-4">
          <span className={cn("flex h-12 w-12 shrink-0 items-center justify-center rounded-xl ring-1", tc.iconBox)}>
            <Icon className={cn("h-6 w-6", tc.icon)} />
          </span>
          <div>
            <p className="text-xs font-medium uppercase tracking-wider text-slate-500">Perfil</p>
            <h1 className="text-2xl font-bold text-slate-900">{profile.name}</h1>
            <p className="mt-1 font-mono text-xs text-slate-400">key: {profile.key}</p>
          </div>
        </div>
        <p className="mt-4 text-sm leading-relaxed text-slate-600">{profile.description ?? "Sin descripción."}</p>
        <p className="mt-6 text-sm text-slate-600">
          <span className="font-semibold text-slate-900">{profile._count.interviews}</span> entrevistas usan este
          perfil.
        </p>
        <div className="mt-6 rounded-lg border border-slate-100 bg-slate-50/80 p-4">
          <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">configJson</p>
          <pre className="mt-2 max-h-64 overflow-auto text-xs leading-relaxed text-slate-800">
            {JSON.stringify(profile.configJson, null, 2)}
          </pre>
        </div>
        <p className="mt-6 text-sm text-slate-500">
          La edición de perfiles desde la UI está prevista para una próxima versión; por ahora podés ajustar datos vía
          seed o base de datos.
        </p>
      </div>
    </div>
  );
}
