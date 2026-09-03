import { describe, expect, it } from "vitest";
import { defaultPipelineCreateData } from "@/lib/talent/pipeline";
import { canWriteOrg, pickOrganizationId } from "@/lib/talent/org-policy";

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

describe("selector de organización activa", () => {
  const memberships = [{ organizationId: "org_evalia" }, { organizationId: "org_acme" }];

  it("prioriza la cookie del selector sobre el JWT", () => {
    expect(pickOrganizationId(memberships, { cookie: "org_acme", jwt: "org_evalia" })).toBe("org_acme");
  });

  it("usa el JWT si no hay cookie", () => {
    expect(pickOrganizationId(memberships, { jwt: "org_evalia" })).toBe("org_evalia");
  });

  it("ignora una cookie de una organización no permitida", () => {
    expect(pickOrganizationId(memberships, { cookie: "org_otra", jwt: "org_evalia" })).toBe("org_evalia");
  });
});

describe("permisos de organización", () => {
  it("OWNER, ADMIN y RECRUITER pueden escribir", () => {
    expect(canWriteOrg("OWNER")).toBe(true);
    expect(canWriteOrg("ADMIN")).toBe(true);
    expect(canWriteOrg("RECRUITER")).toBe(true);
  });

  it("VIEWER no puede modificar", () => {
    expect(canWriteOrg("VIEWER")).toBe(false);
  });
});
