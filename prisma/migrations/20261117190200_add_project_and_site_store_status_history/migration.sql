CREATE TABLE "SiteStoreIssueStatusHistory" (
    "id" TEXT NOT NULL,
    "issueId" TEXT NOT NULL,
    "fromStatus" TEXT,
    "toStatus" TEXT NOT NULL,
    "actorName" TEXT,
    "changedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "note" TEXT,

    CONSTRAINT "SiteStoreIssueStatusHistory_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "SiteStoreIssueStatusHistory_issueId_changedAt_idx"
ON "SiteStoreIssueStatusHistory"("issueId", "changedAt");

ALTER TABLE "SiteStoreIssueStatusHistory"
ADD CONSTRAINT "SiteStoreIssueStatusHistory_issueId_fkey"
FOREIGN KEY ("issueId") REFERENCES "SiteStoreIssue"("id")
ON DELETE CASCADE ON UPDATE CASCADE;

-- Existing issues only have their current status, so seed that as a timeline baseline.
INSERT INTO "SiteStoreIssueStatusHistory" (
    "id", "issueId", "fromStatus", "toStatus", "actorName", "changedAt", "note"
)
SELECT
    "id" || '-status-baseline',
    "id",
    NULL,
    "status",
    "issuedBy",
    "updatedAt",
    'Baseline status when timeline tracking was enabled'
FROM "SiteStoreIssue";

CREATE TABLE "ProjectStatusHistory" (
    "id" TEXT NOT NULL,
    "projectId" TEXT NOT NULL,
    "fromStatus" TEXT,
    "toStatus" TEXT NOT NULL,
    "actorName" TEXT,
    "changedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "note" TEXT,

    CONSTRAINT "ProjectStatusHistory_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "ProjectStatusHistory_projectId_changedAt_idx"
ON "ProjectStatusHistory"("projectId", "changedAt");

ALTER TABLE "ProjectStatusHistory"
ADD CONSTRAINT "ProjectStatusHistory_projectId_fkey"
FOREIGN KEY ("projectId") REFERENCES "Project"("id")
ON DELETE CASCADE ON UPDATE CASCADE;

-- Existing projects only have their current status, so seed that as a timeline baseline.
INSERT INTO "ProjectStatusHistory" (
    "id", "projectId", "fromStatus", "toStatus", "changedAt", "note"
)
SELECT
    "id" || '-status-baseline',
    "id",
    NULL,
    COALESCE("status", 'Planning'),
    "updatedAt",
    'Baseline status when timeline tracking was enabled'
FROM "Project";
