CREATE TABLE IF NOT EXISTS "TdsSection" (
  "id" SERIAL PRIMARY KEY,
  "code" TEXT NOT NULL UNIQUE,
  "description" TEXT,
  "taxType" TEXT NOT NULL DEFAULT 'TDS'
);

CREATE TABLE IF NOT EXISTS "TdsAccount" (
  "id" SERIAL PRIMARY KEY,
  "name" TEXT NOT NULL,
  "taxType" TEXT NOT NULL DEFAULT 'TDS',
  "sectionId" INTEGER REFERENCES "TdsSection"("id"),
  "tdsLimit" DOUBLE PRECISION NOT NULL DEFAULT 0,
  "tdsPercent" DOUBLE PRECISION NOT NULL DEFAULT 0,
  "tdsSurcharge" DOUBLE PRECISION NOT NULL DEFAULT 0,
  "tdsCess" DOUBLE PRECISION NOT NULL DEFAULT 0,
  "tdsNet" DOUBLE PRECISION NOT NULL DEFAULT 0
);

CREATE TABLE IF NOT EXISTS "TdsDeduction" (
  "id" SERIAL PRIMARY KEY,
  "journalId" TEXT NOT NULL REFERENCES "AccountsJournal"("id"),
  "pan" TEXT,
  "accountName" TEXT NOT NULL,
  "billAmount" DOUBLE PRECISION NOT NULL,
  "tdsAmount" DOUBLE PRECISION NOT NULL,
  "interest" DOUBLE PRECISION NOT NULL DEFAULT 0,
  "deductionRemark" TEXT,
  "tdsAccountId" INTEGER NOT NULL REFERENCES "TdsAccount"("id"),
  "costCentre" TEXT,
  "deductionType" TEXT NOT NULL DEFAULT '26Q',
  "quarter" TEXT NOT NULL,
  "financialYear" TEXT NOT NULL,
  "paidAmount" DOUBLE PRECISION NOT NULL DEFAULT 0,
  "status" TEXT NOT NULL DEFAULT 'Pending',
  "createdAt" TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS "TdsChallan" (
  "id" SERIAL PRIMARY KEY,
  "journalId" TEXT NOT NULL REFERENCES "AccountsJournal"("id"),
  "tdsAccountId" INTEGER NOT NULL REFERENCES "TdsAccount"("id"),
  "bankId" TEXT REFERENCES "AccountsBankMaster"("id"),
  "chequeNo" TEXT,
  "chequeDate" TIMESTAMP,
  "costCentre" TEXT,
  "challanAmount" DOUBLE PRECISION NOT NULL,
  "financialYear" TEXT NOT NULL,
  "quarter" TEXT NOT NULL,
  "createdAt" TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS "TdsChallanDeduction" (
  "id" SERIAL PRIMARY KEY,
  "challanId" INTEGER NOT NULL REFERENCES "TdsChallan"("id") ON DELETE CASCADE,
  "deductionId" INTEGER NOT NULL REFERENCES "TdsDeduction"("id"),
  "amountApplied" DOUBLE PRECISION NOT NULL
);

CREATE TABLE IF NOT EXISTS "TdsAdjustment" (
  "id" SERIAL PRIMARY KEY,
  "accountId" TEXT NOT NULL REFERENCES "AccountsLedgerMaster"("id"),
  "bankId" TEXT REFERENCES "AccountsBankMaster"("id"),
  "taxType" TEXT NOT NULL DEFAULT 'TDS',
  "costCentre" TEXT,
  "totalAmount" DOUBLE PRECISION NOT NULL DEFAULT 0,
  "createdAt" TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS "TdsAdjustmentLine" (
  "id" SERIAL PRIMARY KEY,
  "adjustmentId" INTEGER NOT NULL REFERENCES "TdsAdjustment"("id") ON DELETE CASCADE,
  "side" TEXT NOT NULL,
  "refType" TEXT NOT NULL,
  "refId" INTEGER NOT NULL,
  "amount" DOUBLE PRECISION NOT NULL,
  "pendingAmount" DOUBLE PRECISION NOT NULL DEFAULT 0,
  "adjAmount" DOUBLE PRECISION NOT NULL DEFAULT 0
);
