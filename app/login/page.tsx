import { Suspense } from "react";
import LoginForm from "./login-form";

export default function LoginPage() {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-screen items-center justify-center bg-slate-100 text-slate-500">
          <div className="flex flex-col items-center gap-3">
            <div className="h-9 w-9 animate-pulse rounded-full bg-violet-200" />
            <span className="text-sm">Cargando…</span>
          </div>
        </div>
      }
    >
      <LoginForm />
    </Suspense>
  );
}
