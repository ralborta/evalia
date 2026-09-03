import { describe, expect, it } from "vitest";
import {
  computeOverallScore,
  mergeAiProposalsWithCriteria,
  buildRankingExplanation,
} from "@/lib/talent/cv/compare-scorecard";

describe("computeOverallScore", () => {
  it("calcula promedio ponderado determinista", () => {
    const result = computeOverallScore([
      { criterionType: "SCORED", weight: 40, partialScore: 80, status: "MEETS" },
      { criterionType: "SCORED", weight: 60, partialScore: 50, status: "NEEDS_VALIDATION" },
    ]);
    // (80*40 + 50*60) / 100 = 62
    expect(result.overallScore).toBe(62);
    expect(result.excludingOutcome).toBe("PASS");
    expect(result.eligible).toBe(true);
  });

  it("FAIL si algún excluyente es DOES_NOT_MEET", () => {
    const result = computeOverallScore([
      { criterionType: "SCORED", weight: 100, partialScore: 90, status: "MEETS" },
      { criterionType: "EXCLUDING", weight: 0, partialScore: 0, status: "DOES_NOT_MEET" },
    ]);
    expect(result.excludingOutcome).toBe("FAIL");
    expect(result.eligible).toBe(false);
    expect(result.overallScore).toBe(90);
  });

  it("NOT_FOUND en excluyente no equivale a DOES_NOT_MEET", () => {
    const result = computeOverallScore([
      { criterionType: "SCORED", weight: 100, partialScore: 70, status: "MEETS" },
      { criterionType: "EXCLUDING", weight: 0, partialScore: 0, status: "NOT_FOUND" },
    ]);
    expect(result.excludingOutcome).toBe("UNKNOWN");
    expect(result.eligible).toBe(true);
  });

  it("NEEDS_VALIDATION en excluyente → UNKNOWN", () => {
    const result = computeOverallScore([
      { criterionType: "SCORED", weight: 100, partialScore: 70, status: "MEETS" },
      { criterionType: "EXCLUDING", weight: 0, partialScore: 0, status: "NEEDS_VALIDATION" },
    ]);
    expect(result.excludingOutcome).toBe("UNKNOWN");
  });
});

describe("mergeAiProposalsWithCriteria", () => {
  it("no deja que OpenAI invente el overall; partialScore se normaliza", () => {
    const merged = mergeAiProposalsWithCriteria(
      [
        { key: "idioma", label: "Idioma", type: "SCORED", weight: 100 },
        { key: "visa", label: "Visa", type: "EXCLUDING", weight: 0 },
      ],
      [
        {
          criterionKey: "idioma",
          status: "MEETS",
          partialScoreSuggestion: 85,
          confidence: 0.9,
          evidence: "B2",
          explanation: "ok",
        },
        {
          criterionKey: "visa",
          status: "NOT_FOUND",
          confidence: 0.4,
          evidence: "",
          explanation: "no aparece",
        },
      ],
    );
    const scored = computeOverallScore(merged);
    expect(scored.overallScore).toBe(85);
    expect(merged.find((m) => m.criterionKey === "visa")?.partialScore).toBe(0);
    expect(scored.excludingOutcome).toBe("UNKNOWN");
  });
});

describe("buildRankingExplanation", () => {
  it("explica ventaja por score", () => {
    const text = buildRankingExplanation(
      { candidateLabel: "Ana", overallScore: 80, excludingOutcome: "PASS" },
      { candidateLabel: "Luis", overallScore: 70, excludingOutcome: "PASS" },
    );
    expect(text).toContain("Ana");
    expect(text).toContain("Luis");
  });
});
