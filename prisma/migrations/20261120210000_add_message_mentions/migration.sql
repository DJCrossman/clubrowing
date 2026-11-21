-- CreateTable
CREATE TABLE "message_mention" (
    "id" TEXT NOT NULL DEFAULT generate_id('men_'::text),
    "messageId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "start" INTEGER NOT NULL,
    "length" INTEGER NOT NULL,

    CONSTRAINT "message_mention_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "message_mention_userId_idx" ON "message_mention"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "message_mention_messageId_start_key" ON "message_mention"("messageId", "start");

-- AddForeignKey
ALTER TABLE "message_mention" ADD CONSTRAINT "message_mention_messageId_fkey" FOREIGN KEY ("messageId") REFERENCES "message"("id") ON DELETE CASCADE ON UPDATE CASCADE;
