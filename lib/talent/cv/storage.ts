import { createHmac, randomBytes, timingSafeEqual } from "node:crypto";
import { mkdir, readFile, unlink, writeFile } from "node:fs/promises";
import { dirname, join } from "node:path";

export type DocumentStorage = {
  put(key: string, data: Buffer, contentType: string): Promise<void>;
  get(key: string): Promise<Buffer>;
  delete(key: string): Promise<void>;
  signedDownloadUrl(documentId: string, expiresInSeconds?: number): string;
};

function docsRoot() {
  return process.env.CANDIDATE_DOCS_ROOT || "/data/candidate-docs";
}

function signingSecret() {
  const secret = process.env.CANDIDATE_DOCS_SIGNING_SECRET;
  if (!secret) throw new Error("CANDIDATE_DOCS_SIGNING_SECRET no configurada");
  return secret;
}

export function buildStorageKey(organizationId: string, documentId: string) {
  const randomHex = randomBytes(16).toString("hex");
  return `org/${organizationId}/doc/${documentId}/${randomHex}`;
}

export function signDocumentContentUrl(documentId: string, expiresInSeconds = 300) {
  const exp = Math.floor(Date.now() / 1000) + expiresInSeconds;
  const payload = `${documentId}:${exp}`;
  const sig = createHmac("sha256", signingSecret()).update(payload).digest("hex");
  return `/api/documents/${documentId}/content?exp=${exp}&sig=${sig}`;
}

export function verifyDocumentContentSignature(documentId: string, exp: string, sig: string) {
  const expNum = Number.parseInt(exp, 10);
  if (!Number.isFinite(expNum) || expNum * 1000 < Date.now()) return false;
  const payload = `${documentId}:${expNum}`;
  const expected = createHmac("sha256", signingSecret()).update(payload).digest("hex");
  try {
    const a = Buffer.from(expected, "utf8");
    const b = Buffer.from(sig, "utf8");
    if (a.length !== b.length) return false;
    return timingSafeEqual(a, b);
  } catch {
    return false;
  }
}

/** Gancho futuro para anonimizar texto antes del ranking; hoy es identidad. */
export function maybeAnonymizeForRanking(text: string): string {
  return text;
}

export class FsDocumentStorage implements DocumentStorage {
  constructor(private readonly root = docsRoot()) {}

  private abs(key: string) {
    if (key.includes("..") || key.startsWith("/")) {
      throw new Error("storage key inválida");
    }
    return join(this.root, key);
  }

  async put(key: string, data: Buffer, _contentType: string): Promise<void> {
    const path = this.abs(key);
    await mkdir(dirname(path), { recursive: true });
    await writeFile(path, data);
  }

  async get(key: string): Promise<Buffer> {
    return readFile(this.abs(key));
  }

  async delete(key: string): Promise<void> {
    try {
      await unlink(this.abs(key));
    } catch {
      // idempotente
    }
  }

  signedDownloadUrl(documentId: string, expiresInSeconds = 300): string {
    return signDocumentContentUrl(documentId, expiresInSeconds);
  }
}

let singleton: DocumentStorage | null = null;

export function getDocumentStorage(): DocumentStorage {
  if (!singleton) singleton = new FsDocumentStorage();
  return singleton;
}
