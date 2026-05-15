"use client";

import { useState } from "react";
import { signIn } from "next-auth/react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Mic2, Sparkles } from "lucide-react";

export default function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const callbackUrl = searchParams.get("callbackUrl") ?? "/";
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [show, setShow] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    const res = await signIn("credentials", {
      email: email.trim().toLowerCase(),
      password,
      redirect: false,
      callbackUrl,
    });
    setLoading(false);
    if (res?.error) {
      const err = res.error;
      if (err === "CredentialsSignin") {
        setError(
          "Correo o contraseña incorrectos. En Vercel: revisa que DATABASE_URL (runtime) sea la de tu Postgres en Railway y vuelve a intentar; el primer login puede crear el admin si la base estaba vacía.",
        );
      } else if (err === "Configuration") {
        setError(
          "Error de configuración de sesión. En Vercel revisa AUTH_SECRET (o NEXTAUTH_SECRET), NEXTAUTH_URL y NEXT_PUBLIC_APP_URL con tu URL https:// exacta.",
        );
      } else {
        setError(
          `No se pudo iniciar sesión (${err}). En Vercel: DATABASE_URL hacia tu Postgres (Railway), variables de auth, y que el build ejecute seed (build:vercel en vercel.json).`,
        );
      }
      return;
    }
    router.push(callbackUrl);
    router.refresh();
  }

  return (
    <div className="flex min-h-screen flex-col lg:flex-row">
      <div className="evalia-login-hero relative flex flex-1 flex-col justify-between px-8 py-12 text-white lg:max-w-lg lg:px-12 lg:py-16">
        <div className="relative z-10">
          <div className="mb-12 flex items-center gap-4">
            <span className="flex h-14 w-14 items-center justify-center rounded-2xl bg-white/10 shadow-lg ring-1 ring-white/20 backdrop-blur">
              <Mic2 className="h-7 w-7 text-violet-200" />
            </span>
            <div>
              <p className="text-2xl font-bold tracking-tight">EvalIA</p>
              <p className="mt-0.5 flex items-center gap-1.5 text-sm text-violet-200/90">
                <Sparkles className="h-3.5 w-3.5" />
                Evaluación oral con IA
              </p>
            </div>
          </div>
          <h2 className="max-w-sm text-3xl font-bold leading-tight tracking-tight lg:text-4xl">
            Entrevistas claras, informes accionables.
          </h2>
          <p className="mt-6 max-w-sm text-sm leading-relaxed text-slate-300">
            Voz segura con ElevenLabs, panel para evaluadores y experiencia guiada para candidatos — sin exponer claves
            en el navegador del invitado.
          </p>
        </div>
        <div className="relative z-10 mt-12 grid grid-cols-3 gap-4 border-t border-white/10 pt-8 text-center text-[11px] font-medium uppercase tracking-wider text-slate-400">
          <span>Voz natural</span>
          <span>Métricas</span>
          <span>Equipo</span>
        </div>
      </div>

      <div className="flex flex-1 items-center justify-center bg-slate-50/80 p-6 lg:p-12">
        <div className="w-full max-w-md space-y-8">
          <div className="rounded-3xl border border-slate-200/80 bg-white p-8 shadow-xl shadow-slate-300/40 ring-1 ring-slate-100">
            <div className="mb-8">
              <h1 className="text-2xl font-bold tracking-tight text-slate-900">Bienvenido de vuelta</h1>
              <p className="mt-2 text-sm text-slate-500">Ingresa con tu cuenta de evaluador o agente.</p>
            </div>
            <form className="space-y-5" onSubmit={onSubmit}>
              <div className="space-y-2">
                <Label htmlFor="email" className="text-slate-700">
                  Correo electrónico
                </Label>
                <Input
                  id="email"
                  type="email"
                  autoComplete="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="password" className="text-slate-700">
                  Contraseña
                </Label>
                <div className="flex gap-2">
                  <Input
                    id="password"
                    type={show ? "text" : "password"}
                    autoComplete="current-password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                    className="flex-1"
                  />
                  <Button type="button" variant="outline" className="shrink-0 px-3" onClick={() => setShow((s) => !s)}>
                    {show ? "Ocultar" : "Ver"}
                  </Button>
                </div>
              </div>
              {error ? (
                <p className="rounded-xl border border-red-100 bg-red-50 px-3 py-2.5 text-sm leading-snug text-red-800">
                  {error}
                </p>
              ) : null}
              <Button type="submit" className="h-11 w-full text-base" disabled={loading}>
                {loading ? "Entrando…" : "Iniciar sesión"}
              </Button>
            </form>
          </div>
          <p className="text-center text-xs text-slate-500">
            ¿Problemas de acceso?{" "}
            <Link href="mailto:soporte@evalia.app" className="font-medium text-violet-700 underline-offset-2 hover:underline">
              Contactar administrador
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
