import { getOpenAI } from "@/lib/openai";
import {
  AiProfileProposalSchema,
  SCORE_WEIGHT_TOTAL,
  slugifyCriterionKey,
  type AiProfileProposal,
} from "@/lib/talent/scorecard";

function buildPrompt(input: { title: string; description: string; freeText: string }) {
  return `Eres un experto en definición de perfiles para reclutamiento.
Convierte la descripción libre en un scorecard estructurado para una vacante.

Reglas:
- Devuelve SOLO JSON válido.
- Incluye entre 5 y 10 criterios.
- Cada criterio SCORED tiene peso entero. La suma de pesos SCORED debe ser exactamente ${SCORE_WEIGHT_TOTAL}.
- Los excluyentes (type=EXCLUDING) tienen weight 0. Máximo 3 excluyentes.
- key en snake_case ASCII.
- label, description y scoringRule en español, concretos y observables.
- required=true si el criterio es imprescindible para avanzar.
- evidenceRequired=true si hace falta evidencia explícita (ejemplo, métrica o caso).

Vacante: ${input.title}
Descripción de la vacante: ${input.description || "(sin descripción formal)"}
Perfil libre:
${input.freeText}

JSON:
{
  "name": "string",
  "summary": "string",
  "criteria": [
    {
      "key": "string",
      "label": "string",
      "description": "string",
      "weight": 0,
      "type": "SCORED" | "EXCLUDING",
      "required": true,
      "evidenceRequired": false,
      "scoringRule": "string",
      "rationale": "string"
    }
  ]
}`;
}

function normalizeProposal(raw: unknown): unknown {
  if (!raw || typeof raw !== "object") return raw;
  const data = raw as Record<string, unknown>;
  const criteria = Array.isArray(data.criteria) ? data.criteria : [];
  return {
    ...data,
    criteria: criteria.map((item, index) => {
      const c = (item && typeof item === "object" ? item : {}) as Record<string, unknown>;
      const label = String(c.label ?? `Criterio ${index + 1}`);
      const type = c.type === "EXCLUDING" ? "EXCLUDING" : "SCORED";
      return {
        key: typeof c.key === "string" && /^[a-z0-9_]+$/.test(c.key) ? c.key : slugifyCriterionKey(label, index),
        label,
        description: String(c.description ?? label),
        weight: type === "EXCLUDING" ? 0 : Number.parseInt(String(c.weight ?? 0), 10) || 0,
        type,
        required: c.required !== false,
        evidenceRequired: c.evidenceRequired === true,
        scoringRule: String(c.scoringRule ?? "Evaluar evidencia observable en la entrevista o el expediente."),
        rationale: typeof c.rationale === "string" ? c.rationale : undefined,
      };
    }),
  };
}

export async function proposeScorecardFromProfile(input: {
  title: string;
  description?: string | null;
  freeText: string;
}): Promise<AiProfileProposal> {
  const openai = getOpenAI();
  const model = process.env.OPENAI_EVAL_MODEL ?? "gpt-4o-mini";
  const prompt = buildPrompt({
    title: input.title,
    description: input.description ?? "",
    freeText: input.freeText,
  });

  const completion = await openai.chat.completions.create({
    model,
    temperature: 0.2,
    response_format: { type: "json_object" },
    messages: [
      { role: "system", content: "You output only valid JSON for a hiring scorecard." },
      { role: "user", content: prompt },
    ],
  });

  const raw = completion.choices[0]?.message?.content;
  if (!raw) throw new Error("OpenAI no devolvió contenido");

  const parse = (text: string) => AiProfileProposalSchema.parse(normalizeProposal(JSON.parse(text)));

  try {
    return parse(raw);
  } catch (e) {
    const retry = await openai.chat.completions.create({
      model,
      temperature: 0,
      response_format: { type: "json_object" },
      messages: [
        { role: "system", content: "Fix JSON to match the scorecard schema exactly. No markdown." },
        { role: "user", content: `Previous invalid output:\n${raw}\n\nError: ${String(e)}` },
      ],
    });
    const raw2 = retry.choices[0]?.message?.content;
    if (!raw2) throw new Error("Reintento OpenAI vacío");
    return parse(raw2);
  }
}
