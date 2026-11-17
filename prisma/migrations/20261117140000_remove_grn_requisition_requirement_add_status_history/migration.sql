ALTER TABLE "SiteGRNItem"
  ALTER COLUMN "requisitionId" DROP NOT NULL;

CREATE TABLE "SiteGRNStatusHistory" (
  "id" TEXT NOT NULL,
  "grnId" TEXT NOT NULL,
  "fromStatus" TEXT,
  "toStatus" TEXT NOT NULL,
  "changedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "note" TEXT,
  CONSTRAINT "SiteGRNStatusHistory_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "SiteGRNStatusHistory_grnId_changedAt_idx"
  ON "SiteGRNStatusHistory"("grnId", "changedAt");

ALTER TABLE "SiteGRNStatusHistory"
  ADD CONSTRAINT "SiteGRNStatusHistory_grnId_fkey"
  FOREIGN KEY ("grnId") REFERENCES "SiteGRN"("id") ON DELETE CASCADE ON UPDATE CASCADE;

INSERT INTO "SiteGRNStatusHistory" ("id", "grnId", "fromStatus", "toStatus", "changedAt", "note")
SELECT CONCAT('grn-status-', grn."id"), grn."id", NULL, COALESCE(grn."status", 'Draft'), grn."updatedAt", 'Status history tracking started'
FROM "SiteGRN" grn;