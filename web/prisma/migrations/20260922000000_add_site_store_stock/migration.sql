CREATE TABLE "SiteStoreStock" (
    "id" TEXT NOT NULL,
    "projectId" TEXT NOT NULL,
    "requisitionId" TEXT,
    "grnId" TEXT,
    "grnItemId" TEXT NOT NULL,
    "gtnId" TEXT,
    "materialName" TEXT NOT NULL,
    "unit" TEXT,
    "quantity" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "storeName" TEXT,
    "brand" TEXT,
    "poNo" TEXT,
    "purchaseBillNo" TEXT,
    "sourceType" TEXT NOT NULL DEFAULT 'GRN',
    "status" TEXT NOT NULL DEFAULT 'AVAILABLE',
    "receivedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "remarks" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "SiteStoreStock_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "SiteStoreStock_grnItemId_key" ON "SiteStoreStock"("grnItemId");
CREATE INDEX "SiteStoreStock_projectId_materialName_idx" ON "SiteStoreStock"("projectId", "materialName");
CREATE INDEX "SiteStoreStock_status_idx" ON "SiteStoreStock"("status");
CREATE INDEX "SiteStoreStock_poNo_idx" ON "SiteStoreStock"("poNo");

ALTER TABLE "SiteStoreStock" ADD CONSTRAINT "SiteStoreStock_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "ProjectMaster"("id") ON DELETE CASCADE ON UPDATE CASCADE;