"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export function ApplicationCreateForm({ jobId }: { jobId: string }) {
  const router = useRouter();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  async function onSubmit(event: React.FormEvent) {
    event.preventDefault();
    setSaving(true);
    setError(null);
    const res = await fetch(`/api/jobs/${jobId}/applications`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ candidateName: name, candidateEmail: email || null, candidatePhone: phone || null }),
    });
    const json = await res.json().catch(() => ({}));
    setSaving(false);
    if (!res.ok) {
      setError(json.error ?? "No se pudo crear la candidatura");
      return;
    }
    setName("");
    setEmail("");
    setPhone("");
    router.refresh();
  }

  return (
    <form onSubmit={onSubmit} className="mt-6 space-y-3 border-t border-slate-100 pt-5">
      <h3 className="text-sm font-semibold text-slate-900">Alta manual</h3>
      <div className="space-y-1.5">
        <Label htmlFor="cand-name">Nombre</Label>
        <Input id="cand-name" value={name} onChange={(e) => setName(e.target.value)} required />
      </div>
      <div className="space-y-1.5">
        <Label htmlFor="cand-email">Email</Label>
        <Input id="cand-email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} />
      </div>
      <div className="space-y-1.5">
        <Label htmlFor="cand-phone">Teléfono</Label>
        <Input id="cand-phone" value={phone} onChange={(e) => setPhone(e.target.value)} />
      </div>
      {error ? <p className="text-sm text-red-600">{error}</p> : null}
      <Button type="submit" variant="secondary" disabled={saving}>
        {saving ? "Creando…" : "Crear candidato y candidatura"}
      </Button>
    </form>
  );
}
