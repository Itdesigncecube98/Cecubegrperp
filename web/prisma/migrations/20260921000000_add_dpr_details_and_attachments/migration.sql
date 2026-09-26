ALTER TABLE "SiteDPR"
  ADD COLUMN "shift" TEXT NOT NULL DEFAULT 'Day',
  ADD COLUMN "workDescription" TEXT,
  ADD COLUMN "activitiesExecuted" TEXT,
  ADD COLUMN "skilledLabour" INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN "unskilledLabour" INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN "totalLabour" INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN "equipmentUsed" TEXT,
  ADD COLUMN "materialConsumed" TEXT,
  ADD COLUMN "safetyIncidents" TEXT,
  ADD COLUMN "preparedByName" TEXT,
  ADD COLUMN "attachments" JSONB NOT NULL DEFAULT '[]';
