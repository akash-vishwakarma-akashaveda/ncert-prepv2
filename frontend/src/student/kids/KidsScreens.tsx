import React from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Check, ChevronLeft, FileText, Play, Star } from 'lucide-react';
import { ChapterGroup } from '../../types';
import { useProgress } from '../../context/ProgressContext';
import { classLabel } from '../../data/gamification';
import { getSubjectTileStyle } from '../../data/colorTokens';
import { EducationalStage } from '../../data/stageThemes';
import { SubjectSummary } from '../useCourse';
import { Mascot } from '../stage';
import { chapterNumbers, lessonPath, subjectIcon, subjectPath } from '../ui';

/**
 * The subject picker and chapter learning path, first built for Class 1–5 and now used by every class:
 * big, friendly, one thing at a time. Only the wording changes with age (playful for 1–5, plain from 6 up).
 */

/** Words per age group: the same screens, pitched at the reader. */
const COPY = {
  kids: {
    pickTitle: 'Choose your subject!',
    pickLead: 'Pick a book to start your learning adventure today.',
    start: "Let's start your adventure!",
    progress: (d: number, n: number) => `You're doing great! ${d} of ${n} done. Keep going!`,
    lessons: (n: number) => `${n} ${n === 1 ? 'video' : 'videos'}`,
    done: 'Completed!',
  },
  older: {
    pickTitle: 'Your subjects',
    pickLead: 'Pick a subject and carry on from your next chapter.',
    start: 'Start with chapter 1, then follow the path.',
    progress: (d: number, n: number) => `${d} of ${n} chapters done. Keep the streak going.`,
    lessons: (n: number) => `${n} ${n === 1 ? 'lecture' : 'lectures'}`,
    done: 'Completed',
  },
};
const copyFor = (stage: EducationalStage | null) => (stage === 'primary' ? COPY.kids : COPY.older);

/** "Choose your Subject!" heading with the class badge. */
export const SubjectPickerHeader: React.FC<{ classSort: string; stage: EducationalStage | null; detail?: string }> = ({ classSort, stage, detail }) => {
  const copy = copyFor(stage);
  return (
    <header className="text-center space-y-2">
      <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-[color:var(--brand-soft)] text-[color:var(--brand)] text-[12px] font-extrabold">
        <Star className="w-3.5 h-3.5 fill-current" /> {classLabel(classSort)}
        {detail && ` · ${detail}`}
      </span>
      <h1 className="text-[32px] sm:text-[38px] leading-tight">{copy.pickTitle}</h1>
      <p className="text-[14px] font-semibold text-[#6B7280]">{copy.pickLead}</p>
    </header>
  );
};

/** One big card per subject, with its textbook name as a tag and a dot per chapter. */
export const SubjectPickerCards: React.FC<{ subjects: SubjectSummary[] }> = ({ subjects }) => {
  const { isCompleted } = useProgress();
  return (
    <ul className="grid sm:grid-cols-2 lg:grid-cols-3 2xl:grid-cols-4 gap-5">
      {subjects.map((s) => {
        const t = getSubjectTileStyle(s.group.name);
        const Icon = subjectIcon(s.group.name);
        const done = s.group.chapters.filter((c) => c.videos.length && c.videos.every((v) => isCompleted(v.youtube_id))).length;
        const books = Array.from(new Set(s.group.chapters.map((c) => c.textbook).filter(Boolean)));
        const book = books.length > 1 ? `${books.length} books` : s.group.textbook || books[0];
        // A book named after its subject (Mathematics → "Mathematics") would only repeat the title.
        const showBook = book && book.toLowerCase() !== s.group.name.toLowerCase();
        return (
          <li key={s.group.name}>
            <Link
              to={subjectPath(s.group.name)}
              className="kids-subject group h-full flex flex-col items-center gap-3 p-6 rounded-[30px] bg-white border-[4px] text-center transition-transform hover:-translate-y-1"
              style={{ borderColor: t.ink, boxShadow: `0 8px 0 ${t.ink}`, ['--tint' as string]: t.ink, ['--tint-soft' as string]: t.bg }}
            >
              <span
                className="w-24 h-24 rounded-full flex items-center justify-center border-[4px] transition-transform group-hover:scale-105 group-hover:rotate-[-4deg]"
                style={{ background: t.bg, borderColor: t.border, color: t.ink }}
                aria-hidden="true"
              >
                <Icon className="w-11 h-11" strokeWidth={2.4} />
              </span>
              <span className="font-display text-[24px] leading-tight text-[#1E2233]">{s.group.name}</span>
              {showBook && (
                <span className="px-3 py-1 rounded-full text-[12px] font-extrabold text-white" style={{ background: t.ink }}>
                  {book}
                </span>
              )}
              <span className="flex flex-wrap justify-center items-center gap-1 mt-auto" aria-label={`${done} of ${s.group.chapters.length} chapters done`}>
                {s.group.chapters.slice(0, 16).map((c, i) => (
                  <i key={c.key} className="w-2.5 h-2.5 rounded-full" style={{ background: i < done ? t.ink : '#E3E5EC' }} />
                ))}
              </span>
            </Link>
          </li>
        );
      })}
    </ul>
  );
};

