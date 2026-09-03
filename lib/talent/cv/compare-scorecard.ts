import { z } from "zod";
import { getOpenAI } from "@/lib/openai";
import { redactForOpenAI } from "@/lib/talent/cv/redact";
import { maybeAnonymizeForRanking } from "@/lib/talent/cv/storage";

export const COMPARE_PROMPT_VERSION = "cv-compare-prompt-v1";

export const CriterionMatchStatusSchema = z.enum([
  "MEETS",
  "DOES_NOT_MEET",
  "NOT_FOUND",
  "NEEDS_VALIDATION",
]);

export const AiCriterionProposalSchema = z.preprocess((value) => {
  if (!value || typeof value !== "object") return value;
  const obj = value as Record<string, unknown>;
  const criterionKey =
    obj.criterionKey ?? obj.key ?? obj.id ?? obj.criterion_key ?? obj.criterionId;
  return { ...obj, criterionKey };
}, z.object({
  criterionKey: z.string().min(1),
  status: CriterionMatchStatusSchema,
  /** Sugerencia 0-100; el score final se recalcula en TypeScript. */
  partialScoreSuggestion: z.number().min(0).max(100).optional(),
  confidence: z.number().min(0).max(1),
  evidence: z.string().max(2000),
  explanation: z.string().max(2000),
}));

export const AiCompareResponseSchema = z.object({
  criteria: z.array(AiCriterionProposalSchema).min(1),
  suggestedQuestions: z
    .array(
      z.object({
        criterionKey: z.string().optional().nullable(),
        question: z.string().min(1).max(500),
        reason: z.string().max(500).optional().nullable(),
      }),
    )
    .max(20)
    .default([]),
});

export type ScoreCriterionInput = {
  key: string;
  label: string;
  type: "SCORED" | "EXCLUDING";
  weight: number;
  description?: string;
  scoringRule?: string;
};

export type CriterionResultComputed = {
  criterionKey: string;
  criterionLabel: string;
  criterionType: "SCORED" | "EXCLUDING";
  weight: number;
  status: z.infer<typeof CriterionMatchStatusSchema>;
  partialScore: number;
  confidence: number;
  evidence: string;
  explanation: string;
};

export type ScoreComputation = {
  overallScore: number | null;
  excludingOutcome: "PASS" | "FAIL" | "UNKNOWN";
  eligible: boolean;
  results: CriterionResultComputed[];
};

/**
 * Score determinista: overall = sum(partialScore_i * weight_i) / 100
 * Solo criterios SCORED. EXCLUDING no aporta al promedio.
 */
export function computeOverallScore(
  results: Array<{
    criterionType: "SCORED" | "EXCLUDING";
    weight: number;
    partialScore: number;
    status: z.infer<typeof CriterionMatchStatusSchema>;
  }>,
): Pick<ScoreComputation, "overallScore" | "excludingOutcome" | "eligible"> {
  const scored = results.filter((r) => r.criterionType === "SCORED");
  let overallScore: number | null = null;
  if (scored.length > 0) {
    const sum = scored.reduce((acc, r) => acc + r.partialScore * r.weight, 0);
    overallScore = Math.round((sum / 100) * 100) / 100;
  }

  const excluding = results.filter((r) => r.criterionType === "EXCLUDING");
  let excludingOutcome: "PASS" | "FAIL" | "UNKNOWN" = "PASS";
  if (excluding.length === 0) {
    excludingOutcome = "PASS";
  } else if (excluding.some((r) => r.status === "DOES_NOT_MEET")) {
    excludingOutcome = "FAIL";
  } else if (excluding.some((r) => r.status === "NOT_FOUND" || r.status === "NEEDS_VALIDATION")) {
    excludingOutcome = "UNKNOWN";
  } else {
    excludingOutcome = "PASS";
  }

  const eligible = excludingOutcome !== "FAIL";
  return { overallScore, excludingOutcome, eligible };
}

function clampScore(n: number) {
  if (!Number.isFinite(n)) return 0;
  return Math.max(0, Math.min(100, n));
}

