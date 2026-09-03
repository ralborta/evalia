import { describe, expect, it } from "vitest";
import { validateCandidateDocument, DocumentValidationError } from "@/lib/talent/cv/file-validation";

function pdfBuffer(extra = "") {
  return Buffer.from(`%PDF-1.4\n1 0 obj<<>>endobj\ntrailer<<>>\n${extra}`);
}

describe("validateCandidateDocument", () => {
  it("acepta un PDF con magic válido", async () => {
    const result = await validateCandidateDocument(pdfBuffer("hello"), "cv.pdf");
    expect(result.extension).toBe(".pdf");
    expect(result.mimeType).toBe("application/pdf");
    expect(result.sha256).toHaveLength(64);
  });

  it("rechaza extensión no permitida", async () => {
    await expect(validateCandidateDocument(Buffer.from("MZ"), "malware.exe")).rejects.toBeInstanceOf(
      DocumentValidationError,
    );
  });

  it("rechaza ejecutables PE aunque se llamen .pdf", async () => {
    const pe = Buffer.from([0x4d, 0x5a, 0x90, 0x00, 0x03, 0x00, 0x00, 0x00]);
    await expect(validateCandidateDocument(pe, "fake.pdf")).rejects.toMatchObject({ code: "EXECUTABLE" });
  });

  it("rechaza PDF cifrado detectable", async () => {
    const encrypted = pdfBuffer("/Encrypt 2 0 R");
    await expect(validateCandidateDocument(encrypted, "secret.pdf")).rejects.toMatchObject({
      code: "ENCRYPTED_PDF",
    });
  });

  it("rechaza HTML con script", async () => {
    const html = Buffer.from("<!doctype html><html><script>alert(1)</script></html>");
    await expect(validateCandidateDocument(html, "x.pdf")).rejects.toBeInstanceOf(DocumentValidationError);
  });

  it("rechaza archivos vacíos", async () => {
    await expect(validateCandidateDocument(Buffer.alloc(0), "empty.pdf")).rejects.toMatchObject({
      code: "EMPTY_FILE",
    });
  });
});
