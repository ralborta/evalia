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
    <div className="mx-auto max-w-6xl space-y-8">
      <div>
        <h1 className="text-2xl font-semibold text-slate-900">Panel principal</h1>
        <p className="text-sm text-slate-500">Resumen de entrevistas y accesos rápidos.</p>
      </div>
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Stat title="Total entrevistas" value={String(total)} />
        <Stat title="Completadas" value={String(completed)} />
        <Stat title="Pendientes / link" value={String(pending)} />
        <Stat title="En curso / procesando" value={String(inProgress)} />
      </div>
      <div className="grid gap-4 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle className="flex items-center gap-2 text-base">
              <ClipboardList className="h-4 w-4 text-violet-600" />
              Entrevistas recientes
            </CardTitle>
            <Link href="/interviews/new" className="text-sm font-medium text-violet-700 hover:underline">
              Nueva
            </Link>
          </CardHeader>
          <CardContent className="overflow-x-auto p-0">
            <table className="w-full min-w-[640px] text-left text-sm">
              <thead className="border-b border-slate-100 bg-slate-50 text-xs uppercase text-slate-500">
                <tr>
                  <th className="px-4 py-3">Candidato</th>
                  <th className="px-4 py-3">Cargo</th>
                  <th className="px-4 py-3">Perfil</th>
                  <th className="px-4 py-3">Estado</th>
                  <th className="px-4 py-3">Score</th>
                  <th className="px-4 py-3" />
                </tr>
              </thead>
              <tbody>
                {interviews.map((row) => (
                  <tr key={row.id} className="border-b border-slate-100 last:border-0">
                    <td className="px-4 py-3 font-medium text-slate-900">{row.candidate.name}</td>
                    <td className="px-4 py-3 text-slate-600">{row.jobPosition.title}</td>
                    <td className="px-4 py-3 text-slate-600">{row.evaluationProfile.name}</td>
                    <td className="px-4 py-3">
                      <Badge variant={statusVariant(row.status)}>{statusLabel[row.status] ?? row.status}</Badge>
                    </td>
                    <td className="px-4 py-3 text-slate-700">
                      {row.evaluation ? `${row.evaluation.overallScore}` : "—"}
                    </td>
                    <td className="px-4 py-3 text-right">
                      <Link href={`/interviews/${row.id}`} className="text-violet-700 hover:underline">
                        Ver
                      </Link>
                    </td>
                  </tr>
                ))}
                {interviews.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="px-4 py-8 text-center text-slate-500">
                      Aún no hay entrevistas. Crea la primera desde &quot;Nueva entrevista&quot;.
                    </td>
                  </tr>
                ) : null}
              </tbody>
            </table>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Promedio de score</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-4xl font-semibold text-violet-700">{avgScore ?? "—"}</p>
            <p className="mt-2 text-xs text-slate-500">Calculado sobre entrevistas con evaluación en la vista actual.</p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

function Stat({ title, value }: { title: string; value: string }) {
  return (
    <Card>
      <CardHeader className="pb-2">
        <CardDescription>{title}</CardDescription>
      </CardHeader>
      <CardContent>
        <p className="text-2xl font-semibold text-slate-900">{value}</p>
      </CardContent>
    </Card>
  );
}
