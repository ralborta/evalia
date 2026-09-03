-- EvalIA Talent Fase 2 (CV) — aditivo, sin DROP TABLE ni reset.
-- Requiere backup verificado. No ejecutar con --accept-data-loss.
-- Sin BEGIN/COMMIT global: ADD VALUE de enums no debe ir en una sola txn antigua.

DO $$ BEGIN
  CREATE TYPE "DocumentKind" AS ENUM ('CV');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE "DocumentProcessingStatus" AS ENUM (
    'UPLOADED', 'QUEUED', 'EXTRACTING', 'ANALYZING', 'COMPLETED', 'FAILED', 'NEEDS_OCR'
  );
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE "CriterionMatchStatus" AS ENUM (
    'MEETS', 'DOES_NOT_MEET', 'NOT_FOUND', 'NEEDS_VALIDATION'
  );
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE "ExcludingOutcome" AS ENUM ('PASS', 'FAIL', 'UNKNOWN');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN ALTER TYPE "AuditAction" ADD VALUE IF NOT EXISTS 'DOCUMENT_UPLOADED'; EXCEPTION WHEN others THEN NULL; END $$;
DO $$ BEGIN ALTER TYPE "AuditAction" ADD VALUE IF NOT EXISTS 'DOCUMENT_ACCESSED'; EXCEPTION WHEN others THEN NULL; END $$;
DO $$ BEGIN ALTER TYPE "AuditAction" ADD VALUE IF NOT EXISTS 'DOCUMENT_DELETED'; EXCEPTION WHEN others THEN NULL; END $$;
DO $$ BEGIN ALTER TYPE "AuditAction" ADD VALUE IF NOT EXISTS 'CV_ANALYSIS_STARTED'; EXCEPTION WHEN others THEN NULL; END $$;
DO $$ BEGIN ALTER TYPE "AuditAction" ADD VALUE IF NOT EXISTS 'CV_ANALYSIS_COMPLETED'; EXCEPTION WHEN others THEN NULL; END $$;
DO $$ BEGIN ALTER TYPE "AuditAction" ADD VALUE IF NOT EXISTS 'CV_ANALYSIS_FAILED'; EXCEPTION WHEN others THEN NULL; END $$;
DO $$ BEGIN ALTER TYPE "AuditAction" ADD VALUE IF NOT EXISTS 'CV_REPROCESSED'; EXCEPTION WHEN others THEN NULL; END $$;

