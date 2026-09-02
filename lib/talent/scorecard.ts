import { z } from "zod";

export const SCORE_WEIGHT_TOTAL = 100;

export const ScorecardCriterionInputSchema = z.object({
  key: z
    .string()
    .trim()
    .min(1)
    .max(80)
    .regex(/^[a-z0-9_]+$/, "La clave solo admite minúsculas, números y _"),
  label: z.string().trim().min(1).max(120),
  description: z.string().trim().min(1).max(2000),
  weight: z.number().int().min(0).max(100),
  type: z.enum(["SCORED", "EXCLUDING"]),
  required: z.boolean(),
  evidenceRequired: z.boolean(),
  scoringRule: z.string().trim().min(1).max(2000),
  sortOrder: z.number().int().min(0).max(500).optional(),
});

export const ScorecardDraftSchema = z.object({
  name: z.string().trim().min(1).max(160),
  sourcePrompt: z.string().trim().max(8000).optional().nullable(),
  criteria: z.array(ScorecardCriterionInputSchema).min(1).max(40),
});

export const AiProfileProposalSchema = z.object({
  name: z.string().trim().min(1).max(160),
  summary: z.string().trim().min(1).max(2000),
  criteria: z
    .array(
      ScorecardCriterionInputSchema.omit({ sortOrder: true }).extend({
        rationale: z.string().trim().min(1).max(500).optional(),
      }),
    )
    .min(3)
    .max(20),
});

export type ScorecardCriterionInput = z.infer<typeof ScorecardCriterionInputSchema>;
export type ScorecardDraft = z.infer<typeof ScorecardDraftSchema>;
export type AiProfileProposal = z.infer<typeof AiProfileProposalSchema>;

export type WeightValidation = {
  scoredTotal: number;
  excludingCount: number;
  ok: boolean;
  errors: string[];
};

export function validateScorecardWeights(criteria: ScorecardCriterionInput[]): WeightValidation {
  const errors: string[] = [];
  const keys = new Set<string>();
  let scoredTotal = 0;
  let excludingCount = 0;

  criteria.forEach((c, index) => {
    if (keys.has(c.key)) errors.push(`Clave duplicada: ${c.key}`);
    keys.add(c.key);
    if (c.type === "EXCLUDING") {
      excludingCount += 1;
      if (c.weight !== 0) {
        errors.push(`El excluyente «${c.label}» debe tener peso 0`);
      }
    } else {
      scoredTotal += c.weight;
      if (c.weight <= 0) {
        errors.push(`El criterio «${c.label}» necesita un peso mayor a 0`);
      }
    }
    if (!c.label.trim()) errors.push(`El criterio ${index + 1} no tiene etiqueta`);
  });

  if (criteria.filter((c) => c.type === "SCORED").length === 0) {
    errors.push("Hace falta al menos un criterio con peso");
  }
  if (scoredTotal !== SCORE_WEIGHT_TOTAL) {
    errors.push(`La suma de pesos de los criterios puntuables debe ser ${SCORE_WEIGHT_TOTAL} (ahora ${scoredTotal})`);
  }

  return { scoredTotal, excludingCount, ok: errors.length === 0, errors };
}

export function assertPublishableScorecard(draft: ScorecardDraft) {
  const parsed = ScorecardDraftSchema.parse(draft);
  const weights = validateScorecardWeights(parsed.criteria);
  if (!weights.ok) {
    const error = new Error(weights.errors.join(" · "));
    error.name = "ScorecardValidationError";
    throw error;
  }
  return parsed;
}

export function slugifyCriterionKey(label: string, index: number) {
  const base = label
    .normalize("NFD")
    .replace(/\p{M}/gu, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "")
    .slice(0, 40);
  return base || `criterio_${index + 1}`;
}
