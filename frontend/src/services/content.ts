import {
  collection,
  doc,
  getDoc,
  getDocs,
  setDoc,
  updateDoc,
  deleteDoc,
  query,
  where,
  orderBy,
  limit,
  onSnapshot,
  serverTimestamp,
  getCountFromServer,
  writeBatch,
} from 'firebase/firestore';
import { ref, uploadBytesResumable, getDownloadURL, deleteObject } from 'firebase/storage';
import { httpsCallable, FunctionsError } from 'firebase/functions';
import { db, storage, functions, isFirebaseConfigured } from './firebase';
import {
  ChapterNotes,
  CurriculumChapter,
  CurriculumClass,
  CurriculumSubject,
  Doubt,
  DoubtStatus,
  NoteAttachment,
} from '../types';
import { bumpDemoStat } from './stats';

const live = () => Boolean(isFirebaseConfigured && db);

export const MAX_ATTACHMENT_BYTES = 20 * 1024 * 1024;
const MAX_DEMO_ATTACHMENT_BYTES = 1.5 * 1024 * 1024;
export const ALLOWED_ATTACHMENT_TYPES = ['application/pdf', 'image/png', 'image/jpeg', 'image/webp'];
export const DOUBT_MIN_LENGTH = 10;
export const DOUBT_MAX_LENGTH = 2000;

// ---------- demo-mode local store ----------
const LOCAL_KEYS = {
  classes: 'quickprep_classes',
  subjects: 'quickprep_subjects',
  chapters: 'quickprep_chapters',
  notes: 'quickprep_notes_v2',
  doubts: 'quickprep_doubts',
};

function readLocal<T>(key: string, fallback: T): T {
  try {
    const raw = localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T) : fallback;
  } catch {
    return fallback;
  }
}

function writeLocal<T>(key: string, value: T) {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch (err) {
    throw new Error('Browser storage is full. In demo mode, remove some attachments and try again.');
  }
  window.dispatchEvent(new CustomEvent('quickprep-local-change', { detail: key }));
}

function localNotes(): Record<string, ChapterNotes> {
  return readLocal<Record<string, ChapterNotes>>(LOCAL_KEYS.notes, {});
}

export function toMillis(value: unknown): number {
  if (typeof value === 'number') return value;
  if (value && typeof (value as { toMillis?: () => number }).toMillis === 'function') {
    return (value as { toMillis: () => number }).toMillis();
  }
  return 0;
}

function mapNotes(id: string, data: Record<string, unknown>): ChapterNotes {
  return {
    id,
    class_sort: String(data.class_sort || ''),
    subject: String(data.subject || ''),
    chapter_id: String(data.chapter_id || ''),
    chapter_name: String(data.chapter_name || ''),
    title: String(data.title || ''),
    summary: String(data.summary || ''),
    key_points: (data.key_points as string[]) || [],
    formulas: (data.formulas as string[]) || [],
    exam_tips: (data.exam_tips as string[]) || [],
    attachments: (data.attachments as NoteAttachment[]) || [],
    isPublished: data.isPublished === true,
    updated_at: toMillis(data.updated_at),
    updated_by: (data.updated_by as string) || null,
  };
}

function mapDoubt(id: string, data: Record<string, unknown>): Doubt {
  return {
    id,
    userId: String(data.userId || ''),
    userName: (data.userName as string) || null,
    userEmail: (data.userEmail as string) || null,
    class_sort: String(data.class_sort || ''),
    subject: String(data.subject || ''),
    chapter_id: String(data.chapter_id || ''),
    chapter_name: String(data.chapter_name || ''),
    youtube_id: String(data.youtube_id || ''),
    video_title: String(data.video_title || ''),
    question: String(data.question || ''),
    status: (data.status as DoubtStatus) || 'open',
    answer: (data.answer as string) || null,
    answered_by: (data.answered_by as string) || null,
    answered_at: data.answered_at ? toMillis(data.answered_at) : null,
    student_unread: data.student_unread === true,
    created_at: toMillis(data.created_at) || Date.now(),
    updated_at: toMillis(data.updated_at) || Date.now(),
  };
}

// ---------- curriculum hierarchy ----------
export interface CurriculumRecords {
  classes: CurriculumClass[];
  subjects: CurriculumSubject[];
  chapters: CurriculumChapter[];
}

type HierarchyKind = 'classes' | 'subjects' | 'chapters';

