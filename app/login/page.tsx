import { Suspense } from "react";
import { EvaliaLogo } from "@/components/brand/evalia-logo";
import LoginForm from "./login-form";

export default function LoginPage() {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-screen flex-col items-center justify-center gap-4 bg-slate-100 text-slate-500">
          <EvaliaLogo href={null} height={40} />
          <span className="text-sm">Cargando…</span>
        </div>
      }
    >
      <LoginForm />
    </Suspense>
  );
}
