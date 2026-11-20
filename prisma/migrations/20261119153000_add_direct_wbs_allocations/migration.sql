ALTER TABLE "ProjectWbsTask"
ADD COLUMN "directAllocatedAmount" DOUBLE PRECISION NOT NULL DEFAULT 0;

UPDATE "ProjectWbsTask"
SET "directAllocatedAmount" = "allocatedAmount"
WHERE "wbsGroupId" IS NOT NULL;
