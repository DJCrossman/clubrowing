-- AlterTable
ALTER TABLE "activity" ADD COLUMN     "screenshotId" TEXT;

-- CreateIndex
CREATE UNIQUE INDEX "activity_screenshotId_key" ON "activity"("screenshotId");

-- AddForeignKey
ALTER TABLE "activity" ADD CONSTRAINT "activity_screenshotId_fkey" FOREIGN KEY ("screenshotId") REFERENCES "upload"("id") ON DELETE SET NULL ON UPDATE CASCADE;
