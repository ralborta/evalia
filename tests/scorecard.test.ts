import { describe, expect, it } from "vitest";
import {
  AiProfileProposalSchema,
  ScorecardDraftSchema,
  assertPublishableScorecard,
  slugifyCriterionKey,
  validateScorecardWeights,
  nextScorecardVersionAction,
} from "@/lib/talent/scorecard";

const scored = (weight: number, key = "idioma") => ({
  key,
  label: "Inglés",
  description: "Comunicación",
  weight,
  type: "SCORED" as const,
  required: true,
  evidenceRequired: false,
  scoringRule: "0-100",
});

describe("scorecard weights", () => {
  it("acepta criterios puntuables que suman 100", () => {
    const result = validateScorecardWeights([scored(40, "idioma"), scored(60, "saas")]);
    expect(result.ok).toBe(true);
    expect(result.scoredTotal).toBe(100);
  });

  it("rechaza suma distinta de 100", () => {
    const result = validateScorecardWeights([scored(40, "idioma")]);
    expect(result.ok).toBe(false);
  });

  it("muestra excluyentes con peso 0 y no los suma", () => {
    const result = validateScorecardWeights([
      scored(100, "idioma"),
      {
        key: "visa",
        label: "Visa",
        description: "Debe poder trabajar",
        weight: 0,
        type: "EXCLUDING",
        required: true,
        evidenceRequired: true,
        scoringRule: "Sí o no",
      },
    ]);
    expect(result.ok).toBe(true);
    expect(result.excludingCount).toBe(1);
  });

  it("rechaza un excluyente con peso", () => {
    const result = validateScorecardWeights([
      scored(100, "idioma"),
      {
        key: "visa",
        label: "Visa",
        description: "Debe poder trabajar",
        weight: 10,
        type: "EXCLUDING",
        required: true,
        evidenceRequired: true,
        scoringRule: "Sí o no",
      },
    ]);
    expect(result.ok).toBe(false);
  });
});

describe("scorecard publish", () => {
  it("publica un draft válido", () => {
    const draft = assertPublishableScorecard({
      name: "CSM",
      criteria: [scored(50, "a"), scored(50, "b")],
    });
    expect(draft.criteria).toHaveLength(2);
  });

  it("valida el JSON de la IA con Zod", () => {
    const parsed = AiProfileProposalSchema.parse({
      name: "Perfil",
      summary: "Resumen",
      criteria: [scored(40, "idioma"), scored(40, "saas"), scored(20, "cierre")],
    });
    expect(parsed.criteria[0]?.key).toBe("idioma");
  });

  it("rechaza un draft vacío", () => {
    expect(ScorecardDraftSchema.safeParse({ name: "X", criteria: [] }).success).toBe(false);
  });
});

describe("criterion keys", () => {
  it("normaliza etiquetas a snake_case", () => {
    expect(slugifyCriterionKey("Inglés oral", 0)).toBe("ingles_oral");
  });
});

describe("versionado inmutable del scorecard", () => {
  it("editar un scorecard publicado crea una nueva versión", () => {
    const published = { id: "sc_v1", status: "PUBLISHED" as const, version: 1 };
    expect(nextScorecardVersionAction(published)).toEqual({ mode: "create", version: 2 });
  });

  it("guardar un borrador existente no cambia de versión", () => {
    const draft = { id: "sc_draft", status: "DRAFT" as const, version: 2 };
    expect(nextScorecardVersionAction(draft)).toEqual({
      mode: "update",
      id: "sc_draft",
      version: 2,
    });
  });
});

