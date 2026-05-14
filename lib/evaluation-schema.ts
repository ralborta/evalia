import { z } from "zod";

export const EvaluationResultSchema = z.object({
  overallScore: z.number().int().min(0).max(100),
  estimatedLevel: z.enum(["A1", "A2", "B1", "B2", "C1", "C2"]),
  recommendation: z.enum([
    "RECOMMENDED",
    "RECOMMENDED_WITH_OBSERVATIONS",
    "NEEDS_HUMAN_REVIEW",
    "NOT_RECOMMENDED_FOR_ROLE",
  ]),
  roleFit: z.string(),
  operationalRisk: z.string(),
  executiveSummary: z.string(),
  strengths: z.array(z.string()),
  weaknesses: z.array(z.string()),
  risks: z.array(z.string()),
  suggestedNextStep: z.string().optional(),
  metrics: z.array(
    z.object({
      key: z.string(),
      label: z.string(),
      score: z.number().int().min(0).max(100),
      weight: z.number().int().min(0).max(100).optional(),
      comment: z.string().optional(),
    }),
  ),
});

export type EvaluationResult = z.infer<typeof EvaluationResultSchema>;