CREATE TABLE IF NOT EXISTS "CandidateDocument" (
  "id" TEXT NOT NULL,
  "organizationId" TEXT NOT NULL,
  "applicationId" TEXT NOT NULL,
  "candidateId" TEXT NOT NULL,
  "kind" "DocumentKind" NOT NULL DEFAULT 'CV',
  "version" INTEGER NOT NULL,
  "isCurrent" BOOLEAN NOT NULL DEFAULT true,
  "originalFileName" TEXT NOT NULL,
  "mimeType" TEXT NOT NULL,
  "byteSize" INTEGER NOT NULL,
  "sha256" TEXT NOT NULL,
  "storageKey" TEXT NOT NULL,
  "processingStatus" "DocumentProcessingStatus" NOT NULL DEFAULT 'UPLOADED',
  "processingError" TEXT,
  "uploadedById" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "CandidateDocument_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "CandidateDocument_organizationId_sha256_key"
  ON "CandidateDocument"("organizationId", "sha256");
CREATE INDEX IF NOT EXISTS "CandidateDocument_organizationId_applicationId_isCurrent_idx"
  ON "CandidateDocument"("organizationId", "applicationId", "isCurrent");
CREATE INDEX IF NOT EXISTS "CandidateDocument_organizationId_candidateId_idx"
  ON "CandidateDocument"("organizationId", "candidateId");
CREATE INDEX IF NOT EXISTS "CandidateDocument_applicationId_version_idx"
  ON "CandidateDocument"("applicationId", "version");

CREATE TABLE IF NOT EXISTS "DocumentExtraction" (
  "id" TEXT NOT NULL,
  "organizationId" TEXT NOT NULL,
  "documentId" TEXT NOT NULL,
  "rawText" TEXT,
  "charCount" INTEGER NOT NULL DEFAULT 0,
  "pageCount" INTEGER,
  "extractor" TEXT NOT NULL,
  "needsOcr" BOOLEAN NOT NULL DEFAULT false,
  "ocrProvider" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "DocumentExtraction_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX IF NOT EXISTS "DocumentExtraction_documentId_key" ON "DocumentExtraction"("documentId");
CREATE INDEX IF NOT EXISTS "DocumentExtraction_organizationId_idx" ON "DocumentExtraction"("organizationId");

CREATE TABLE IF NOT EXISTS "CvStructuredProfile" (
  "id" TEXT NOT NULL,
  "organizationId" TEXT NOT NULL,
  "documentId" TEXT NOT NULL,
  "version" INTEGER NOT NULL,
  "profileJson" JSONB NOT NULL,
  "parserVersion" TEXT NOT NULL,
  "model" TEXT,
  "promptVersion" TEXT NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "CvStructuredProfile_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX IF NOT EXISTS "CvStructuredProfile_documentId_version_key"
  ON "CvStructuredProfile"("documentId", "version");
CREATE INDEX IF NOT EXISTS "CvStructuredProfile_organizationId_documentId_idx"
  ON "CvStructuredProfile"("organizationId", "documentId");

CREATE TABLE IF NOT EXISTS "CvEvaluation" (
  "id" TEXT NOT NULL,
  "organizationId" TEXT NOT NULL,
  "applicationId" TEXT NOT NULL,
  "jobId" TEXT NOT NULL,
  "documentId" TEXT NOT NULL,
  "scorecardId" TEXT NOT NULL,
  "version" INTEGER NOT NULL,
  "isCurrent" BOOLEAN NOT NULL DEFAULT true,
  "status" "DocumentProcessingStatus" NOT NULL DEFAULT 'QUEUED',
  "overallScore" DOUBLE PRECISION,
  "excludingOutcome" "ExcludingOutcome" NOT NULL DEFAULT 'UNKNOWN',
  "rankingExplanation" TEXT,
  "model" TEXT,
  "promptVersion" TEXT NOT NULL,
  "scorecardVersion" INTEGER NOT NULL,
  "errorMessage" TEXT,
  "createdById" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "CvEvaluation_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX IF NOT EXISTS "CvEvaluation_applicationId_version_key"
  ON "CvEvaluation"("applicationId", "version");
CREATE INDEX IF NOT EXISTS "CvEvaluation_organizationId_jobId_overallScore_idx"
  ON "CvEvaluation"("organizationId", "jobId", "overallScore");
CREATE INDEX IF NOT EXISTS "CvEvaluation_organizationId_applicationId_isCurrent_idx"
  ON "CvEvaluation"("organizationId", "applicationId", "isCurrent");

CREATE TABLE IF NOT EXISTS "CvCriterionResult" (
  "id" TEXT NOT NULL,
  "evaluationId" TEXT NOT NULL,
  "criterionKey" TEXT NOT NULL,
  "criterionLabel" TEXT NOT NULL,
  "criterionType" "CriterionType" NOT NULL,
  "weight" INTEGER NOT NULL,
  "status" "CriterionMatchStatus" NOT NULL,
  "partialScore" DOUBLE PRECISION NOT NULL,
  "confidence" DOUBLE PRECISION NOT NULL,
  "evidence" TEXT NOT NULL,
  "explanation" TEXT NOT NULL,
  CONSTRAINT "CvCriterionResult_pkey" PRIMARY KEY ("id")
);
CREATE INDEX IF NOT EXISTS "CvCriterionResult_evaluationId_idx" ON "CvCriterionResult"("evaluationId");

CREATE TABLE IF NOT EXISTS "CvSuggestedQuestion" (
  "id" TEXT NOT NULL,
  "evaluationId" TEXT NOT NULL,
  "criterionKey" TEXT,
  "question" TEXT NOT NULL,
  "reason" TEXT,
  "sortOrder" INTEGER NOT NULL DEFAULT 0,
  CONSTRAINT "CvSuggestedQuestion_pkey" PRIMARY KEY ("id")
);
CREATE INDEX IF NOT EXISTS "CvSuggestedQuestion_evaluationId_sortOrder_idx"
  ON "CvSuggestedQuestion"("evaluationId", "sortOrder");
