import { describe, expect, it } from "vitest";
import { redactForOpenAI } from "@/lib/talent/cv/redact";

describe("redactForOpenAI", () => {
  it("redacta emails y teléfonos", () => {
    const { text, redactedCount } = redactForOpenAI(
      "Contacto: ana@ejemplo.com y +34 612 345 678",
    );
    expect(text).not.toContain("ana@ejemplo.com");
    expect(text).toContain("[REDACTED]");
    expect(redactedCount).toBeGreaterThanOrEqual(2);
  });

  it("elimina data:image base64", () => {
    const blob = `data:image/png;base64,${"A".repeat(80)}`;
    const { text } = redactForOpenAI(`foto ${blob} fin`);
    expect(text).not.toContain("base64");
    expect(text).toContain("[REDACTED]");
  });

  it("redacta etiquetas de atributos protegidos", () => {
    const { text } = redactForOpenAI("Nombre: Ana\nEdad: 42\nNacionalidad: ES\nExperiencia en SaaS");
    expect(text.toLowerCase()).not.toMatch(/edad:\s*42/);
    expect(text).toContain("Experiencia en SaaS");
  });
});
