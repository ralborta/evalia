import { describe, expect, it } from "vitest";
import { EvaluationResultSchema } from "@/lib/evaluation-schema";

describe("regresión de evaluaciones actuales", () => {
  it("conserva el esquema de informe de idioma", () => {
    const parsed = EvaluationResultSchema.parse({
      overallScore: 80,
      estimatedLevel: "B2",
      recommendation: "RECOMMENDED",
      roleFit: "High",
      operationalRisk: "Low",
      executiveSummary: "Sólido",
      strengths: ["Fluidez"],
      weaknesses: ["Léxico"],
      risks: [],
      metrics: [{ key: "fluency", label: "Fluidez", score: 80 }],
    });
    expect(parsed.overallScore).toBe(80);
  });

  it("el login y las entrevistas siguen en rutas existentes", async () => {
    const { readFileSync } = await import("node:fs");
    const interviews = readFileSync("app/api/interviews/route.ts", "utf8");
    const me = readFileSync("app/api/auth/me/route.ts", "utf8");
    const login = readFileSync("app/login/page.tsx", "utf8");
    expect(interviews).toContain("export async function GET");
    expect(interviews).toContain("export async function POST");
    expect(me).toContain("export async function GET");
    expect(login).toContain("Login");
  });
});
