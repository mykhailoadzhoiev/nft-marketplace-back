-- DropForeignKey
ALTER TABLE "Authorization" DROP CONSTRAINT "Authorization_userId_fkey";

-- DropForeignKey
ALTER TABLE "HiddenTokenOriginal" DROP CONSTRAINT "HiddenTokenOriginal_tokenOriginalId_fkey";

-- DropForeignKey
ALTER TABLE "HiddenTokenOriginal" DROP CONSTRAINT "HiddenTokenOriginal_userId_fkey";

-- DropForeignKey
ALTER TABLE "IpfsObjectThumb" DROP CONSTRAINT "IpfsObjectThumb_orgIpfsObjectId_fkey";

-- DropForeignKey
ALTER TABLE "IpfsObjectThumb" DROP CONSTRAINT "IpfsObjectThumb_thumbIpfsObjectId_fkey";

-- DropForeignKey
ALTER TABLE "Lot" DROP CONSTRAINT "Lot_tokenOriginalId_fkey";

-- DropForeignKey
ALTER TABLE "Lot" DROP CONSTRAINT "Lot_userId_fkey";

-- DropForeignKey
ALTER TABLE "LotBet" DROP CONSTRAINT "LotBet_lotId_fkey";

-- DropForeignKey
ALTER TABLE "LotBet" DROP CONSTRAINT "LotBet_userId_fkey";

-- DropForeignKey
ALTER TABLE "LotToken" DROP CONSTRAINT "LotToken_lotId_fkey";

-- DropForeignKey
ALTER TABLE "LotToken" DROP CONSTRAINT "LotToken_tokenNftId_fkey";

-- DropForeignKey
ALTER TABLE "TokenHistory" DROP CONSTRAINT "TokenHistory_tokenOriginalId_fkey";

-- DropForeignKey
ALTER TABLE "TokenMedia" DROP CONSTRAINT "TokenMedia_ipfsObjectId_fkey";

-- DropForeignKey
ALTER TABLE "TokenMedia" DROP CONSTRAINT "TokenMedia_tokenOriginalId_fkey";

-- DropForeignKey
ALTER TABLE "TokenNFT" DROP CONSTRAINT "TokenNFT_tokenOriginalId_fkey";

-- DropForeignKey
ALTER TABLE "TokenNFT" DROP CONSTRAINT "TokenNFT_userId_fkey";

-- DropForeignKey
ALTER TABLE "TokenOriginal" DROP CONSTRAINT "TokenOriginal_userId_fkey";

-- DropForeignKey
ALTER TABLE "UserToUser" DROP CONSTRAINT "UserToUser_followerId_fkey";

-- DropForeignKey
ALTER TABLE "UserToUser" DROP CONSTRAINT "UserToUser_userId_fkey";

-- AddForeignKey
ALTER TABLE "UserToUser" ADD CONSTRAINT "UserToUser_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "UserToUser" ADD CONSTRAINT "UserToUser_followerId_fkey" FOREIGN KEY ("followerId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Authorization" ADD CONSTRAINT "Authorization_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TokenOriginal" ADD CONSTRAINT "TokenOriginal_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "HiddenTokenOriginal" ADD CONSTRAINT "HiddenTokenOriginal_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "HiddenTokenOriginal" ADD CONSTRAINT "HiddenTokenOriginal_tokenOriginalId_fkey" FOREIGN KEY ("tokenOriginalId") REFERENCES "TokenOriginal"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TokenNFT" ADD CONSTRAINT "TokenNFT_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TokenNFT" ADD CONSTRAINT "TokenNFT_tokenOriginalId_fkey" FOREIGN KEY ("tokenOriginalId") REFERENCES "TokenOriginal"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TokenHistory" ADD CONSTRAINT "TokenHistory_tokenOriginalId_fkey" FOREIGN KEY ("tokenOriginalId") REFERENCES "TokenOriginal"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TokenMedia" ADD CONSTRAINT "TokenMedia_tokenOriginalId_fkey" FOREIGN KEY ("tokenOriginalId") REFERENCES "TokenOriginal"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TokenMedia" ADD CONSTRAINT "TokenMedia_ipfsObjectId_fkey" FOREIGN KEY ("ipfsObjectId") REFERENCES "IpfsObject"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Lot" ADD CONSTRAINT "Lot_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Lot" ADD CONSTRAINT "Lot_tokenOriginalId_fkey" FOREIGN KEY ("tokenOriginalId") REFERENCES "TokenOriginal"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LotBet" ADD CONSTRAINT "LotBet_lotId_fkey" FOREIGN KEY ("lotId") REFERENCES "Lot"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LotBet" ADD CONSTRAINT "LotBet_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LotToken" ADD CONSTRAINT "LotToken_lotId_fkey" FOREIGN KEY ("lotId") REFERENCES "Lot"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LotToken" ADD CONSTRAINT "LotToken_tokenNftId_fkey" FOREIGN KEY ("tokenNftId") REFERENCES "TokenNFT"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "IpfsObjectThumb" ADD CONSTRAINT "IpfsObjectThumb_orgIpfsObjectId_fkey" FOREIGN KEY ("orgIpfsObjectId") REFERENCES "IpfsObject"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "IpfsObjectThumb" ADD CONSTRAINT "IpfsObjectThumb_thumbIpfsObjectId_fkey" FOREIGN KEY ("thumbIpfsObjectId") REFERENCES "IpfsObject"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- RenameIndex
ALTER INDEX "Authorization.tokenUid_unique" RENAME TO "Authorization_tokenUid_key";

