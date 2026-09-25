CREATE TABLE "SiteGTN" (
  "id" TEXT NOT NULL,
  "gtnNo" TEXT NOT NULL,
  "projectId" TEXT NOT NULL,
  "gtnDate" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "fromLocation" TEXT,
  "toLocation" TEXT,
  "vehicleNo" TEXT,
  "status" TEXT NOT NULL DEFAULT 'Draft',
  "remarks" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "SiteGTN_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "SiteGTN_gtnNo_key" ON "SiteGTN"("gtnNo");
CREATE INDEX "SiteGTN_projectId_idx" ON "SiteGTN"("projectId");
ALTER TABLE "SiteGTN" ADD CONSTRAINT "SiteGTN_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "ProjectMaster"("id") ON DELETE CASCADE ON UPDATE CASCADE;

CREATE TABLE "SiteGTNItem" (
  "id" TEXT NOT NULL,
  "gtnId" TEXT NOT NULL,
  "requisitionId" TEXT NOT NULL,
  "materialName" TEXT NOT NULL,
  "quantity" DOUBLE PRECISION NOT NULL DEFAULT 0,
  "unit" TEXT,
  CONSTRAINT "SiteGTNItem_pkey" PRIMARY KEY ("id")
);
ALTER TABLE "SiteGTNItem" ADD CONSTRAINT "SiteGTNItem_gtnId_fkey" FOREIGN KEY ("gtnId") REFERENCES "SiteGTN"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "SiteGTNItem" ADD CONSTRAINT "SiteGTNItem_requisitionId_fkey" FOREIGN KEY ("requisitionId") REFERENCES "SiteMaterialRequisition"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

CREATE TABLE "SiteGRN" (
  "id" TEXT NOT NULL,
  "grnNo" TEXT NOT NULL,
  "projectId" TEXT NOT NULL,
  "gtnId" TEXT,
  "grnDate" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "vehicleNo" TEXT,
  "challanNo" TEXT,
  "challanDate" TIMESTAMP(3),
  "gateRegistrationDate" TIMESTAMP(3),
  "gateRegistrationIn" TIMESTAMP(3),
  "gateRegistrationOut" TIMESTAMP(3),
  "gateRegistrationRefNo" TEXT,
  "state" TEXT,
  "ewayBillNo" TEXT,
  "ewayBillDate" TIMESTAMP(3),
  "status" TEXT NOT NULL DEFAULT 'Draft',
  "remarks" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "SiteGRN_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "SiteGRN_grnNo_key" ON "SiteGRN"("grnNo");
CREATE INDEX "SiteGRN_projectId_idx" ON "SiteGRN"("projectId");
CREATE INDEX "SiteGRN_gtnId_idx" ON "SiteGRN"("gtnId");
ALTER TABLE "SiteGRN" ADD CONSTRAINT "SiteGRN_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "ProjectMaster"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "SiteGRN" ADD CONSTRAINT "SiteGRN_gtnId_fkey" FOREIGN KEY ("gtnId") REFERENCES "SiteGTN"("id") ON DELETE SET NULL ON UPDATE CASCADE;

CREATE TABLE "SiteGRNItem" (
  "id" TEXT NOT NULL,
  "grnId" TEXT NOT NULL,
  "requisitionId" TEXT NOT NULL,
  "materialName" TEXT NOT NULL,
  "quantity" DOUBLE PRECISION NOT NULL DEFAULT 0,
  "unit" TEXT,
  "acceptedQty" DOUBLE PRECISION NOT NULL DEFAULT 0,
  "rejectedQty" DOUBLE PRECISION NOT NULL DEFAULT 0,
  "remarks" TEXT,
  CONSTRAINT "SiteGRNItem_pkey" PRIMARY KEY ("id")
);
ALTER TABLE "SiteGRNItem" ADD CONSTRAINT "SiteGRNItem_grnId_fkey" FOREIGN KEY ("grnId") REFERENCES "SiteGRN"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "SiteGRNItem" ADD CONSTRAINT "SiteGRNItem_requisitionId_fkey" FOREIGN KEY ("requisitionId") REFERENCES "SiteMaterialRequisition"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
