CREATE TABLE "AttendanceDeviceEmployeeMap" (
    "id" TEXT NOT NULL,
    "deviceId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "employeeId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "AttendanceDeviceEmployeeMap_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "AttendanceDeviceEmployeeMap_deviceId_userId_key"
ON "AttendanceDeviceEmployeeMap"("deviceId", "userId");

CREATE INDEX "AttendanceDeviceEmployeeMap_employeeId_idx"
ON "AttendanceDeviceEmployeeMap"("employeeId");

ALTER TABLE "AttendanceDeviceEmployeeMap"
ADD CONSTRAINT "AttendanceDeviceEmployeeMap_employeeId_fkey"
FOREIGN KEY ("employeeId") REFERENCES "Employee"("id") ON DELETE CASCADE ON UPDATE CASCADE;
