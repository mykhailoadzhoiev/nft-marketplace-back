/*
  Warnings:

  - You are about to drop the column `lastBetAt` on the `Lot` table. All the data in the column will be lost.

*/
-- DropIndex
DROP INDEX "Lot.lastBetAt_index";

-- AlterTable
ALTER TABLE "Lot" DROP COLUMN "lastBetAt",
ADD COLUMN     "lastActiveAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP;

-- CreateIndex
CREATE INDEX "Lot.lastActiveAt_index" ON "Lot"("lastActiveAt");
