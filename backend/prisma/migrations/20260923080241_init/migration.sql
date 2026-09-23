-- CreateEnum
CREATE TYPE "Role" AS ENUM ('STUDENT', 'ADMIN');

-- CreateEnum
CREATE TYPE "ConsentStatus" AS ENUM ('PENDING', 'GRANTED', 'DECLINED');

-- CreateEnum
CREATE TYPE "DoubtStatus" AS ENUM ('OPEN', 'ANSWERED', 'CLOSED');

-- CreateEnum
CREATE TYPE "FeedbackStatus" AS ENUM ('NEW', 'REVIEWED');

-- CreateTable
CREATE TABLE "User" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "googleId" TEXT,
    "passwordHash" TEXT,
    "emailVerified" BOOLEAN NOT NULL DEFAULT false,
    "role" "Role" NOT NULL DEFAULT 'STUDENT',
    "classGrade" INTEGER,
    "displayName" TEXT,
    "photoUrl" TEXT,
    "phoneNumber" TEXT,
    "xp" INTEGER NOT NULL DEFAULT 0,
    "streak" INTEGER NOT NULL DEFAULT 0,
    "lastActiveDate" TEXT,
    "lastWatchedVideo" TEXT,
    "studyGoalMinutes" INTEGER,
    "onboardingCompleted" BOOLEAN NOT NULL DEFAULT false,
    "focusSubjects" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "consentStatus" "ConsentStatus" NOT NULL DEFAULT 'PENDING',
    "consentAgeGroup" TEXT,
    "consentMethod" TEXT,
    "consentNoticeVersion" TEXT,
    "consentLanguage" TEXT,
    "consentParentName" TEXT,
    "consentParentEmail" TEXT,
    "consentGrantedAt" TIMESTAMP(3),
    "consentRequestedAt" TIMESTAMP(3),
    "remindersEnabled" BOOLEAN NOT NULL DEFAULT false,
    "reminderFrequency" TEXT NOT NULL DEFAULT 'daily',
    "reminderHour" INTEGER,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "LessonProgress" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "youtubeId" TEXT NOT NULL,
    "completed" BOOLEAN NOT NULL DEFAULT false,
    "favorited" BOOLEAN NOT NULL DEFAULT false,
    "watchedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "LessonProgress_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "XpTransaction" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "amount" INTEGER NOT NULL,
    "reason" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "XpTransaction_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Video" (
    "youtubeId" TEXT NOT NULL,
    "classGrade" INTEGER NOT NULL,
    "subject" TEXT NOT NULL,
    "chapter" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "order" INTEGER NOT NULL DEFAULT 0,
    "isActive" BOOLEAN NOT NULL DEFAULT true,

    CONSTRAINT "Video_pkey" PRIMARY KEY ("youtubeId")
);

-- CreateTable
CREATE TABLE "CurriculumClass" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "order" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "CurriculumClass_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CurriculumSubject" (
    "id" TEXT NOT NULL,
    "classId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "order" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "CurriculumSubject_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CurriculumChapter" (
    "id" TEXT NOT NULL,
    "subjectId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "order" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "CurriculumChapter_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ChapterNote" (
    "id" TEXT NOT NULL,
    "chapterKey" TEXT NOT NULL,
    "classGrade" INTEGER NOT NULL,
    "isPublished" BOOLEAN NOT NULL DEFAULT false,
    "attachmentUrl" TEXT,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ChapterNote_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Doubt" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "question" TEXT NOT NULL,
    "answer" TEXT,
    "status" "DoubtStatus" NOT NULL DEFAULT 'OPEN',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "answeredAt" TIMESTAMP(3),

    CONSTRAINT "Doubt_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Feedback" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "rating" INTEGER NOT NULL,
    "comment" TEXT,
    "status" "FeedbackStatus" NOT NULL DEFAULT 'NEW',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Feedback_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ConsentRequest" (
    "token" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "status" "ConsentStatus" NOT NULL DEFAULT 'PENDING',
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ConsentRequest_pkey" PRIMARY KEY ("token")
);

-- CreateTable
CREATE TABLE "StatsDaily" (
    "day" TEXT NOT NULL,
    "registrations" INTEGER NOT NULL DEFAULT 0,
    "activeUsers" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "StatsDaily_pkey" PRIMARY KEY ("day")
);

-- CreateTable
CREATE TABLE "StatsTotal" (
    "id" TEXT NOT NULL DEFAULT 'totals',
    "registrations" INTEGER NOT NULL DEFAULT 0,
    "lessonsWatched" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "StatsTotal_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AppSetting" (
    "key" TEXT NOT NULL,
    "value" JSONB NOT NULL,

    CONSTRAINT "AppSetting_pkey" PRIMARY KEY ("key")
);

-- CreateTable
CREATE TABLE "RateLimit" (
    "key" TEXT NOT NULL,
    "windowEnd" TIMESTAMP(3) NOT NULL,
    "count" INTEGER NOT NULL DEFAULT 1,

    CONSTRAINT "RateLimit_pkey" PRIMARY KEY ("key")
);

-- CreateIndex
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");

-- CreateIndex
CREATE UNIQUE INDEX "User_googleId_key" ON "User"("googleId");

-- CreateIndex
CREATE INDEX "User_classGrade_xp_idx" ON "User"("classGrade", "xp");

-- CreateIndex
CREATE UNIQUE INDEX "LessonProgress_userId_youtubeId_key" ON "LessonProgress"("userId", "youtubeId");

-- CreateIndex
CREATE INDEX "XpTransaction_userId_createdAt_idx" ON "XpTransaction"("userId", "createdAt");

-- CreateIndex
CREATE INDEX "Video_classGrade_subject_chapter_idx" ON "Video"("classGrade", "subject", "chapter");

-- CreateIndex
CREATE UNIQUE INDEX "ChapterNote_chapterKey_key" ON "ChapterNote"("chapterKey");

-- CreateIndex
CREATE INDEX "Doubt_status_createdAt_idx" ON "Doubt"("status", "createdAt");

-- CreateIndex
CREATE INDEX "Doubt_userId_createdAt_idx" ON "Doubt"("userId", "createdAt");

-- CreateIndex
CREATE INDEX "Feedback_status_createdAt_idx" ON "Feedback"("status", "createdAt");

-- CreateIndex
CREATE INDEX "ConsentRequest_status_expiresAt_idx" ON "ConsentRequest"("status", "expiresAt");

-- CreateIndex
CREATE INDEX "ConsentRequest_userId_idx" ON "ConsentRequest"("userId");

-- AddForeignKey
ALTER TABLE "LessonProgress" ADD CONSTRAINT "LessonProgress_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "XpTransaction" ADD CONSTRAINT "XpTransaction_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CurriculumSubject" ADD CONSTRAINT "CurriculumSubject_classId_fkey" FOREIGN KEY ("classId") REFERENCES "CurriculumClass"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CurriculumChapter" ADD CONSTRAINT "CurriculumChapter_subjectId_fkey" FOREIGN KEY ("subjectId") REFERENCES "CurriculumSubject"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Doubt" ADD CONSTRAINT "Doubt_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Feedback" ADD CONSTRAINT "Feedback_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ConsentRequest" ADD CONSTRAINT "ConsentRequest_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
