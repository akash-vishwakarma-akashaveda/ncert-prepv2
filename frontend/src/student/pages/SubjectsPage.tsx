import React, { useEffect, useState } from 'react';
import { Link, Navigate, useParams } from 'react-router-dom';
import { ChevronDown, BookOpen, Star, Compass } from 'lucide-react';
import { NotesTarget } from '../../types';
import { useAuth } from '../../context/AuthContext';
import { useProgress } from '../../context/ProgressContext';
import { NotesService } from '../../services/content';
import { RevisionNotesModal } from '../../components/app/RevisionNotesModal';
import { classLabel } from '../../data/gamification';
import { getSubjectTileStyle } from '../../data/colorTokens';
import { SubjectSummary, useCourse } from '../useCourse';
import { useStage } from '../stage';
import { EmptyState, ProgressBar, SubjectGlyph, btnPrimary, card, subjectPath } from '../ui';
import { LearningPath, SubjectPickerCards, SubjectPickerHeader, SubjectPickerTip } from '../kids/KidsScreens';

export const SubjectCard: React.FC<{ summary: SubjectSummary }> = ({ summary }) => {
  const { isCompleted } = useProgress();
  const t = getSubjectTileStyle(summary.group.name);
  const chaptersDone = summary.group.chapters.filter((c) => c.videos.length && c.videos.every((v) => isCompleted(v.youtube_id))).length;
  return (
    <Link
      to={subjectPath(summary.group.name)}
      className="subject-card btn-3d group bg-white rounded-[26px] border-[3px] p-[18px] flex flex-col gap-3.5 hover:-translate-y-0.5 transition-transform"
      style={{ borderColor: t.border, ['--edge' as string]: t.border, ['--tint' as string]: t.ink, ['--tint-soft' as string]: t.bg }}
    >
      <div className="flex items-center gap-3">
        <SubjectGlyph subject={summary.group.name} className="w-[52px] h-[52px] rounded-[18px]" />
        <div className="min-w-0 flex flex-col gap-1 items-start">
          <span className="font-display text-lg leading-tight truncate max-w-full">{summary.group.name}</span>
          <span className="text-[10.5px] font-extrabold text-white rounded-full px-2 py-0.5 max-w-full truncate" style={{ background: t.ink }}>
            {summary.group.textbook || `${summary.lessons.length} lessons`}
          </span>
        </div>
        {summary.isFocus && <Star className="ml-auto w-4 h-4 shrink-0 fill-[#FFC53D] text-[#E0A81F]" aria-label="Focus subject" />}
      </div>
      <div className="mt-auto space-y-1.5">
        <ProgressBar value={summary.percent} color={t.ink} />
        <p className="text-[11.5px] font-bold text-[#6B7280]">
          {chaptersDone} of {summary.group.chapters.length} chapters done
        </p>
      </div>
    </Link>
  );
};

/**
 * Every class gets the same flow (first built for Class 1–5): a big-card subject picker, then a winding
 * chapter path. Class 11–12 streams still put the stream's subjects first, with the rest folded away.
 */
export const SubjectsPage: React.FC = () => {
  const course = useCourse();
  const { isAdmin } = useAuth();
  const stage = useStage();

  if (isAdmin && !course.classSort) {
    return <Navigate to="/browse" replace />;
  }

  return (
    <div className="space-y-6">
      <SubjectPickerHeader classSort={course.classSort} stage={stage} detail={course.stream?.label} />
      {course.subjects.length === 0 ? (
        <EmptyState
          icon={<BookOpen className="w-6 h-6" />}
          title="Lessons coming soon"
          body="Lessons for your class are being added. Chapter PDFs may already be there under Textbooks."
          action={<Link to="/app/textbooks" className={btnPrimary}>Open textbooks</Link>}
        />
      ) : (
        <>
          {course.hasStreams && !course.stream && (
            <div className={`${card} p-4 flex flex-wrap items-center gap-3`}>
              <Compass className="w-5 h-5 text-[color:var(--brand)] shrink-0" />
              <p className="text-[13px] font-semibold text-[#4B5168] flex-1 min-w-[220px]">
                Pick your stream and we'll put those subjects first. Every subject stays open either way.
              </p>
              <Link to="/app/profile" className={`${btnPrimary} px-4 py-2 text-[13px]`}>Choose my stream</Link>
            </div>
          )}
          <SubjectPickerCards subjects={course.streamSubjects} />
          {course.otherSubjects.length > 0 && (
            <details className={`group ${card} px-5 py-3`}>
              <summary className="cursor-pointer list-none flex items-center gap-2 text-[13.5px] font-extrabold text-[#4B5168] py-1">
                <ChevronDown className="w-4 h-4 transition-transform group-open:rotate-180" />
                Other subjects in {classLabel(course.classSort)} ({course.otherSubjects.length})
              </summary>
              <p className="text-[12px] font-semibold text-[#6B7280] pt-1 pb-4">
                Outside your stream, but open to you. Take a look whenever you like.
              </p>
              <div className="pb-3">
                <SubjectPickerCards subjects={course.otherSubjects} />
              </div>
            </details>
          )}
          {stage === 'primary' && <SubjectPickerTip />}
        </>
      )}
    </div>
  );
};

export const SubjectDetailPage: React.FC = () => {
  const { subject = '' } = useParams();
  const course = useCourse();
  const [notesKeys, setNotesKeys] = useState<Set<string>>(new Set());
  const [notesTarget, setNotesTarget] = useState<NotesTarget | null>(null);
  const stage = useStage();

  useEffect(() => {
    if (course.classSort) NotesService.publishedKeysForClass(course.classSort).then(setNotesKeys);
  }, [course.classSort]);

  const summary = course.subjects.find((s) => s.group.name === subject);
  if (!summary) {
    return (
      <EmptyState
        icon={<BookOpen className="w-6 h-6" />}
        title={course.loading ? 'Loading subject…' : 'Subject not found'}
        action={!course.loading && <Link to="/app/subjects" className={btnPrimary}>Back to my subjects</Link>}
      />
    );
  }

  return (
    <>
      <LearningPath classSort={course.classSort} stage={stage} summary={summary} notesKeys={notesKeys} onOpenNotes={setNotesTarget} />
      {notesTarget && <RevisionNotesModal isOpen onClose={() => setNotesTarget(null)} target={notesTarget} />}
    </>
  );
};
