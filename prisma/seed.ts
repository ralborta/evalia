import "dotenv/config";
import { PrismaClient, InterviewStatus, EnglishLevel, Recommendation, UserRole, InterviewAudience } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

const SEED_TOKEN_COMPLETED = "seed00000000000000000001completed";
const SEED_TOKEN_AGENT = "seed00000000000000000002agentlnk";

async function main() {
  const passwordDemo = await bcrypt.hash("demo12345", 10);
  const passwordAdmin = await bcrypt.hash("admin", 10);

  await prisma.user.upsert({
    where: { email: "admin@evalia.app" },
    update: {
      password: passwordAdmin,
      role: UserRole.ADMIN,
    },
    create: {
      email: "admin@evalia.app",
      name: "Admin EvalIA",
      password: passwordAdmin,
      role: UserRole.ADMIN,
    },
  });

  const evaluator = await prisma.user.upsert({
    where: { email: "evaluador@evalia.app" },
    update: {},
    create: {
      email: "evaluador@evalia.app",
      name: "Ana López",
      password: passwordDemo,
      role: UserRole.EVALUATOR,
    },
  });

  const agentUser = await prisma.user.upsert({
    where: { email: "agente@evalia.app" },
    update: {},
    create: {
      email: "agente@evalia.app",
      name: "Juan Pérez",
      password: passwordDemo,
      role: UserRole.AGENT,
    },
  });

  const profiles = [
    {
      key: "general_english",
      name: "Inglés general",
      description: "Fluidez, comprensión, gramática, vocabulario y coherencia.",
      configJson: { focus: ["fluency", "comprehension", "grammar", "vocabulary", "coherence"] },
    },
    {
      key: "customer_support",
      name: "Atención al cliente en inglés",
      description: "Empatía, claridad y resolución en contexto de soporte.",
      configJson: { focus: ["empathy", "clarity", "problem_solving"] },
    },
    {
      key: "sales_english",
      name: "Ventas en inglés",
      description: "Persuasión, objeciones y vocabulario comercial.",
      configJson: { focus: ["persuasion", "objections", "commercial_language"] },
    },
    {
      key: "tech_support",
      name: "Soporte técnico / Backoffice en inglés",
      description: "Precisión, instrucciones y documentación.",
      configJson: { focus: ["precision", "instructions", "documentation"] },
    },
  ];

  for (const p of profiles) {
    await prisma.evaluationProfile.upsert({
      where: { key: p.key },
      update: { name: p.name, description: p.description, configJson: p.configJson },
      create: p,
    });
  }

  const profile = await prisma.evaluationProfile.findUniqueOrThrow({
    where: { key: "customer_support" },
  });

  const job = await prisma.jobPosition.upsert({
    where: { id: "seed-job-cs" },
    update: {},
    create: {
      id: "seed-job-cs",
      title: "Customer Support Agent",
      description: "Soporte L2",
      targetLevel: EnglishLevel.B2,
    },
  });

  const extCandidate = await prisma.candidate.upsert({
    where: { id: "seed-candidate-ext" },
    update: {},
    create: {
      id: "seed-candidate-ext",
      name: "María García",
      email: "maria.externa@example.com",
    },
  });

  const agentCandidate = await prisma.candidate.upsert({
    where: { id: "seed-candidate-agent" },
    update: { linkedUserId: agentUser.id },
    create: {
      id: "seed-candidate-agent",
      name: agentUser.name,
      email: agentUser.email!,
      linkedUserId: agentUser.id,
    },
  });

  const completed = await prisma.interview.upsert({
    where: { publicToken: SEED_TOKEN_COMPLETED },
    update: {},
    create: {
      publicToken: SEED_TOKEN_COMPLETED,
      audience: InterviewAudience.EXTERNAL_CANDIDATE,
      candidateId: extCandidate.id,
      jobPositionId: job.id,
      evaluationProfileId: profile.id,
      createdById: evaluator.id,
      status: InterviewStatus.COMPLETED,
      durationMinutes: 8,
      targetLevel: EnglishLevel.B2,
      transcript:
        "Agent: Hello, please introduce yourself.\nCandidate: Hi, I am Maria. I work in customer support for two years.\nAgent: Tell me about a difficult customer.\nCandidate: Once a client was upset about billing. I listened, verified the invoice, and offered a clear timeline for resolution.",
      summary: "Conversación de demostración para probar la UI del informe.",
      durationSeconds: 420,
      startedAt: new Date(Date.now() - 86400000),
      finishedAt: new Date(Date.now() - 86400000 + 420000),
    },
  });

  await prisma.evaluation.upsert({
    where: { interviewId: completed.id },
    update: {},
    create: {
      interviewId: completed.id,
      overallScore: 82,
      estimatedLevel: EnglishLevel.B2,
      recommendation: Recommendation.RECOMMENDED_WITH_OBSERVATIONS,
      roleFit: "High",
      operationalRisk: "Medium-low",
      executiveSummary:
        "Candidata con comunicación clara y tono profesional. Buena estructura en respuestas situacionales.",
      strengths: ["Claridad", "Empatía verbal", "Ejemplos concretos"],
      weaknesses: ["Algunas pausas de relleno", "Precisión gramatical mejorable en pasado"],
      risks: ["En picos de estrés podría acelerar el ritmo y perder precisión"],
      suggestedNextStep: "Entrevista técnica con un caso de billing en inglés.",
      rawJson: {},
      metrics: {
        create: [
          { key: "fluency", label: "Fluidez", score: 84, weight: 20, comment: "Ritmo natural." },
          { key: "grammar", label: "Gramática", score: 76, weight: 15, comment: "Errores menores en tiempos verbales." },
          { key: "comprehension", label: "Comprensión", score: 88, weight: 15, comment: "Responde al foco de la pregunta." },
        ],
      },
    },
  });

  await prisma.interview.upsert({
    where: { publicToken: SEED_TOKEN_AGENT },
    update: {},
    create: {
      publicToken: SEED_TOKEN_AGENT,
      audience: InterviewAudience.INTERNAL_AGENT,
      candidateId: agentCandidate.id,
      jobPositionId: job.id,
      evaluationProfileId: profile.id,
      createdById: evaluator.id,
      status: InterviewStatus.LINK_READY,
      durationMinutes: 10,
      targetLevel: EnglishLevel.B2,
      internalNotes: "Simulación interna — agente Juan",
    },
  });

  console.log("Seed OK");
  console.log("Admin: admin@evalia.app / admin");
  console.log("Evaluador y agente: evaluador@evalia.app | agente@evalia.app — contraseña: demo12345");
  console.log("Entrevista demo completada — link:", `/interview/${SEED_TOKEN_COMPLETED}`);
  console.log("Entrevista agente (link listo) — link:", `/interview/${SEED_TOKEN_AGENT}`);
}

main()
  .then(() => prisma.$disconnect())
  .catch(async (e) => {
    console.error(e);
    await prisma.$disconnect();
    process.exit(1);
  });
