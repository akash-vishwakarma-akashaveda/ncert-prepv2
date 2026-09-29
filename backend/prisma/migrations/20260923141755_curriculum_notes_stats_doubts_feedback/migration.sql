/*
  Warnings:

  - You are about to drop the column `attachmentUrl` on the `ChapterNote` table. All the data in the column will be lost.
  - You are about to drop the column `chapterKey` on the `ChapterNote` table. All the data in the column will be lost.
  - You are about to drop the column `classGrade` on the `ChapterNote` table. All the data in the column will be lost.
  - You are about to drop the column `name` on the `CurriculumChapter` table. All the data in the column will be lost.
  - You are about to drop the column `subjectId` on the `CurriculumChapter` table. All the data in the column will be lost.
  - You are about to drop the column `classId` on the `CurriculumSubject` table. All the data in the column will be lost.
  - You are about to drop the column `comment` on the `Feedback` table. All the data in the column will be lost.
  - You are about to drop the column `rating` on the `Feedback` table. All the data in the column will be lost.
  - You are about to drop the column `activeUsers` on the `StatsDaily` table. All the data in the column will be lost.
  - You are about to drop the column `lessonsWatched` on the `StatsTotal` table. All the data in the column will be lost.
  - Added the required column `chapterId` to the `ChapterNote` table without a default value. This is not possible if the table is not empty.
  - Added the required column `chapterName` to the `ChapterNote` table without a default value. This is not possible if the table is not empty.
  - Added the required column `classSort` to the `ChapterNote` table without a default value. This is not possible if the table is not empty.
  - Added the required column `subject` to the `ChapterNote` table without a default value. This is not possible if the table is not empty.
  - Added the required column `summary` to the `ChapterNote` table without a default value. This is not possible if the table is not empty.
  - Added the required column `title` to the `ChapterNote` table without a default value. This is not possible if the table is not empty.
  - Added the required column `chapterId` to the `CurriculumChapter` table without a default value. This is not possible if the table is not empty.
  - Added the required column `chapterName` to the `CurriculumChapter` table without a default value. This is not possible if the table is not empty.
  - Added the required column `classSort` to the `CurriculumChapter` table without a default value. This is not possible if the table is not empty.
  - Added the required column `subject` to the `CurriculumChapter` table without a default value. This is not possible if the table is not empty.
  - Added the required column `updatedAt` to the `CurriculumChapter` table without a default value. This is not possible if the table is not empty.
  - Added the required column `classSort` to the `CurriculumClass` table without a default value. This is not possible if the table is not empty.
  - Added the required column `updatedAt` to the `CurriculumClass` table without a default value. This is not possible if the table is not empty.
  - Added the required column `classSort` to the `CurriculumSubject` table without a default value. This is not possible if the table is not empty.
  - Added the required column `updatedAt` to the `CurriculumSubject` table without a default value. This is not possible if the table is not empty.
  - Added the required column `chapterId` to the `Doubt` table without a default value. This is not possible if the table is not empty.
  - Added the required column `chapterName` to the `Doubt` table without a default value. This is not possible if the table is not empty.
  - Added the required column `classSort` to the `Doubt` table without a default value. This is not possible if the table is not empty.
  - Added the required column `subject` to the `Doubt` table without a default value. This is not possible if the table is not empty.
  - Added the required column `updatedAt` to the `Doubt` table without a default value. This is not possible if the table is not empty.
  - Added the required column `videoTitle` to the `Doubt` table without a default value. This is not possible if the table is not empty.
  - Added the required column `youtubeId` to the `Doubt` table without a default value. This is not possible if the table is not empty.
  - Added the required column `message` to the `Feedback` table without a default value. This is not possible if the table is not empty.
  - Added the required column `youtubeId` to the `Feedback` table without a default value. This is not possible if the table is not empty.

*/
-- DropForeignKey
ALTER TABLE "CurriculumChapter" DROP CONSTRAINT "CurriculumChapter_subjectId_fkey";

