"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";

type Stage = { id: string; name: string; isRejected: boolean; isTerminal: boolean };
type Card = { id: string; candidateName: string; stageId: string };

export function PipelineKanban({
  stages,
  applications,
}: {
  jobId: string;
  stages: Stage[];
  applications: Card[];
}) {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);

  async function move(applicationId: string, toStageId: string) {
    setError(null);
    const res = await fetch(`/api/applications/${applicationId}/move`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ toStageId }),
    });
    if (!res.ok) {
      const json = await res.json().catch(() => ({}));
      setError(json.error ?? "No se pudo mover");
      return;
    }
    router.refresh();
  }

  return (
    <div className="space-y-3">
      {error ? <p className="text-sm text-red-600">{error}</p> : null}
      <div className="flex gap-3 overflow-x-auto pb-2">
        {stages.map((stage) => {
          const cards = applications.filter((a) => a.stageId === stage.id);
          return (
            <div
              key={stage.id}
              className={`w-64 shrink-0 rounded-xl border p-3 ${
                stage.isRejected ? "border-red-200 bg-red-50/50" : "border-slate-200 bg-white"
              }`}
            >
              <div className="mb-3 flex items-center justify-between">
                <h3 className="text-sm font-semibold text-slate-900">{stage.name}</h3>
                <span className="text-xs tabular-nums text-slate-500">{cards.length}</span>
              </div>
              <div className="space-y-2">
                {cards.map((card) => (
                  <div key={card.id} className="rounded-lg border border-slate-200 bg-slate-50 p-3">
                    <Link href={`/applications/${card.id}`} className="text-sm font-semibold text-slate-900 hover:text-blue-700">
                      {card.candidateName}
                    </Link>
                    <select
                      className="mt-2 w-full rounded-lg border border-slate-200 bg-white px-2 py-1 text-xs"
                      value={card.stageId}
                      onChange={(e) => move(card.id, e.target.value)}
                    >
                      {stages.map((s) => (
                        <option key={s.id} value={s.id}>
                          Mover a {s.name}
                        </option>
                      ))}
                    </select>
                  </div>
                ))}
                {cards.length === 0 ? <p className="text-xs text-slate-400">Sin candidaturas</p> : null}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
