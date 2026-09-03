import { z } from "zod";
import { getOpenAI } from "@/lib/openai";
import { redactForOpenAI } from "@/lib/talent/cv/redact";
import { maybeAnonymizeForRanking } from "@/lib/talent/cv/storage";

export const PARSER_VERSION = "cv-profile-v1";
export const PROFILE_PROMPT_VERSION = "cv-profile-prompt-v1";

export const CvStructuredProfileSchema = z.object({
  experience: z
    .array(
      z.object({
        title: z.string().max(200).optional().nullable(),
        company: z.string().max(200).optional().nullable(),
        start: z.string().max(40).optional().nullable(),
        end: z.string().max(40).optional().nullable(),
        summary: z.string().max(2000).optional().nullable(),
      }),
    )
    .max(40)
    .default([]),
  education: z
    .array(
      z.object({
        degree: z.string().max(200).optional().nullable(),
        institution: z.string().max(200).optional().nullable(),
        year: z.string().max(40).optional().nullable(),
      }),
    )
    .max(30)
    .default([]),
  certifications: z.array(z.string().max(200)).max(40).default([]),
  tools: z.array(z.string().max(100)).max(80).default([]),
  languages: z
    .array(
      z.object({
        name: z.string().max(80),
        level: z.string().max(80).optional().nullable(),
      }),
    )
    .max(20)
    .default([]),
  skills: z.array(z.string().max(100)).max(100).default([]),
  achievements: z.array(z.string().max(500)).max(40).default([]),
});

export type CvStructuredProfileData = z.infer<typeof CvStructuredProfileSchema>;

function buildProfilePrompt(redactedText: string) {
  return `Extrae un perfil profesional estructurado del CV.
Reglas estrictas:
- Devuelve SOLO JSON válido con las claves: experience, education, certifications, tools, languages, skills, achievements.
- NO inventes datos que no estén en el texto.
- NO incluyas dirección, foto, edad, género, nacionalidad, documento de identidad, estado civil ni datos de contacto.
- Si un campo no aparece, usa lista vacía o null.

Texto del CV (ya redactado):
${redactedText}`;
}

export async function extractStructuredProfile(rawText: string): Promise<{
  profile: CvStructuredProfileData;
  model: string;
  promptVersion: string;
  parserVersion: string;
}> {
  const { text } = redactForOpenAI(maybeAnonymizeForRanking(rawText));
  const openai = getOpenAI();
  const model = process.env.OPENAI_EVAL_MODEL ?? "gpt-4o-mini";

  const completion = await openai.chat.completions.create({
    model,
    temperature: 0,
    response_format: { type: "json_object" },
    messages: [
      {
        role: "system",
        content:
          "You extract structured CV profiles as JSON only. Never invent protected attributes or contact details.",
      },
      { role: "user", content: buildProfilePrompt(text) },
    ],
  });

  const raw = completion.choices[0]?.message?.content;
  if (!raw) throw new Error("OpenAI no devolvió perfil estructurado");
  const parsed = CvStructuredProfileSchema.parse(JSON.parse(raw));
  return {
    profile: parsed,
    model,
    promptVersion: PROFILE_PROMPT_VERSION,
    parserVersion: PARSER_VERSION,
  };
}
