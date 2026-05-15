import { prisma } from "@/lib/prisma";
import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

const statusLabel: Record<string, string> = {
  CREATED: "Creada",
  LINK_READY: "Link listo",
  IN_PROGRESS: "En progreso",
  PROCESSING: "Procesando",
  COMPLETED: "Completada",
  FAILED: "Fallida",
  EXPIRED: "Expirada",
};

export default async function InterviewsListPage() {
  const interviews = await prisma.interview.findMany({
    orderBy: { createdAt: "desc" },
    include: {
      candidate: true,
      jobPosition: true,
      evaluationProfile: true,
      evaluation: true,
    },
  });

  return (
    <div className="mx-auto max-w-6xl space-y-10">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-slate-900">Entrevistas</h1>
          <p className="mt-2 text-slate-600">Listado con estado y puntuación.</p>
        </div>
        <Link
          href="/interviews/new"
          className="inline-flex items-center justify-center rounded-xl bg-gradient-to-r from-violet-600 to-indigo-600 px-5 py-2.5 text-sm font-semibold text-white shadow-lg shadow-violet-600/25 transition hover:from-violet-500 hover:to-indigo-500"
        >
          Nueva entrevista
        </Link>
      </div>
      <Card className="overflow-hidden">
        <CardHeader className="border-b border-slate-100 bg-slate-50/60 py-5">
          <CardTitle className="text-lg font-bold text-slate-900">Todas las entrevistas</CardTitle>
        </CardHeader>
        <CardContent className="overflow-x-auto p-0">
          <table className="w-full min-w-[720px] text-left text-sm">
            <thead className="border-b border-slate-100 bg-white text-[11px] font-semibold uppercase tracking-wider text-slate-500">
              <tr>
                <th className="px-5 py-3.5">Candidato</th>
                <th className="px-5 py-3.5">Cargo</th>
                <th className="px-5 py-3.5">Perfil</th>
                <th className="px-5 py-3.5">Estado</th>
                <th className="px-5 py-3.5">Nivel</th>
                <th className="px-5 py-3.5">Score</th>
                <th className="px-5 py-3.5" />
              </tr>
            </thead>
            <tbody>
              {interviews.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-6 py-14 text-center">
                    <p className="font-semibold text-slate-800">No hay entrevistas en esta base de datos.</p>
                    <p className="mx-auto mt-3 max-w-lg text-sm leading-relaxed text-slate-600">
                      Esto no lista conversaciones de ElevenLabs: solo filas creadas aquí (Nueva entrevista) o por el
                      seed. Las conversaciones de ElevenLabs se enlazan al abrir el detalle de una entrevista e
                      importar el <span className="font-mono text-xs text-violet-700">conversation_id</span>.
                    </p>
                    <Link
                      href="/interviews/new"
                      className="mt-6 inline-flex rounded-xl bg-violet-600 px-5 py-2.5 text-sm font-semibold text-white shadow-md hover:bg-violet-500"
                    >
                      Crear nueva entrevista
                    </Link>
                  </td>
                </tr>
              ) : (
                interviews.map((row) => (
                  <tr
                    key={row.id}
                    className="border-b border-slate-50 transition-colors last:border-0 hover:bg-violet-50/40"
                  >
                    <td className="px-5 py-3.5 font-semibold text-slate-900">{row.candidate.name}</td>
                    <td className="px-5 py-3.5 text-slate-600">{row.jobPosition.title}</td>
                    <td className="px-5 py-3.5 text-slate-600">{row.evaluationProfile.name}</td>
                    <td className="px-5 py-3.5">
                      <Badge variant="secondary">{statusLabel[row.status] ?? row.status}</Badge>
                    </td>
                    <td className="px-5 py-3.5 text-slate-600">{row.evaluation?.estimatedLevel ?? "—"}</td>
                    <td className="px-5 py-3.5 font-medium text-slate-800">{row.evaluation?.overallScore ?? "—"}</td>
                    <td className="px-5 py-3.5 text-right">
                      <Link
                        href={`/interviews/${row.id}`}
                        className="text-sm font-semibold text-violet-700 underline-offset-2 hover:underline"
                      >
                        Detalle
                      </Link>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </CardContent>
      </Card>
    </div>
  );
}
