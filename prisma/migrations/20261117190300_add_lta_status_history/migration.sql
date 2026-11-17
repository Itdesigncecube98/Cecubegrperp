CREATE TABLE "LtaStatusHistory" (
    "id" TEXT NOT NULL,
    "ltaId" TEXT NOT NULL,
    "fromStatus" TEXT,
    "toStatus" TEXT NOT NULL,
    "actorName" TEXT,
    "changedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "note" TEXT,

    CONSTRAINT "LtaStatusHistory_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "LtaStatusHistory_ltaId_changedAt_idx"
ON "LtaStatusHistory"("ltaId", "changedAt");

ALTER TABLE "LtaStatusHistory"
ADD CONSTRAINT "LtaStatusHistory_ltaId_fkey"
FOREIGN KEY ("ltaId") REFERENCES "LeaveTravelAllowance"("id")
ON DELETE CASCADE ON UPDATE CASCADE;

INSERT INTO "LtaStatusHistory" (
    "id", "ltaId", "fromStatus", "toStatus", "changedAt", "note"
)
SELECT
    "id" || '-status-baseline',
    "id",
    NULL,
    "status",
    "updatedAt",
    'Baseline status when timeline tracking was enabled'
FROM "LeaveTravelAllowance";
