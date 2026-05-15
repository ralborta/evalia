import { prisma } from "@/lib/prisma";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export default async function CandidatesPage() {
  const candidates = await prisma.candidate.findMany({
    orderBy: { name: "asc" },
    include: {
      _count: { select: { interviews: true } },
    },
    take: 200,
  });

  return (
    <div className="mx-auto max-w-5xl space-y-8">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">Candidatos</h1>
        <p className="mt-1 text-sm text-slate-600">Personas con al menos una entrevista asociada en EvalIA.</p>
      </div>
      <Card>
        <CardHeader className="border-b border-slate-100">
          <CardTitle className="text-base font-semibold">Listado</CardTitle>
        </CardHeader>
        <CardContent className="overflow-x-auto p-0">
          <table className="w-full min-w-[480px] text-left text-sm">
            <thead className="bg-slate-50 text-[11px] font-semibold uppercase tracking-wider text-slate-500">
              <tr>
                <th className="px-5 py-3">Nombre</th>
                <th className="px-5 py-3">Email</th>
                <th className="px-5 py-3">Entrevistas</th>
              </tr>
            </thead>
            <tbody>
              {candidates.map((c) => (
                <tr key={c.id} className="border-b border-slate-50 last:border-0 hover:bg-slate-50/80">
                  <td className="px-5 py-3 font-medium text-slate-900">{c.name}</td>
                  <td className="px-5 py-3 text-slate-600">{c.email ?? "—"}</td>
                  <td className="px-5 py-3 text-slate-700">{c._count.interviews}</td>
                </tr>
              ))}
            </tbody>
          </table>
          {candidates.length === 0 ? (
            <p className="px-5 py-10 text-center text-sm text-slate-500">No hay candidatos registrados todavía.</p>
          ) : null}
        </CardContent>
      </Card>
    </div>
  );
}
