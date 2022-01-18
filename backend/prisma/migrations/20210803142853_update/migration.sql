/*
  Warnings:

  - Made the column `totalSalesProfit` on table `User` required. This step will fail if there are existing NULL values in that column.

*/
-- AlterEnum
ALTER TYPE "TokenHistoryType" ADD VALUE 'LOT_BET_CANCEL';

-- AlterTable
ALTER TABLE "LotBet" ADD COLUMN     "isCancel" BOOLEAN NOT NULL DEFAULT false;

-- AlterTable
ALTER TABLE "TokenOriginal" ADD COLUMN     "isCommercial" BOOLEAN NOT NULL DEFAULT false;

-- AlterTable
ALTER TABLE "User" ADD COLUMN     "featuredIndex" SMALLINT,
ALTER COLUMN "totalSalesProfit" SET NOT NULL;

-- CreateIndex
CREATE INDEX "LotBet.isCancel_index" ON "LotBet"("isCancel");

-- CreateIndex
CREATE INDEX "User.featuredIndex_index" ON "User"("featuredIndex");