/** Pip's tip under the Class 1–5 picker. */
export const SubjectPickerTip: React.FC = () => (
  <div className="flex items-center gap-4 p-5 rounded-[28px] bg-[#FFF6E2] border-[3px] border-[#FFD97A] shadow-[0_6px_0_#FFD97A]">
    <Mascot className="w-16 shrink-0 animate-bob" />
    <div>
      <p className="font-display text-[19px] text-[#1E2233]">Not sure where to start?</p>
      <p className="text-[13px] font-semibold text-[#8A5A14]">You can switch subjects any time. Pick your favourite first!</p>
    </div>
  </div>
);

type NodeState = 'done' | 'current' | 'next';

/** A subject's chapters as a winding road: done stops get a tick, the current one glows, the rest wait. */
export const LearningPath: React.FC<{
  classSort: string;
  stage: EducationalStage | null;
  summary: SubjectSummary;
  notesKeys: Set<string>;
  onOpenNotes: (chapter: ChapterGroup) => void;
}> = ({ classSort, stage, summary, notesKeys, onOpenNotes }) => {
  const { isCompleted } = useProgress();
  const navigate = useNavigate();
  const copy = copyFor(stage);
  const t = getSubjectTileStyle(summary.group.name);
  const chapters = summary.group.chapters;
  const numbers = chapterNumbers(chapters);
  // Several books in one subject (common from Class 6 up): the path gets a signpost at each new book.
  const books = Array.from(new Set(chapters.map((c) => c.textbook || '')));
  const multiBook = books.length > 1;
  const isDone = (c: ChapterGroup) => c.videos.length > 0 && c.videos.every((v) => isCompleted(v.youtube_id));
  const currentIndex = chapters.findIndex((c) => !isDone(c));
  const doneCount = chapters.filter(isDone).length;
  const open = (c: ChapterGroup) => {
    const next = c.videos.find((v) => !isCompleted(v.youtube_id)) ?? c.videos[0];
    if (next) navigate(lessonPath(next.youtube_id));
  };

  return (
    <div className="max-w-[640px] mx-auto space-y-6">
      <Link to="/app/subjects" className="inline-flex items-center gap-1 px-4 py-2 rounded-full bg-white border-2 border-[#E3E5EC] text-xs font-extrabold text-[#6B7280] hover:text-[#1E2233]">
        <ChevronLeft className="w-4 h-4" /> My subjects
      </Link>

      <header className="relative rounded-[30px] bg-[#FFC53D] border-[4px] border-[#E0A81F] shadow-[0_8px_0_#E0A81F] px-6 pt-5 pb-6 text-center">
        <span className="text-[11.5px] font-extrabold tracking-[0.1em] text-[#7A5C10]">
          {classLabel(classSort).toUpperCase()} · {summary.group.name.toUpperCase()}
        </span>
        <h1 className="text-[28px] leading-tight mt-1">
          {multiBook ? summary.group.name : summary.group.textbook || chapters.find((c) => c.textbook)?.textbook || summary.group.name}
        </h1>
        {multiBook && <p className="text-[12.5px] font-extrabold text-[#7A5C10]">{books.filter(Boolean).join(' · ')}</p>}
        <div className="mt-3 inline-flex items-center gap-3 px-4 py-2 rounded-full bg-white/70">
          <Mascot className="w-10 -my-2 animate-bob" />
          <span className="text-[13.5px] font-extrabold text-[#7A5C10]">
            {doneCount === 0 ? copy.start : copy.progress(doneCount, chapters.length)}
          </span>
        </div>
      </header>

      {chapters.length === 0 ? (
        <p className="text-center text-sm font-bold text-[#6B7280]">Lessons for this book are coming soon.</p>
      ) : (
        <ol className="relative py-4" aria-label="Chapters">
          {/* The road: a dashed line down the middle that the chapter stops sit on. */}
          <span aria-hidden="true" className="absolute left-1/2 top-0 bottom-0 -translate-x-1/2 w-3 rounded-full bg-[#E9DCC0]" />
          <span aria-hidden="true" className="absolute left-1/2 top-2 bottom-2 -translate-x-1/2 border-l-[3px] border-dashed border-white" />
          {chapters.map((c, i) => {
            const state: NodeState = isDone(c) ? 'done' : i === currentIndex ? 'current' : 'next';
            const left = i % 2 === 0;
            const lessons = c.videos.length;
            const lessonsDone = c.videos.filter((v) => isCompleted(v.youtube_id)).length;
            return (
              <React.Fragment key={c.key}>
                {multiBook && c.textbook !== chapters[i - 1]?.textbook && (
                  <li className="relative flex justify-center mb-7">
                    <span className="relative z-10 inline-flex items-center gap-2 px-4 py-2 rounded-full bg-[color:var(--brand)] text-white text-[13px] font-extrabold shadow-[0_4px_0_var(--brand-edge)]">
                      <span className="text-[10px] tracking-[0.12em] opacity-80">BOOK</span> {c.textbook || 'Other chapters'}
                    </span>
                  </li>
                )}
                <li className={`relative flex ${left ? 'justify-start' : 'justify-end'} mb-7 last:mb-0`}>
                  <span
                    aria-hidden="true"
                    className={`absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 z-10 w-9 h-9 rounded-full border-[4px] flex items-center justify-center text-[13px] font-extrabold ${
                      state === 'done'
                        ? 'bg-[#12A594] border-white text-white'
                        : state === 'current'
                          ? 'bg-[#FFC53D] border-white text-[#1E2233] animate-glow'
                          : 'bg-[#F1F3FB] border-white text-[#9AA1B4]'
                    }`}
                  >
                    {state === 'done' ? <Check className="w-4 h-4" strokeWidth={3.5} /> : numbers[i]}
                  </span>
                  <div className={`relative w-[calc(50%-28px)] ${left ? 'pr-1' : 'pl-1'}`}>
                    <button
                      type="button"
                      onClick={() => open(c)}
                      disabled={lessons === 0}
                      className={`w-full text-left flex items-center gap-3 p-4 rounded-[24px] border-[3px] cursor-pointer transition-transform hover:-translate-y-0.5 disabled:cursor-default disabled:hover:translate-y-0 ${
                        state === 'current'
                          ? 'bg-[#FFC53D] border-[#E0A81F] shadow-[0_6px_0_#E0A81F] scale-[1.04]'
                          : state === 'done'
                            ? 'bg-white border-[#A9E6D3] shadow-[0_5px_0_#A9E6D3]'
                            : 'bg-white border-[#E3E5EC] shadow-[0_5px_0_#E3E5EC]'
                      }`}
                    >
                      {state === 'current' && (
                        <span className="w-11 h-11 shrink-0 rounded-full bg-white flex items-center justify-center shadow-[0_3px_0_#E0A81F]">
                          <Play className="w-5 h-5 fill-[#1E2233] text-[#1E2233] ml-0.5" />
                        </span>
                      )}
                      <span className="min-w-0">
                        <span className="block text-[10.5px] font-extrabold tracking-[0.08em] text-[#6B7280]">
                          CHAPTER {numbers[i]}
                          {state === 'current' && ' · UP NEXT'}
                        </span>
                        <span className={`block font-display leading-snug ${state === 'current' ? 'text-[19px] text-[#1E2233]' : state === 'done' ? 'text-[16px] text-[#1E2233]' : 'text-[16px] text-[#4B5168]'}`}>
                          {c.chapter_name}
                        </span>
                        <span className="block text-[11.5px] font-bold" style={{ color: state === 'done' ? '#0B7A67' : t.ink }}>
                          {lessons === 0
                            ? 'Coming soon'
                            : state === 'done'
                              ? copy.done
                              : lessons > 1 && lessonsDone > 0
                                ? `${lessonsDone} of ${copy.lessons(lessons)} done`
                                : copy.lessons(lessons)}
                        </span>
                      </span>
                    </button>
                    {notesKeys.has(c.key) && (
                      <button
                        type="button"
                        onClick={() => onOpenNotes(c)}
                        aria-label={`Notes for ${c.chapter_name}`}
                        className="absolute -top-2 right-2 w-8 h-8 rounded-full bg-white border-2 border-[color:var(--brand-line)] text-[color:var(--brand)] flex items-center justify-center shadow-[0_2px_0_var(--brand-line)] cursor-pointer"
                      >
                        <FileText className="w-4 h-4" />
                      </button>
                    )}
                  </div>
                </li>
              </React.Fragment>
            );
          })}
        </ol>
      )}
    </div>
  );
};
