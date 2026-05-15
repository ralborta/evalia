import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export default function SettingsPage() {
  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">Configuración</h1>
        <p className="mt-1 text-sm text-slate-600">Preferencias de la cuenta y del espacio de trabajo.</p>
      </div>
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Próximamente</CardTitle>
        </CardHeader>
        <CardContent className="text-sm text-slate-600">
          Esta sección se habilitará en una próxima versión. Mientras tanto, las variables de entorno y la base de datos
          se gestionan desde tu proveedor (Vercel / Railway).
        </CardContent>
      </Card>
    </div>
  );
}
