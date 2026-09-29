/*
  Warnings:

  - You are about to drop the column `reason` on the `XpTransaction` table. All the data in the column will be lost.
  - Added the required column `balanceAfter` to the `XpTransaction` table without a default value. This is not possible if the table is not empty.
  - Added the required column `classSort` to the `XpTransaction` table without a default value. This is not possible if the table is not empty.
  - Added the required column `description` to the `XpTransaction` table without a default value. This is not possible if the table is not empty.
  - Added the required column `type` to the `XpTransaction` table without a default value. This is not possible if the table is not empty.

*/
-- CreateEnum
CREATE TYPE "XpSourceType" AS ENUM ('LESSON_COMPLETED', 'LESSON_UNCOMPLETED', 'FOCUS_SESSION', 'STREAK_BONUS', 'NOTES_REVISION', 'DOUBT_ASKED', 'WELCOME_BONUS');

-- DropIndex
DROP INDEX "XpTransaction_userId_createdAt_idx";

-- AlterTable
ALTER TABLE "XpTransaction" DROP COLUMN "reason",
ADD COLUMN     "balanceAfter" INTEGER NOT NULL,
ADD COLUMN     "classSort" TEXT NOT NULL,
ADD COLUMN     "description" TEXT NOT NULL,
ADD COLUMN     "sourceId" TEXT,
ADD COLUMN     "type" "XpSourceType" NOT NULL;

-- CreateIndex
CREATE INDEX "XpTransaction_userId_classSort_createdAt_idx" ON "XpTransaction"("userId", "classSort", "createdAt");

-- CreateIndex
CREATE INDEX "XpTransaction_userId_sourceId_type_idx" ON "XpTransaction"("userId", "sourceId", "type");
