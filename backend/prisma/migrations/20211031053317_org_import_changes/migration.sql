-- CreateEnum
CREATE TYPE "TokenOriginalType" AS ENUM ('LOCAL', 'IMPORT');

-- AlterEnum
ALTER TYPE "TaskType" ADD VALUE 'ORG_IMPORT';

-- AlterEnum
-- This migration adds more than one value to an enum.
-- With PostgreSQL versions 11 and earlier, this is not possible
-- in a single migration. This can be worked around by creating
-- multiple migrations, each migration adding only one value to
-- the enum.


ALTER TYPE "TokenOriginalStatus" ADD VALUE 'IMPORT_TASK';
ALTER TYPE "TokenOriginalStatus" ADD VALUE 'IMPORT_FAIL';

-- AlterTable
ALTER TABLE "TokenOriginal" ADD COLUMN     "importAddr" VARCHAR(100),
ADD COLUMN     "importTokenId" VARCHAR(100),
ADD COLUMN     "type" "TokenOriginalType" NOT NULL DEFAULT E'LOCAL';

-- CreateIndex
CREATE INDEX "TokenOriginal_type_idx" ON "TokenOriginal"("type");

-- CreateIndex
CREATE INDEX "TokenOriginal_status_idx" ON "TokenOriginal"("status");

-- CreateIndex
CREATE INDEX "TokenOriginal_importAddr_idx" ON "TokenOriginal"("importAddr");

-- CreateIndex
CREATE INDEX "TokenOriginal_importAddr_importTokenId_idx" ON "TokenOriginal"("importAddr", "importTokenId");
