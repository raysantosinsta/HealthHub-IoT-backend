-- AlterTable
ALTER TABLE "ActivityPattern" ADD COLUMN     "defaultBpmMax" INTEGER,
ADD COLUMN     "defaultBpmMin" INTEGER,
ADD COLUMN     "defaultSpo2Min" INTEGER DEFAULT 94;
