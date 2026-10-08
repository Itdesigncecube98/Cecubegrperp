DROP INDEX "AttendancePunch_deviceId_deviceLogId_key";
CREATE UNIQUE INDEX "AttendancePunch_deviceId_deviceLogId_punchTime_key" ON "AttendancePunch"("deviceId", "deviceLogId", "punchTime");
