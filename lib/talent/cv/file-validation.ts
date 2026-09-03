import { createHash } from "node:crypto";

const DEFAULT_MAX_BYTES = 8 * 1024 * 1024;
const ALLOWED_EXT = new Set([".pdf", ".docx"]);
const ALLOWED_MIME = new Set([
  "application/pdf",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  "application/zip", // docx is a zip container; magic may report zip
]);

export class DocumentValidationError extends Error {
  constructor(
    message: string,
    readonly code: string,
  ) {
    super(message);
    this.name = "DocumentValidationError";
  }
}

export type ValidatedDocument = {
  filename: string;
  extension: ".pdf" | ".docx";
  mimeType: string;
  byteSize: number;
  sha256: string;
  buffer: Buffer;
};

function maxBytes() {
  const raw = process.env.CANDIDATE_DOC_MAX_BYTES;
  const n = raw ? Number.parseInt(raw, 10) : DEFAULT_MAX_BYTES;
  return Number.isFinite(n) && n > 0 ? n : DEFAULT_MAX_BYTES;
}

function extensionOf(filename: string): string {
  const i = filename.lastIndexOf(".");
  return i >= 0 ? filename.slice(i).toLowerCase() : "";
}

function looksLikePdf(buf: Buffer) {
  return buf.length >= 5 && buf.subarray(0, 5).toString("ascii") === "%PDF-";
}

function looksLikeZip(buf: Buffer) {
  return buf.length >= 4 && buf[0] === 0x50 && buf[1] === 0x4b && (buf[2] === 0x03 || buf[2] === 0x05 || buf[2] === 0x07);
}

function looksLikePe(buf: Buffer) {
  return buf.length >= 2 && buf[0] === 0x4d && buf[1] === 0x5a;
}

function looksLikeElf(buf: Buffer) {
  return buf.length >= 4 && buf[0] === 0x7f && buf[1] === 0x45 && buf[2] === 0x4c && buf[3] === 0x46;
}

function looksLikeMachO(buf: Buffer) {
  if (buf.length < 4) return false;
  const mag = buf.readUInt32BE(0);
  return mag === 0xfeedface || mag === 0xfeedfacf || mag === 0xcafebabe || mag === 0xcefaedfe || mag === 0xcffaedfe;
}

function detectEncryptedPdf(buf: Buffer) {
  // Heurística: /Encrypt en el diccionario del trailer o objetos
  const sample = buf.subarray(0, Math.min(buf.length, 512 * 1024)).toString("latin1");
  return /\/Encrypt[\s\/\[]/.test(sample);
}

function detectHtmlWithScript(buf: Buffer) {
  const head = buf.subarray(0, Math.min(buf.length, 64 * 1024)).toString("utf8").toLowerCase();
  if (!head.includes("<html") && !head.includes("<!doctype html")) return false;
  return /<script[\s>]/.test(head);
}

function roughZipBombCheck(buf: Buffer) {
  // Contar entradas locales PK\x03\x04; demasiadas entradas pequeñas → sospechoso
  let entries = 0;
  for (let i = 0; i < Math.min(buf.length - 30, 2 * 1024 * 1024); i++) {
    if (buf[i] === 0x50 && buf[i + 1] === 0x4b && buf[i + 2] === 0x03 && buf[i + 3] === 0x04) {
      entries += 1;
      if (entries > 5000) return true;
      const compSize = buf.readUInt32LE(i + 18);
      const uncompSize = buf.readUInt32LE(i + 22);
      if (uncompSize > 0 && compSize > 0 && uncompSize / compSize > 200 && uncompSize > 50 * 1024 * 1024) {
        return true;
      }
    }
  }
  return false;
}

/**
 * Valida extensión, tamaño, magic bytes y firmas peligrosas.
 * No registra el contenido del archivo.
 */
export async function validateCandidateDocument(
  buffer: Buffer,
  filename: string,
): Promise<ValidatedDocument> {
  const safeName = filename.replace(/[/\\]/g, "_").trim();
  if (!safeName) throw new DocumentValidationError("Nombre de archivo vacío", "EMPTY_NAME");

  const extension = extensionOf(safeName);
  if (!ALLOWED_EXT.has(extension)) {
    throw new DocumentValidationError("Solo se admiten PDF o DOCX", "BAD_EXTENSION");
  }

  const limit = maxBytes();
  if (buffer.length === 0) throw new DocumentValidationError("Archivo vacío", "EMPTY_FILE");
  if (buffer.length > limit) {
    throw new DocumentValidationError("El archivo supera el tamaño máximo", "TOO_LARGE");
  }

  if (looksLikePe(buffer) || looksLikeElf(buffer) || looksLikeMachO(buffer)) {
    throw new DocumentValidationError("Tipo de archivo no permitido", "EXECUTABLE");
  }
  if (detectHtmlWithScript(buffer)) {
    throw new DocumentValidationError("HTML con script no permitido", "HTML_SCRIPT");
  }

  let mimeType = "application/octet-stream";
  try {
    const { fileTypeFromBuffer } = await import("file-type");
    const detected = await fileTypeFromBuffer(buffer);
    if (detected?.mime) mimeType = detected.mime;
  } catch {
    // file-type opcional; caemos a magic manual
  }

  if (extension === ".pdf") {
    if (!looksLikePdf(buffer)) {
      throw new DocumentValidationError("La firma del PDF no es válida", "BAD_PDF_MAGIC");
    }
    if (detectEncryptedPdf(buffer)) {
      throw new DocumentValidationError("PDF cifrado o protegido no admitido", "ENCRYPTED_PDF");
    }
    mimeType = "application/pdf";
  } else {
    if (!looksLikeZip(buffer)) {
      throw new DocumentValidationError("La firma del DOCX no es válida", "BAD_DOCX_MAGIC");
    }
    if (roughZipBombCheck(buffer)) {
      throw new DocumentValidationError("Archivo comprimido sospechoso", "ZIP_BOMB");
    }
    if (mimeType !== "application/zip" && !ALLOWED_MIME.has(mimeType)) {
      // Algunos detectores reportan el mime OOXML exacto
      if (mimeType !== "application/vnd.openxmlformats-officedocument.wordprocessingml.document") {
        mimeType = "application/vnd.openxmlformats-officedocument.wordprocessingml.document";
      }
    } else {
      mimeType = "application/vnd.openxmlformats-officedocument.wordprocessingml.document";
    }
  }

  if (!ALLOWED_MIME.has(mimeType) && mimeType !== "application/vnd.openxmlformats-officedocument.wordprocessingml.document") {
    throw new DocumentValidationError("MIME no permitido", "BAD_MIME");
  }

  const sha256 = createHash("sha256").update(buffer).digest("hex");
  return {
    filename: safeName,
    extension: extension as ".pdf" | ".docx",
    mimeType,
    byteSize: buffer.length,
    sha256,
    buffer,
  };
}
