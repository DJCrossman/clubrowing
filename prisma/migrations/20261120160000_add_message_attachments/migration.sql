-- AlterTable
ALTER TABLE "upload" ADD COLUMN "messageId" TEXT;
ALTER TABLE "upload" ADD COLUMN "name" TEXT;

-- CreateIndex
CREATE INDEX "upload_messageId_idx" ON "upload"("messageId");

-- AddForeignKey
ALTER TABLE "upload" ADD CONSTRAINT "upload_messageId_fkey" FOREIGN KEY ("messageId") REFERENCES "message"("id") ON DELETE SET NULL ON UPDATE CASCADE;
