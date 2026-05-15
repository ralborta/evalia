import { prisma } from "@/lib/prisma";
import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ClipboardList } from "lucide-react";

const statusLabel: Record<string, string> = {
  CREATED: "Creada",
  LINK_READY: "Link listo",
  IN_PROGRESS: "En progreso",
  PROCESSING: "Procesando",
  COMPLETED: "Completada",
  FAILED: "Fallida",
  EXPIRED: "Expirada",
};

function statusVariant(s: string): "default" | "secondary" | "success" | "warning" | "danger" | "outline" {
  if (s === "COMPLETED") return "success";
  if (s === "FAILED" || s === "EXPIRED") return "danger";
  if (s === "IN_PROGRESS" || s === "PROCESSING") return "warning";
  return "secondary";
}

export default async function DashboardPage() {
  const interviews = await prisma.interview.findMany({
    orderBy: { createdAt: "desc" },
    take: 30,
    include: {
      candidate: true,
      jobPosition: true,
      evaluationProfile: true,
      evaluation: true,
    },
  });

  const total = await prisma.interview.count();
  const completed = await prisma.interview.count({ where: { status: "COMPLETED" } });
  const inProgress = await prisma.interview.count({ where: { status: { in: ["IN_PROGRESS", "PROCESSING"] } } });
  const pending = await prisma.interview.count({
    where: { status: { in: ["CREATED", "LINK_READY"] } },
  });

  const scored = interviews.filter((i) => i.evaluation);
  const avgScore =
    scored.length === 0 ? null : Math.round(scored.reduce((a, i) => a + (i.evaluation?.overallScore ?? 0), 0) / scored.length);

  return (
    <div className="mx-auto max-w-6xl space-y-10">
      <div>
        <h1 className="text-3xl font-bold tracking-tight text-slate-900">Panel principal</h1>
        <p className="mt-2 text-slate-600">Resumen de entrevistas y accesos rápidos.</p>
      </div>
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Stat title="Total entrevistas" value={String(total)} />
        <Stat title="Completadas" value={String(completed)} />
        <Stat title="Pendientes / link" value={String(pending)} />
        <Stat title="En curso / procesando" value={String(inProgress)} />
      </div>
      <div className="grid gap-6 lg:grid-cols-3">
        <Card className="overflow-hidden lg:col-span-2">
          <CardHeader className="flex flex-row flex-wrap items-center justify-between gap-3 border-b border-slate-100 bg-slate-50/50 pb-4">
            <CardTitle className="flex items-center gap-2 text-lg font-bold text-slate-900">
              <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-violet-100 text-violet-700">
                <ClipboardList className="h-4 w-4" />
              </span>
              Entrevistas recientes
            </CardTitle>
            <Link
              href="/interviews/new"
              className="rounded-xl bg-gradient-to-r from-violet-600 to-indigo-600 px-4 py-2 text-sm font-semibold text-white shadow-md shadow-violet-600/25 transition hover:from-violet-500 hover:to-indigo-500"
            >
              Nueva entrevista
            </Link>
          </CardHeader>
          <CardContent className="overflow-x-auto p-0">
            <table className="w-full min-w-[640px] text-left text-sm">
              <thead className="border-b border-slate-100 bg-white text-[11px] font-semibold uppercase tracking-wider text-slate-500">
                <tr>
                  <th className="px-5 py-3.5">Candidato</th>
                  <th className="px-5 py-3.5">Cargo</th>
                  <th className="px-5 py-3.5">Perfil</th>
                  <th className="px-5 py-3.5">Estado</th>
                  <th className="px-5 py-3.5">Score</th>
                  <th className="px-5 py-3.5" />
                </tr>
              </thead>
              <tbody>
                {interviews.map((row) => (
                  <tr
                    key={row.id}
                    className="border-b border-slate-50 transition-colors last:border-0 hover:bg-violet-50/40"
                  >
                    <td className="px-5 py-3.5 font-semibold text-slate-900">{row.candidate.name}</td>
                    <td className="px-5 py-3.5 text-slate-600">{row.jobPosition.title}</td>
                    <td className="px-5 py-3.5 text-slate-600">{row.evaluationProfile.name}</td>
                    <td className="px-5 py-3.5">
                      <Badge variant={statusVariant(row.status)}>{statusLabel[row.status] ?? row.status}</Badge>
                    </td>
                    <td className="px-5 py-3.5 font-medium text-slate-800">
                      {row.evaluation ? `${row.evaluation.overallScore}` : "—"}
                    </td>
                    <td className="px-5 py-3.5 text-right">
                      <Link
                        href={`/interviews/${row.id}`}
                        className="text-sm font-semibold text-violet-700 underline-offset-2 hover:underline"
                      >
                        Ver detalle
                      </Link>
                    </td>
                  </tr>
                ))}
                {interviews.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="px-5 py-12 text-center text-slate-500">
                      Aún no hay entrevistas. Crea la primera desde &quot;Nueva entrevista&quot;.
                    </td>
                  </tr>
                ) : null}
              </tbody>
            </table>
          </CardContent>
        </Card>
        <Card className="border-violet-100 bg-gradient-to-b from-white to-violet-50/30">
          <CardHeader>
            <CardTitle className="text-lg font-bold text-slate-900">Promedio de score</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-5xl font-bold tabular-nums tracking-tight text-violet-700">{avgScore ?? "—"}</p>
            <p className="mt-3 text-xs leading-relaxed text-slate-500">
              Calculado sobre entrevistas con evaluación en la vista actual.
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

function Stat({ title, value }: { title: string; value: string }) {
  return (
    <Card className="overflow-hidden border-l-4 border-l-violet-500 bg-white shadow-md shadow-slate-200/30">
      <CardHeader className="pb-2">
        <CardDescription className="text-xs font-semibold uppercase tracking-wide text-slate-500">{title}</CardDescription>
      </CardHeader>
      <CardContent>
        <p className="text-3xl font-bold tabular-nums tracking-tight text-slate-900">{value}</p>
      </CardContent>
    </Card>
  );
}
