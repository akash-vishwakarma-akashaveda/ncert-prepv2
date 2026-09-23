import React, { useEffect, useState } from 'react';
import { Link, Navigate, useParams } from 'react-router-dom';
import { Check, ChevronDown, ChevronLeft, FileText, Play, Bookmark, BookOpen, Star } from 'lucide-react';
import { NotesTarget } from '../../types';
import { useAuth } from '../../context/AuthContext';
import { useProgress } from '../../context/ProgressContext';
import { NotesService } from '../../services/content';
import { RevisionNotesModal } from '../../components/app/RevisionNotesModal';
import { classLabel } from '../../data/gamification';
import { getSubjectTileStyle } from '../../data/colorTokens';
import { SubjectSummary, useCourse } from '../useCourse';
import { Mascot, useStage } from '../stage';
import { EmptyState, PageHeader, ProgressBar, SubjectGlyph, btnPrimary, chapterNumbers, formatDuration, lessonPath, pill, subjectPath } from '../ui';

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

export const SubjectsPage: React.FC = () => {
  const course = useCourse();
  const { isAdmin } = useAuth();

  if (isAdmin && !course.classSort) {
    return <Navigate to="/browse" replace />;
  }

  return (
    <div className="space-y-6">
      <PageHeader section="subjects" title="My subjects" description={`${classLabel(course.classSort)} · ${course.subjects.length} subjects`} />
      {course.subjects.length === 0 ? (
        <EmptyState icon={<BookOpen className="w-6 h-6" />} title="No subjects yet" body="Lessons for your class haven't been published yet." />
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 2xl:grid-cols-4 gap-4 sm:gap-5">
          {course.subjects.map((s) => (
            <SubjectCard key={s.group.name} summary={s} />
          ))}
        </div>
      )}
    </div>
  );
};

