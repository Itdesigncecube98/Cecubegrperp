-- Migration: add_engg_and_accounts_modules
-- Engineering Module + Accounts Portal tables

-- ─────────────────────────────────────────
-- ENGINEERING MODULE
-- ─────────────────────────────────────────

CREATE TABLE "Project" (
    "id"            SERIAL PRIMARY KEY,
    "projectCode"   TEXT NOT NULL UNIQUE,
    "name"          TEXT NOT NULL,
    "description"   TEXT,
    "clientName"    TEXT,
    "clientContact" TEXT,
    "clientEmail"   TEXT,
    "siteAddress"   TEXT,
    "status"        TEXT NOT NULL DEFAULT 'PLANNING',
    "priority"      TEXT NOT NULL DEFAULT 'MEDIUM',
    "startDate"     TEXT,
    "endDate"       TEXT,
    "actualEndDate" TEXT,
    "budgetAmount"  DOUBLE PRECISION NOT NULL DEFAULT 0.0,
    "spentAmount"   DOUBLE PRECISION NOT NULL DEFAULT 0.0,
    "managerId"     TEXT,
    "departmentId"  TEXT,
    "tags"          TEXT,
    "createdAt"     TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt"     TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE "WorkOrder" (
    "id"             SERIAL PRIMARY KEY,
    "woNumber"       TEXT NOT NULL UNIQUE,
    "projectId"      INTEGER NOT NULL,
    "title"          TEXT NOT NULL,
    "description"    TEXT,
    "scope"          TEXT,
    "assignedToId"   TEXT,
    "supervisorId"   TEXT,
    "status"         TEXT NOT NULL DEFAULT 'OPEN',
    "priority"       TEXT NOT NULL DEFAULT 'MEDIUM',
    "scheduledDate"  TEXT,
    "dueDate"        TEXT,
    "completedDate"  TEXT,
    "estimatedHours" DOUBLE PRECISION NOT NULL DEFAULT 0.0,
    "actualHours"    DOUBLE PRECISION NOT NULL DEFAULT 0.0,
    "remarks"        TEXT,
    "approvedBy"     TEXT,
    "approvedAt"     TIMESTAMP(3),
    "createdAt"      TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt"      TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE "SiteVisit" (
    "id"             SERIAL PRIMARY KEY,
    "projectId"      INTEGER NOT NULL,
    "workOrderId"    INTEGER,
    "employeeId"     TEXT NOT NULL,
    "visitDate"      TEXT NOT NULL,
    "checkInTime"    TEXT,
    "checkOutTime"   TEXT,
    "latitude"       DOUBLE PRECISION,
    "longitude"      DOUBLE PRECISION,
    "address"        TEXT,
    "purpose"        TEXT,
    "observations"   TEXT,
    "nextAction"     TEXT,
    "status"         TEXT NOT NULL DEFAULT 'PLANNED',
    "photoUrls"      TEXT,
    "signatureData"  TEXT,
    "clientSignedBy" TEXT,
    "createdAt"      TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt"      TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE "MaterialRequest" (
    "id"              SERIAL PRIMARY KEY,
    "mrNumber"        TEXT NOT NULL UNIQUE,
    "projectId"       INTEGER NOT NULL,
    "workOrderId"     INTEGER,
    "requestedById"   TEXT NOT NULL,
    "approvedById"    TEXT,
    "status"          TEXT NOT NULL DEFAULT 'DRAFT',
    "urgency"         TEXT NOT NULL DEFAULT 'NORMAL',
    "requiredByDate"  TEXT,
    "remarks"         TEXT,
    "rejectionReason" TEXT,
    "approvedAt"      TIMESTAMP(3),
    "createdAt"       TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt"       TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE "MaterialItem" (
    "id"                SERIAL PRIMARY KEY,
    "materialRequestId" INTEGER NOT NULL,
    "itemCode"          TEXT,
    "description"       TEXT NOT NULL,
    "unit"              TEXT NOT NULL DEFAULT 'Nos',
    "quantityRequired"  DOUBLE PRECISION NOT NULL,
    "quantityApproved"  DOUBLE PRECISION NOT NULL DEFAULT 0.0,
    "quantityIssued"    DOUBLE PRECISION NOT NULL DEFAULT 0.0,
    "estimatedRate"     DOUBLE PRECISION NOT NULL DEFAULT 0.0,
    "actualRate"        DOUBLE PRECISION NOT NULL DEFAULT 0.0,
    "remarks"           TEXT
);

