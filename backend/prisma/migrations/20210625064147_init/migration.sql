-- CreateEnum
CREATE TYPE "UserRole" AS ENUM ('GUEST', 'USER', 'MODERATOR', 'ADMIN');

-- CreateEnum
CREATE TYPE "TaskType" AS ENUM ('SEND_EMAIL', 'ORG_PROCESSING', 'ORG_TOKENS', 'LOT_POST_CLOSE');

-- CreateEnum
CREATE TYPE "SettingColection" AS ENUM ('NONE', 'FRONT');

-- CreateEnum
CREATE TYPE "SettingType" AS ENUM ('STRING', 'INTEGER', 'DESIMAL', 'BOOL', 'TEXT');

-- CreateEnum
CREATE TYPE "MediaType" AS ENUM ('IMAGE', 'VIDEO');

-- CreateEnum
CREATE TYPE "TokenOriginalStatus" AS ENUM ('BAN', 'DRAFT', 'VALIDATION', 'TASK', 'PUBLISHED');

-- CreateEnum
CREATE TYPE "TokenHistoryType" AS ENUM ('ORG_PUBLISHED', 'LOT_CREATED', 'LOT_CLOSED', 'NFT_TOKEN_ADDED', 'NFT_TOKEN_PUT_UP_FOR_SALE', 'NFT_TOKEN_CHANGED_OWNER_BET');

-- CreateEnum
CREATE TYPE "CurrencyType" AS ENUM ('BNB');

-- CreateEnum
CREATE TYPE "LotSaleType" AS ENUM ('AUCTION');

-- CreateEnum
CREATE TYPE "LotStatus" AS ENUM ('IN_SALES', 'CLOSED');

-- CreateEnum
CREATE TYPE "IpfsObjectLocation" AS ENUM ('S3_MAIN');