-- DropForeignKey
ALTER TABLE "CurriculumSubject" DROP CONSTRAINT "CurriculumSubject_classId_fkey";

-- DropIndex
DROP INDEX "ChapterNote_chapterKey_key";

-- AlterTable
ALTER TABLE "ChapterNote" DROP COLUMN "attachmentUrl",
DROP COLUMN "chapterKey",
DROP COLUMN "classGrade",
ADD COLUMN     "attachments" JSONB NOT NULL DEFAULT '[]',
ADD COLUMN     "chapterId" TEXT NOT NULL,
ADD COLUMN     "chapterName" TEXT NOT NULL,
ADD COLUMN     "classSort" TEXT NOT NULL,
ADD COLUMN     "examTips" TEXT[] DEFAULT ARRAY[]::TEXT[],
ADD COLUMN     "formulas" TEXT[] DEFAULT ARRAY[]::TEXT[],
ADD COLUMN     "keyPoints" TEXT[] DEFAULT ARRAY[]::TEXT[],
ADD COLUMN     "subject" TEXT NOT NULL,
ADD COLUMN     "summary" TEXT NOT NULL,
ADD COLUMN     "title" TEXT NOT NULL,
ADD COLUMN     "updatedBy" TEXT;

-- AlterTable
ALTER TABLE "CurriculumChapter" DROP COLUMN "name",
DROP COLUMN "subjectId",
ADD COLUMN     "chapterId" TEXT NOT NULL,
ADD COLUMN     "chapterName" TEXT NOT NULL,
ADD COLUMN     "classSort" TEXT NOT NULL,
ADD COLUMN     "isActive" BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN     "subject" TEXT NOT NULL,
ADD COLUMN     "textbook" TEXT,
ADD COLUMN     "updatedAt" TIMESTAMP(3) NOT NULL;

-- AlterTable
ALTER TABLE "CurriculumClass" ADD COLUMN     "classSort" TEXT NOT NULL,
ADD COLUMN     "description" TEXT,
ADD COLUMN     "isActive" BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN     "updatedAt" TIMESTAMP(3) NOT NULL;

-- AlterTable
ALTER TABLE "CurriculumSubject" DROP COLUMN "classId",
ADD COLUMN     "classSort" TEXT NOT NULL,
ADD COLUMN     "isActive" BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN     "textbook" TEXT,
ADD COLUMN     "updatedAt" TIMESTAMP(3) NOT NULL;

-- AlterTable
ALTER TABLE "Doubt" ADD COLUMN     "answeredBy" TEXT,
ADD COLUMN     "chapterId" TEXT NOT NULL,
ADD COLUMN     "chapterName" TEXT NOT NULL,
ADD COLUMN     "classSort" TEXT NOT NULL,
ADD COLUMN     "studentUnread" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "subject" TEXT NOT NULL,
ADD COLUMN     "updatedAt" TIMESTAMP(3) NOT NULL,
ADD COLUMN     "videoTitle" TEXT NOT NULL,
ADD COLUMN     "youtubeId" TEXT NOT NULL;

-- AlterTable
ALTER TABLE "Feedback" DROP COLUMN "comment",
DROP COLUMN "rating",
ADD COLUMN     "message" TEXT NOT NULL,
ADD COLUMN     "youtubeId" TEXT NOT NULL;

-- AlterTable
ALTER TABLE "StatsDaily" DROP COLUMN "activeUsers",
ADD COLUMN     "activeStudents" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "doubtsAsked" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "lessonsCompleted" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "lessonsStarted" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "newVisitors" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "visitors" INTEGER NOT NULL DEFAULT 0;

-- AlterTable
ALTER TABLE "StatsTotal" DROP COLUMN "lessonsWatched",
ADD COLUMN     "doubtsAsked" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "lessonsCompleted" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "lessonsStarted" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "visitors" INTEGER NOT NULL DEFAULT 0;
