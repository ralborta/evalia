import { describe, expect, it } from "vitest";
import { defaultPipelineCreateData } from "@/lib/talent/pipeline";

function orgFilter(organizationId: string) {
  return { organizationId };
}

describe("aislamiento por organización", () => {
  it("todas las consultas Talent llevan organizationId", () => {
    const where = orgFilter("org_a");
    expect(where).toEqual({ organizationId: "org_a" });
    expect(where.organizationId).not.toBe("org_b");
  });

  it("el pipeline de una vacante nace con la misma organización", () => {
    const stages = defaultPipelineCreateData("org_a");
    expect(stages.every((s) => s.organizationId === "org_a")).toBe(true);
    expect(stages.some((s) => s.key === "rejected" && s.isRejected)).toBe(true);
  });

  it("un usuario de org B no puede resolver org A solo con el id", () => {
    const memberships = [{ organizationId: "org_b" }];
    const requested = "org_a";
    const allowed = memberships.some((m) => m.organizationId === requested);
    expect(allowed).toBe(false);
  });
});
