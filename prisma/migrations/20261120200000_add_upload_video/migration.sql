-- AlterTable
ALTER TABLE "upload" ADD COLUMN     "contentType" TEXT,
ADD COLUMN     "durationMs" INTEGER,
ADD COLUMN     "height" INTEGER,
ADD COLUMN     "pending" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "width" INTEGER;

-- CreateTable
CREATE TABLE "video_playback" (
    "id" TEXT NOT NULL DEFAULT generate_id('vpb_'::text),
    "uploadId" TEXT,
    "userId" TEXT NOT NULL,
    "bytes" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "video_playback_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "video_playback_createdAt_idx" ON "video_playback"("createdAt");

-- CreateIndex
CREATE INDEX "video_playback_uploadId_userId_createdAt_idx" ON "video_playback"("uploadId", "userId", "createdAt");

-- AddForeignKey
ALTER TABLE "video_playback" ADD CONSTRAINT "video_playback_uploadId_fkey" FOREIGN KEY ("uploadId") REFERENCES "upload"("id") ON DELETE SET NULL ON UPDATE CASCADE;