export const CurriculumService = {
  async load(): Promise<CurriculumRecords> {
    if (live()) {
      try {
        const [c, s, ch] = await Promise.all([
          getDocs(collection(db!, 'classes')),
          getDocs(collection(db!, 'subjects')),
          getDocs(collection(db!, 'chapters')),
        ]);
        return {
          classes: c.docs.map((d) => ({ ...(d.data() as CurriculumClass), id: d.id })),
          subjects: s.docs.map((d) => ({ ...(d.data() as CurriculumSubject), id: d.id })),
          chapters: ch.docs.map((d) => ({ ...(d.data() as CurriculumChapter), id: d.id })),
        };
      } catch (err) {
        console.warn('Failed to load curriculum hierarchy:', err);
        return { classes: [], subjects: [], chapters: [] };
      }
    }
    return {
      classes: readLocal<CurriculumClass[]>(LOCAL_KEYS.classes, []),
      subjects: readLocal<CurriculumSubject[]>(LOCAL_KEYS.subjects, []),
      chapters: readLocal<CurriculumChapter[]>(LOCAL_KEYS.chapters, []),
    };
  },

  async save<T extends { id: string }>(kind: HierarchyKind, record: T): Promise<void> {
    if (live()) {
      const { id, ...data } = record;
      await setDoc(doc(db!, kind, id), { ...data, updated_at: serverTimestamp() }, { merge: true });
      return;
    }
    const list = readLocal<T[]>(LOCAL_KEYS[kind], []);
    const idx = list.findIndex((r) => r.id === record.id);
    if (idx >= 0) list[idx] = { ...list[idx], ...record };
    else list.push(record);
    writeLocal(LOCAL_KEYS[kind], list);
  },

  async saveMany(records: CurriculumRecords): Promise<number> {
    const total = records.classes.length + records.subjects.length + records.chapters.length;
    if (live()) {
      const writes: [HierarchyKind, { id: string }][] = [
        ...records.classes.map((r) => ['classes', r] as [HierarchyKind, { id: string }]),
        ...records.subjects.map((r) => ['subjects', r] as [HierarchyKind, { id: string }]),
        ...records.chapters.map((r) => ['chapters', r] as [HierarchyKind, { id: string }]),
      ];
      for (let i = 0; i < writes.length; i += 450) {
        const batch = writeBatch(db!);
        writes.slice(i, i + 450).forEach(([kind, record]) => {
          const { id, ...data } = record;
          batch.set(doc(db!, kind, id), { ...data, updated_at: serverTimestamp() }, { merge: true });
        });
        await batch.commit();
      }
      return total;
    }
    for (const r of records.classes) await this.save('classes', r);
    for (const r of records.subjects) await this.save('subjects', r);
    for (const r of records.chapters) await this.save('chapters', r);
    return total;
  },

  async remove(kind: HierarchyKind, id: string): Promise<void> {
    if (live()) {
      await deleteDoc(doc(db!, kind, id));
      return;
    }
    writeLocal(
      LOCAL_KEYS[kind],
      readLocal<{ id: string }[]>(LOCAL_KEYS[kind], []).filter((r) => r.id !== id)
    );
  },
};

