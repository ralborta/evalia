export type ExtractResult = {
  text: string;
  charCount: number;
  pageCount: number | null;
  extractor: string;
};

export function detectInsufficientText(charCount: number, pageCount: number | null): boolean {
  if (charCount < 200) return true;
  if (pageCount != null && pageCount > 0 && charCount / pageCount < 40) return true;
  return false;
}

export async function extractPdfText(buffer: Buffer): Promise<ExtractResult> {
  // pdf-parse v2: clase PDFParse
  const { PDFParse } = await import("pdf-parse");
  const parser = new PDFParse({ data: new Uint8Array(buffer) });
  try {
    const result = await parser.getText();
    const text = (result.text || "").replace(/\u0000/g, "").trim();
    const pageCount = Array.isArray(result.pages) ? result.pages.length : null;
    return {
      text,
      charCount: text.length,
      pageCount,
      extractor: "pdf-parse@2",
    };
  } finally {
    try {
      await parser.destroy?.();
    } catch {
      // ignore
    }
  }
}

export async function extractDocxText(buffer: Buffer): Promise<ExtractResult> {
  const mammoth = await import("mammoth");
  const result = await mammoth.extractRawText({ buffer });
  const text = (result.value || "").replace(/\u0000/g, "").trim();
  return {
    text,
    charCount: text.length,
    pageCount: null,
    extractor: "mammoth@1",
  };
}

export async function extractTextFromBuffer(
  buffer: Buffer,
  mimeType: string,
): Promise<ExtractResult> {
  if (mimeType === "application/pdf" || mimeType.includes("pdf")) {
    return extractPdfText(buffer);
  }
  return extractDocxText(buffer);
}
