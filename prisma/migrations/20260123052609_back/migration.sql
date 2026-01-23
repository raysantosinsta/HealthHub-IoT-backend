/*
  Warnings:

  - You are about to drop the `PatientState` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `TrustedContact` table. If the table is not empty, all the data it contains will be lost.

*/
-- DropForeignKey
ALTER TABLE "PatientState" DROP CONSTRAINT "PatientState_patientId_fkey";

-- DropForeignKey
ALTER TABLE "TrustedContact" DROP CONSTRAINT "TrustedContact_patientId_fkey";

-- DropTable
DROP TABLE "PatientState";

-- DropTable
DROP TABLE "TrustedContact";

-- DropEnum
DROP TYPE "SleepMode";

-- DropEnum
DROP TYPE "UserState";
