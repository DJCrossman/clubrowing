-- CreateEnum
CREATE TYPE "ErgOwnership" AS ENUM ('club', 'personal');

-- AlterTable
ALTER TABLE "erg" ADD COLUMN     "ownerId" TEXT,
ADD COLUMN     "ownership" "ErgOwnership" NOT NULL DEFAULT 'club';

-- AddForeignKey
ALTER TABLE "erg" ADD CONSTRAINT "erg_ownerId_fkey" FOREIGN KEY ("ownerId") REFERENCES "athlete"("id") ON DELETE SET NULL ON UPDATE CASCADE;
