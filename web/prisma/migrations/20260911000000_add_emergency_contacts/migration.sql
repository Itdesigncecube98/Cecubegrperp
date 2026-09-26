CREATE TABLE "EmergencyContact" (
    "id" SERIAL NOT NULL,
    "employeeId" TEXT NOT NULL,
    "name" TEXT,
    "phone" TEXT,
    "relationship" TEXT,
    CONSTRAINT "EmergencyContact_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "EmergencyContact_employeeId_idx" ON "EmergencyContact"("employeeId");

ALTER TABLE "EmergencyContact" ADD CONSTRAINT "EmergencyContact_employeeId_fkey"
  FOREIGN KEY ("employeeId") REFERENCES "Employee"("id") ON DELETE CASCADE ON UPDATE CASCADE;

INSERT INTO "EmergencyContact" ("employeeId", "name", "phone")
SELECT "id", "emergencyContact", "emergencyPhone"
FROM "Employee"
WHERE COALESCE(NULLIF("emergencyContact", ''), NULLIF("emergencyPhone", '')) IS NOT NULL;