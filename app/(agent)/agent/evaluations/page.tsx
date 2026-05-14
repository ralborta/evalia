import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { auth } from "@/auth";
import { redirect } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export default async function AgentEvaluationsPage() {
  const session = await auth();
  if (!session?.user) redirect("/login");

  const interviews = await prisma.interview.findMany({
    where: { candidate: { linkedUserId: session.user.id } },
    orderBy: { createdAt: "desc" },
    include: { jobPosition: true, evaluation: true, evaluationProfile: true },
  });

  return (
    <div className="mx-auto max-w-5xl space-y-6">
      <h1 className="text-2xl font-semibold text-slate-900">Mis evaluaciones</h1>
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Historial</CardTitle>
        </CardHeader>
        <CardContent className="overflow-x-auto p-0">
          <table className="w-full text-left text-sm">
            <thead className="border-b border-slate-100 bg-slate-50 text-xs uppercase text-slate-500">
              <tr>
                <th className="px-4 py-3">Perfil</th>
                <th className="px-4 py-3">Cargo</th>
                <th className="px-4 py-3">Score</th>
                <th className="px-4 py-3">Nivel</th>
                <th className="px-4 py-3" />
              </tr>
            </thead>
            <tbody>
              {interviews.map((row) => (
                <tr key={row.id} className="border-b border-slate-100 last:border-0">
                  <td className="px-4 py-3">{row.evaluationProfile.name}</td>
                  <td className="px-4 py-3">{row.jobPosition.title}</td>
                  <td className="px-4 py-3">{row.evaluation?.overallScore ?? "—"}</td>
                  <td className="px-4 py-3">{row.evaluation?.estimatedLevel ?? "—"}</td>
                  <td className="px-4 py-3 text-right text-violet-700">
                    <Link href={`/interview/${row.publicToken}`}>Abrir</Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </CardContent>
      </Card>
    </div>
  );
}
