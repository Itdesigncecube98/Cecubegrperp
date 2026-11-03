ALTER TABLE "TaskLibraryMaterial"
ADD COLUMN "subgroupIds" TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],
ADD COLUMN "components" JSONB;
