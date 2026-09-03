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

function redisBlobKey(storageKey: string) {
  return `cvdoc:blob:${storageKey}`;
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

/**
 * Almacenamiento privado en disco + espejo en Redis.
 * Redis cubre el caso EasyPanel donde volúmenes con el mismo nombre no se
 * comparten entre evalia-web y evalia-worker. El FS sigue siendo la fuente
 * canónica local; Redis permite al worker recuperar el blob sin PII en logs.
 */
export class FsDocumentStorage implements DocumentStorage {
  constructor(private readonly root = docsRoot()) {}

  private abs(key: string) {
    if (key.includes("..") || key.startsWith("/")) {
      throw new Error("storage key inválida");
    }
    return join(this.root, key);
  }

  private async redis() {
    if (!process.env.REDIS_URL) return null;
    const { getRedisConnection } = await import("@/lib/talent/cv/queue");
    return getRedisConnection();
  }

  async put(key: string, data: Buffer, _contentType: string): Promise<void> {
    const path = this.abs(key);
    await mkdir(dirname(path), { recursive: true });
    await writeFile(path, data);
    try {
      const redis = await this.redis();
      if (redis) {
        // Sin TTL: el worker debe poder reprocesar; delete() limpia.
        await redis.set(redisBlobKey(key), data);
      }
    } catch {
      // El put en disco ya es suficiente si web y worker comparten FS.
    }
  }

  async get(key: string): Promise<Buffer> {
    try {
      return await readFile(this.abs(key));
    } catch {
      const redis = await this.redis();
      if (!redis) throw new Error("documento no encontrado en almacenamiento");
      const raw = await redis.getBuffer(redisBlobKey(key));
      if (!raw || raw.length === 0) {
        throw new Error("documento no encontrado en almacenamiento");
      }
      // Hidratar FS local del worker para lecturas siguientes / OCR.
      try {
        const path = this.abs(key);
        await mkdir(dirname(path), { recursive: true });
        await writeFile(path, raw);
      } catch {
        // no bloquear si el FS local no es escribible
      }
      return raw;
    }
  }

  async delete(key: string): Promise<void> {
    try {
      await unlink(this.abs(key));
    } catch {
      // idempotente
    }
    try {
      const redis = await this.redis();
      if (redis) await redis.del(redisBlobKey(key));
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
