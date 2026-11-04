CREATE TABLE "LeaveBalanceSetup" (
  "id" TEXT NOT NULL,
  "completedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "completedBy" TEXT NOT NULL,
  "employeeCount" INTEGER NOT NULL,
  CONSTRAINT "LeaveBalanceSetup_pkey" PRIMARY KEY ("id")
);
