-- Backup script to preserve data before schema push
-- Run this manually if needed

-- Backup ImprestOpeningBalance if it exists
CREATE TABLE IF NOT EXISTS "ImprestOpeningBalance_backup" AS 
SELECT * FROM "ImprestOpeningBalance";

-- Backup projectsHeadId2 data from ImprestWorkflowConfig if column exists
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name='ImprestWorkflowConfig' AND column_name='projectsHeadId2'
  ) THEN
    CREATE TABLE IF NOT EXISTS "ImprestWorkflowConfig_projectsHeadId2_backup" AS
    SELECT id, "projectsHeadId2" FROM "ImprestWorkflowConfig" WHERE "projectsHeadId2" IS NOT NULL;
  END IF;
END $$;

-- Backup MarketingLead leadStatus before enum change
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name='MarketingLead' AND column_name='leadStatus'
  ) THEN
    CREATE TABLE IF NOT EXISTS "MarketingLead_leadStatus_backup" AS
    SELECT id, "leadStatus" FROM "MarketingLead";
  END IF;
END $$;
