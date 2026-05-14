import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export default function AgentCallsPage() {
  return (
    <div className="mx-auto max-w-3xl space-y-4">
      <h1 className="text-2xl font-semibold text-slate-900">Mis llamadas</h1>
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Próximamente</CardTitle>
        </CardHeader>
        <CardContent className="text-sm text-slate-600">
          Aquí podrás ver el historial detallado de llamadas simuladas (duración, escenario y estado). Por ahora usa
          &quot;Mis evaluaciones&quot; o el enlace de sala que te comparta tu supervisor.
        </CardContent>
      </Card>
    </div>
  );
}
