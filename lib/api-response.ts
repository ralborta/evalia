import { NextResponse } from "next/server";
import { jsonOrgError } from "@/lib/org-context";

export function fail(error: unknown) {
  try {
    const mapped = jsonOrgError(error);
    return NextResponse.json(mapped.body, { status: mapped.status });
  } catch {
    console.error(error);
    return NextResponse.json({ error: "Error interno" }, { status: 500 });
  }
}
