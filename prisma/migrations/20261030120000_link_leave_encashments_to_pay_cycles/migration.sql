ALTER TABLE "LeaveEncashment"
ADD COLUMN "payCycleId" TEXT;

CREATE INDEX "LeaveEncashment_payCycleId_idx"
ON "LeaveEncashment"("payCycleId");

CREATE INDEX "LeaveEncashment_employeeId_asOnDate_isProcessed_idx"
ON "LeaveEncashment"("employeeId", "asOnDate", "isProcessed");

ALTER TABLE "LeaveEncashment"
ADD CONSTRAINT "LeaveEncashment_payCycleId_fkey"
FOREIGN KEY ("payCycleId") REFERENCES "PayCycle"("id")
ON DELETE SET NULL ON UPDATE CASCADE;
