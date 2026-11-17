CREATE TABLE "WorkOrderStatusHistory" (
    "id" TEXT NOT NULL,
    "workOrderId" TEXT NOT NULL,
    "fromStatus" TEXT,
    "toStatus" TEXT NOT NULL,
    "changedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "actorName" TEXT,
    "note" TEXT,
    CONSTRAINT "WorkOrderStatusHistory_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "WorkOrderStatusHistory_workOrderId_changedAt_idx" ON "WorkOrderStatusHistory"("workOrderId", "changedAt");
ALTER TABLE "WorkOrderStatusHistory" ADD CONSTRAINT "WorkOrderStatusHistory_workOrderId_fkey" FOREIGN KEY ("workOrderId") REFERENCES "WorkOrder"("id") ON DELETE CASCADE ON UPDATE CASCADE;
INSERT INTO "WorkOrderStatusHistory" ("id", "workOrderId", "fromStatus", "toStatus", "changedAt", "actorName", "note")
SELECT 'wo-created-' || wo."id", wo."id", NULL, 'Draft', wo."createdAt", 'System', 'Work order created (history tracking started)' FROM "WorkOrder" wo;
INSERT INTO "WorkOrderStatusHistory" ("id", "workOrderId", "fromStatus", "toStatus", "changedAt", "actorName", "note")
SELECT 'wo-current-' || wo."id", wo."id", 'Draft', wo."status", wo."updatedAt", 'System', 'Current status when history tracking started' FROM "WorkOrder" wo WHERE wo."status" <> 'Draft';