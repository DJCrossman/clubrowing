
-- CreateTable
CREATE TABLE "upload" (
    "id" TEXT NOT NULL DEFAULT generate_id('upl_'::text),
    "userId" TEXT NOT NULL,
    "url" TEXT NOT NULL,
    "size" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "upload_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "upload_userId_createdAt_idx" ON "upload"("userId", "createdAt");
