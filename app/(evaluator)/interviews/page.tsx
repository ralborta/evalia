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
    <div className="mx-auto max-w-6xl space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-slate-900">Entrevistas</h1>
          <p className="text-sm text-slate-500">Listado completo con estado y score.</p>
        </div>
        <Link
          href="/interviews/new"
          className="rounded-lg bg-violet-600 px-4 py-2 text-sm font-medium text-white hover:bg-violet-700"
        >
          Nueva entrevista
        </Link>
      </div>
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Todas las entrevistas</CardTitle>
        </CardHeader>
        <CardContent className="overflow-x-auto p-0">
          <table className="w-full min-w-[720px] text-left text-sm">
            <thead className="border-b border-slate-100 bg-slate-50 text-xs uppercase text-slate-500">
              <tr>
                <th className="px-4 py-3">Candidato</th>
                <th className="px-4 py-3">Cargo</th>
                <th className="px-4 py-3">Perfil</th>
                <th className="px-4 py-3">Estado</th>
                <th className="px-4 py-3">Nivel</th>
                <th className="px-4 py-3">Score</th>
                <th className="px-4 py-3" />
              </tr>
            </thead>
            <tbody>
              {interviews.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-4 py-10 text-center text-sm text-slate-600">
                    <p className="font-medium text-slate-800">No hay entrevistas en esta base de datos.</p>
                    <p className="mt-2 max-w-lg mx-auto">
                      Esto no lista conversaciones de ElevenLabs: solo filas creadas aquí (Nueva entrevista) o por el
                      seed. Las conversaciones de ElevenLabs se enlazan al abrir el detalle de una entrevista e
                      importar el <span className="font-mono text-xs">conversation_id</span>.
                    </p>
                    <Link
                      href="/interviews/new"
                      className="mt-4 inline-block text-sm font-medium text-violet-700 hover:underline"
                    >
                      Crear nueva entrevista
                    </Link>
                  </td>
                </tr>
              ) : (
                interviews.map((row) => (
                  <tr key={row.id} className="border-b border-slate-100 last:border-0">
                    <td className="px-4 py-3 font-medium">{row.candidate.name}</td>
                    <td className="px-4 py-3 text-slate-600">{row.jobPosition.title}</td>
                    <td className="px-4 py-3 text-slate-600">{row.evaluationProfile.name}</td>
                    <td className="px-4 py-3">
                      <Badge variant="secondary">{statusLabel[row.status] ?? row.status}</Badge>
                    </td>
                    <td className="px-4 py-3 text-slate-600">{row.evaluation?.estimatedLevel ?? "—"}</td>
                    <td className="px-4 py-3">{row.evaluation?.overallScore ?? "—"}</td>
                    <td className="px-4 py-3 text-right">
                      <Link href={`/interviews/${row.id}`} className="text-violet-700 hover:underline">
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
