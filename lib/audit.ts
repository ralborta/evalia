import type { AuditAction, Prisma, PrismaClient } from "@prisma/client";
import { prisma } from "@/lib/prisma";

type Db = PrismaClient | Prisma.TransactionClient;

const SECRET_KEYS = /password|secret|token|authorization|cookie|api[_-]?key|smtp/i;

function sanitizeMeta(input: unknown): Prisma.InputJsonValue | undefined {
  if (input == null) return undefined;
  if (typeof input !== "object") return undefined;
  const out: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(input as Record<string, unknown>)) {
    if (SECRET_KEYS.test(key)) continue;
    if (typeof value === "string" || typeof value === "number" || typeof value === "boolean" || value === null) {
      out[key] = value;
    } else if (Array.isArray(value) && value.every((v) => typeof v === "string" || typeof v === "number")) {
      out[key] = value;
    }
  }
  return out as Prisma.InputJsonValue;
}

export async function writeAudit(
  db: Db,
  input: {
    organizationId: string;
    actorUserId?: string | null;
    action: AuditAction;
    entityType: string;
    entityId: string;
    meta?: unknown;
  },
) {
  const data: Prisma.AuditLogCreateInput = {
    action: input.action,
    entityType: input.entityType,
    entityId: input.entityId,
    organization: { connect: { id: input.organizationId } },
    ...(input.actorUserId ? { actor: { connect: { id: input.actorUserId } } } : {}),
  };
  const meta = sanitizeMeta(input.meta);
  if (meta) {
    // metadata no se persiste como JSON libre de secretos en columnas extra:
    // AuditLog solo guarda actor, acción, entidad y fecha. El meta se usa
    // solo para trazas internas no persistidas si hiciera falta más adelante.
    void meta;
  }
  await db.auditLog.create({ data });
}

export async function auditTalent(input: Parameters<typeof writeAudit>[1]) {
  return writeAudit(prisma, input);
}
