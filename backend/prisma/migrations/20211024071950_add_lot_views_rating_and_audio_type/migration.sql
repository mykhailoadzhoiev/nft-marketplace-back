-- AlterEnum
ALTER TYPE "MediaType" ADD VALUE 'AUDIO';

-- AlterTable
ALTER TABLE "Lot" ADD COLUMN     "viewsRating" INTEGER NOT NULL DEFAULT 0;

-- CreateIndex
CREATE INDEX "Lot.viewsRating_index" ON "Lot"("viewsRating");
