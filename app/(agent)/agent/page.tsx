import { prisma } from "@/lib/prisma";
import { auth } from "@/auth";
import { redirect } from "next/navigation";
import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";

export default async function AgentHomePage() {
  const session = await auth();
  if (!session?.user) redirect("/login");

  const interviews = await prisma.interview.findMany({
    where: { candidate: { linkedUserId: session.user.id } },
    orderBy: { createdAt: "desc" },
    take: 20,
    include: { jobPosition: true, evaluation: true },
  });

  const completed = interviews.filter((i) => i.evaluation);
  const avg =
    completed.length === 0
      ? null
      : Math.round(completed.reduce((a, i) => a + (i.evaluation?.overallScore ?? 0), 0) / completed.length);

  return (
    <div className="mx-auto max-w-5xl space-y-8">
      <div>
        <h1 className="text-2xl font-semibold text-slate-900">Tu desempeño</h1>
        <p className="text-sm text-slate-500">Resumen de evaluaciones asignadas a tu perfil.</p>
      </div>
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Evaluaciones</CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-semibold">{interviews.length}</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Puntaje promedio</CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-semibold text-violet-700">{avg ?? "—"}</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Completadas</CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-semibold">{completed.length}</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Pendientes</CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-semibold">{interviews.length - completed.length}</p>
          </CardContent>
        </Card>
      </div>
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Últimas evaluaciones</CardTitle>
        </CardHeader>
        <CardContent className="overflow-x-auto p-0">
          <table className="w-full text-left text-sm">
            <thead className="border-b border-slate-100 bg-slate-50 text-xs uppercase text-slate-500">
              <tr>
                <th className="px-4 py-3">Cargo</th>
                <th className="px-4 py-3">Score</th>
                <th className="px-4 py-3">Estado</th>
                <th className="px-4 py-3" />
              </tr>
            </thead>
            <tbody>
              {interviews.map((row) => (
                <tr key={row.id} className="border-b border-slate-100 last:border-0">
                  <td className="px-4 py-3">{row.jobPosition.title}</td>
                  <td className="px-4 py-3">{row.evaluation?.overallScore ?? "—"}</td>
                  <td className="px-4 py-3">{row.status}</td>
                  <td className="px-4 py-3 text-right">
                    <Link href={`/interview/${row.publicToken}`} className="text-violet-700 hover:underline">
                      Sala
                    </Link>
                  </td>
                </tr>
              ))}
              {interviews.length === 0 ? (
                <tr>
                  <td colSpan={4} className="px-4 py-8 text-center text-slate-500">
                    Aún no tienes simulaciones asignadas.
                  </td>
                </tr>
              ) : null}
            </tbody>
          </table>
        </CardContent>
      </Card>
    </div>
  );
}
