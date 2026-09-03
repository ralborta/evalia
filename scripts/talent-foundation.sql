-- EvalIA Talent foundation — aditivo, sin DROP TABLE ni reset.
-- Requiere backup verificado. No ejecutar con --accept-data-loss.

BEGIN;

CREATE TYPE "OrgMemberRole" AS ENUM ('OWNER', 'ADMIN', 'RECRUITER', 'VIEWER');
CREATE TYPE "JobStatus" AS ENUM ('DRAFT', 'OPEN', 'PAUSED', 'CLOSED', 'ARCHIVED');
CREATE TYPE "ScorecardStatus" AS ENUM ('DRAFT', 'PUBLISHED', 'ARCHIVED');
CREATE TYPE "CriterionType" AS ENUM ('SCORED', 'EXCLUDING');
CREATE TYPE "ApplicationSource" AS ENUM ('MANUAL');
CREATE TYPE "AuditAction" AS ENUM (
  'JOB_CREATED',
  'JOB_UPDATED',
  'SCORECARD_CREATED',
  'SCORECARD_UPDATED',
  'SCORECARD_PUBLISHED',
  'APPLICATION_CREATED',
  'APPLICATION_STAGE_MOVED'
);

CREATE TABLE "Organization" (
  "id" TEXT NOT NULL,
  "name" TEXT NOT NULL,
  "slug" TEXT NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "Organization_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "Organization_slug_key" ON "Organization"("slug");

INSERT INTO "Organization" ("id", "name", "slug", "createdAt", "updatedAt")
VALUES ('org_evalia_inicial', 'EvalIA', 'evalia', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP);

ALTER TABLE "Candidate" ADD COLUMN "organizationId" TEXT;
ALTER TABLE "JobPosition" ADD COLUMN "organizationId" TEXT;
ALTER TABLE "EvaluationProfile" ADD COLUMN "organizationId" TEXT;
ALTER TABLE "Interview" ADD COLUMN "organizationId" TEXT;

UPDATE "Candidate" SET "organizationId" = 'org_evalia_inicial' WHERE "organizationId" IS NULL;
UPDATE "JobPosition" SET "organizationId" = 'org_evalia_inicial' WHERE "organizationId" IS NULL;
UPDATE "EvaluationProfile" SET "organizationId" = 'org_evalia_inicial' WHERE "organizationId" IS NULL;
UPDATE "Interview" SET "organizationId" = 'org_evalia_inicial' WHERE "organizationId" IS NULL;

ALTER TABLE "Candidate" ALTER COLUMN "organizationId" SET NOT NULL;
ALTER TABLE "JobPosition" ALTER COLUMN "organizationId" SET NOT NULL;
ALTER TABLE "EvaluationProfile" ALTER COLUMN "organizationId" SET NOT NULL;
ALTER TABLE "Interview" ALTER COLUMN "organizationId" SET NOT NULL;

DROP INDEX IF EXISTS "EvaluationProfile_key_key";

CREATE TABLE "OrganizationMember" (
  "id" TEXT NOT NULL,
  "organizationId" TEXT NOT NULL,
  "userId" TEXT NOT NULL,
  "role" "OrgMemberRole" NOT NULL DEFAULT 'RECRUITER',
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "OrganizationMember_pkey" PRIMARY KEY ("id")
);

INSERT INTO "OrganizationMember" ("id", "organizationId", "userId", "role", "createdAt", "updatedAt")
SELECT
  md5(random()::text || u.id),
  'org_evalia_inicial',
  u.id,
  CASE
    WHEN u.role = 'ADMIN' THEN 'OWNER'::"OrgMemberRole"
    WHEN u.role = 'AGENT' THEN 'VIEWER'::"OrgMemberRole"
    ELSE 'RECRUITER'::"OrgMemberRole"
  END,
  CURRENT_TIMESTAMP,
  CURRENT_TIMESTAMP
FROM "User" u;

CREATE TABLE "Job" (
  "id" TEXT NOT NULL,
  "organizationId" TEXT NOT NULL,
  "title" TEXT NOT NULL,
  "description" TEXT,
  "status" "JobStatus" NOT NULL DEFAULT 'DRAFT',
  "location" TEXT,
  "publishedScorecardId" TEXT,
  "createdById" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "Job_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "Scorecard" (
  "id" TEXT NOT NULL,
  "organizationId" TEXT NOT NULL,
  "jobId" TEXT NOT NULL,
  "familyId" TEXT NOT NULL,
  "version" INTEGER NOT NULL DEFAULT 1,
  "status" "ScorecardStatus" NOT NULL DEFAULT 'DRAFT',
  "name" TEXT NOT NULL,
  "sourcePrompt" TEXT,
  "createdById" TEXT,
  "publishedAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "Scorecard_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "ScorecardCriterion" (
  "id" TEXT NOT NULL,
  "scorecardId" TEXT NOT NULL,
  "key" TEXT NOT NULL,
  "label" TEXT NOT NULL,
  "description" TEXT NOT NULL,
  "weight" INTEGER NOT NULL DEFAULT 0,
  "type" "CriterionType" NOT NULL DEFAULT 'SCORED',
  "required" BOOLEAN NOT NULL DEFAULT true,
  "evidenceRequired" BOOLEAN NOT NULL DEFAULT false,
  "scoringRule" TEXT NOT NULL,
  "sortOrder" INTEGER NOT NULL DEFAULT 0,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "ScorecardCriterion_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "PipelineStage" (
  "id" TEXT NOT NULL,
  "organizationId" TEXT NOT NULL,
  "jobId" TEXT NOT NULL,
  "key" TEXT NOT NULL,
  "name" TEXT NOT NULL,
  "sortOrder" INTEGER NOT NULL,
  "isTerminal" BOOLEAN NOT NULL DEFAULT false,
  "isRejected" BOOLEAN NOT NULL DEFAULT false,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "PipelineStage_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "Application" (
  "id" TEXT NOT NULL,
  "organizationId" TEXT NOT NULL,
  "jobId" TEXT NOT NULL,
  "candidateId" TEXT NOT NULL,
  "stageId" TEXT NOT NULL,
  "scorecardId" TEXT,
  "source" "ApplicationSource" NOT NULL DEFAULT 'MANUAL',
  "notes" TEXT,
  "createdById" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "Application_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "ApplicationStageHistory" (
  "id" TEXT NOT NULL,
  "applicationId" TEXT NOT NULL,
  "fromStageId" TEXT,
  "toStageId" TEXT NOT NULL,
  "actorUserId" TEXT,
  "note" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "ApplicationStageHistory_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "AuditLog" (
  "id" TEXT NOT NULL,
  "organizationId" TEXT NOT NULL,
  "actorUserId" TEXT,
  "action" "AuditAction" NOT NULL,
  "entityType" TEXT NOT NULL,
  "entityId" TEXT NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "AuditLog_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "OrganizationMember_userId_idx" ON "OrganizationMember"("userId");
CREATE UNIQUE INDEX "OrganizationMember_organizationId_userId_key" ON "OrganizationMember"("organizationId", "userId");
CREATE INDEX "Job_organizationId_status_idx" ON "Job"("organizationId", "status");
CREATE INDEX "Job_organizationId_createdAt_idx" ON "Job"("organizationId", "createdAt");
CREATE INDEX "Scorecard_organizationId_familyId_idx" ON "Scorecard"("organizationId", "familyId");
CREATE INDEX "Scorecard_organizationId_status_idx" ON "Scorecard"("organizationId", "status");
CREATE UNIQUE INDEX "Scorecard_jobId_version_key" ON "Scorecard"("jobId", "version");
CREATE INDEX "ScorecardCriterion_scorecardId_sortOrder_idx" ON "ScorecardCriterion"("scorecardId", "sortOrder");
CREATE INDEX "PipelineStage_organizationId_jobId_sortOrder_idx" ON "PipelineStage"("organizationId", "jobId", "sortOrder");
CREATE UNIQUE INDEX "PipelineStage_jobId_key_key" ON "PipelineStage"("jobId", "key");
CREATE INDEX "Application_organizationId_jobId_stageId_idx" ON "Application"("organizationId", "jobId", "stageId");
CREATE INDEX "Application_organizationId_candidateId_idx" ON "Application"("organizationId", "candidateId");
CREATE UNIQUE INDEX "Application_jobId_candidateId_key" ON "Application"("jobId", "candidateId");
CREATE INDEX "ApplicationStageHistory_applicationId_createdAt_idx" ON "ApplicationStageHistory"("applicationId", "createdAt");
CREATE INDEX "AuditLog_organizationId_createdAt_idx" ON "AuditLog"("organizationId", "createdAt");
CREATE INDEX "AuditLog_entityType_entityId_idx" ON "AuditLog"("entityType", "entityId");
CREATE INDEX "Candidate_organizationId_idx" ON "Candidate"("organizationId");
CREATE INDEX "Candidate_organizationId_email_idx" ON "Candidate"("organizationId", "email");
CREATE INDEX "JobPosition_organizationId_idx" ON "JobPosition"("organizationId");
CREATE INDEX "EvaluationProfile_organizationId_idx" ON "EvaluationProfile"("organizationId");
CREATE UNIQUE INDEX "EvaluationProfile_organizationId_key_key" ON "EvaluationProfile"("organizationId", "key");
CREATE INDEX "Interview_organizationId_idx" ON "Interview"("organizationId");

ALTER TABLE "OrganizationMember" ADD CONSTRAINT "OrganizationMember_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "OrganizationMember" ADD CONSTRAINT "OrganizationMember_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "Candidate" ADD CONSTRAINT "Candidate_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "JobPosition" ADD CONSTRAINT "JobPosition_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "EvaluationProfile" ADD CONSTRAINT "EvaluationProfile_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "Interview" ADD CONSTRAINT "Interview_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "Job" ADD CONSTRAINT "Job_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "Job" ADD CONSTRAINT "Job_publishedScorecardId_fkey" FOREIGN KEY ("publishedScorecardId") REFERENCES "Scorecard"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "Job" ADD CONSTRAINT "Job_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "Scorecard" ADD CONSTRAINT "Scorecard_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "Scorecard" ADD CONSTRAINT "Scorecard_jobId_fkey" FOREIGN KEY ("jobId") REFERENCES "Job"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "Scorecard" ADD CONSTRAINT "Scorecard_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "ScorecardCriterion" ADD CONSTRAINT "ScorecardCriterion_scorecardId_fkey" FOREIGN KEY ("scorecardId") REFERENCES "Scorecard"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "PipelineStage" ADD CONSTRAINT "PipelineStage_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "PipelineStage" ADD CONSTRAINT "PipelineStage_jobId_fkey" FOREIGN KEY ("jobId") REFERENCES "Job"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "Application" ADD CONSTRAINT "Application_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "Application" ADD CONSTRAINT "Application_jobId_fkey" FOREIGN KEY ("jobId") REFERENCES "Job"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "Application" ADD CONSTRAINT "Application_candidateId_fkey" FOREIGN KEY ("candidateId") REFERENCES "Candidate"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "Application" ADD CONSTRAINT "Application_stageId_fkey" FOREIGN KEY ("stageId") REFERENCES "PipelineStage"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "Application" ADD CONSTRAINT "Application_scorecardId_fkey" FOREIGN KEY ("scorecardId") REFERENCES "Scorecard"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "Application" ADD CONSTRAINT "Application_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "ApplicationStageHistory" ADD CONSTRAINT "ApplicationStageHistory_applicationId_fkey" FOREIGN KEY ("applicationId") REFERENCES "Application"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "ApplicationStageHistory" ADD CONSTRAINT "ApplicationStageHistory_fromStageId_fkey" FOREIGN KEY ("fromStageId") REFERENCES "PipelineStage"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "ApplicationStageHistory" ADD CONSTRAINT "ApplicationStageHistory_toStageId_fkey" FOREIGN KEY ("toStageId") REFERENCES "PipelineStage"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "ApplicationStageHistory" ADD CONSTRAINT "ApplicationStageHistory_actorUserId_fkey" FOREIGN KEY ("actorUserId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "AuditLog" ADD CONSTRAINT "AuditLog_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "AuditLog" ADD CONSTRAINT "AuditLog_actorUserId_fkey" FOREIGN KEY ("actorUserId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

COMMIT;
