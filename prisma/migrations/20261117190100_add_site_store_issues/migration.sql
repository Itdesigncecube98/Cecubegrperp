CREATE TABLE "SiteStoreIssue" (
    "id" TEXT NOT NULL,
    "issueNo" TEXT NOT NULL,
    "projectId" TEXT NOT NULL,
    "issueDate" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "status" TEXT NOT NULL DEFAULT 'Issued',
    "vehicleNo" TEXT,
    "workOrderNo" TEXT,
    "purchaseOrderNo" TEXT,
    "purchaseBillNo" TEXT,
    "ewayBillNo" TEXT,
    "challanNo" TEXT,
    "remarks" TEXT,
    "issuedBy" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "SiteStoreIssue_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "SiteStoreIssueItem" (
    "id" TEXT NOT NULL,
    "issueId" TEXT NOT NULL,
    "stockId" TEXT NOT NULL,
    "materialName" TEXT NOT NULL,
    "unit" TEXT,
    "quantity" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "SiteStoreIssueItem_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "SiteStoreIssue_issueNo_key" ON "SiteStoreIssue"("issueNo");
CREATE INDEX "SiteStoreIssue_projectId_issueDate_idx" ON "SiteStoreIssue"("projectId", "issueDate");
CREATE INDEX "SiteStoreIssue_status_idx" ON "SiteStoreIssue"("status");
CREATE INDEX "SiteStoreIssueItem_issueId_idx" ON "SiteStoreIssueItem"("issueId");
CREATE INDEX "SiteStoreIssueItem_stockId_idx" ON "SiteStoreIssueItem"("stockId");

ALTER TABLE "SiteStoreIssue"
ADD CONSTRAINT "SiteStoreIssue_projectId_fkey"
FOREIGN KEY ("projectId") REFERENCES "ProjectMaster"("id")
ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "SiteStoreIssueItem"
ADD CONSTRAINT "SiteStoreIssueItem_issueId_fkey"
FOREIGN KEY ("issueId") REFERENCES "SiteStoreIssue"("id")
ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "SiteStoreIssueItem"
ADD CONSTRAINT "SiteStoreIssueItem_stockId_fkey"
FOREIGN KEY ("stockId") REFERENCES "SiteStoreStock"("id")
ON DELETE RESTRICT ON UPDATE CASCADE;
