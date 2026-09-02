import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

type HealthBody = {
  status: "ok" | "error";
  database: "connected" | "disconnected";
};

export async function GET() {
  try {
    await prisma.$queryRaw`SELECT 1`;
    const body: HealthBody = { status: "ok", database: "connected" };
    return NextResponse.json(body, { status: 200 });
  } catch {
    const body: HealthBody = { status: "error", database: "disconnected" };
    return NextResponse.json(body, { status: 503 });
  }
}
