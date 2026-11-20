-- AlterTable
ALTER TABLE "upload" ADD COLUMN "previewOfId" TEXT;

-- CreateIndex
CREATE UNIQUE INDEX "upload_previewOfId_key" ON "upload"("previewOfId");

-- AddForeignKey
ALTER TABLE "upload" ADD CONSTRAINT "upload_previewOfId_fkey" FOREIGN KEY ("previewOfId") REFERENCES "upload"("id") ON DELETE SET NULL ON UPDATE CASCADE;
