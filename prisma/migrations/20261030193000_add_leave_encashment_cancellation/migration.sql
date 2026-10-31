ALTER TABLE "LeaveEncashment"
ADD COLUMN "cancelledAt" TIMESTAMP(3);

CREATE INDEX "LeaveEncashment_employeeId_asOnDate_cancelledAt_idx"
ON "LeaveEncashment"("employeeId", "asOnDate", "cancelledAt");
