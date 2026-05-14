import { prisma } from "@/lib/prisma";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export default async function EvaluationProfilesPage() {
  const profiles = await prisma.evaluationProfile.findMany({ orderBy: { name: "asc" } });

  return (
    <div className="mx-auto max-w-4xl space-y-6">
      <div>
        <h1 className="text-2xl font-semibold text-slate-900">Perfiles de evaluación</h1>
        <p className="text-sm text-slate-500">
          Cada perfil orienta preguntas y el análisis del LLM hacia un contexto laboral (comercialmente no usamos la
          palabra &quot;rúbrica&quot; en la interfaz).
        </p>
      </div>
      <div className="grid gap-4 md:grid-cols-2">
        {profiles.map((p) => (
          <Card key={p.id}>
            <CardHeader>
              <CardTitle className="text-base">{p.name}</CardTitle>
              {p.description ? <p className="text-sm text-slate-500">{p.description}</p> : null}
            </CardHeader>
            <CardContent>
              <p className="text-xs font-mono text-slate-400">key: {p.key}</p>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
