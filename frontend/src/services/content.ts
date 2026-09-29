import { api } from './api/client';
import {
  ChapterNotes,
  CurriculumChapter,
  CurriculumClass,
  CurriculumSubject,
  Doubt,
  DoubtStatus,
  NoteAttachment,
} from '../types';

export const MAX_ATTACHMENT_BYTES = 20 * 1024 * 1024;
export const ALLOWED_ATTACHMENT_TYPES = ['application/pdf', 'image/png', 'image/jpeg', 'image/webp'];
export const DOUBT_MIN_LENGTH = 10;
export const DOUBT_MAX_LENGTH = 2000;

// ---------- curriculum hierarchy ----------
export interface CurriculumRecords {
  classes: CurriculumClass[];
  subjects: CurriculumSubject[];
  chapters: CurriculumChapter[];
}

type HierarchyKind = 'classes' | 'subjects' | 'chapters';

export const CurriculumService = {
  async load(): Promise<CurriculumRecords> {
    try {
      return await api.get<CurriculumRecords>('/api/curriculum');
    } catch (err) {
      console.warn('Failed to load curriculum hierarchy:', err);
      return { classes: [], subjects: [], chapters: [] };
    }
  },

  async save<T extends { id: string }>(kind: HierarchyKind, record: T): Promise<void> {
    const batch: CurriculumRecords = { classes: [], subjects: [], chapters: [] };
    (batch[kind] as unknown as T[]).push(record);
    await api.post('/api/curriculum/batch', batch);
  },

  async saveMany(records: CurriculumRecords): Promise<number> {
    const total = records.classes.length + records.subjects.length + records.chapters.length;
    if (total === 0) return 0;
    await api.post('/api/curriculum/batch', records);
    return total;
  },

  async remove(kind: HierarchyKind, id: string): Promise<void> {
    await api.delete(`/api/curriculum/${kind}/${encodeURIComponent(id)}`);
  },
};

// ---------- notes & cheat sheets ----------
export const NotesService = {
  async getPublished(id: string): Promise<ChapterNotes | null> {
    try {
      return await api.get<ChapterNotes>(`/api/notes/${encodeURIComponent(id)}`);
    } catch {
      return null;
    }
  },

  async publishedKeysForClass(classSort: string): Promise<Set<string>> {
    try {
      const ids = await api.get<string[]>(`/api/notes/published?classSort=${encodeURIComponent(classSort)}`);
      return new Set(ids);
    } catch (err) {
      console.warn('Failed to load notes index:', err);
      return new Set();
    }
  },

  async listAll(): Promise<ChapterNotes[]> {
    return api.get<ChapterNotes[]>('/api/notes');
  },

  async save(notes: ChapterNotes, _adminName: string | null): Promise<ChapterNotes> {
    return api.put<ChapterNotes>(`/api/notes/${encodeURIComponent(notes.id)}`, notes);
  },

  async remove(notes: ChapterNotes): Promise<void> {
    await api.delete(`/api/notes/${encodeURIComponent(notes.id)}`);
  },

  validateFile(file: File): string | null {
    if (!ALLOWED_ATTACHMENT_TYPES.includes(file.type)) {
      return `${file.name}: only PDF, PNG, JPG or WEBP files are allowed.`;
    }
    if (file.size > MAX_ATTACHMENT_BYTES) {
      return `${file.name}: files must be under ${Math.round((MAX_ATTACHMENT_BYTES / (1024 * 1024)) * 10) / 10} MB.`;
    }
    return null;
  },

  // The backend hands out a pre-signed S3 PUT URL; the browser uploads directly to S3 (never
  // through our server), matching how the old Firebase Storage upload worked.
  async uploadAttachment(noteId: string, file: File, onProgress?: (pct: number) => void): Promise<NoteAttachment> {
    const invalid = this.validateFile(file);
    if (invalid) throw new Error(invalid);

    const { uploadUrl, publicUrl, path } = await api.post<{ uploadUrl: string; publicUrl: string; path: string }>(
      '/api/notes/upload-url',
      { noteId, fileName: file.name, contentType: file.type, size: file.size }
    );

    await new Promise<void>((resolve, reject) => {
      const xhr = new XMLHttpRequest();
      xhr.open('PUT', uploadUrl);
      xhr.setRequestHeader('Content-Type', file.type);
      xhr.upload.onprogress = (e) => {
        if (e.lengthComputable) onProgress?.(Math.round((e.loaded / e.total) * 100));
      };
      xhr.onload = () => (xhr.status >= 200 && xhr.status < 300 ? resolve() : reject(new Error(`Upload failed (${xhr.status})`)));
      xhr.onerror = () => reject(new Error('Upload failed: file storage refused the connection (check the bucket CORS rule, guide Phase 10.3).'));
      xhr.send(file);
    });

    return { name: file.name, url: publicUrl, path, contentType: file.type, size: file.size, uploaded_at: Date.now() };
  },

  async deleteAttachment(attachment: NoteAttachment): Promise<void> {
    await api.post('/api/notes/delete-attachment', { path: attachment.path }).catch(() => undefined);
  },
};

export async function openAttachment(attachment: NoteAttachment) {
  window.open(attachment.url, '_blank', 'noopener');
}

// ---------- doubts ----------
export interface AskDoubtInput {
  youtube_id: string;
  video_title: string;
  class_sort: string;
  subject: string;
  chapter_id: string;
  chapter_name: string;
  question: string;
}

export interface DemoAsker {
  userId: string;
  userName: string | null;
  userEmail: string | null;
}

export const DoubtsService = {
  async fetchMine(): Promise<Doubt[]> {
    return api.get<Doubt[]>('/api/doubts/mine');
  },

  async ask(input: AskDoubtInput, _asker: DemoAsker): Promise<void> {
    const question = input.question.trim();
    if (question.length < DOUBT_MIN_LENGTH) {
      throw new Error(`Please describe your doubt in at least ${DOUBT_MIN_LENGTH} characters.`);
    }
    if (question.length > DOUBT_MAX_LENGTH) {
      throw new Error(`Doubts must be ${DOUBT_MAX_LENGTH} characters or fewer.`);
    }
    await api.post('/api/doubts', { ...input, question });
  },

  async markRead(doubt: Doubt): Promise<void> {
    if (!doubt.student_unread) return;
    await api.post(`/api/doubts/${encodeURIComponent(doubt.id)}/read`);
  },

  async closeByStudent(doubt: Doubt): Promise<void> {
    await api.patch(`/api/doubts/${encodeURIComponent(doubt.id)}`, { status: 'closed' });
  },

  async listAll(): Promise<Doubt[]> {
    return api.get<Doubt[]>('/api/doubts');
  },

  async answer(doubt: Doubt, answer: string, _adminName: string | null): Promise<void> {
    const text = answer.trim();
    if (!text) throw new Error('Write an answer before sending.');
    await api.post(`/api/doubts/${encodeURIComponent(doubt.id)}/answer`, { answer: text });
  },

  async setStatus(doubt: Doubt, status: DoubtStatus): Promise<void> {
    await api.patch(`/api/doubts/${encodeURIComponent(doubt.id)}`, { status });
  },
};

// ---------- admin stats ----------
export async function countStudentsByClass(): Promise<{ total: number; byClass: Record<string, number> } | null> {
  try {
    return await api.get<{ total: number; byClass: Record<string, number> }>('/api/users/count-by-class');
  } catch (err) {
    console.warn('Failed to count students:', err);
    return null;
  }
}
