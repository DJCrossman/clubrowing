
-- CreateTable
CREATE TABLE "activity_strokes" (
    "id" TEXT NOT NULL DEFAULT generate_id('act_strk_'::text),
    "activityId" TEXT NOT NULL,
    "strokes" JSONB NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "activity_strokes_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "activity_strokes_activityId_key" ON "activity_strokes"("activityId");

-- AddForeignKey
ALTER TABLE "activity_strokes" ADD CONSTRAINT "activity_strokes_activityId_fkey" FOREIGN KEY ("activityId") REFERENCES "activity"("id") ON DELETE CASCADE ON UPDATE CASCADE;