-- RenameIndex
ALTER INDEX "HiddenTokenOriginal.userId_tokenOriginalId_unique" RENAME TO "HiddenTokenOriginal_userId_tokenOriginalId_key";

-- RenameIndex
ALTER INDEX "IpfsObject.isBanned_index" RENAME TO "IpfsObject_isBanned_idx";

-- RenameIndex
ALTER INDEX "IpfsObject.sha256_index" RENAME TO "IpfsObject_sha256_idx";

-- RenameIndex
ALTER INDEX "IpfsObjectThumb.orgIpfsObjectId_index" RENAME TO "IpfsObjectThumb_orgIpfsObjectId_idx";

-- RenameIndex
ALTER INDEX "IpfsObjectThumb.orgIpfsObjectId_thumbName_unique" RENAME TO "IpfsObjectThumb_orgIpfsObjectId_thumbName_key";

-- RenameIndex
ALTER INDEX "Lot.isTop_index" RENAME TO "Lot_isTop_idx";

-- RenameIndex
ALTER INDEX "Lot.lastActiveAt_index" RENAME TO "Lot_lastActiveAt_idx";

-- RenameIndex
ALTER INDEX "Lot.status_index" RENAME TO "Lot_status_idx";

-- RenameIndex
ALTER INDEX "Lot.userId_index" RENAME TO "Lot_userId_idx";

-- RenameIndex
ALTER INDEX "Lot.viewsRating_index" RENAME TO "Lot_viewsRating_idx";

-- RenameIndex
ALTER INDEX "LotBet.isCancel_index" RENAME TO "LotBet_isCancel_idx";

-- RenameIndex
ALTER INDEX "LotBet.lotId_index" RENAME TO "LotBet_lotId_idx";

-- RenameIndex
ALTER INDEX "LotBet.lotId_userId_index" RENAME TO "LotBet_lotId_userId_idx";

-- RenameIndex
ALTER INDEX "LotBet.userId_index" RENAME TO "LotBet_userId_idx";

-- RenameIndex
ALTER INDEX "Setting.collection_index" RENAME TO "Setting_collection_idx";

-- RenameIndex
ALTER INDEX "Setting.name_index" RENAME TO "Setting_name_idx";

-- RenameIndex
ALTER INDEX "Task.isActive_index" RENAME TO "Task_isActive_idx";

-- RenameIndex
ALTER INDEX "Task.type_index" RENAME TO "Task_type_idx";

-- RenameIndex
ALTER INDEX "TokenMedia.ipfsObjectId_index" RENAME TO "TokenMedia_ipfsObjectId_idx";

-- RenameIndex
ALTER INDEX "TokenMedia.tokenOriginalId_index" RENAME TO "TokenMedia_tokenOriginalId_idx";

-- RenameIndex
ALTER INDEX "TokenMedia.tokenOriginalId_isOriginal_isConverted_isPreview_isC" RENAME TO "TokenMedia_tokenOriginalId_isOriginal_isConverted_isPreview_key";

-- RenameIndex
ALTER INDEX "TokenNFT.token_unique" RENAME TO "TokenNFT_token_key";

-- RenameIndex
ALTER INDEX "User.email_unique" RENAME TO "User_email_key";

-- RenameIndex
ALTER INDEX "User.featuredIndex_index" RENAME TO "User_featuredIndex_idx";

-- RenameIndex
ALTER INDEX "User.metaName_unique" RENAME TO "User_metaName_key";

-- RenameIndex
ALTER INDEX "User.metamaskAddress_unique" RENAME TO "User_metamaskAddress_key";

-- RenameIndex
ALTER INDEX "UserToUser.userId_followerId_unique" RENAME TO "UserToUser_userId_followerId_key";
