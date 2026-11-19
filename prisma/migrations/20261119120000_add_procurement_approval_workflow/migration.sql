ALTER TABLE "SystemSettings"
ADD COLUMN "purchaseWorkOrderApprovalConfig" JSONB;

CREATE TABLE "DocumentApprovalStep" (
    "id" TEXT NOT NULL,
    "documentType" TEXT NOT NULL,
    "documentId" TEXT NOT NULL,
    "stage" INTEGER NOT NULL,
    "threshold" DOUBLE PRECISION NOT NULL,
    "approverEmployeeId" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'PENDING',
    "approvedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "DocumentApprovalStep_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "DocumentApprovalStep_documentType_documentId_stage_approverEmployeeId_key"
ON "DocumentApprovalStep"("documentType", "documentId", "stage", "approverEmployeeId");

CREATE INDEX "DocumentApprovalStep_approverEmployeeId_status_idx"
ON "DocumentApprovalStep"("approverEmployeeId", "status");

CREATE INDEX "DocumentApprovalStep_documentType_documentId_stage_idx"
ON "DocumentApprovalStep"("documentType", "documentId", "stage");
