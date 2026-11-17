ALTER TABLE "Contractor"
  ADD COLUMN "faxNo" TEXT,
  ADD COLUMN "website" TEXT,
  ADD COLUMN "documents" TEXT;

ALTER TABLE "VendorMaster"
  ADD COLUMN "faxNo" TEXT,
  ADD COLUMN "website" TEXT;
