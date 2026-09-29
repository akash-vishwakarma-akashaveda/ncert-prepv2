import { useMemo } from 'react';
import { SubjectGroup, Video } from '../types';
import { useAuth } from '../context/AuthContext';
import { useProgress } from '../context/ProgressContext';
import { useCatalogContext } from '../context/CatalogContext';
import { Stream, classHasStreams, getStream, isInStream } from '../data/streams';

export interface SubjectSummary {
  group: SubjectGroup;
  lessons: Video[];
  completed: number;
  percent: number;
  nextLesson: Video | null;
  isFocus: boolean;
  /** False only for a senior who picked a stream this subject is not part of. */
  inStream: boolean;
}

// Everything the student pages need about the enrolled class, computed once per render.
export function useCourse() {
  const { user } = useAuth();
  const { isCompleted, lastWatchedId } = useProgress();
  const { getSubjectsForClass, videoMap, loading } = useCatalogContext();
  const classSort = user?.grade_preference || '';
  const focus = user?.focus_subjects || [];
  // Classes 1-10 have no streams, so every subject counts as in-stream and nothing is split out.
  const stream: Stream | null = classHasStreams(classSort) ? getStream(user?.stream) : null;

  const subjects = useMemo<SubjectSummary[]>(() => {
    if (!classSort) return [];
    return getSubjectsForClass(classSort)
      .map((group) => {
        const lessons = group.chapters.flatMap((c) => c.videos);
        const completed = lessons.filter((v) => isCompleted(v.youtube_id)).length;
        return {
          group,
          lessons,
          completed,
          percent: lessons.length ? Math.round((completed / lessons.length) * 100) : 0,
          nextLesson: lessons.find((v) => !isCompleted(v.youtube_id)) || null,
          isFocus: focus.includes(group.name),
          inStream: isInStream(group.name, stream),
        };
      })
      .sort((a, b) => Number(b.inStream) - Number(a.inStream) || Number(b.isFocus) - Number(a.isFocus));
  }, [classSort, getSubjectsForClass, isCompleted, focus.join('|'), stream?.id]); // eslint-disable-line react-hooks/exhaustive-deps

  // What the dashboard leads with. Without a stream this is simply everything.
  const streamSubjects = subjects.filter((s) => s.inStream);
  const otherSubjects = subjects.filter((s) => !s.inStream);
  const allLessons = subjects.flatMap((s) => s.lessons);
  const completedCount = allLessons.filter((v) => isCompleted(v.youtube_id)).length;
  const lastWatched = lastWatchedId ? videoMap.get(lastWatchedId) || null : null;
  const resume =
    lastWatched && lastWatched.isActive && lastWatched.class_sort === classSort
      ? lastWatched
      : subjects.find((s) => s.nextLesson)?.nextLesson || allLessons[0] || null;

  return {
    classSort,
    stream,
    hasStreams: classHasStreams(classSort),
    subjects,
    streamSubjects,
    otherSubjects,
    allLessons,
    completedCount,
    percent: allLessons.length ? Math.round((completedCount / allLessons.length) * 100) : 0,
    resume,
    resumeStarted: Boolean(lastWatched && resume?.youtube_id === lastWatched.youtube_id),
    loading,
  };
}
