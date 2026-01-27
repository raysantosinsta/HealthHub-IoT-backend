/*
  Warnings:

  - You are about to drop the column `bpmMax` on the `Patient` table. All the data in the column will be lost.
  - You are about to drop the column `bpmMin` on the `Patient` table. All the data in the column will be lost.
  - You are about to drop the column `spo2Min` on the `Patient` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "Patient" DROP COLUMN "bpmMax",
DROP COLUMN "bpmMin",
DROP COLUMN "spo2Min",
ADD COLUMN     "currentActivityId" TEXT;

-- AlterTable
ALTER TABLE "VitalSign" ADD COLUMN     "activityPatternId" TEXT;

-- CreateTable
CREATE TABLE "ActivityPattern" (
    "id" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,

    CONSTRAINT "ActivityPattern_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PatientActivityThreshold" (
    "id" TEXT NOT NULL,
    "patientId" TEXT NOT NULL,
    "activityPatternId" TEXT NOT NULL,
    "bpmMin" INTEGER NOT NULL,
    "bpmMax" INTEGER NOT NULL,
    "spo2Min" INTEGER NOT NULL DEFAULT 94,

    CONSTRAINT "PatientActivityThreshold_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "ActivityPattern_slug_key" ON "ActivityPattern"("slug");

-- CreateIndex
CREATE UNIQUE INDEX "PatientActivityThreshold_patientId_activityPatternId_key" ON "PatientActivityThreshold"("patientId", "activityPatternId");

-- AddForeignKey
ALTER TABLE "Patient" ADD CONSTRAINT "Patient_currentActivityId_fkey" FOREIGN KEY ("currentActivityId") REFERENCES "ActivityPattern"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PatientActivityThreshold" ADD CONSTRAINT "PatientActivityThreshold_patientId_fkey" FOREIGN KEY ("patientId") REFERENCES "Patient"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PatientActivityThreshold" ADD CONSTRAINT "PatientActivityThreshold_activityPatternId_fkey" FOREIGN KEY ("activityPatternId") REFERENCES "ActivityPattern"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "VitalSign" ADD CONSTRAINT "VitalSign_activityPatternId_fkey" FOREIGN KEY ("activityPatternId") REFERENCES "ActivityPattern"("id") ON DELETE SET NULL ON UPDATE CASCADE;
