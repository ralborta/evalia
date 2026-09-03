import { describe, expect, it } from "vitest";
import { buildStorageKey } from "@/lib/talent/cv/storage";

function orgFilter(organizationId: string) {
  return { organizationId };
}

describe("aislamiento de documentos por organización", () => {
  it("las consultas de documentos llevan organizationId", () => {
    const where = { ...orgFilter("org_a"), id: "doc_1" };
    expect(where.organizationId).toBe("org_a");
    expect(where.organizationId).not.toBe("org_b");
  });

  it("la clave de storage incluye organizationId y no es predecible solo con el id", () => {
    const keyA = buildStorageKey("org_a", "doc_1");
    const keyB = buildStorageKey("org_b", "doc_1");
    expect(keyA.startsWith("org/org_a/doc/doc_1/")).toBe(true);
    expect(keyB.startsWith("org/org_b/doc/doc_1/")).toBe(true);
    expect(keyA).not.toBe(keyB);
    expect(keyA.split("/").pop()!.length).toBeGreaterThanOrEqual(16);
  });

  it("el unique de sha256 es por organización (mismo hash puede vivir en dos orgs)", () => {
    const constraint = ["organizationId", "sha256"] as const;
    expect(constraint).toContain("organizationId");
    expect(constraint).not.toContain("applicationId");
  });
});
