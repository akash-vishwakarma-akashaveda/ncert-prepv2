/*
  Warnings:

  - You are about to drop the column `chapter` on the `Video` table. All the data in the column will be lost.
  - You are about to drop the column `classGrade` on the `Video` table. All the data in the column will be lost.
  - You are about to drop the column `order` on the `Video` table. All the data in the column will be lost.
  - You are about to drop the column `title` on the `Video` table. All the data in the column will be lost.
  - Added the required column `chapterId` to the `Video` table without a default value. This is not possible if the table is not empty.
  - Added the required column `chapterName` to the `Video` table without a default value. This is not possible if the table is not empty.
  - Added the required column `classDisplay` to the `Video` table without a default value. This is not possible if the table is not empty.
  - Added the required column `classSort` to the `Video` table without a default value. This is not possible if the table is not empty.
  - Added the required column `videoTitle` to the `Video` table without a default value. This is not possible if the table is not empty.

*/
-- DropIndex
DROP INDEX "Video_classGrade_subject_chapter_idx";

-- AlterTable
ALTER TABLE "Video" DROP COLUMN "chapter",
DROP COLUMN "classGrade",
DROP COLUMN "order",
DROP COLUMN "title",
ADD COLUMN     "chapterId" TEXT NOT NULL,
ADD COLUMN     "chapterName" TEXT NOT NULL,
ADD COLUMN     "classDisplay" TEXT NOT NULL,
ADD COLUMN     "classSort" TEXT NOT NULL,
ADD COLUMN     "contentHash" TEXT NOT NULL DEFAULT '',
ADD COLUMN     "isPremium" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "pdfUrl" TEXT NOT NULL DEFAULT '',
ADD COLUMN     "pyqAvailable" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "syncedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
ADD COLUMN     "textbook" TEXT NOT NULL DEFAULT '',
ADD COLUMN     "timestamps" TEXT NOT NULL DEFAULT '',
ADD COLUMN     "videoTitle" TEXT NOT NULL,
ADD COLUMN     "ytPublic" BOOLEAN NOT NULL DEFAULT true;

-- CreateIndex
CREATE INDEX "Video_classSort_subject_chapterId_idx" ON "Video"("classSort", "subject", "chapterId");
