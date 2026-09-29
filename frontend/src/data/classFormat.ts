import { Video } from '../types';

// The database stores the Google Sheet format (SRS 4.1): class_display "Class IX", class_sort "Class 9".
// Inside the app a class is always the zero-padded numeral "09" and is displayed as "Class 9".

const ROMAN: [number, string][] = [
  [10, 'X'],
  [9, 'IX'],
  [5, 'V'],
  [4, 'IV'],
  [1, 'I'],
];

export function toRoman(n: number): string {
  let rest = n;
  let out = '';
  for (const [value, symbol] of ROMAN) {
    while (rest >= value) {
      out += symbol;
      rest -= value;
    }
  }
  return out;
}

function fromRoman(roman: string): number {
  const map: Record<string, number> = { I: 1, V: 5, X: 10 };
  let total = 0;
  for (let i = 0; i < roman.length; i++) {
    const cur = map[roman[i]] || 0;
    const next = map[roman[i + 1]] || 0;
    total += cur < next ? -cur : cur;
  }
  return total;
}

export function classNumber(raw: string | number | undefined | null): number {
  if (raw === undefined || raw === null) return 0;
  const text = String(raw).trim().toUpperCase();
  const digits = text.match(/\d+/);
  if (digits) return parseInt(digits[0], 10);
  const roman = text.replace(/^CLASS\s*/, '').match(/^[IVX]+$/);
  return roman ? fromRoman(roman[0]) : 0;
}

export function normalizeClassSort(raw: string | number | undefined | null): string {
  const n = classNumber(raw);
  return n > 0 ? String(n).padStart(2, '0') : '';
}

export function storedClassFields(classSort: string) {
  const n = classNumber(classSort);
  return { class_display: `Class ${toRoman(n)}`, class_sort: `Class ${n}` };
}

export function normalizeVideo(data: Partial<Video> & Record<string, unknown>, youtubeId: string): Video {
  const sort = normalizeClassSort(data.class_sort as string) || normalizeClassSort(data.class_display as string);
  return {
    ...(data as Video),
    youtube_id: youtubeId,
    class_sort: sort,
    class_display: `Class ${parseInt(sort || '0', 10)}`,
    // Missing isActive means "never moderated", which the SRS defines as active.
    isActive: data.isActive !== false,
    isPremium: data.isPremium === true,
  };
}

export function toStoredVideo(video: Partial<Video>): Record<string, string | number | boolean | undefined> {
  const { youtube_id: _id, ...rest } = video;
  return rest.class_sort ? { ...rest, ...storedClassFields(rest.class_sort) } : rest;
}

export function compareChapterIds(a: string, b: string): number {
  return a.localeCompare(b, undefined, { numeric: true, sensitivity: 'base' });
}

// "Physics Part-I" < "Physics Part II": punctuation is ignored so part numbers sort naturally.
export function compareBooks(a = '', b = ''): number {
  const clean = (t: string) => t.replace(/[^A-Za-z0-9]+/g, ' ').trim();
  return clean(a).localeCompare(clean(b), undefined, { numeric: true, sensitivity: 'base' });
}

export function compareVideosInSyllabusOrder(a: Video, b: Video): number {
  return (
    a.class_sort.localeCompare(b.class_sort) ||
    a.subject.localeCompare(b.subject) ||
    compareBooks(a.textbook, b.textbook) ||
    compareChapterIds(a.chapter_id, b.chapter_id)
  );
}
