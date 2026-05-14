"use client";

import { useState } from "react";
import { signIn } from "next-auth/react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Mic2 } from "lucide-react";

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
    <div className="flex min-h-full flex-col md:flex-row">
      <div className="flex flex-1 flex-col justify-between bg-[#1a1a2e] p-10 text-white md:max-w-md">
        <div>
          <div className="mb-10 flex items-center gap-3">
            <div className="flex h-12 w-12 items-center justify-center rounded-full bg-violet-600">
              <Mic2 className="h-6 w-6" />
            </div>
            <div>
              <p className="text-lg font-semibold">EvalIA</p>
              <p className="text-sm text-slate-300">Plataforma de evaluación con IA</p>
            </div>
          </div>
          <p className="text-sm leading-relaxed text-slate-300">
            Entrevistas orales, conversaciones simuladas y reportes claros para tu equipo — sin exponer claves en el
            navegador del candidato.
          </p>
        </div>
        <div className="mt-10 grid grid-cols-3 gap-3 text-center text-xs text-slate-400">
          <span>IA avanzada</span>
          <span>Métricas claras</span>
          <span>Feedback útil</span>
        </div>
      </div>
      <div className="flex flex-1 items-center justify-center bg-white p-8">
        <div className="w-full max-w-md space-y-6">
          <div>
            <h1 className="text-2xl font-semibold text-slate-900">Bienvenido de vuelta</h1>
            <p className="text-sm text-slate-500">Ingresa con tu cuenta de evaluador o agente.</p>
          </div>
          <form className="space-y-4" onSubmit={onSubmit}>
            <div className="space-y-2">
              <Label htmlFor="email">Correo electrónico</Label>
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
              <Label htmlFor="password">Contraseña</Label>
              <div className="flex gap-2">
                <Input
                  id="password"
                  type={show ? "text" : "password"}
                  autoComplete="current-password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                />
                <Button type="button" variant="outline" onClick={() => setShow((s) => !s)}>
                  {show ? "Ocultar" : "Ver"}
                </Button>
              </div>
            </div>
            {error ? <p className="text-sm text-red-600">{error}</p> : null}
            <Button type="submit" className="w-full" disabled={loading}>
              {loading ? "Entrando…" : "Iniciar sesión"}
            </Button>
          </form>
          <p className="text-center text-xs text-slate-500">
            ¿Problemas de acceso?{" "}
            <Link href="mailto:soporte@evalia.app" className="text-violet-700 underline">
              Contactar administrador
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
