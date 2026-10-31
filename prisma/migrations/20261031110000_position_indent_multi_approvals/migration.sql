ALTER TABLE "PositionIndent"
ADD COLUMN "raisedByEmployeeId" TEXT,
ADD COLUMN "handledByHr" BOOLEAN NOT NULL DEFAULT false;

ALTER TABLE "PositionIndent"
ADD CONSTRAINT "PositionIndent_raisedByEmployeeId_fkey"
FOREIGN KEY ("raisedByEmployeeId") REFERENCES "Employee"("id")
ON DELETE SET NULL ON UPDATE CASCADE;

CREATE INDEX "PositionIndent_raisedByEmployeeId_idx"
ON "PositionIndent"("raisedByEmployeeId");

CREATE TABLE "PositionIndentApproval" (
  "id" TEXT NOT NULL,
  "positionIndentId" TEXT NOT NULL,
  "employeeId" TEXT NOT NULL,
  "status" TEXT NOT NULL DEFAULT 'pending',
  "actedAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "PositionIndentApproval_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "PositionIndentApproval_positionIndentId_fkey"
    FOREIGN KEY ("positionIndentId") REFERENCES "PositionIndent"("id")
    ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT "PositionIndentApproval_employeeId_fkey"
    FOREIGN KEY ("employeeId") REFERENCES "Employee"("id")
    ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE UNIQUE INDEX "PositionIndentApproval_positionIndentId_employeeId_key"
ON "PositionIndentApproval"("positionIndentId", "employeeId");
CREATE INDEX "PositionIndentApproval_employeeId_status_idx"
ON "PositionIndentApproval"("employeeId", "status");

CREATE TABLE "PositionIndentHandler" (
  "id" TEXT NOT NULL,
  "positionIndentId" TEXT NOT NULL,
  "employeeId" TEXT NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "PositionIndentHandler_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "PositionIndentHandler_positionIndentId_fkey"
    FOREIGN KEY ("positionIndentId") REFERENCES "PositionIndent"("id")
    ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT "PositionIndentHandler_employeeId_fkey"
    FOREIGN KEY ("employeeId") REFERENCES "Employee"("id")
    ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE UNIQUE INDEX "PositionIndentHandler_positionIndentId_employeeId_key"
ON "PositionIndentHandler"("positionIndentId", "employeeId");
CREATE INDEX "PositionIndentHandler_employeeId_idx"
ON "PositionIndentHandler"("employeeId");
