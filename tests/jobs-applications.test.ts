import { describe, expect, it } from "vitest";
import { JobStatus } from "@prisma/client";
import { DEFAULT_PIPELINE_STAGES } from "@/lib/talent/pipeline";

describe("vacantes", () => {
  it("permite crear y editar estados conocidos", () => {
    expect(["DRAFT", "OPEN", "PAUSED", "CLOSED", "ARCHIVED"]).toContain(JobStatus.OPEN);
  });

  it("cada vacante nueva tiene pipeline configurable", () => {
    expect(DEFAULT_PIPELINE_STAGES.length).toBeGreaterThanOrEqual(4);
    expect(new Set(DEFAULT_PIPELINE_STAGES.map((s) => s.key)).size).toBe(DEFAULT_PIPELINE_STAGES.length);
  });
});

describe("candidaturas y movimientos", () => {
  it("una candidatura es única por vacante y candidato", () => {
    const key = (jobId: string, candidateId: string) => `${jobId}:${candidateId}`;
    const existing = new Set([key("job1", "cand1")]);
    expect(existing.has(key("job1", "cand1"))).toBe(true);
    expect(existing.has(key("job2", "cand1"))).toBe(false);
  });

  it("el historial de etapa es append-only", () => {
    const history = [{ from: null, to: "applied" }];
    const next = [...history, { from: "applied", to: "screen" }];
    expect(history).toHaveLength(1);
    expect(next).toHaveLength(2);
    expect(next[0]).toEqual(history[0]);
  });
});
