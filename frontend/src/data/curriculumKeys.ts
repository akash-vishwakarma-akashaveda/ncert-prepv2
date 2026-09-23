import { NotesTarget } from '../types';

export function slug(value: string): string {
  return value
    .toLowerCase()
    .normalize('NFKD')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '') || 'x';
}

export function subjectKey(classSort: string, subject: string): string {
  return `${classSort}_${slug(subject)}`;
}

// The book is part of the key: one subject can have several books that each start at "Chapter 1"
// (e.g. Class 9 English: Beehive + Moments), and those chapters must not merge.
export function chapterKey(classSort: string, subject: string, chapterId: string, textbook = ''): string {
  return `${subjectKey(classSort, subject)}_${textbook ? `${slug(textbook)}_` : ''}${slug(chapterId)}`;
}

export function notesKey(target: NotesTarget): string {
  return chapterKey(target.class_sort, target.subject, target.chapter_id, target.textbook);
}
