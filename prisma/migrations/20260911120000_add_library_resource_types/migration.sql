ALTER TABLE "UnitLibrary" DROP CONSTRAINT IF EXISTS "UnitLibrary_name_key";
ALTER TABLE "UnitLibrary" ADD COLUMN IF NOT EXISTS "libraryId" TEXT;
ALTER TABLE "MaterialLibraryGroup" ADD COLUMN IF NOT EXISTS "resourceType" TEXT NOT NULL DEFAULT 'Material';
ALTER TABLE "MaterialLibraryItem" ADD COLUMN IF NOT EXISTS "resourceType" TEXT NOT NULL DEFAULT 'Material';

CREATE INDEX IF NOT EXISTS "UnitLibrary_libraryId_idx" ON "UnitLibrary"("libraryId");
CREATE UNIQUE INDEX IF NOT EXISTS "UnitLibrary_libraryId_name_key" ON "UnitLibrary"("libraryId", "name");
CREATE INDEX IF NOT EXISTS "MaterialLibraryGroup_resourceType_idx" ON "MaterialLibraryGroup"("resourceType");
CREATE INDEX IF NOT EXISTS "MaterialLibraryItem_resourceType_idx" ON "MaterialLibraryItem"("resourceType");

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'UnitLibrary_libraryId_fkey'
  ) THEN
    ALTER TABLE "UnitLibrary"
      ADD CONSTRAINT "UnitLibrary_libraryId_fkey"
      FOREIGN KEY ("libraryId") REFERENCES "Library"("id") ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
END $$;
