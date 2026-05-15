"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

export function ImportElevenLabsForm({ interviewId }: { interviewId: string }) {
  const [conversationId, setConversationId] = useState("");
  const [runEvaluation, setRunEvaluation] = useState(true);
  const [loading, setLoading] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setMsg(null);
    const trimmed = conversationId.trim();
    if (!trimmed) {
      setMsg("Pega el conversation id de ElevenLabs.");
      return;
    }
    setLoading(true);
    const res = await fetch(`/api/interviews/${interviewId}/import-elevenlabs`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ conversationId: trimmed, runEvaluation }),
    });
    setLoading(false);
    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      setMsg(typeof data.error === "string" ? data.error : "Error al importar");
      return;
    }
    setConversationId("");
    window.location.reload();
  }

  return (
    <Card className="border border-violet-200/80 bg-gradient-to-br from-violet-50/90 via-white to-indigo-50/50 shadow-md shadow-violet-200/30">
      <CardHeader className="pb-3">
        <CardTitle className="text-lg font-bold text-violet-950">Importar desde ElevenLabs</CardTitle>
        <CardDescription className="text-slate-600">
          Pega el <span className="rounded bg-white/80 px-1.5 py-0.5 font-mono text-xs text-violet-800">conversation_id</span> del panel o API de ConvAI. Se asocia a{" "}
          <strong>esta</strong> entrevista y se sobrescribe transcript / metadatos.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form className="space-y-5" onSubmit={(e) => void onSubmit(e)}>
          <div className="space-y-2">
            <Label htmlFor="el-conv-id" className="text-slate-700">
              Conversation ID
            </Label>
            <Input
              id="el-conv-id"
              placeholder="ej. conv_abc123…"
              value={conversationId}
              onChange={(e) => setConversationId(e.target.value)}
              autoComplete="off"
            />
          </div>
          <label className="flex cursor-pointer items-center gap-3 rounded-xl border border-slate-200/80 bg-white/70 px-4 py-3 text-sm text-slate-700 shadow-sm">
            <input
              type="checkbox"
              checked={runEvaluation}
              onChange={(e) => setRunEvaluation(e.target.checked)}
              className="h-4 w-4 rounded border-slate-300 text-violet-600 focus:ring-violet-500"
            />
            Ejecutar evaluación con OpenAI tras importar
          </label>
          {msg ? (
            <p className="rounded-xl border border-red-100 bg-red-50 px-3 py-2 text-sm text-red-800">{msg}</p>
          ) : null}
          <Button type="submit" className="font-semibold" disabled={loading}>
            {loading ? "Importando…" : "Importar"}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}
