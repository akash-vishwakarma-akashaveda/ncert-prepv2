-- AlterTable
ALTER TABLE "User" ADD COLUMN     "referralCode" TEXT,
ADD COLUMN     "referredByCode" TEXT;

-- CreateTable
CREATE TABLE "VideoWatchStat" (
    "id" TEXT NOT NULL,
    "youtubeId" TEXT NOT NULL,
    "day" TEXT NOT NULL,
    "secondsWatched" INTEGER NOT NULL DEFAULT 0,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "VideoWatchStat_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "VideoWatchStat_day_idx" ON "VideoWatchStat"("day");

-- CreateIndex
CREATE UNIQUE INDEX "VideoWatchStat_youtubeId_day_key" ON "VideoWatchStat"("youtubeId", "day");

-- CreateIndex
CREATE UNIQUE INDEX "User_referralCode_key" ON "User"("referralCode");

-- CreateIndex
CREATE INDEX "User_referredByCode_idx" ON "User"("referredByCode");
