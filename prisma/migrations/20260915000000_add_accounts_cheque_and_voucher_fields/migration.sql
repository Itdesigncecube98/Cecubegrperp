CREATE TABLE IF NOT EXISTS "AccountsChequeBook" (
  "id" SERIAL NOT NULL,
  "bank" TEXT NOT NULL,
  "seriesName" TEXT NOT NULL,
  "chequeNo" TEXT NOT NULL,
  "status" TEXT NOT NULL DEFAULT 'Issued',
  "statusDate" DATE NOT NULL,
  "voucherDate" DATE NOT NULL,
  "createdAt" TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "AccountsChequeBook_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "AccountsChequeBook_bank_seriesName_chequeNo_key"
  ON "AccountsChequeBook"("bank", "seriesName", "chequeNo");

ALTER TABLE "AccountsJournal"
  ADD COLUMN IF NOT EXISTS "billNo" TEXT,
  ADD COLUMN IF NOT EXISTS "billDate" TIMESTAMP,
  ADD COLUMN IF NOT EXISTS "dueDate" TIMESTAMP;
