/*
  Warnings:

  - You are about to drop the column `thumbSize` on the `IpfsObjectThumb` table. All the data in the column will be lost.
  - You are about to drop the column `currencyType` on the `Lot` table. All the data in the column will be lost.
  - You are about to drop the column `currencyType` on the `LotBet` table. All the data in the column will be lost.
  - A unique constraint covering the columns `[orgIpfsObjectId,thumbName]` on the table `IpfsObjectThumb` will be added. If there are existing duplicate values, this will fail.
  - Added the required column `thumbName` to the `IpfsObjectThumb` table without a default value. This is not possible if the table is not empty.

*/
-- DropIndex
DROP INDEX "IpfsObjectThumb.orgIpfsObjectId_thumbSize_unique";

-- AlterTable
ALTER TABLE "IpfsObjectThumb" DROP COLUMN "thumbSize",
ADD COLUMN     "thumbName" VARCHAR(32) NOT NULL;

-- AlterTable
ALTER TABLE "Lot" DROP COLUMN "currencyType",
ADD COLUMN     "isTop" BOOLEAN NOT NULL DEFAULT false;

-- AlterTable
ALTER TABLE "LotBet" DROP COLUMN "currencyType";

-- AlterTable
ALTER TABLE "TokenHistory" ADD COLUMN     "oldOwnerId" BIGINT;

-- AlterTable
ALTER TABLE "User" ADD COLUMN     "totalSalesProfit" DECIMAL(64,0) DEFAULT 0;

-- DropEnum
DROP TYPE "CurrencyType";

-- CreateIndex
CREATE UNIQUE INDEX "IpfsObjectThumb.orgIpfsObjectId_thumbName_unique" ON "IpfsObjectThumb"("orgIpfsObjectId", "thumbName");

-- CreateIndex
CREATE INDEX "Lot.isTop_index" ON "Lot"("isTop");

-- AddForeignKey
ALTER TABLE "TokenHistory" ADD FOREIGN KEY ("oldOwnerId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