CREATE TABLE "DrawingDocument" (
    "id"            SERIAL PRIMARY KEY,
    "projectId"     INTEGER NOT NULL,
    "drawingNumber" TEXT NOT NULL,
    "title"         TEXT NOT NULL,
    "revision"      TEXT NOT NULL DEFAULT 'A',
    "discipline"    TEXT NOT NULL DEFAULT 'Civil',
    "drawingType"   TEXT NOT NULL DEFAULT 'Design',
    "status"        TEXT NOT NULL DEFAULT 'DRAFT',
    "uploadedById"  TEXT,
    "fileData"      TEXT,
    "fileName"      TEXT,
    "fileType"      TEXT,
    "fileSize"      INTEGER,
    "remarks"       TEXT,
    "issuedDate"    TEXT,
    "createdAt"     TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt"     TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE UNIQUE INDEX "DrawingDocument_projectId_drawingNumber_revision_key"
    ON "DrawingDocument"("projectId", "drawingNumber", "revision");

CREATE TABLE "Equipment" (
    "id"                  SERIAL PRIMARY KEY,
    "assetCode"           TEXT NOT NULL UNIQUE,
    "name"                TEXT NOT NULL,
    "description"         TEXT,
    "category"            TEXT NOT NULL DEFAULT 'General',
    "make"                TEXT,
    "model"               TEXT,
    "serialNumber"        TEXT,
    "purchaseDate"        TEXT,
    "purchaseValue"       DOUBLE PRECISION NOT NULL DEFAULT 0.0,
    "currentValue"        DOUBLE PRECISION NOT NULL DEFAULT 0.0,
    "status"              TEXT NOT NULL DEFAULT 'AVAILABLE',
    "assignedToId"        TEXT,
    "currentLocation"     TEXT,
    "nextServiceDate"     TEXT,
    "serviceIntervalDays" INTEGER NOT NULL DEFAULT 90,
    "notes"               TEXT,
    "createdAt"           TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt"           TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- ─────────────────────────────────────────
-- ACCOUNTS PORTAL
-- ─────────────────────────────────────────

CREATE TABLE "Vendor" (
    "id"            SERIAL PRIMARY KEY,
    "vendorCode"    TEXT NOT NULL UNIQUE,
    "name"          TEXT NOT NULL,
    "contactPerson" TEXT,
    "email"         TEXT,
    "phone"         TEXT,
    "address"       TEXT,
    "gstin"         TEXT,
    "pan"           TEXT,
    "bankName"      TEXT,
    "bankAccount"   TEXT,
    "bankIfsc"      TEXT,
    "category"      TEXT NOT NULL DEFAULT 'Supplier',
    "status"        TEXT NOT NULL DEFAULT 'ACTIVE',
    "creditDays"    INTEGER NOT NULL DEFAULT 30,
    "notes"         TEXT,
    "createdAt"     TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt"     TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE "PurchaseOrder" (
    "id"                SERIAL PRIMARY KEY,
    "poNumber"          TEXT NOT NULL UNIQUE,
    "vendorId"          INTEGER NOT NULL,
    "materialRequestId" INTEGER,
    "raisedById"        TEXT,
    "approvedById"      TEXT,
    "status"            TEXT NOT NULL DEFAULT 'DRAFT',
    "poDate"            TEXT NOT NULL,
    "expectedDelivery"  TEXT,
    "deliveryAddress"   TEXT,
    "paymentTerms"      TEXT,
    "currency"          TEXT NOT NULL DEFAULT 'INR',
    "subtotal"          DOUBLE PRECISION NOT NULL DEFAULT 0.0,
    "taxAmount"         DOUBLE PRECISION NOT NULL DEFAULT 0.0,
    "discountAmount"    DOUBLE PRECISION NOT NULL DEFAULT 0.0,
    "totalAmount"       DOUBLE PRECISION NOT NULL DEFAULT 0.0,
    "paidAmount"        DOUBLE PRECISION NOT NULL DEFAULT 0.0,
    "terms"             TEXT,
    "remarks"           TEXT,
    "approvedAt"        TIMESTAMP(3),
    "createdAt"         TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt"         TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE "POLineItem" (
    "id"              SERIAL PRIMARY KEY,
    "purchaseOrderId" INTEGER NOT NULL,
    "itemCode"        TEXT,
    "description"     TEXT NOT NULL,
    "unit"            TEXT NOT NULL DEFAULT 'Nos',
    "quantity"        DOUBLE PRECISION NOT NULL,
    "unitPrice"       DOUBLE PRECISION NOT NULL,
    "taxRate"         DOUBLE PRECISION NOT NULL DEFAULT 0.0,
    "taxAmount"       DOUBLE PRECISION NOT NULL DEFAULT 0.0,
    "totalAmount"     DOUBLE PRECISION NOT NULL DEFAULT 0.0,
    "receivedQty"     DOUBLE PRECISION NOT NULL DEFAULT 0.0,
    "remarks"         TEXT
);

CREATE TABLE "Invoice" (
    "id"            SERIAL PRIMARY KEY,
    "invoiceNumber" TEXT NOT NULL UNIQUE,
    "invoiceType"   TEXT NOT NULL DEFAULT 'SALES',
    "projectId"     INTEGER,
    "vendorId"      INTEGER,
    "clientName"    TEXT,
    "clientGstin"   TEXT,
    "clientAddress" TEXT,
    "invoiceDate"   TEXT NOT NULL,
    "dueDate"       TEXT,
    "currency"      TEXT NOT NULL DEFAULT 'INR',
    "subtotal"      DOUBLE PRECISION NOT NULL DEFAULT 0.0,
    "cgst"          DOUBLE PRECISION NOT NULL DEFAULT 0.0,
    "sgst"          DOUBLE PRECISION NOT NULL DEFAULT 0.0,
    "igst"          DOUBLE PRECISION NOT NULL DEFAULT 0.0,
    "tds"           DOUBLE PRECISION NOT NULL DEFAULT 0.0,
    "discountAmount" DOUBLE PRECISION NOT NULL DEFAULT 0.0,
    "totalAmount"   DOUBLE PRECISION NOT NULL DEFAULT 0.0,
    "paidAmount"    DOUBLE PRECISION NOT NULL DEFAULT 0.0,
    "status"        TEXT NOT NULL DEFAULT 'DRAFT',
    "paymentMode"   TEXT,
    "paymentDate"   TEXT,
    "paymentRef"    TEXT,
    "notes"         TEXT,
    "createdById"   TEXT,
    "createdAt"     TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt"     TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE "InvoiceLineItem" (
    "id"          SERIAL PRIMARY KEY,
    "invoiceId"   INTEGER NOT NULL,
    "description" TEXT NOT NULL,
    "unit"        TEXT NOT NULL DEFAULT 'Nos',
    "quantity"    DOUBLE PRECISION NOT NULL DEFAULT 1.0,
    "unitPrice"   DOUBLE PRECISION NOT NULL,
    "taxRate"     DOUBLE PRECISION NOT NULL DEFAULT 0.0,
    "taxAmount"   DOUBLE PRECISION NOT NULL DEFAULT 0.0,
    "totalAmount" DOUBLE PRECISION NOT NULL DEFAULT 0.0,
    "hsnSac"      TEXT
);

CREATE TABLE "Expense" (
    "id"              SERIAL PRIMARY KEY,
    "expenseNumber"   TEXT NOT NULL UNIQUE,
    "employeeId"      TEXT NOT NULL,
    "projectId"       INTEGER,
    "purchaseOrderId" INTEGER,
    "category"        TEXT NOT NULL,
    "description"     TEXT NOT NULL,
    "amount"          DOUBLE PRECISION NOT NULL,
    "currency"        TEXT NOT NULL DEFAULT 'INR',
    "expenseDate"     TEXT NOT NULL,
    "receiptData"     TEXT,
    "receiptFileName" TEXT,
    "status"          TEXT NOT NULL DEFAULT 'DRAFT',
    "submittedAt"     TIMESTAMP(3),
    "approvedById"    TEXT,
    "approvedAt"      TIMESTAMP(3),
    "rejectionReason" TEXT,
    "paidAt"          TIMESTAMP(3),
    "paymentRef"      TEXT,
    "tripLogId"       INTEGER,
    "remarks"         TEXT,
    "createdAt"       TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt"       TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE "Payroll" (
    "id"               SERIAL PRIMARY KEY,
    "payrollMonth"     TEXT NOT NULL,
    "employeeId"       TEXT NOT NULL,
    "basicSalary"      DOUBLE PRECISION NOT NULL DEFAULT 0.0,
    "hra"              DOUBLE PRECISION NOT NULL DEFAULT 0.0,
    "conveyance"       DOUBLE PRECISION NOT NULL DEFAULT 0.0,
    "medicalAllowance" DOUBLE PRECISION NOT NULL DEFAULT 0.0,
    "otherAllowances"  DOUBLE PRECISION NOT NULL DEFAULT 0.0,
    "grossSalary"      DOUBLE PRECISION NOT NULL DEFAULT 0.0,
    "pf"               DOUBLE PRECISION NOT NULL DEFAULT 0.0,
    "pfEmployer"       DOUBLE PRECISION NOT NULL DEFAULT 0.0,
    "esi"              DOUBLE PRECISION NOT NULL DEFAULT 0.0,
    "esiEmployer"      DOUBLE PRECISION NOT NULL DEFAULT 0.0,
    "tds"              DOUBLE PRECISION NOT NULL DEFAULT 0.0,
    "professionalTax"  DOUBLE PRECISION NOT NULL DEFAULT 0.0,
    "otherDeductions"  DOUBLE PRECISION NOT NULL DEFAULT 0.0,
    "lossOfPayDays"    DOUBLE PRECISION NOT NULL DEFAULT 0.0,
    "lossOfPayAmount"  DOUBLE PRECISION NOT NULL DEFAULT 0.0,
    "overtimeHours"    DOUBLE PRECISION NOT NULL DEFAULT 0.0,
    "overtimeAmount"   DOUBLE PRECISION NOT NULL DEFAULT 0.0,
    "bonus"            DOUBLE PRECISION NOT NULL DEFAULT 0.0,
    "netSalary"        DOUBLE PRECISION NOT NULL DEFAULT 0.0,
    "workingDays"      INTEGER NOT NULL DEFAULT 0,
    "presentDays"      DOUBLE PRECISION NOT NULL DEFAULT 0.0,
    "status"           TEXT NOT NULL DEFAULT 'DRAFT',
    "paymentDate"      TEXT,
    "paymentMode"      TEXT,
    "paymentRef"       TEXT,
    "processedById"    TEXT,
    "approvedById"     TEXT,
    "approvedAt"       TIMESTAMP(3),
    "remarks"          TEXT,
    "createdAt"        TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt"        TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "Payroll_payrollMonth_employeeId_key" UNIQUE("payrollMonth", "employeeId")
);

CREATE TABLE "BudgetAllocation" (
    "id"          SERIAL PRIMARY KEY,
    "projectId"   INTEGER NOT NULL,
    "category"    TEXT NOT NULL,
    "description" TEXT,
    "allocated"   DOUBLE PRECISION NOT NULL DEFAULT 0.0,
    "spent"       DOUBLE PRECISION NOT NULL DEFAULT 0.0,
    "revised"     DOUBLE PRECISION,
    "fiscalYear"  TEXT,
    "notes"       TEXT,
    "createdAt"   TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt"   TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- ─────────────────────────────────────────
-- FOREIGN KEY CONSTRAINTS
-- ─────────────────────────────────────────

-- Project
ALTER TABLE "Project"
    ADD CONSTRAINT "Project_managerId_fkey"
        FOREIGN KEY ("managerId") REFERENCES "Employee"("id") ON DELETE SET NULL;

-- WorkOrder
ALTER TABLE "WorkOrder"
    ADD CONSTRAINT "WorkOrder_projectId_fkey"
        FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE CASCADE,
    ADD CONSTRAINT "WorkOrder_assignedToId_fkey"
        FOREIGN KEY ("assignedToId") REFERENCES "Employee"("id") ON DELETE SET NULL,
    ADD CONSTRAINT "WorkOrder_supervisorId_fkey"
        FOREIGN KEY ("supervisorId") REFERENCES "Employee"("id") ON DELETE SET NULL;

-- SiteVisit
ALTER TABLE "SiteVisit"
    ADD CONSTRAINT "SiteVisit_projectId_fkey"
        FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE CASCADE,
    ADD CONSTRAINT "SiteVisit_workOrderId_fkey"
        FOREIGN KEY ("workOrderId") REFERENCES "WorkOrder"("id") ON DELETE SET NULL,
    ADD CONSTRAINT "SiteVisit_employeeId_fkey"
        FOREIGN KEY ("employeeId") REFERENCES "Employee"("id") ON DELETE CASCADE;

-- MaterialRequest
ALTER TABLE "MaterialRequest"
    ADD CONSTRAINT "MaterialRequest_projectId_fkey"
        FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE CASCADE,
    ADD CONSTRAINT "MaterialRequest_workOrderId_fkey"
        FOREIGN KEY ("workOrderId") REFERENCES "WorkOrder"("id") ON DELETE SET NULL,
    ADD CONSTRAINT "MaterialRequest_requestedById_fkey"
        FOREIGN KEY ("requestedById") REFERENCES "Employee"("id") ON DELETE CASCADE,
    ADD CONSTRAINT "MaterialRequest_approvedById_fkey"
        FOREIGN KEY ("approvedById") REFERENCES "Employee"("id") ON DELETE SET NULL;

-- MaterialItem
ALTER TABLE "MaterialItem"
    ADD CONSTRAINT "MaterialItem_materialRequestId_fkey"
        FOREIGN KEY ("materialRequestId") REFERENCES "MaterialRequest"("id") ON DELETE CASCADE;

-- DrawingDocument
ALTER TABLE "DrawingDocument"
    ADD CONSTRAINT "DrawingDocument_projectId_fkey"
        FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE CASCADE,
    ADD CONSTRAINT "DrawingDocument_uploadedById_fkey"
        FOREIGN KEY ("uploadedById") REFERENCES "Employee"("id") ON DELETE SET NULL;

-- Equipment
ALTER TABLE "Equipment"
    ADD CONSTRAINT "Equipment_assignedToId_fkey"
        FOREIGN KEY ("assignedToId") REFERENCES "Employee"("id") ON DELETE SET NULL;

-- PurchaseOrder
ALTER TABLE "PurchaseOrder"
    ADD CONSTRAINT "PurchaseOrder_vendorId_fkey"
        FOREIGN KEY ("vendorId") REFERENCES "Vendor"("id") ON DELETE RESTRICT,
    ADD CONSTRAINT "PurchaseOrder_materialRequestId_fkey"
        FOREIGN KEY ("materialRequestId") REFERENCES "MaterialRequest"("id") ON DELETE SET NULL,
    ADD CONSTRAINT "PurchaseOrder_raisedById_fkey"
        FOREIGN KEY ("raisedById") REFERENCES "Employee"("id") ON DELETE SET NULL;

-- POLineItem
ALTER TABLE "POLineItem"
    ADD CONSTRAINT "POLineItem_purchaseOrderId_fkey"
        FOREIGN KEY ("purchaseOrderId") REFERENCES "PurchaseOrder"("id") ON DELETE CASCADE;

-- Invoice
ALTER TABLE "Invoice"
    ADD CONSTRAINT "Invoice_projectId_fkey"
        FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE SET NULL,
    ADD CONSTRAINT "Invoice_vendorId_fkey"
        FOREIGN KEY ("vendorId") REFERENCES "Vendor"("id") ON DELETE SET NULL;

-- InvoiceLineItem
ALTER TABLE "InvoiceLineItem"
    ADD CONSTRAINT "InvoiceLineItem_invoiceId_fkey"
        FOREIGN KEY ("invoiceId") REFERENCES "Invoice"("id") ON DELETE CASCADE;

-- Expense
ALTER TABLE "Expense"
    ADD CONSTRAINT "Expense_employeeId_fkey"
        FOREIGN KEY ("employeeId") REFERENCES "Employee"("id") ON DELETE CASCADE,
    ADD CONSTRAINT "Expense_approvedById_fkey"
        FOREIGN KEY ("approvedById") REFERENCES "Employee"("id") ON DELETE SET NULL,
    ADD CONSTRAINT "Expense_purchaseOrderId_fkey"
        FOREIGN KEY ("purchaseOrderId") REFERENCES "PurchaseOrder"("id") ON DELETE SET NULL;

-- Payroll
ALTER TABLE "Payroll"
    ADD CONSTRAINT "Payroll_employeeId_fkey"
        FOREIGN KEY ("employeeId") REFERENCES "Employee"("id") ON DELETE CASCADE;

-- BudgetAllocation
ALTER TABLE "BudgetAllocation"
    ADD CONSTRAINT "BudgetAllocation_projectId_fkey"
        FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE CASCADE;
