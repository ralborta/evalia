import { auth } from "@/auth";
import { redirect } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export default async function AgentProfilePage() {
  const session = await auth();
  if (!session?.user) redirect("/login");

  return (
    <div className="mx-auto max-w-lg space-y-4">
      <h1 className="text-2xl font-semibold text-slate-900">Perfil</h1>
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Datos de cuenta</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2 text-sm text-slate-700">
          <p>
            <span className="text-slate-500">Nombre:</span> {session.user.name}
          </p>
          <p>
            <span className="text-slate-500">Correo:</span> {session.user.email}
          </p>
          <p>
            <span className="text-slate-500">Rol:</span> {session.user.role}
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
