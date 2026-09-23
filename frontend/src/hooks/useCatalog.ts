import { useState, useEffect, useMemo, useCallback } from 'react';
import {
  Video,
  ClassGroup,
  SubjectGroup,
  ChapterGroup,
  CurriculumClass,
  CurriculumSubject,
  CurriculumChapter,
} from '../types';
import { VideoService } from '../services/videos';
import { CurriculumService, CurriculumRecords } from '../services/content';
import { compareBooks, compareChapterIds, compareVideosInSyllabusOrder } from '../data/classFormat';
import { chapterKey, subjectKey } from '../data/curriculumKeys';

const EMPTY_RECORDS: CurriculumRecords = { classes: [], subjects: [], chapters: [] };

/**
 * Videos come from the Sheet sync; classes/subjects/chapters records are an admin overlay that can
 * hide items, rename chapters, set order, and add chapters that have notes but no videos yet.
 * Items without a record are visible with default ordering.
 */
export function useCatalog() {
  const [allVideos, setAllVideos] = useState<Video[]>([]);
  const [records, setRecords] = useState<CurriculumRecords>(EMPTY_RECORDS);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [videos, hierarchy] = await Promise.all([VideoService.fetchVideos(), CurriculumService.load()]);
      setAllVideos(videos);
      setRecords(hierarchy);
      setError(null);
    } catch (err) {
      console.error('Failed to load course catalog:', err);
      setError('Could not load the course catalog. Please try refreshing.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const classRecords = useMemo(
    () => new Map<string, CurriculumClass>(records.classes.map((r) => [r.class_sort, r])),
    [records.classes]
  );
  const subjectRecords = useMemo(
    () => new Map<string, CurriculumSubject>(records.subjects.map((r) => [r.id, r])),
    [records.subjects]
  );
  const chapterRecords = useMemo(
    () => new Map<string, CurriculumChapter>(records.chapters.map((r) => [r.id, r])),
    [records.chapters]
  );
  // Records saved before chapter keys included the book are still found by their old key.
  const chapterRecord = useCallback(
    (classSort: string, subject: string, chapterId: string, textbook?: string) =>
      chapterRecords.get(chapterKey(classSort, subject, chapterId, textbook)) ??
      (textbook ? chapterRecords.get(chapterKey(classSort, subject, chapterId)) : undefined),
    [chapterRecords]
  );

  const activeVideos = useMemo(() => {
    return allVideos.filter((v) => {
      if (!v.isActive) return false;
      if (v.yt_public === false) return false;
      if (classRecords.get(v.class_sort)?.isActive === false) return false;
      if (subjectRecords.get(subjectKey(v.class_sort, v.subject))?.isActive === false) return false;
      if (chapterRecord(v.class_sort, v.subject, v.chapter_id, v.textbook)?.isActive === false) return false;
      return true;
    });
  }, [allVideos, classRecords, subjectRecords, chapterRecords, chapterRecord]);

  const videoMap = useMemo(() => {
    const map = new Map<string, Video>();
    allVideos.forEach((v) => map.set(v.youtube_id, v));
    return map;
  }, [allVideos]);

  const classes = useMemo((): ClassGroup[] => {
    const classMap = new Map<string, { sort: string; subjects: Set<string>; count: number }>();
    const ensure = (sort: string) => {
      if (!classMap.has(sort)) classMap.set(sort, { sort, subjects: new Set(), count: 0 });
      return classMap.get(sort)!;
    };

    activeVideos.forEach((v) => {
      const entry = ensure(v.class_sort);
      entry.subjects.add(v.subject);
      entry.count += 1;
    });
    records.classes.filter((c) => c.isActive).forEach((c) => ensure(c.class_sort));
    records.subjects
      .filter((s) => s.isActive && classRecords.get(s.class_sort)?.isActive !== false)
      .forEach((s) => ensure(s.class_sort).subjects.add(s.name));

    const order = (sort: string) => classRecords.get(sort)?.order ?? parseInt(sort, 10);
    return Array.from(classMap.values())
      .sort((a, b) => order(a.sort) - order(b.sort))
      .map((e) => ({
        class_display: classRecords.get(e.sort)?.name || `Class ${parseInt(e.sort, 10)}`,
        class_sort: e.sort,
        subjects: Array.from(e.subjects).sort(),
        videoCount: e.count,
      }));
  }, [activeVideos, records, classRecords]);

  const getSubjectsForClass = useCallback(
    (classSort: string): SubjectGroup[] => {
      if (classRecords.get(classSort)?.isActive === false) return [];

      const subjectMap = new Map<string, { chapters: Map<string, ChapterGroup>; count: number }>();
      const ensureSubject = (name: string) => {
        if (!subjectMap.has(name)) subjectMap.set(name, { chapters: new Map(), count: 0 });
        return subjectMap.get(name)!;
      };

      activeVideos
        .filter((v) => v.class_sort === classSort)
        .sort(compareVideosInSyllabusOrder)
        .forEach((v) => {
          const sub = ensureSubject(v.subject);
          sub.count += 1;
          const key = chapterKey(classSort, v.subject, v.chapter_id, v.textbook);
          if (!sub.chapters.has(key)) {
            sub.chapters.set(key, {
              key,
              class_sort: classSort,
              subject: v.subject,
              textbook: v.textbook,
              chapter_id: v.chapter_id,
              chapter_name: chapterRecord(classSort, v.subject, v.chapter_id, v.textbook)?.chapter_name || v.chapter_name,
              videos: [],
            });
          }
          sub.chapters.get(key)!.videos.push(v);
        });

      records.subjects
        .filter((s) => s.class_sort === classSort && s.isActive)
        .forEach((s) => ensureSubject(s.name));

      records.chapters
        .filter(
          (c) =>
            c.class_sort === classSort &&
            c.isActive &&
            subjectRecords.get(subjectKey(classSort, c.subject))?.isActive !== false
        )
        .forEach((c) => {
          const sub = ensureSubject(c.subject);
          // A record saved before keys carried the book overlays its video chapter instead of adding an empty one.
          if (!c.textbook && Array.from(sub.chapters.values()).some((ch) => ch.chapter_id === c.chapter_id)) return;
          if (!sub.chapters.has(c.id)) {
            sub.chapters.set(c.id, {
              key: c.id,
              class_sort: c.class_sort,
              subject: c.subject,
              textbook: c.textbook,
              chapter_id: c.chapter_id,
              chapter_name: c.chapter_name,
              videos: [],
            });
          }
        });

      const subjectOrder = (name: string) => subjectRecords.get(subjectKey(classSort, name))?.order ?? 999;
      const chapterOrder = (ch: ChapterGroup) => chapterRecord(classSort, ch.subject, ch.chapter_id, ch.textbook)?.order ?? 999;

      return Array.from(subjectMap.entries())
        .map(([name, data]) => ({
          name,
          textbook: subjectRecords.get(subjectKey(classSort, name))?.textbook,
          chapters: Array.from(data.chapters.values()).sort(
            (a, b) => compareBooks(a.textbook, b.textbook) || chapterOrder(a) - chapterOrder(b) || compareChapterIds(a.chapter_id, b.chapter_id)
          ),
          videoCount: data.count,
        }))
        .sort((a, b) => subjectOrder(a.name) - subjectOrder(b.name) || a.name.localeCompare(b.name));
    },
    [activeVideos, records, classRecords, subjectRecords, chapterRecord]
  );

  return {
    allVideos,
    activeVideos,
    videoMap,
    classes,
    records,
    loading,
    error,
    refreshCatalog: load,
    getSubjectsForClass,
  };
}
