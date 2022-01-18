-- AlterEnum
ALTER TYPE "LotSaleType" ADD VALUE 'SALE';

-- AlterEnum
ALTER TYPE "TaskType" ADD VALUE 'LOT_BUY_TOKEN';

-- AlterEnum
ALTER TYPE "TokenHistoryType" ADD VALUE 'NFT_TOKEN_CHANGED_OWNER_SALE';

-- AlterTable
ALTER TABLE "Lot" ADD COLUMN     "isUseTimer" BOOLEAN NOT NULL DEFAULT false;

-- AlterTable
ALTER TABLE "LotToken" ADD COLUMN     "isProcessin" BOOLEAN NOT NULL DEFAULT false;
