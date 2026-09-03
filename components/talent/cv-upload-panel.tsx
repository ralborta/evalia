"use client";

import { useCallback, useEffect, useState } from "react";
import { Badge } from "@/components/ui/badge";

type DocRow = {
  id: string;
  version: number;
  isCurrent: boolean;
  originalFileName: string;
  mimeType: string;
  byteSize: number;
  processingStatus: string;
  processingError: string | null;
  createdAt: string;
};

const STATUS_LABEL: Record<string, string> = {
  UPLOADED: "Subido",
  QUEUED: "En cola",
  EXTRACTING: "Extrayendo",
  ANALYZING: "Analizando",
  COMPLETED: "Completado",
  FAILED: "Fallido",
  NEEDS_OCR: "Requiere OCR",
};

function statusVariant(status: string): "default" | "secondary" | "danger" | "outline" | "warning" {
  if (status === "COMPLETED") return "default";
  if (status === "FAILED") return "danger";
  if (status === "NEEDS_OCR") return "warning";
  return "secondary";
}

export function CvUploadPanel({
  applicationId,
  canWrite = true,
}: {
  applicationId: string;
  canWrite?: boolean;
}) {
  const [docs, setDocs] = useState<DocRow[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const [progress, setProgress] = useState<number | null>(null);

  const load = useCallback(async () => {
    const res = await fetch(`/api/applications/${applicationId}/documents`);
    const json = await res.json().catch(() => ({}));
    if (res.ok) setDocs(json.documents ?? []);
  }, [applicationId]);

  useEffect(() => {
    const boot = setTimeout(() => {
      void load();
    }, 0);
    const t = setInterval(() => void load(), 4000);
    return () => {
      clearTimeout(boot);
      clearInterval(t);
    };
  }, [load]);

  async function onFile(file: File | null) {
    if (!file || !canWrite) return;
    setUploading(true);
    setError(null);
    setProgress(10);
    try {
      const form = new FormData();
      form.append("file", file);
      setProgress(40);
      const res = await fetch(`/api/applications/${applicationId}/documents`, {
        method: "POST",
        body: form,
      });
      setProgress(80);
      const json = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(json.error ?? "No se pudo subir el CV");
        return;
      }
      setProgress(100);
      await load();
    } finally {
      setUploading(false);
      setTimeout(() => setProgress(null), 600);
    }
  }

  const current = docs.find((d) => d.isCurrent) ?? docs[0];

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-3">
        <label className="inline-flex cursor-pointer">
          <input
            type="file"
            accept=".pdf,.docx,application/pdf,application/vnd.openxmlformats-officedocument.wordprocessingml.document"
            className="hidden"
            disabled={!canWrite || uploading}
            onChange={(e) => void onFile(e.target.files?.[0] ?? null)}
          />
          <span
            className={`inline-flex h-10 items-center justify-center rounded-xl border border-slate-200 bg-white px-4 text-sm font-semibold text-slate-800 shadow-sm ${
              !canWrite || uploading ? "pointer-events-none opacity-50" : "hover:bg-slate-50"
            }`}
          >
            {uploading ? "Subiendo…" : "Subir CV (PDF/DOCX)"}
          </span>
        </label>
        {current ? (
          <Badge variant={statusVariant(current.processingStatus)}>
            {STATUS_LABEL[current.processingStatus] ?? current.processingStatus}
          </Badge>
        ) : null}
      </div>

      {progress != null ? (
        <div className="h-2 overflow-hidden rounded-full bg-slate-100">
          <div className="h-full bg-blue-600 transition-all" style={{ width: `${progress}%` }} />
        </div>
      ) : null}

      {error ? <p className="text-sm text-red-600">{error}</p> : null}
      {!canWrite ? <p className="text-sm text-slate-500">Tu rol de visor no permite subir CVs.</p> : null}

      {current ? (
        <p className="text-sm text-slate-600">
          {current.originalFileName} · v{current.version} · {(current.byteSize / 1024).toFixed(0)} KB
          {current.processingError ? (
            <span className="mt-1 block text-amber-700">{current.processingError}</span>
          ) : null}
        </p>
      ) : (
        <p className="text-sm text-slate-500">Aún no hay CV en esta candidatura.</p>
      )}
    </div>
  );
}
