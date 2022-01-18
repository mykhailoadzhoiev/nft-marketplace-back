-- AlterEnum
ALTER TYPE "TokenHistoryType" ADD VALUE 'LOT_BET_CREATED';

-- CreateTable
CREATE TABLE "HiddenTokenOriginal" (
    "id" BIGSERIAL NOT NULL,
    "userId" BIGINT NOT NULL,
    "tokenOriginalId" BIGINT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "HiddenTokenOriginal.userId_tokenOriginalId_unique" ON "HiddenTokenOriginal"("userId", "tokenOriginalId");

-- AddForeignKey
ALTER TABLE "HiddenTokenOriginal" ADD FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "HiddenTokenOriginal" ADD FOREIGN KEY ("tokenOriginalId") REFERENCES "TokenOriginal"("id") ON DELETE CASCADE ON UPDATE CASCADE;
