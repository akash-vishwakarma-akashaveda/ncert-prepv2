import { CurriculumChapter, CurriculumClass, CurriculumSubject, Video } from '../../types';
import { CurriculumRecords } from '../../services/content';
import { chapterKey, subjectKey } from '../../data/curriculumKeys';
import { compareChapterIds } from '../../data/classFormat';

export interface AdminChapterNode {
  key: string;
  class_sort: string;
  subject: string;
  textbook?: string;
  chapter_id: string;
  chapter_name: string;
  order: number;
  isActive: boolean;
  record?: CurriculumChapter;
  videoCount: number;
}

export interface AdminSubjectNode {
  key: string;
  class_sort: string;
  name: string;
  textbook: string;
  order: number;
  isActive: boolean;
  record?: CurriculumSubject;
  videoCount: number;
  chapters: AdminChapterNode[];
}

export interface AdminClassNode {
  class_sort: string;
  name: string;
  order: number;
  isActive: boolean;
  record?: CurriculumClass;
  videoCount: number;
  subjects: AdminSubjectNode[];
}

/** Full tree for admins: every class/subject/chapter from videos or records, including hidden ones. */
export function buildAdminTree(videos: Video[], records: CurriculumRecords): AdminClassNode[] {
  const classes = new Map<string, AdminClassNode>();
  const subjects = new Map<string, AdminSubjectNode>();
  const chapters = new Map<string, AdminChapterNode>();

  const classRec = new Map(records.classes.map((r) => [r.class_sort, r]));
  const subjectRec = new Map(records.subjects.map((r) => [r.id, r]));
  const chapterRec = new Map(records.chapters.map((r) => [r.id, r]));

  const ensureClass = (sort: string) => {
    if (!classes.has(sort)) {
      const rec = classRec.get(sort);
      classes.set(sort, {
        class_sort: sort,
        name: rec?.name || `Class ${parseInt(sort, 10)}`,
        order: rec?.order ?? parseInt(sort, 10),
        isActive: rec?.isActive ?? true,
        record: rec,
        videoCount: 0,
        subjects: [],
      });
    }
    return classes.get(sort)!;
  };

  const ensureSubject = (sort: string, name: string, textbook = '') => {
    const key = subjectKey(sort, name);
    if (!subjects.has(key)) {
      const rec = subjectRec.get(key);
      const node: AdminSubjectNode = {
        key,
        class_sort: sort,
        name,
        textbook: rec?.textbook || textbook,
        order: rec?.order ?? 999,
        isActive: rec?.isActive ?? true,
        record: rec,
        videoCount: 0,
        chapters: [],
      };
      subjects.set(key, node);
      ensureClass(sort).subjects.push(node);
    }
    return subjects.get(key)!;
  };

  const ensureChapter = (sort: string, subject: string, chapterId: string, chapterName: string, textbook = '') => {
    const key = chapterKey(sort, subject, chapterId, textbook);
    if (!chapters.has(key)) {
      const rec = chapterRec.get(key) ?? (textbook ? chapterRec.get(chapterKey(sort, subject, chapterId)) : undefined);
      const node: AdminChapterNode = {
        key,
        class_sort: sort,
        subject,
        textbook: textbook || undefined,
        chapter_id: chapterId,
        chapter_name: rec?.chapter_name || chapterName,
        order: rec?.order ?? 999,
        isActive: rec?.isActive ?? true,
        record: rec,
        videoCount: 0,
      };
      chapters.set(key, node);
      ensureSubject(sort, subject).chapters.push(node);
    }
    return chapters.get(key)!;
  };

  videos.forEach((v) => {
    ensureClass(v.class_sort).videoCount += 1;
    ensureSubject(v.class_sort, v.subject, v.textbook).videoCount += 1;
    ensureChapter(v.class_sort, v.subject, v.chapter_id, v.chapter_name, v.textbook).videoCount += 1;
  });
  records.classes.forEach((r) => ensureClass(r.class_sort));
  records.subjects.forEach((r) => ensureSubject(r.class_sort, r.name, r.textbook));
  records.chapters.forEach((r) => {
    // Pre-book records already overlay their video chapter above; don't add a duplicate node.
    const overlaid = !r.textbook && Array.from(chapters.values()).some(
      (n) => n.class_sort === r.class_sort && n.subject === r.subject && n.chapter_id === r.chapter_id
    );
    if (!overlaid) ensureChapter(r.class_sort, r.subject, r.chapter_id, r.chapter_name, r.textbook);
  });

  const sorted = Array.from(classes.values()).sort((a, b) => a.order - b.order);
  sorted.forEach((c) => {
    c.subjects.sort((a, b) => a.order - b.order || a.name.localeCompare(b.name));
    c.subjects.forEach((s) =>
      s.chapters.sort((a, b) => a.order - b.order || compareChapterIds(a.chapter_id, b.chapter_id))
    );
  });
  return sorted;
}

/** Records for every node that has no record yet, with orders matching the current display order. */
export function missingRecords(tree: AdminClassNode[]): CurriculumRecords {
  const out: CurriculumRecords = { classes: [], subjects: [], chapters: [] };
  tree.forEach((c) => {
    if (!c.record) {
      out.classes.push({
        id: c.class_sort,
        class_sort: c.class_sort,
        name: c.name,
        order: c.order,
        isActive: true,
      });
    }
    c.subjects.forEach((s, si) => {
      if (!s.record) {
        out.subjects.push({
          id: s.key,
          class_sort: s.class_sort,
          name: s.name,
          textbook: s.textbook,
          order: (si + 1) * 10,
          isActive: true,
        });
      }
      s.chapters.forEach((ch, ci) => {
        if (!ch.record) {
          out.chapters.push({
            id: ch.key,
            class_sort: ch.class_sort,
            subject: ch.subject,
            chapter_id: ch.chapter_id,
            chapter_name: ch.chapter_name,
            order: (ci + 1) * 10,
            isActive: true,
          });
        }
      });
    });
  });
  return out;
}
