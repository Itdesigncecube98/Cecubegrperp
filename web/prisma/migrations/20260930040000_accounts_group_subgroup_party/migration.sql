ALTER TABLE "AccountsAccountGroup"
ADD COLUMN IF NOT EXISTS "parentId" TEXT;

ALTER TABLE "AccountsAccountGroup"
ADD CONSTRAINT "AccountsAccountGroup_parentId_fkey"
FOREIGN KEY ("parentId") REFERENCES "AccountsAccountGroup"("id")
ON DELETE SET NULL ON UPDATE CASCADE;

CREATE INDEX IF NOT EXISTS "AccountsAccountGroup_parentId_idx"
ON "AccountsAccountGroup"("parentId");

ALTER TABLE "AccountsLedgerMaster"
ADD COLUMN IF NOT EXISTS "contactPerson" TEXT,
ADD COLUMN IF NOT EXISTS "address" TEXT,
ADD COLUMN IF NOT EXISTS "mobile" TEXT,
ADD COLUMN IF NOT EXISTS "email" TEXT;
