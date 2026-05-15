import Link from "next/link";
import { ArrowLeft } from "lucide-react";

export default function NewEvaluationProfilePage() {
  return (
    <div className="mx-auto max-w-lg space-y-6">
      <Link
        href="/evaluation-profiles"
        className="inline-flex items-center gap-2 text-sm font-semibold text-blue-600 hover:text-blue-700"
      >
        <ArrowLeft className="h-4 w-4" />
        Volver a perfiles
      </Link>
      <div className="rounded-xl border border-slate-200 bg-white p-8 shadow-sm">
        <h1 className="text-xl font-bold text-slate-900">Nuevo perfil</h1>
        <p className="mt-2 text-sm leading-relaxed text-slate-600">
          La creación de perfiles desde la interfaz aún no está disponible. Los perfiles se gestionan por ahora con el
          seed de base de datos o migraciones.
        </p>
      </div>
    </div>
  );
}