// ---------- notes & cheat sheets ----------
export const NotesService = {
  async getPublished(id: string): Promise<ChapterNotes | null> {
    if (live()) {
      try {
        const snap = await getDoc(doc(db!, 'notes', id));
        if (!snap.exists()) return null;
        const notes = mapNotes(snap.id, snap.data());
        return notes.isPublished ? notes : null;
      } catch (err) {
        console.warn('Failed to load notes:', err);
        return null;
      }
    }
    const notes = localNotes()[id];
    return notes?.isPublished ? notes : null;
  },

  async publishedKeysForClass(classSort: string): Promise<Set<string>> {
    if (live()) {
      try {
        const snap = await getDocs(
          query(collection(db!, 'notes'), where('class_sort', '==', classSort), where('isPublished', '==', true))
        );
        return new Set(snap.docs.map((d) => d.id));
      } catch (err) {
        console.warn('Failed to load notes index:', err);
        return new Set();
      }
    }
    return new Set(
      Object.values(localNotes())
        .filter((n) => n.isPublished && n.class_sort === classSort)
        .map((n) => n.id)
    );
  },

  async listAll(): Promise<ChapterNotes[]> {
    if (live()) {
      const snap = await getDocs(collection(db!, 'notes'));
      return snap.docs.map((d) => mapNotes(d.id, d.data()));
    }
    return Object.values(localNotes());
  },

  async save(notes: ChapterNotes, adminName: string | null): Promise<ChapterNotes> {
    const saved = { ...notes, updated_at: Date.now(), updated_by: adminName };
    if (live()) {
      const { id, ...data } = saved;
      await setDoc(doc(db!, 'notes', id), { ...data, updated_at: serverTimestamp() });
      return saved;
    }
    const all = localNotes();
    all[saved.id] = saved;
    writeLocal(LOCAL_KEYS.notes, all);
    return saved;
  },

  async remove(notes: ChapterNotes): Promise<void> {
    await Promise.all(notes.attachments.map((a) => this.deleteAttachment(a).catch(() => undefined)));
    if (live()) {
      await deleteDoc(doc(db!, 'notes', notes.id));
      return;
    }
    const all = localNotes();
    delete all[notes.id];
    writeLocal(LOCAL_KEYS.notes, all);
  },

  validateFile(file: File): string | null {
    if (!ALLOWED_ATTACHMENT_TYPES.includes(file.type)) {
      return `${file.name}: only PDF, PNG, JPG or WEBP files are allowed.`;
    }
    const maxBytes = live() && storage ? MAX_ATTACHMENT_BYTES : MAX_DEMO_ATTACHMENT_BYTES;
    if (file.size > maxBytes) {
      return `${file.name}: files must be under ${Math.round(maxBytes / (1024 * 1024) * 10) / 10} MB${
        live() ? '' : ' in demo mode'
      }.`;
    }
    return null;
  },

  async uploadAttachment(noteId: string, file: File, onProgress?: (pct: number) => void): Promise<NoteAttachment> {
    const invalid = this.validateFile(file);
    if (invalid) throw new Error(invalid);

    const safeName = file.name.replace(/[^\w.\-]+/g, '_').slice(-120);
    const path = `notes/${noteId}/${Date.now()}_${safeName}`;

    if (live() && storage) {
      const task = uploadBytesResumable(ref(storage, path), file, { contentType: file.type });
      await new Promise<void>((resolve, reject) => {
        task.on(
          'state_changed',
          (snap) => onProgress?.(Math.round((snap.bytesTransferred / snap.totalBytes) * 100)),
          reject,
          () => resolve()
        );
      });
      const url = await getDownloadURL(task.snapshot.ref);
      return { name: file.name, url, path, contentType: file.type, size: file.size, uploaded_at: Date.now() };
    }

    const url = await new Promise<string>((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(String(reader.result));
      reader.onerror = () => reject(new Error(`Could not read ${file.name}`));
      reader.readAsDataURL(file);
    });
    onProgress?.(100);
    return { name: file.name, url, path, contentType: file.type, size: file.size, uploaded_at: Date.now() };
  },

  async deleteAttachment(attachment: NoteAttachment): Promise<void> {
    if (live() && storage && !attachment.url.startsWith('data:')) {
      await deleteObject(ref(storage, attachment.path)).catch((err) => {
        if ((err as { code?: string }).code !== 'storage/object-not-found') throw err;
      });
    }
  },
};

