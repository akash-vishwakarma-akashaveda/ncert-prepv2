/**
 * Classes 11 and 12 split into streams. Nothing is hidden because of a stream: the catalog still
 * carries every subject, and a student can always open the ones outside their own. The stream only
 * decides what "My subjects" leads with, so a science student is not scrolling past Accountancy.
 */
export type StreamId = 'science' | 'commerce' | 'humanities';

export interface Stream {
  id: StreamId;
  label: string;
  blurb: string;
  /** Subjects that define the stream. Several belong to more than one — that is intentional. */
  subjects: string[];
}

/** Taken by every stream, so they are never treated as "other". */
export const COMMON_SUBJECTS = ['English', 'Hindi', 'Health and Physical Education'];

export const STREAMS: Stream[] = [
  {
    id: 'science',
    label: 'Science',
    blurb: 'Physics, Chemistry, Biology or Maths — for medical, engineering and research paths.',
    subjects: ['Physics', 'Chemistry', 'Biology', 'Mathematics', 'Biotechnology', 'Computer Science'],
  },
  {
    id: 'commerce',
    label: 'Commerce',
    blurb: 'Accounts, business and economics — for CA, finance and management paths.',
    subjects: ['Accountancy', 'Business Studies', 'Economics', 'Mathematics', 'Computer Science'],
  },
  {
    id: 'humanities',
    label: 'Humanities',
    blurb: 'History, politics and society — for law, civil services, design and the arts.',
    subjects: ['History', 'Geography', 'Political Science', 'Sociology', 'Psychology', 'Economics'],
  },
];

/** Streams only apply to classes 11-12; every other class has one common set of subjects. */
export function classHasStreams(classSort: string | undefined): boolean {
  const classNumber = Number(classSort);
  return classNumber === 11 || classNumber === 12;
}

export function getStream(id: string | null | undefined): Stream | null {
  return STREAMS.find((s) => s.id === id) ?? null;
}

/** True when the subject belongs to this stream, or is taken by everyone. */
export function isInStream(subject: string, stream: Stream | null): boolean {
  if (!stream) return true;
  return stream.subjects.includes(subject) || COMMON_SUBJECTS.includes(subject);
}
