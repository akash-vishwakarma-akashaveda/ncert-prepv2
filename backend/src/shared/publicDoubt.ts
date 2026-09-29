import type { Doubt } from '@prisma/client';

export function toPublicDoubt(d: Doubt & { user?: { displayName: string | null; email: string } }) {
  return {
    id: d.id,
    userId: d.userId,
    userName: d.user?.displayName ?? null,
    userEmail: d.user?.email ?? null,
    class_sort: d.classSort,
    subject: d.subject,
    chapter_id: d.chapterId,
    chapter_name: d.chapterName,
    youtube_id: d.youtubeId,
    video_title: d.videoTitle,
    question: d.question,
    status: d.status.toLowerCase(),
    answer: d.answer,
    answered_by: d.answeredBy,
    answered_at: d.answeredAt ? d.answeredAt.getTime() : null,
    student_unread: d.studentUnread,
    created_at: d.createdAt.getTime(),
    updated_at: d.updatedAt.getTime(),
  };
}