-- CreateTable
CREATE TABLE "Seed" (
    "id" SERIAL NOT NULL,
    "seed" VARCHAR(255) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "User" (
    "id" BIGSERIAL NOT NULL,
    "role" "UserRole" NOT NULL DEFAULT E'USER',
    "email" VARCHAR(255),
    "emailActivatedAt" TIMESTAMP(3),
    "passwordHash" VARCHAR(72) NOT NULL,
    "metaName" VARCHAR(16),
    "name" VARCHAR(64) NOT NULL DEFAULT E'',
    "description" TEXT NOT NULL DEFAULT E'',
    "avatarId" BIGINT,
    "metamaskAddress" VARCHAR(64),
    "metamaskMessage" TEXT,
    "metamaskSignature" TEXT,
    "socialTwitch" VARCHAR(255) NOT NULL DEFAULT E'',
    "socialInstagram" VARCHAR(255) NOT NULL DEFAULT E'',
    "socialTwitter" VARCHAR(255) NOT NULL DEFAULT E'',
    "socialOnlyfans" VARCHAR(255) NOT NULL DEFAULT E'',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Task" (
    "id" BIGSERIAL NOT NULL,
    "type" "TaskType" NOT NULL DEFAULT E'SEND_EMAIL',
    "data" JSONB NOT NULL,
    "attempts" SMALLINT NOT NULL DEFAULT 0,
    "forNodeUid" VARCHAR(32),
    "isActive" BOOLEAN NOT NULL DEFAULT false,
    "isFail" BOOLEAN NOT NULL DEFAULT false,
    "lastStartAt" TIMESTAMP(3),
    "failAt" TIMESTAMP(3),
    "errorText" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Setting" (
    "id" BIGSERIAL NOT NULL,
    "collection" "SettingColection" NOT NULL DEFAULT E'NONE',
    "type" "SettingType" NOT NULL DEFAULT E'STRING',
    "name" VARCHAR(255) NOT NULL,
    "value" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Authorization" (
    "id" BIGSERIAL NOT NULL,
    "tokenUid" VARCHAR(32) NOT NULL,
    "expirationAt" TIMESTAMP(3) NOT NULL,
    "userId" BIGINT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TokenOriginal" (
    "id" BIGSERIAL NOT NULL,
    "status" "TokenOriginalStatus" NOT NULL DEFAULT E'DRAFT',
    "userId" BIGINT NOT NULL,
    "contentType" "MediaType" NOT NULL,
    "categoryId" BIGINT,
    "name" VARCHAR(255) NOT NULL,
    "description" TEXT NOT NULL,
    "moderatorMessage" TEXT,
    "isUseCensored" BOOLEAN NOT NULL DEFAULT false,
    "itsProcessed" BOOLEAN NOT NULL DEFAULT false,
    "copiesTotal" INTEGER NOT NULL DEFAULT 1,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TokenNFT" (
    "id" BIGSERIAL NOT NULL,
    "userId" BIGINT NOT NULL,
    "tokenOriginalId" BIGINT NOT NULL,
    "token" VARCHAR(100) NOT NULL,
    "index" INTEGER NOT NULL,
    "currentLotId" BIGINT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TokenHistory" (
    "id" BIGSERIAL NOT NULL,
    "type" "TokenHistoryType" NOT NULL,
    "tokenOriginalId" BIGINT NOT NULL,
    "tokenNftId" BIGINT,
    "userId" BIGINT,
    "lotId" BIGINT,
    "betId" BIGINT,
    "buyPrice" DECIMAL(64,0),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TokenMedia" (
    "id" BIGSERIAL NOT NULL,
    "tokenOriginalId" BIGINT NOT NULL,
    "ipfsObjectId" BIGINT NOT NULL,
    "type" "MediaType" NOT NULL,
    "isOriginal" BOOLEAN NOT NULL DEFAULT false,
    "isConverted" BOOLEAN NOT NULL DEFAULT false,
    "isPreview" BOOLEAN NOT NULL DEFAULT false,
    "isCensored" BOOLEAN NOT NULL DEFAULT false,
    "isWatermark" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "MarketCategory" (
    "id" BIGSERIAL NOT NULL,
    "name" VARCHAR(255) NOT NULL,

    PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Lot" (
    "id" BIGSERIAL NOT NULL,
    "saleType" "LotSaleType" NOT NULL DEFAULT E'AUCTION',
    "status" "LotStatus" NOT NULL DEFAULT E'IN_SALES',
    "tokenOriginalId" BIGINT NOT NULL,
    "userId" BIGINT NOT NULL,
    "currencyType" "CurrencyType" NOT NULL DEFAULT E'BNB',
    "minimalCost" DECIMAL(64,0) NOT NULL,
    "currentCost" DECIMAL(64,0) NOT NULL,
    "sellerSignsData" JSONB NOT NULL,
    "copiesSold" INTEGER NOT NULL DEFAULT 0,
    "copiesTotal" INTEGER NOT NULL DEFAULT 1,
    "expiresAt" TIMESTAMP(3),
    "lastBetAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "LotBet" (
    "id" BIGSERIAL NOT NULL,
    "userId" BIGINT NOT NULL,
    "lotId" BIGINT NOT NULL,
    "tokenNftId" BIGINT,
    "isWin" BOOLEAN NOT NULL DEFAULT false,
    "currencyType" "CurrencyType" NOT NULL DEFAULT E'BNB',
    "betAmount" DECIMAL(64,0) NOT NULL,
    "buyerSignsData" JSONB NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "LotToken" (
    "id" BIGSERIAL NOT NULL,
    "lotId" BIGINT NOT NULL,
    "tokenNftId" BIGINT NOT NULL,
    "isSold" BOOLEAN NOT NULL DEFAULT false,

    PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "IpfsObject" (
    "id" BIGSERIAL NOT NULL,
    "sha256" VARCHAR(64) NOT NULL,
    "location" "IpfsObjectLocation" NOT NULL DEFAULT E'S3_MAIN',
    "mime" VARCHAR(255) NOT NULL,
    "size" INTEGER NOT NULL,
    "width" INTEGER NOT NULL,
    "height" INTEGER NOT NULL,
    "type" "MediaType" NOT NULL,
    "isThumb" BOOLEAN NOT NULL DEFAULT false,
    "isBanned" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "IpfsObjectThumb" (
    "id" BIGSERIAL NOT NULL,
    "orgIpfsObjectId" BIGINT NOT NULL,
    "thumbIpfsObjectId" BIGINT NOT NULL,
    "thumbSize" INTEGER NOT NULL,

    PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "User.email_unique" ON "User"("email");

-- CreateIndex
CREATE UNIQUE INDEX "User.metaName_unique" ON "User"("metaName");

-- CreateIndex
CREATE UNIQUE INDEX "User.metamaskAddress_unique" ON "User"("metamaskAddress");

-- CreateIndex
CREATE INDEX "Task.type_index" ON "Task"("type");

-- CreateIndex
CREATE INDEX "Task.isActive_index" ON "Task"("isActive");

-- CreateIndex
CREATE INDEX "Setting.collection_index" ON "Setting"("collection");

-- CreateIndex
CREATE INDEX "Setting.name_index" ON "Setting"("name");

-- CreateIndex
CREATE UNIQUE INDEX "Authorization.tokenUid_unique" ON "Authorization"("tokenUid");

-- CreateIndex
CREATE UNIQUE INDEX "TokenNFT.token_unique" ON "TokenNFT"("token");

-- CreateIndex
CREATE INDEX "TokenMedia.tokenOriginalId_index" ON "TokenMedia"("tokenOriginalId");

-- CreateIndex
CREATE INDEX "TokenMedia.ipfsObjectId_index" ON "TokenMedia"("ipfsObjectId");

-- CreateIndex
CREATE UNIQUE INDEX "TokenMedia.tokenOriginalId_isOriginal_isConverted_isPreview_isCensored_isWatermark_unique" ON "TokenMedia"("tokenOriginalId", "isOriginal", "isConverted", "isPreview", "isCensored", "isWatermark");

-- CreateIndex
CREATE INDEX "Lot.status_index" ON "Lot"("status");

-- CreateIndex
CREATE INDEX "Lot.lastBetAt_index" ON "Lot"("lastBetAt");

-- CreateIndex
CREATE INDEX "Lot.userId_index" ON "Lot"("userId");

-- CreateIndex
CREATE INDEX "LotBet.lotId_index" ON "LotBet"("lotId");

-- CreateIndex
CREATE INDEX "LotBet.userId_index" ON "LotBet"("userId");

-- CreateIndex
CREATE INDEX "LotBet.lotId_userId_index" ON "LotBet"("lotId", "userId");

-- CreateIndex
CREATE INDEX "IpfsObject.sha256_index" ON "IpfsObject"("sha256");

-- CreateIndex
CREATE INDEX "IpfsObject.isBanned_index" ON "IpfsObject"("isBanned");

-- CreateIndex
CREATE INDEX "IpfsObjectThumb.orgIpfsObjectId_index" ON "IpfsObjectThumb"("orgIpfsObjectId");

-- CreateIndex
CREATE UNIQUE INDEX "IpfsObjectThumb.orgIpfsObjectId_thumbSize_unique" ON "IpfsObjectThumb"("orgIpfsObjectId", "thumbSize");

-- AddForeignKey
ALTER TABLE "User" ADD FOREIGN KEY ("avatarId") REFERENCES "IpfsObject"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Authorization" ADD FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TokenOriginal" ADD FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TokenNFT" ADD FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TokenNFT" ADD FOREIGN KEY ("tokenOriginalId") REFERENCES "TokenOriginal"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TokenNFT" ADD FOREIGN KEY ("currentLotId") REFERENCES "Lot"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TokenHistory" ADD FOREIGN KEY ("tokenOriginalId") REFERENCES "TokenOriginal"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TokenHistory" ADD FOREIGN KEY ("tokenNftId") REFERENCES "TokenNFT"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TokenHistory" ADD FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TokenHistory" ADD FOREIGN KEY ("lotId") REFERENCES "Lot"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TokenHistory" ADD FOREIGN KEY ("betId") REFERENCES "LotBet"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TokenMedia" ADD FOREIGN KEY ("tokenOriginalId") REFERENCES "TokenOriginal"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TokenMedia" ADD FOREIGN KEY ("ipfsObjectId") REFERENCES "IpfsObject"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Lot" ADD FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Lot" ADD FOREIGN KEY ("tokenOriginalId") REFERENCES "TokenOriginal"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LotBet" ADD FOREIGN KEY ("lotId") REFERENCES "Lot"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LotBet" ADD FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LotBet" ADD FOREIGN KEY ("tokenNftId") REFERENCES "TokenNFT"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LotToken" ADD FOREIGN KEY ("lotId") REFERENCES "Lot"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LotToken" ADD FOREIGN KEY ("tokenNftId") REFERENCES "TokenNFT"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "IpfsObjectThumb" ADD FOREIGN KEY ("orgIpfsObjectId") REFERENCES "IpfsObject"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "IpfsObjectThumb" ADD FOREIGN KEY ("thumbIpfsObjectId") REFERENCES "IpfsObject"("id") ON DELETE CASCADE ON UPDATE CASCADE;
