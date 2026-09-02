import Link from "next/link";
import { JobForm } from "@/components/talent/job-form";
import { requireEvaluatorPage } from "@/lib/require-evaluator-page";

export default async function NewJobPage() {
  await requireEvaluatorPage();
  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <Link href="/jobs" className="text-sm font-semibold text-blue-600 hover:text-blue-700">
        ← Volver a vacantes
      </Link>
      <div>
        <h1 className="text-2xl font-bold text-slate-900">Nueva vacante</h1>
        <p className="mt-1 text-sm text-slate-600">
          Se crea un pipeline inicial y un scorecard en borrador. Nada se publica hasta que lo confirmes.
        </p>
      </div>
      <JobForm />
    </div>
  );
}
