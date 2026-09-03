import { Queue } from "bullmq";
import IORedis from "ioredis";

export const CV_QUEUE_NAME = "cv-processing";

export type CvProcessingJob = {
  documentId: string;
  organizationId: string;
  version: number;
};

let connection: IORedis | null = null;
let queue: Queue<CvProcessingJob> | null = null;

export function getRedisConnection() {
  const url = process.env.REDIS_URL;
  if (!url) throw new Error("REDIS_URL no configurada");
  if (!connection) {
    connection = new IORedis(url, { maxRetriesPerRequest: null });
  }
  return connection;
}

export function getCvQueue() {
  if (!queue) {
    queue = new Queue<CvProcessingJob>(CV_QUEUE_NAME, {
      connection: getRedisConnection(),
      defaultJobOptions: {
        attempts: 5,
        backoff: { type: "exponential", delay: 3000 },
        removeOnComplete: 100,
        removeOnFail: 200,
      },
    });
  }
  return queue;
}

export function cvJobId(documentId: string, version: number) {
  return `doc:${documentId}:v${version}`;
}

/** Encola procesamiento; jobId idempotente por documento+versión. */
export async function enqueueDocument(documentId: string, organizationId: string, version: number) {
  const q = getCvQueue();
  await q.add(
    "process",
    { documentId, organizationId, version },
    { jobId: cvJobId(documentId, version) },
  );
}

export async function pingRedis(): Promise<"connected" | "disconnected" | "skipped"> {
  if (!process.env.REDIS_URL) return "skipped";
  try {
    const conn = getRedisConnection();
    const pong = await conn.ping();
    return pong === "PONG" ? "connected" : "disconnected";
  } catch {
    return "disconnected";
  }
}
