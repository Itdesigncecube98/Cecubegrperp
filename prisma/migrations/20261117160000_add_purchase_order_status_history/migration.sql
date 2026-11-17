CREATE TABLE "PurchaseOrderStatusHistory" (
    "id" TEXT NOT NULL,
    "purchaseOrderId" TEXT NOT NULL,
    "fromStatus" TEXT,
    "toStatus" TEXT NOT NULL,
    "changedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "actorName" TEXT,
    "note" TEXT,
    CONSTRAINT "PurchaseOrderStatusHistory_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "PurchaseOrderStatusHistory_purchaseOrderId_changedAt_idx"
ON "PurchaseOrderStatusHistory"("purchaseOrderId", "changedAt");

ALTER TABLE "PurchaseOrderStatusHistory"
ADD CONSTRAINT "PurchaseOrderStatusHistory_purchaseOrderId_fkey"
FOREIGN KEY ("purchaseOrderId") REFERENCES "PurchaseOrder"("id") ON DELETE CASCADE ON UPDATE CASCADE;

INSERT INTO "PurchaseOrderStatusHistory" ("id", "purchaseOrderId", "fromStatus", "toStatus", "changedAt", "actorName", "note")
SELECT 'po-status-' || po."id", po."id", NULL, 'DRAFT', po."createdAt",
       COALESCE(NULLIF(po."preparedByName", ''), po."preparedBy", 'System'),
       'Initial status (history tracking started)'
FROM "PurchaseOrder" po;

INSERT INTO "PurchaseOrderStatusHistory" ("id", "purchaseOrderId", "fromStatus", "toStatus", "changedAt", "actorName", "note")
SELECT 'po-current-' || po."id", po."id", 'DRAFT', po."status"::text, po."updatedAt",
       COALESCE(NULLIF(po."approvedByName", ''), po."approvedBy", 'System'),
       'Current status when history tracking started'
FROM "PurchaseOrder" po
WHERE po."status"::text <> 'DRAFT';

CREATE TABLE "SiteGTNStatusHistory" (
    "id" TEXT NOT NULL,
    "gtnId" TEXT NOT NULL,
    "fromStatus" TEXT,
    "toStatus" TEXT NOT NULL,
    "changedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "actorName" TEXT,
    "note" TEXT,
    CONSTRAINT "SiteGTNStatusHistory_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "SiteGTNStatusHistory_gtnId_changedAt_idx" ON "SiteGTNStatusHistory"("gtnId", "changedAt");
ALTER TABLE "SiteGTNStatusHistory" ADD CONSTRAINT "SiteGTNStatusHistory_gtnId_fkey" FOREIGN KEY ("gtnId") REFERENCES "SiteGTN"("id") ON DELETE CASCADE ON UPDATE CASCADE;
INSERT INTO "SiteGTNStatusHistory" ("id", "gtnId", "fromStatus", "toStatus", "changedAt", "actorName", "note")
SELECT 'gtn-status-' || gtn."id", gtn."id", NULL, gtn."status", gtn."createdAt", 'System', 'Initial status (history tracking started)' FROM "SiteGTN" gtn;

CREATE TABLE "VendorBillStatusHistory" (
    "id" TEXT NOT NULL,
    "billId" TEXT NOT NULL,
    "fromStatus" TEXT,
    "toStatus" TEXT NOT NULL,
    "changedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "actorName" TEXT,
    "note" TEXT,
    CONSTRAINT "VendorBillStatusHistory_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "VendorBillStatusHistory_billId_changedAt_idx" ON "VendorBillStatusHistory"("billId", "changedAt");
ALTER TABLE "VendorBillStatusHistory" ADD CONSTRAINT "VendorBillStatusHistory_billId_fkey" FOREIGN KEY ("billId") REFERENCES "VendorBill"("id") ON DELETE CASCADE ON UPDATE CASCADE;
INSERT INTO "VendorBillStatusHistory" ("id", "billId", "fromStatus", "toStatus", "changedAt", "actorName", "note")
SELECT 'bill-status-' || bill."id", bill."id", NULL, bill."status", bill."createdAt", 'System', 'Initial status (history tracking started)' FROM "VendorBill" bill;