export async function openAttachment(attachment: NoteAttachment) {
  if (attachment.url.startsWith('data:')) {
    // Browsers block top-level navigation to data: URLs, so open demo files as blobs.
    const blob = await (await fetch(attachment.url)).blob();
    const objectUrl = URL.createObjectURL(blob);
    window.open(objectUrl, '_blank', 'noopener');
    setTimeout(() => URL.revokeObjectURL(objectUrl), 60_000);
    return;
  }
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
  subscribeMine(userId: string, onChange: (doubts: Doubt[]) => void): () => void {
    if (live()) {
      return onSnapshot(
        query(collection(db!, 'doubts'), where('userId', '==', userId), orderBy('created_at', 'desc'), limit(100)),
        (snap) => onChange(snap.docs.map((d) => mapDoubt(d.id, d.data()))),
        (err) => console.warn('Doubts subscription failed:', err)
      );
    }
    const emit = () =>
      onChange(
        readLocal<Doubt[]>(LOCAL_KEYS.doubts, [])
          .filter((d) => d.userId === userId)
          .sort((a, b) => b.created_at - a.created_at)
      );
    emit();
    const handler = (e: Event) => {
      if ((e as CustomEvent).detail === LOCAL_KEYS.doubts) emit();
    };
    const storageHandler = (e: StorageEvent) => {
      if (e.key === LOCAL_KEYS.doubts) emit();
    };
    window.addEventListener('quickprep-local-change', handler);
    window.addEventListener('storage', storageHandler);
    return () => {
      window.removeEventListener('quickprep-local-change', handler);
      window.removeEventListener('storage', storageHandler);
    };
  },

  async ask(input: AskDoubtInput, asker: DemoAsker): Promise<void> {
    const question = input.question.trim();
    if (question.length < DOUBT_MIN_LENGTH) {
      throw new Error(`Please describe your doubt in at least ${DOUBT_MIN_LENGTH} characters.`);
    }
    if (question.length > DOUBT_MAX_LENGTH) {
      throw new Error(`Doubts must be ${DOUBT_MAX_LENGTH} characters or fewer.`);
    }

    if (live() && functions) {
      try {
        await httpsCallable(functions, 'askDoubt')({ youtubeId: input.youtube_id, question });
      } catch (err) {
        const e = err as FunctionsError;
        if (
          e.code === 'functions/resource-exhausted' ||
          e.code === 'functions/invalid-argument' ||
          e.code === 'functions/not-found'
        ) {
          throw new Error(e.message);
        }
        throw new Error('Could not send your doubt right now. Please try again.');
      }
      return;
    }

    const all = readLocal<Doubt[]>(LOCAL_KEYS.doubts, []);
    const dayAgo = Date.now() - 24 * 60 * 60 * 1000;
    if (all.filter((d) => d.userId === asker.userId && d.created_at > dayAgo).length >= 10) {
      throw new Error('You can ask at most 10 doubts per day. Please try again tomorrow.');
    }
    const now = Date.now();
    bumpDemoStat('doubtsAsked');
    all.push({
      id: `doubt-${now}-${Math.random().toString(36).slice(2, 7)}`,
      ...asker,
      class_sort: input.class_sort,
      subject: input.subject,
      chapter_id: input.chapter_id,
      chapter_name: input.chapter_name,
      youtube_id: input.youtube_id,
      video_title: input.video_title,
      question,
      status: 'open',
      answer: null,
      answered_by: null,
      answered_at: null,
      student_unread: false,
      created_at: now,
      updated_at: now,
    });
    writeLocal(LOCAL_KEYS.doubts, all);
  },

  async markRead(doubt: Doubt): Promise<void> {
    if (!doubt.student_unread) return;
    await this.update(doubt.id, { student_unread: false });
  },

  async closeByStudent(doubt: Doubt): Promise<void> {
    await this.update(doubt.id, { status: 'closed', student_unread: false });
  },

  async listAll(): Promise<Doubt[]> {
    if (live()) {
      const snap = await getDocs(query(collection(db!, 'doubts'), orderBy('created_at', 'desc'), limit(300)));
      return snap.docs.map((d) => mapDoubt(d.id, d.data()));
    }
    return readLocal<Doubt[]>(LOCAL_KEYS.doubts, []).sort((a, b) => b.created_at - a.created_at);
  },

  async answer(doubt: Doubt, answer: string, adminName: string | null): Promise<void> {
    const text = answer.trim();
    if (!text) throw new Error('Write an answer before sending.');
    await this.update(doubt.id, {
      answer: text,
      status: 'answered',
      answered_by: adminName,
      answered_at: Date.now(),
      student_unread: true,
    });
  },

  async setStatus(doubt: Doubt, status: DoubtStatus): Promise<void> {
    await this.update(doubt.id, { status });
  },

  async update(id: string, changes: Partial<Doubt>): Promise<void> {
    if (live()) {
      const payload: Record<string, ReturnType<typeof serverTimestamp> | string | number | boolean | null> = {
        ...(changes as Record<string, string | number | boolean | null>),
        updated_at: serverTimestamp(),
      };
      if (changes.answered_at) payload.answered_at = serverTimestamp();
      await updateDoc(doc(db!, 'doubts', id), payload);
      return;
    }
    const all = readLocal<Doubt[]>(LOCAL_KEYS.doubts, []);
    const idx = all.findIndex((d) => d.id === id);
    if (idx < 0) return;
    all[idx] = { ...all[idx], ...changes, updated_at: Date.now() };
    writeLocal(LOCAL_KEYS.doubts, all);
  },

  removeLocalForUser(userId: string) {
    if (live()) return;
    writeLocal(
      LOCAL_KEYS.doubts,
      readLocal<Doubt[]>(LOCAL_KEYS.doubts, []).filter((d) => d.userId !== userId)
    );
  },
};

// ---------- admin stats ----------
export async function countStudentsByClass(): Promise<{ total: number; byClass: Record<string, number> } | null> {
  if (!live()) return null;
  try {
    const usersCol = collection(db!, 'users');
    const total = (await getCountFromServer(usersCol)).data().count;
    const classes = Array.from({ length: 12 }, (_, i) => String(i + 1).padStart(2, '0'));
    const counts = await Promise.all(
      classes.map((c) => getCountFromServer(query(usersCol, where('grade_preference', '==', c))))
    );
    const byClass: Record<string, number> = {};
    classes.forEach((c, i) => {
      byClass[c] = counts[i].data().count;
    });
    return { total, byClass };
  } catch (err) {
    console.warn('Failed to count students:', err);
    return null;
  }
}
