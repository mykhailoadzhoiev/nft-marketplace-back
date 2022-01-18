-- AlterTable
ALTER TABLE "User" ADD COLUMN     "backgroundId" BIGINT;

-- AddForeignKey
ALTER TABLE "User" ADD CONSTRAINT "User_backgroundId_fkey" FOREIGN KEY ("backgroundId") REFERENCES "IpfsObject"("id") ON DELETE SET NULL ON UPDATE CASCADE;