export function mergeAiProposalsWithCriteria(
  criteria: ScoreCriterionInput[],
  proposals: z.infer<typeof AiCriterionProposalSchema>[],
): CriterionResultComputed[] {
  const byKey = new Map(proposals.map((p) => [p.criterionKey, p]));
  return criteria.map((c) => {
    const p = byKey.get(c.key);
    const status = p?.status ?? "NOT_FOUND";
    let partialScore: number;
    if (c.type === "EXCLUDING") {
      // Excluyentes: 100 si MEETS, 0 en resto (NOT_FOUND ≠ DOES_NOT_MEET a nivel de outcome)
      partialScore = status === "MEETS" ? 100 : 0;
    } else {
      const suggestion = p?.partialScoreSuggestion;
      if (typeof suggestion === "number") {
        partialScore = clampScore(suggestion);
      } else if (status === "MEETS") {
        partialScore = 100;
      } else if (status === "DOES_NOT_MEET") {
        partialScore = 0;
      } else if (status === "NEEDS_VALIDATION") {
        partialScore = 50;
      } else {
        partialScore = 0;
      }
    }
    return {
      criterionKey: c.key,
      criterionLabel: c.label,
      criterionType: c.type,
      weight: c.weight,
      status,
      partialScore,
      confidence: typeof p?.confidence === "number" ? Math.max(0, Math.min(1, p.confidence)) : 0.3,
      evidence: (p?.evidence || "").slice(0, 2000) || "Sin evidencia en el CV",
      explanation: (p?.explanation || "").slice(0, 2000) || "Sin explicación",
    };
  });
}

export function buildRankingExplanation(a: {
  candidateLabel: string;
  overallScore: number | null;
  excludingOutcome: string;
}, b: {
  candidateLabel: string;
  overallScore: number | null;
  excludingOutcome: string;
} | null): string {
  if (!b) return `${a.candidateLabel} es el primero del ranking actual.`;
  if (a.excludingOutcome === "FAIL" && b.excludingOutcome !== "FAIL") {
    return `${a.candidateLabel} queda por debajo de ${b.candidateLabel} por un excluyente en FAIL.`;
  }
  if (a.excludingOutcome !== "FAIL" && b.excludingOutcome === "FAIL") {
    return `${a.candidateLabel} queda por encima de ${b.candidateLabel} porque este último tiene un excluyente en FAIL.`;
  }
  const sa = a.overallScore ?? -1;
  const sb = b.overallScore ?? -1;
  if (sa > sb) {
    return `${a.candidateLabel} (${sa}) supera a ${b.candidateLabel} (${sb}) por puntuación global.`;
  }
  if (sa < sb) {
    return `${a.candidateLabel} (${sa}) queda por debajo de ${b.candidateLabel} (${sb}) por puntuación global.`;
  }
  return `${a.candidateLabel} empata en score con ${b.candidateLabel}; desempate por antigüedad de candidatura.`;
}

export async function proposeCriterionMatches(input: {
  criteria: ScoreCriterionInput[];
  profileJson: unknown;
  cvText: string;
}): Promise<{
  proposals: z.infer<typeof AiCriterionProposalSchema>[];
  suggestedQuestions: z.infer<typeof AiCompareResponseSchema>["suggestedQuestions"];
  model: string;
  promptVersion: string;
}> {
  const { text } = redactForOpenAI(maybeAnonymizeForRanking(input.cvText));
  const openai = getOpenAI();
  const model = process.env.OPENAI_EVAL_MODEL ?? "gpt-4o-mini";

  const criteriaDesc = input.criteria
    .map(
      (c) =>
        `- key=${c.key} type=${c.type} weight=${c.weight} label=${c.label}\n  rule=${c.scoringRule || c.description || ""}`,
    )
    .join("\n");

  const prompt = `Compara el CV con el scorecard.
Para CADA criterio del listado responde un objeto con:
- criterionKey: DEBE ser exactamente el valor "key=" del criterio (no inventes otras claves)
- status: MEETS|DOES_NOT_MEET|NOT_FOUND|NEEDS_VALIDATION
- partialScoreSuggestion: 0-100 (orientativo; el score final lo calcula el sistema)
- confidence: 0-1
- evidence: cita breve del CV redactado
- explanation: breve
NOT_FOUND no es lo mismo que DOES_NOT_MEET.
No uses dirección, edad, género, nacionalidad ni documentos de identidad.
Sugiere hasta 5 preguntas de validación cuando falte evidencia.

Criterios:
${criteriaDesc}

Perfil estructurado JSON:
${JSON.stringify(input.profileJson)}

Texto CV redactado:
${text}

JSON:
{ "criteria": [{ "criterionKey": "...", "status": "...", "partialScoreSuggestion": 0, "confidence": 0.5, "evidence": "...", "explanation": "..." }], "suggestedQuestions": [{ "criterionKey": "", "question": "", "reason": "" }] }`;

  const completion = await openai.chat.completions.create({
    model,
    temperature: 0,
    response_format: { type: "json_object" },
    messages: [
      {
        role: "system",
        content: "You compare CVs to scorecards and output JSON only. Never invent final overall scores.",
      },
      { role: "user", content: prompt },
    ],
  });

  const raw = completion.choices[0]?.message?.content;
  if (!raw) throw new Error("OpenAI no devolvió comparación");
  const parsed = AiCompareResponseSchema.parse(JSON.parse(raw));
  return {
    proposals: parsed.criteria,
    suggestedQuestions: parsed.suggestedQuestions,
    model,
    promptVersion: COMPARE_PROMPT_VERSION,
  };
}
