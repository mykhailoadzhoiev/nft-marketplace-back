-- CreateTable
CREATE TABLE "UserToUser" (
    "id" BIGSERIAL NOT NULL,
    "userId" BIGINT NOT NULL,
    "followerId" BIGINT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "UserToUser.userId_followerId_unique" ON "UserToUser"("userId", "followerId");

-- AddForeignKey
ALTER TABLE "UserToUser" ADD FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "UserToUser" ADD FOREIGN KEY ("followerId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
