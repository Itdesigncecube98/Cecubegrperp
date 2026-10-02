CREATE TABLE "AttendancePunch" (
    "id" TEXT NOT NULL,
    "deviceLogId" INTEGER NOT NULL,
    "deviceId" TEXT NOT NULL,
    "userId" TEXT,
    "employeeCode" TEXT,
    "employeeName" TEXT,
    "designation" TEXT,
    "direction" TEXT,
    "punchTime" TIMESTAMP(3) NOT NULL,
    "location" TEXT,
    "source" TEXT NOT NULL DEFAULT 'etimetracklite',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AttendancePunch_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "AttendancePunch_deviceId_deviceLogId_key"
ON "AttendancePunch"("deviceId", "deviceLogId");

CREATE INDEX "AttendancePunch_punchTime_idx"
ON "AttendancePunch"("punchTime");

CREATE INDEX "AttendancePunch_employeeCode_punchTime_idx"
ON "AttendancePunch"("employeeCode", "punchTime");
