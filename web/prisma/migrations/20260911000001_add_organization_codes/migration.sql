ALTER TABLE "Organization" ADD COLUMN "code" TEXT;

CREATE UNIQUE INDEX "Organization_code_key" ON "Organization"("code");

CREATE TABLE "EmployeeCodeCounter" (
    "id" SERIAL NOT NULL,
    "prefix" TEXT NOT NULL,
    "nextNumber" INTEGER NOT NULL DEFAULT 1,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "EmployeeCodeCounter_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "EmployeeCodeCounter_prefix_key" ON "EmployeeCodeCounter"("prefix");