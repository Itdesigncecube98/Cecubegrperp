CREATE TABLE "PunchLiveLocation" (
    "employeeId" TEXT NOT NULL,
    "date" TEXT NOT NULL,
    "latitude" DOUBLE PRECISION NOT NULL,
    "longitude" DOUBLE PRECISION NOT NULL,
    "accuracy" DOUBLE PRECISION,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PunchLiveLocation_pkey" PRIMARY KEY ("employeeId")
);

CREATE INDEX "PunchLiveLocation_date_updatedAt_idx" ON "PunchLiveLocation"("date", "updatedAt");

ALTER TABLE "PunchLiveLocation"
ADD CONSTRAINT "PunchLiveLocation_employeeId_fkey"
FOREIGN KEY ("employeeId") REFERENCES "Employee"("id")
ON DELETE CASCADE ON UPDATE CASCADE;
