import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export default function AgentHelpPage() {
  return (
    <div className="mx-auto max-w-3xl space-y-4">
      <h1 className="text-2xl font-semibold text-slate-900">Ayuda</h1>
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Consejos para la simulación</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2 text-sm text-slate-600">
          <p>Usa auriculares con micrófono y un lugar silencioso.</p>
          <p>Habla en inglés de forma natural; el entrevistador es un agente de voz.</p>
          <p>No cierres la ventana hasta finalizar con el botón correspondiente.</p>
        </CardContent>
      </Card>
    </div>
  );
}
