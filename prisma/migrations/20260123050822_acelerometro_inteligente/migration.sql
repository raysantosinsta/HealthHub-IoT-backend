-- CreateEnum
CREATE TYPE "UserState" AS ENUM ('ACTIVE', 'RESTING', 'SUSPICIOUS_INACTIVE', 'EMERGENCY');

-- CreateEnum
CREATE TYPE "SleepMode" AS ENUM ('MANUAL', 'AUTO', 'OFF');

-- CreateTable
CREATE TABLE "PatientState" (
    "id" TEXT NOT NULL,
    "patientId" TEXT NOT NULL,
    "currentState" "UserState" NOT NULL DEFAULT 'ACTIVE',
    "lastUpdated" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "sleepMode" "SleepMode" DEFAULT 'AUTO',
    "lastCheckIn" TIMESTAMP(3),
    "suspiciousSince" TIMESTAMP(3),
    "emergencySince" TIMESTAMP(3),
    "alertLevel" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "PatientState_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TrustedContact" (
    "id" TEXT NOT NULL,
    "patientId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "phone" TEXT,
    "telegramId" TEXT,
    "priority" INTEGER NOT NULL DEFAULT 1,

    CONSTRAINT "TrustedContact_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "PatientState_patientId_lastUpdated_idx" ON "PatientState"("patientId", "lastUpdated");

-- CreateIndex
CREATE UNIQUE INDEX "PatientState_patientId_key" ON "PatientState"("patientId");

-- AddForeignKey
ALTER TABLE "PatientState" ADD CONSTRAINT "PatientState_patientId_fkey" FOREIGN KEY ("patientId") REFERENCES "Patient"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TrustedContact" ADD CONSTRAINT "TrustedContact_patientId_fkey" FOREIGN KEY ("patientId") REFERENCES "Patient"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
