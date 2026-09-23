import type { Video } from '@prisma/client';

/** Prisma's camelCase columns -> the frontend's Video type, which is (and always was, even under
 * Firestore) snake_case on the wire. Keeping the wire shape unchanged means the frontend's catalog
 * grouping logic (useCatalog.ts) needs zero changes for this migration. */
export function toPublicVideo(v: Video) {
  return {
    youtube_id: v.youtubeId,
    class_sort: v.classSort,
    class_display: v.classDisplay,
    subject: v.subject,
    textbook: v.textbook,
    chapter_id: v.chapterId,
    chapter_name: v.chapterName,
    video_title: v.videoTitle,
    isActive: v.isActive,
    isPremium: v.isPremium,
    pyq_available: v.pyqAvailable,
    yt_public: v.ytPublic,
    pdf_url: v.pdfUrl,
    timestamps: v.timestamps,
    created_at: v.syncedAt.toISOString(),
  };
}

interface VideoFields {
  class_sort?: string;
  class_display?: string;
  subject?: string;
  textbook?: string;
  chapter_id?: string;
  chapter_name?: string;
  video_title?: string;
  isActive?: boolean;
  isPremium?: boolean;
  pyq_available?: boolean;
  yt_public?: boolean;
  pdf_url?: string;
  timestamps?: string;
}

/** The reverse mapping, for create/update request bodies. */
export function toPrismaVideoData(body: VideoFields): Record<string, unknown> {
  const data: Record<string, unknown> = {};
  if (body.class_sort !== undefined) data.classSort = body.class_sort;
  if (body.class_display !== undefined) data.classDisplay = body.class_display;
  if (body.subject !== undefined) data.subject = body.subject;
  if (body.textbook !== undefined) data.textbook = body.textbook;
  if (body.chapter_id !== undefined) data.chapterId = body.chapter_id;
  if (body.chapter_name !== undefined) data.chapterName = body.chapter_name;
  if (body.video_title !== undefined) data.videoTitle = body.video_title;
  if (body.isActive !== undefined) data.isActive = body.isActive;
  if (body.isPremium !== undefined) data.isPremium = body.isPremium;
  if (body.pyq_available !== undefined) data.pyqAvailable = body.pyq_available;
  if (body.yt_public !== undefined) data.ytPublic = body.yt_public;
  if (body.pdf_url !== undefined) data.pdfUrl = body.pdf_url;
  if (body.timestamps !== undefined) data.timestamps = body.timestamps;
  return data;
}
