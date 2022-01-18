-- AlterTable
ALTER TABLE "Lot" ADD COLUMN     "marketplaceVer" INTEGER NOT NULL DEFAULT 1;

-- AlterTable
ALTER TABLE "TokenOriginal" ADD COLUMN     "creatorReward" INTEGER NOT NULL DEFAULT 10;
