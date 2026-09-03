"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

const statuses = [
  { value: "DRAFT", label: "Borrador" },
  { value: "OPEN", label: "Abierta" },
  { value: "PAUSED", label: "Pausada" },
  { value: "CLOSED", label: "Cerrada" },
];

export function JobForm({
  jobId,
  initial,
  canWrite = true,
}: {
  jobId?: string;
  initial?: { title: string; description: string | null; location: string | null; status: string };
  canWrite?: boolean;
}) {
  const router = useRouter();
  const [title, setTitle] = useState(initial?.title ?? "");
  const [description, setDescription] = useState(initial?.description ?? "");
  const [location, setLocation] = useState(initial?.location ?? "");
  const [status, setStatus] = useState(initial?.status ?? "DRAFT");
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  async function onSubmit(event: React.FormEvent) {
    event.preventDefault();
    if (!canWrite) return;
    setSaving(true);
    setError(null);
    const payload = { title, description, location, status };
    const res = await fetch(jobId ? `/api/jobs/${jobId}` : "/api/jobs", {
      method: jobId ? "PATCH" : "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    const json = await res.json().catch(() => ({}));
    setSaving(false);
    if (!res.ok) {
      setError(json.error ?? "No se pudo guardar");
      return;
    }
    router.push(`/jobs/${json.job.id}`);
    router.refresh();
  }

  return (
    <form onSubmit={onSubmit} className="space-y-5 rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
      <div className="space-y-2">
        <Label htmlFor="title">Título</Label>
        <Input id="title" value={title} onChange={(e) => setTitle(e.target.value)} required disabled={!canWrite} />
      </div>
      <div className="space-y-2">
        <Label htmlFor="location">Ubicación</Label>
        <Input id="location" value={location} onChange={(e) => setLocation(e.target.value)} disabled={!canWrite} />
      </div>
      <div className="space-y-2">
        <Label htmlFor="status">Estado</Label>
        <select
          id="status"
          value={status}
          disabled={!canWrite}
          onChange={(e) => setStatus(e.target.value)}
          className="flex h-10 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm"
        >
          {statuses.map((s) => (
            <option key={s.value} value={s.value}>
              {s.label}
            </option>
          ))}
        </select>
      </div>
      <div className="space-y-2">
        <Label htmlFor="description">Descripción</Label>
        <textarea
          id="description"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          disabled={!canWrite}
          className="min-h-36 w-full rounded-xl border border-slate-200 px-3 py-2 text-sm"
        />
      </div>
      {error ? <p className="text-sm text-red-600">{error}</p> : null}
      {!canWrite ? <p className="text-sm text-slate-500">Tu rol de visor no permite modificar esta vacante.</p> : null}
      <Button type="submit" disabled={saving || !canWrite}>
        {saving ? "Guardando…" : jobId ? "Guardar cambios" : "Crear vacante"}
      </Button>
    </form>
  );
}
