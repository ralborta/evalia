import type { EnglishLevel, Recommendation } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { getOpenAI } from "@/lib/openai";
import { EvaluationResultSchema, type EvaluationResult } from "@/lib/evaluation-schema";

function buildPrompt(input: {
  candidateName: string;
  jobTitle: string;
  targetLevel: EnglishLevel | null;
  evaluationProfileName: string;
  durationSeconds: number | null;
  transcript: string;
}): string {
  const tl = input.targetLevel ?? "B1";
  return `You are an expert English language assessor for professional recruitment.

Evaluate the candidate's spoken English interview based on the transcript and interview metadata.

Important:
- Be objective and consistent.
- Do not overstate certainty.
- If audio-level pronunciation data is not available, estimate pronunciation clarity only from transcript signals and conversation flow.
- Focus on professional communication for the evaluated role.
- Return only valid JSON matching the required schema.

Input data:
Candidate name: ${input.candidateName}
Job title: ${input.jobTitle}
Expected level: ${tl}
Evaluation profile: ${input.evaluationProfileName}
Interview duration: ${input.durationSeconds ?? 0} seconds

Transcript:
${input.transcript}

Evaluate these dimensions from 0 to 100 (include all in metrics array with Spanish labels):
- pronunciationClarity (label: Claridad de pronunciación)
- fluency (Fluidez)
- grammar (Gramática)
- vocabulary (Vocabulario)
- comprehension (Comprensión)
- coherence (Coherencia)
- roleFitLanguage (Adecuación al rol)
- responseRelevance (Relevancia de respuestas)
- averageAnswerLength (Desarrollo de respuestas)
- scenarioHandling (Manejo situacional)
- professionalConfidence (Confianza profesional)
- consistency (Consistencia)
- clarificationNeed (Necesidad de aclaraciones — score alto = poca necesidad)
- communicationRisk (Riesgo comunicacional — score alto = bajo riesgo)

Return JSON with:
- overallScore 0-100
- estimatedLevel: A1|A2|B1|B2|C1|C2
- recommendation: RECOMMENDED|RECOMMENDED_WITH_OBSERVATIONS|NEEDS_HUMAN_REVIEW|NOT_RECOMMENDED_FOR_ROLE
- roleFit: Low|Medium|High|Very High
- operationalRisk: Low|Medium-low|Medium|Medium-high|High
- executiveSummary in Spanish
- strengths, weaknesses, risks: arrays of strings in Spanish
- suggestedNextStep in Spanish
- metrics: array of {key, label (Spanish), score, weight (optional), comment (Spanish optional)}
Use weights from the product brief when possible (fluency 20%, pronunciation 15%, grammar 15%, vocabulary 15%, comprehension 15%, coherence 10%, role fit language 10%).`;
}

export async function runInterviewEvaluation(interviewId: string) {
  const interview = await prisma.interview.findUnique({
    where: { id: interviewId },
    include: {
      candidate: true,
      jobPosition: true,
      evaluationProfile: true,
    },
  });

  if (!interview?.transcript?.trim()) {
    throw new Error("La entrevista no tiene transcripción para evaluar");
  }

  const prompt = buildPrompt({
    candidateName: interview.candidate.name,
    jobTitle: interview.jobPosition.title,
    targetLevel: interview.targetLevel,
    evaluationProfileName: interview.evaluationProfile.name,
    durationSeconds: interview.durationSeconds,
    transcript: interview.transcript,
  });

  const openai = getOpenAI();
  const completion = await openai.chat.completions.create({
    model: process.env.OPENAI_EVAL_MODEL ?? "gpt-4o-mini",
    temperature: 0.2,
    response_format: { type: "json_object" },
    messages: [
      { role: "system", content: "You output only valid JSON for evaluation." },
      { role: "user", content: prompt },
    ],
  });

  const raw = completion.choices[0]?.message?.content;
  if (!raw) throw new Error("OpenAI no devolvió contenido");

  let parsed: EvaluationResult;
  try {
    parsed = EvaluationResultSchema.parse(JSON.parse(raw));
  } catch (e) {
    const retry = await openai.chat.completions.create({
      model: process.env.OPENAI_EVAL_MODEL ?? "gpt-4o-mini",
      temperature: 0,
      response_format: { type: "json_object" },
      messages: [
        { role: "system", content: "Fix JSON to match schema exactly. No markdown." },
        { role: "user", content: `Previous invalid output:\n${raw}\n\nError: ${String(e)}` },
      ],
    });
    const raw2 = retry.choices[0]?.message?.content;
    if (!raw2) throw new Error("Reintento OpenAI vacío");
    parsed = EvaluationResultSchema.parse(JSON.parse(raw2));
  }

  await prisma.$transaction(async (tx) => {
    await tx.evaluation.deleteMany({ where: { interviewId } });
    await tx.evaluation.create({
      data: {
        interviewId,
        overallScore: parsed.overallScore,
        estimatedLevel: parsed.estimatedLevel as EnglishLevel,
        recommendation: parsed.recommendation as Recommendation,
        roleFit: parsed.roleFit,
        operationalRisk: parsed.operationalRisk,
        executiveSummary: parsed.executiveSummary,
        strengths: parsed.strengths,
        weaknesses: parsed.weaknesses,
        risks: parsed.risks,
        suggestedNextStep: parsed.suggestedNextStep ?? null,
        rawJson: parsed as object,
        metrics: {
          create: parsed.metrics.map((m) => ({
            key: m.key,
            label: m.label,
            score: m.score,
            weight: m.weight ?? null,
            comment: m.comment ?? null,
          })),
        },
      },
    });
    await tx.interview.update({
      where: { id: interviewId },
      data: { status: "COMPLETED" },
    });
  });

  return prisma.evaluation.findUniqueOrThrow({
    where: { interviewId },
    include: { metrics: true },
  });
}
