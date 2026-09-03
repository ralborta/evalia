import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

type HealthBody = {
  status: "ok" | "error";
  database: "connected" | "disconnected";
  redis?: "connected" | "disconnected" | "skipped";
};

async function pingRedisSafe(): Promise<"connected" | "disconnected" | "skipped"> {
  const url = process.env.REDIS_URL;
  if (!url) return "skipped";
  try {
    // Ping ligero sin compartir la conexión del worker
    const IORedis = (await import("ioredis")).default;
    const client = new IORedis(url, {
      maxRetriesPerRequest: 1,
      connectTimeout: 1500,
      lazyConnect: true,
    });
    try {
      await client.connect();
      const pong = await client.ping();
      return pong === "PONG" ? "connected" : "disconnected";
    } finally {
      client.disconnect();
    }
  } catch {
    return "disconnected";
  }
}

export async function GET() {
  try {
    await prisma.$queryRaw`SELECT 1`;
    const body: HealthBody = { status: "ok", database: "connected" };
    if (process.env.REDIS_URL) {
      body.redis = await pingRedisSafe();
    }
    return NextResponse.json(body, { status: 200 });
  } catch {
    const body: HealthBody = { status: "error", database: "disconnected" };
    if (process.env.REDIS_URL) body.redis = "skipped";
    return NextResponse.json(body, { status: 503 });
  }
}
