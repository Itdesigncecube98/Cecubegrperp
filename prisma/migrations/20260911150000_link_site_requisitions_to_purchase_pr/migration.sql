ALTER TABLE "SiteMaterialRequisition" ADD COLUMN IF NOT EXISTS "purchaseIndentId" TEXT;
CREATE INDEX IF NOT EXISTS "SiteMaterialRequisition_purchaseIndentId_idx" ON "SiteMaterialRequisition"("purchaseIndentId");
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'SiteMaterialRequisition_purchaseIndentId_fkey') THEN
    ALTER TABLE "SiteMaterialRequisition"
      ADD CONSTRAINT "SiteMaterialRequisition_purchaseIndentId_fkey"
      FOREIGN KEY ("purchaseIndentId") REFERENCES "PurchaseIndent"("id") ON DELETE SET NULL ON UPDATE CASCADE;
  END IF;
END $$;
