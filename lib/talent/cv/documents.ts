import { createId } from "@/lib/talent/cv/ids";
import { AuditAction } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { writeAudit } from "@/lib/audit";
import { validateCandidateDocument, DocumentValidationError } from "@/lib/talent/cv/file-validation";
import { buildStorageKey, getDocumentStorage } from "@/lib/talent/cv/storage";
import { enqueueDocument } from "@/lib/talent/cv/queue";

export { DocumentValidationError };

/** cuid-like id sin dependencia extra (prisma usa cuid en schema). */
function newId() {
  return createId();
}

export async function uploadApplicationDocument(input: {
  organizationId: string;
  applicationId: string;
  actorUserId: string;
  filename: string;
  buffer: Buffer;
}) {
  const application = await prisma.application.findFirst({
    where: { id: input.applicationId, organizationId: input.organizationId },
    select: { id: true, candidateId: true },
  });
  if (!application) {
    const err = new Error("Candidatura no encontrada");
    err.name = "NotFoundError";
    throw err;
  }

  const validated = await validateCandidateDocument(input.buffer, input.filename);

  const existingSameHash = await prisma.candidateDocument.findFirst({
    where: { organizationId: input.organizationId, sha256: validated.sha256 },
  });
  if (existingSameHash) {
    if (existingSameHash.applicationId === input.applicationId) {
      // Mismo hash en la misma candidatura: reactivar y reencolar sin duplicar bytes
      await prisma.$transaction(async (tx) => {
        await tx.candidateDocument.updateMany({
          where: {
            organizationId: input.organizationId,
            applicationId: input.applicationId,
            isCurrent: true,
            NOT: { id: existingSameHash.id },
          },
          data: { isCurrent: false },
        });
        await tx.candidateDocument.update({
          where: { id: existingSameHash.id },
          data: {
            isCurrent: true,
            processingStatus: "QUEUED",
            processingError: null,
          },
        });
      });
      try {
        await enqueueDocument(existingSameHash.id, input.organizationId, existingSameHash.version);
      } catch {
        // cola opcional en el proceso web
      }
      const refreshed = await prisma.candidateDocument.findUniqueOrThrow({ where: { id: existingSameHash.id } });
      return { document: refreshed, reused: true as const };
    }
    const err = new Error("Este archivo ya existe en otra candidatura de la organización");
    err.name = "DuplicateDocumentError";
    throw err;
  }

  const latest = await prisma.candidateDocument.findFirst({
    where: { organizationId: input.organizationId, applicationId: input.applicationId },
    orderBy: { version: "desc" },
    select: { version: true },
  });
  const version = (latest?.version ?? 0) + 1;
  const documentId = newId();
  const storageKey = buildStorageKey(input.organizationId, documentId);
  const storage = getDocumentStorage();

  await storage.put(storageKey, validated.buffer, validated.mimeType);

  const document = await prisma.$transaction(async (tx) => {
    await tx.candidateDocument.updateMany({
      where: {
        organizationId: input.organizationId,
        applicationId: input.applicationId,
        isCurrent: true,
      },
      data: { isCurrent: false },
    });

    const created = await tx.candidateDocument.create({
      data: {
        id: documentId,
        organizationId: input.organizationId,
        applicationId: input.applicationId,
        candidateId: application.candidateId,
        kind: "CV",
        version,
        isCurrent: true,
        originalFileName: validated.filename,
        mimeType: validated.mimeType,
        byteSize: validated.byteSize,
        sha256: validated.sha256,
        storageKey,
        processingStatus: "UPLOADED",
        uploadedById: input.actorUserId,
      },
    });

    await writeAudit(tx, {
      organizationId: input.organizationId,
      actorUserId: input.actorUserId,
      action: AuditAction.DOCUMENT_UPLOADED,
      entityType: "CandidateDocument",
      entityId: created.id,
    });

    return created;
  });

  try {
    await enqueueDocument(document.id, input.organizationId, document.version);
    await prisma.candidateDocument.update({
      where: { id: document.id },
      data: { processingStatus: "QUEUED" },
    });
  } catch {
    // Redis puede no estar disponible en web; el worker o reprocess lo recuperan
    await prisma.candidateDocument.update({
      where: { id: document.id },
      data: {
        processingStatus: "UPLOADED",
        processingError: "Cola no disponible; pendiente de encolar",
      },
    });
  }

  return { document, reused: false as const };
}

export async function softDeleteDocument(input: {
  organizationId: string;
  documentId: string;
  actorUserId: string;
  purgeStorage?: boolean;
}) {
  const doc = await prisma.candidateDocument.findFirst({
    where: { id: input.documentId, organizationId: input.organizationId },
  });
  if (!doc) {
    const err = new Error("Documento no encontrado");
    err.name = "NotFoundError";
    throw err;
  }

  await prisma.candidateDocument.update({
    where: { id: doc.id },
    data: { isCurrent: false },
  });

  if (input.purgeStorage) {
    await getDocumentStorage().delete(doc.storageKey);
  }

  await writeAudit(prisma, {
    organizationId: input.organizationId,
    actorUserId: input.actorUserId,
    action: AuditAction.DOCUMENT_DELETED,
    entityType: "CandidateDocument",
    entityId: doc.id,
  });

  return doc;
}

export async function reprocessDocument(input: {
  organizationId: string;
  documentId: string;
  actorUserId: string;
}) {
  const doc = await prisma.candidateDocument.findFirst({
    where: { id: input.documentId, organizationId: input.organizationId },
  });
  if (!doc) {
    const err = new Error("Documento no encontrado");
    err.name = "NotFoundError";
    throw err;
  }

  await prisma.candidateDocument.update({
    where: { id: doc.id },
    data: { processingStatus: "QUEUED", processingError: null },
  });

  await writeAudit(prisma, {
    organizationId: input.organizationId,
    actorUserId: input.actorUserId,
    action: AuditAction.CV_REPROCESSED,
    entityType: "CandidateDocument",
    entityId: doc.id,
  });

  await enqueueDocument(doc.id, input.organizationId, doc.version);
  return doc;
}
