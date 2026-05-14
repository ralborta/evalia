import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";

export async function GET() {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  const profiles = await prisma.evaluationProfile.findMany({ orderBy: { name: "asc" } });
  return NextResponse.json(profiles);
}
