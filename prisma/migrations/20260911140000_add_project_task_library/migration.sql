ALTER TABLE "TaskLibraryItem" ADD COLUMN IF NOT EXISTS "projectId" TEXT;
CREATE INDEX IF NOT EXISTS "TaskLibraryItem_projectId_idx" ON "TaskLibraryItem"("projectId");
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'TaskLibraryItem_projectId_fkey') THEN
    ALTER TABLE "TaskLibraryItem"
      ADD CONSTRAINT "TaskLibraryItem_projectId_fkey"
      FOREIGN KEY ("projectId") REFERENCES "ProjectMaster"("id") ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
END $$;