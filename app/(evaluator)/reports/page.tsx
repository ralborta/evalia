import { prisma } from "@/lib/prisma";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export default async function ReportsPage() {
  const interviews = await prisma.interview.findMany({
    where: { status: "COMPLETED", evaluation: { isNot: null } },
    include: { evaluation: true, candidate: true, jobPosition: true },
  });

  const avg =
    interviews.length === 0
      ? null
      : Math.round(interviews.reduce((a, i) => a + (i.evaluation?.overallScore ?? 0), 0) / interviews.length);

  const buckets = { high: 0, mid: 0, low: 0 };
  for (const i of interviews) {
    const s = i.evaluation?.overallScore ?? 0;
    if (s >= 80) buckets.high += 1;
    else if (s >= 60) buckets.mid += 1;
    else buckets.low += 1;
  }

  return (
    <div className="mx-auto max-w-5xl space-y-8">
      <div>
        <h1 className="text-2xl font-semibold text-slate-900">Reportes</h1>
        <p className="text-sm text-slate-500">Vista agregada de entrevistas completadas con evaluación.</p>
      </div>
      <div className="grid gap-4 sm:grid-cols-3">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-slate-500">Promedio general</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-semibold text-violet-700">{avg ?? "—"}</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-slate-500">Excelente / bueno (≥80)</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-semibold text-emerald-700">{buckets.high}</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-slate-500">Necesita mejora (&lt;60)</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-semibold text-red-700">{buckets.low}</p>
          </CardContent>
        </Card>
      </div>
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Detalle reciente</CardTitle>
        </CardHeader>
        <CardContent className="overflow-x-auto p-0">
          <table className="w-full text-left text-sm">
            <thead className="border-b border-slate-100 bg-slate-50 text-xs uppercase text-slate-500">
              <tr>
                <th className="px-4 py-3">Candidato</th>
                <th className="px-4 py-3">Cargo</th>
                <th className="px-4 py-3">Score</th>
                <th className="px-4 py-3">Nivel</th>
              </tr>
            </thead>
            <tbody>
              {interviews.slice(0, 15).map((row) => (
                <tr key={row.id} className="border-b border-slate-100 last:border-0">
                  <td className="px-4 py-3">{row.candidate.name}</td>
                  <td className="px-4 py-3">{row.jobPosition.title}</td>
                  <td className="px-4 py-3">{row.evaluation?.overallScore}</td>
                  <td className="px-4 py-3">{row.evaluation?.estimatedLevel}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </CardContent>
      </Card>
    </div>
  );
}