export const SubjectDetailPage: React.FC = () => {
  const { subject = '' } = useParams();
  const course = useCourse();
  const { isCompleted, isFavorited, toggleFavorite } = useProgress();
  const [notesKeys, setNotesKeys] = useState<Set<string>>(new Set());
  const [notesTarget, setNotesTarget] = useState<NotesTarget | null>(null);
  const [openKey, setOpenKey] = useState<string | null>(null);
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

  const chapters = summary.group.chapters;
  const isChapterDone = (i: number) => chapters[i].videos.length > 0 && chapters[i].videos.every((v) => isCompleted(v.youtube_id));
  const currentIndex = chapters.findIndex((_, i) => !isChapterDone(i));
  const chaptersDone = chapters.filter((_, i) => isChapterDone(i)).length;
  // The current chapter starts expanded so its lessons are one tap away.
  const expanded = openKey ?? (currentIndex >= 0 ? chapters[currentIndex].key : null);
  const withNotes = chapters.filter((c) => notesKeys.has(c.key));
  const numbers = chapterNumbers(chapters);
  const books = Array.from(new Set(chapters.map((c) => c.textbook || '')));
  const multiBook = books.length > 1;

  return (
    <div className="space-y-5">
      <Link to="/app/subjects" className="inline-flex items-center gap-1 px-4 py-2 rounded-full bg-white border-2 border-[#E3E5EC] text-xs font-extrabold text-[#6B7280] hover:text-[#1E2233]">
        <ChevronLeft className="w-4 h-4" /> My subjects
      </Link>

      <section className="rounded-[26px] bg-[#FFC53D] border-[3px] border-[#E0A81F] shadow-[0_6px_0_#E0A81F] p-5 sm:p-6 flex flex-wrap items-center gap-4 sm:gap-5">
        <div className="flex-1 min-w-[220px] flex flex-col gap-1.5">
          <span className="text-[11px] font-extrabold tracking-[0.1em] text-[#7A5C10]">
            {classLabel(course.classSort).toUpperCase()} · {summary.group.name.toUpperCase()}
          </span>
          <h1 className="text-[27px] leading-tight">{multiBook ? summary.group.name : summary.group.textbook || chapters[0]?.textbook || summary.group.name} learning path</h1>
          {multiBook && <span className="text-[12.5px] font-extrabold text-[#7A5C10]">{books.length} books: {books.join(' · ')}</span>}
          <span className="text-[13px] font-bold text-[#7A5C10]">
            {chaptersDone === 0
              ? `${chapters.length} chapters · ${summary.lessons.length} lessons. Let's start!`
              : `You're doing great — ${chaptersDone} of ${chapters.length} chapters cleared.`}
          </span>
        </div>
        {stage === 'primary' && <Mascot className="hidden sm:block w-16 -my-2 animate-bob" />}
        <div className="flex flex-col items-center gap-1 px-5 py-3.5 rounded-[20px] bg-white/55">
          <span className="font-display text-[26px] leading-none">{summary.percent}%</span>
          <span className="text-[10px] font-extrabold text-[#7A5C10]">COMPLETE</span>
        </div>
        {summary.nextLesson && (
          <Link to={lessonPath(summary.nextLesson.youtube_id)} className={btnPrimary}>
            <Play className="w-4 h-4 fill-white" /> {summary.completed ? 'Continue' : 'Start subject'}
          </Link>
        )}
      </section>

      <div className="grid grid-cols-1 lg:grid-cols-[minmax(0,2fr)_minmax(250px,1fr)] gap-5 items-start">
        <ol aria-label="Chapters">
          {chapters.map((chapter, index) => {
            const done = isChapterDone(index);
            const current = index === currentIndex;
            const doneCount = chapter.videos.filter((v) => isCompleted(v.youtube_id)).length;
            const open = expanded === chapter.key;
            const dot = done
              ? 'bg-[#12A594] border-[#0B7A67] text-white'
              : current
                ? 'bg-[#FFC53D] border-[#E0A81F] text-[#1E2233] animate-glow'
                : 'bg-[#F1F3FB] border-[#E3E5EC] text-[#9AA1B4]';
            const box = current ? 'bg-[#FFF6E2] border-[#FFD97A]' : done ? 'bg-white border-[#CDEFE4]' : 'bg-white border-[color:var(--card-line)]';
            return (
              <React.Fragment key={chapter.key}>
              {multiBook && chapter.textbook !== chapters[index - 1]?.textbook && (
                <li className={`flex items-center gap-2.5 mb-3 ${index ? 'mt-3' : ''}`}>
                  <span className="text-[10.5px] font-extrabold tracking-[0.1em] text-white bg-[color:var(--brand)] rounded-full px-3 py-1">BOOK</span>
                  <h2 className="text-lg">{chapter.textbook || 'Other chapters'}</h2>
                </li>
              )}
              <li className="flex gap-3 sm:gap-[18px]">
                <div className="shrink-0 w-10 sm:w-[52px] flex flex-col items-center" aria-hidden="true">
                  <span className={`w-10 h-10 sm:w-[46px] sm:h-[46px] rounded-full border-[3px] flex items-center justify-center text-sm font-extrabold ${dot}`}>
                    {done ? <Check className="w-5 h-5" strokeWidth={3} /> : current ? <Play className="w-4 h-4 fill-current" /> : index + 1}
                  </span>
                  {index < chapters.length - 1 && chapters[index + 1].textbook === chapter.textbook && <span className={`flex-1 w-[5px] min-h-[18px] rounded-full ${done ? 'bg-[#A9E6D3]' : 'bg-[#E3E5EC]'}`} />}
                </div>
                <div className={`flex-1 min-w-0 mb-4 rounded-[22px] border-[3px] ${box}`} style={{ boxShadow: `0 5px 0 ${current ? '#FFD97A' : done ? '#CDEFE4' : 'var(--card-line)'}` }}>
                  <div className="flex items-center gap-3 p-4 sm:px-[18px]">
                    <button onClick={() => setOpenKey(open ? '' : chapter.key)} aria-expanded={open} className="flex-1 min-w-0 flex items-center gap-2 text-left cursor-pointer">
                      <span className="min-w-0">
                        <span className="block text-[10.5px] font-extrabold tracking-[0.08em] text-[#6B7280]">CHAPTER {numbers[index]}</span>
                        <span className="block font-display text-lg leading-snug">{chapter.chapter_name}</span>
                        <span className="block text-[11.5px] font-bold text-[#6B7280]">
                          {chapter.videos.length} {chapter.videos.length === 1 ? 'lesson' : 'lessons'} · {doneCount} done
                        </span>
                      </span>
                      <ChevronDown className={`ml-auto w-5 h-5 shrink-0 text-[#9AA1B4] transition-transform ${open ? '' : '-rotate-90'}`} />
                    </button>
                    <span
                      className={`${pill} shrink-0 hidden sm:inline-flex ${
                        done ? 'bg-[#E7F7F1] text-[#0B7A67]' : current ? 'bg-[#FFC53D] text-[#1E2233]' : 'bg-[#F1F3FB] text-[#9AA1B4]'
                      }`}
                    >
                      {done ? 'Completed' : current ? (doneCount ? 'Continue' : 'Start') : 'Up ahead'}
                    </span>
                  </div>

                  {open && (
                    <ul className="px-3 pb-3 space-y-1.5">
                      {chapter.videos.length === 0 && <li className="px-2 py-2 text-sm font-semibold text-[#6B7280]">Video lessons for this chapter are coming soon.</li>}
                      {chapter.videos.map((v, vi) => {
                        const completed = isCompleted(v.youtube_id);
                        const saved = isFavorited(v.youtube_id);
                        return (
                          <li key={v.youtube_id} className="flex items-center gap-3 p-2.5 rounded-2xl bg-white border-2 border-[color:var(--card-line)] hover:border-[#D7DCEF]">
                            <span
                              className={`w-7 h-7 shrink-0 rounded-full flex items-center justify-center text-[11px] font-extrabold ${
                                completed ? 'bg-[#12A594] text-white' : 'bg-[#F1F3FB] text-[#6B7280]'
                              }`}
                              aria-label={completed ? 'Completed' : 'Not started'}
                            >
                              {completed ? <Check className="w-4 h-4" strokeWidth={3} /> : vi + 1}
                            </span>
                            <Link to={lessonPath(v.youtube_id)} className="flex-1 min-w-0">
                              <span className="block text-[13px] font-extrabold truncate hover:text-[color:var(--brand)]">{v.video_title}</span>
                              <span className="block text-[11px] font-semibold text-[#6B7280]">
                                Lecture {vi + 1}
                                {formatDuration(v.duration_seconds) && ` · ${formatDuration(v.duration_seconds)}`}
                                {v.pyq_available && ' · Includes PYQs'}
                              </span>
                            </Link>
                            <button
                              onClick={() => toggleFavorite(v.youtube_id)}
                              aria-label={saved ? 'Remove from saved' : 'Save lesson'}
                              aria-pressed={saved}
                              className="p-1.5 rounded-xl hover:bg-[#F1F3FB] cursor-pointer"
                            >
                              <Bookmark className={`w-4 h-4 ${saved ? 'fill-[color:var(--brand)] text-[color:var(--brand)]' : 'text-[#9AA1B4]'}`} />
                            </button>
                          </li>
                        );
                      })}
                      {notesKeys.has(chapter.key) && (
                        <li>
                          <button onClick={() => setNotesTarget(chapter)} className="w-full flex items-center gap-2 p-2.5 rounded-2xl bg-[color:var(--brand-soft)] border-2 border-[color:var(--brand-line)] text-[13px] font-extrabold text-[color:var(--brand)] cursor-pointer">
                            <FileText className="w-4 h-4" /> Chapter notes & cheat sheet
                          </button>
                        </li>
                      )}
                    </ul>
                  )}
                </div>
              </li>
              </React.Fragment>
            );
          })}
        </ol>

        <aside className="lg:sticky lg:top-24 rounded-[26px] bg-[color:var(--brand-soft)] border-[3px] border-[color:var(--brand-line)] p-5 flex flex-col gap-3">
          <h3 className="text-lg">Chapter notes</h3>
          <p className="text-[12.5px] font-semibold leading-relaxed text-[#4B5168]">Published notes and cheat sheets appear here for every chapter that has them.</p>
          {withNotes.length === 0 ? (
            <p className="text-[12.5px] font-bold text-[#6B7280]">No notes published for {summary.group.name} yet.</p>
          ) : (
            <ul className="space-y-2">
              {withNotes.map((c) => (
                <li key={c.key}>
                  <button onClick={() => setNotesTarget(c)} className="w-full flex items-center gap-2.5 bg-white rounded-[14px] px-3 py-2.5 border-2 border-[#D7DCEF] hover:border-[color:var(--brand)] text-left cursor-pointer">
                    <span className="text-[10px] font-extrabold text-white bg-[#E0603F] rounded-md px-1.5 py-0.5">NOTES</span>
                    <span className="flex-1 min-w-0 truncate text-[12.5px] font-bold">{c.chapter_name}</span>
                    <span className="text-[11px] font-bold text-[color:var(--brand)]">Open</span>
                  </button>
                </li>
              ))}
            </ul>
          )}
        </aside>
      </div>

      {notesTarget && <RevisionNotesModal isOpen onClose={() => setNotesTarget(null)} target={notesTarget} />}
    </div>
  );
};
