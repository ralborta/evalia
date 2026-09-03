/**
 * Worker BullMQ para procesamiento de CVs.
 * Health: GET /health en WORKER_HEALTH_PORT (default 8081).
 */
import http from "node:http";
import { Worker } from "bullmq";
import { prisma } from "@/lib/prisma";
import {
  CV_QUEUE_NAME,
  getRedisConnection,
  type CvProcessingJob,
  pingRedis,
} from "@/lib/talent/cv/queue";
import { processCandidateDocument } from "@/lib/talent/cv/process-document";

const concurrency = Number.parseInt(process.env.WORKER_CONCURRENCY || "2", 10) || 2;
const healthPort = Number.parseInt(process.env.WORKER_HEALTH_PORT || "8081", 10) || 8081;

async function checkDatabase(): Promise<"connected" | "disconnected"> {
  try {
    await prisma.$queryRaw`SELECT 1`;
    return "connected";
  } catch {
    return "disconnected";
  }
}

function startHealthServer() {
  const server = http.createServer(async (_req, res) => {
    if (_req.url !== "/health") {
      res.writeHead(404);
      res.end();
      return;
    }
    const [redis, database] = await Promise.all([pingRedis(), checkDatabase()]);
    const ok = database === "connected" && redis !== "disconnected";
    const body = JSON.stringify({
      status: ok ? "ok" : "error",
      redis,
      database,
    });
    res.writeHead(ok ? 200 : 503, { "content-type": "application/json" });
    res.end(body);
  });
  server.listen(healthPort, "0.0.0.0", () => {
    console.info(`[worker] health en :${healthPort}/health`);
  });
  return server;
}

async function main() {
  if (!process.env.REDIS_URL) {
    console.error("[worker] REDIS_URL es obligatorio");
    process.exit(1);
  }
  if (!process.env.DATABASE_URL) {
    console.error("[worker] DATABASE_URL es obligatorio");
    process.exit(1);
  }

  startHealthServer();
  const connection = getRedisConnection();

  const worker = new Worker<CvProcessingJob>(
    CV_QUEUE_NAME,
    async (job) => {
      // No loguear texto de CV ni PII
      console.info(`[worker] procesando documento id=${job.data.documentId} v=${job.data.version}`);
      await processCandidateDocument(job.data.documentId);
    },
    {
      connection,
      concurrency,
    },
  );

  worker.on("failed", async (job, err) => {
    const documentId = job?.data?.documentId;
    console.error(`[worker] fallo job=${job?.id} code=${(err as { code?: string })?.code || "ERR"}`);
    if (documentId) {
      try {
        await prisma.candidateDocument.updateMany({
          where: { id: documentId },
          data: {
            processingStatus: "FAILED",
            processingError: (err?.message || "Error de worker").slice(0, 400),
          },
        });
      } catch {
        // ignore
      }
    }
  });

  worker.on("completed", (job) => {
    console.info(`[worker] completado job=${job.id}`);
  });

  console.info(`[worker] escuchando cola ${CV_QUEUE_NAME} concurrency=${concurrency}`);
}

main().catch((error) => {
  console.error("[worker] fatal", error instanceof Error ? error.message : error);
  process.exit(1);
});
