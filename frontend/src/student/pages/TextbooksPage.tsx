import React, { Suspense, lazy, useMemo, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { BookOpen, Compass, FileText, Star } from 'lucide-react';
import { classLabel } from '../../data/gamification';
import { getSubjectTileStyle } from '../../data/colorTokens';
import { ChapterGroup } from '../../types';
import { toDisplayTitle } from '../../components/home/StageShowcase';
import { useCourse } from '../useCourse';
import { EmptyState, SubjectGlyph, btnPrimary, card, chapterNumbers } from '../ui';

// PDF.js is heavy, so the viewer (and the library) load only when a chapter is opened.
const PdfViewer = lazy(() => import('../../components/textbook/PdfViewer').then((m) => ({ default: m.PdfViewer })));

interface OpenChapter {
  chapter: ChapterGroup;
  url: string;
}

interface PdfChapter {
  chapter: ChapterGroup;
  number: number;
  url: string;
}

/**
 * The class's NCERT books as a small library: pick a subject, then each of its books is a card with a coloured
 * cover and its chapters listed in order. Chapters open in the PDF viewer. The subject lives in ?subject=.
 * Class 11–12: only the chosen stream's subjects (plus the ones every stream takes), like "My subjects".
 */
export const TextbooksPage: React.FC = () => {
  const course = useCourse();
  const [openChapter, setOpenChapter] = useState<OpenChapter | null>(null);
  const [params, setParams] = useSearchParams();

  // Subjects that have at least one chapter PDF, each split into its books.
  const subjects = useMemo(
    () =>
      course.streamSubjects
        .map((s) => {
          const numbers = chapterNumbers(s.group.chapters);
          const books = new Map<string, PdfChapter[]>();
          s.group.chapters.forEach((chapter, i) => {
            const url = chapter.videos.find((v) => v.pdf_url)?.pdf_url;
            if (!url) return;
            const book = chapter.textbook || s.group.textbook || s.group.name;
            books.set(book, [...(books.get(book) ?? []), { chapter, number: numbers[i], url }]);
          });
          const count = Array.from(books.values()).reduce((n, list) => n + list.length, 0);
          return { name: s.group.name, books: Array.from(books.entries()), count };
        })
        .filter((s) => s.count > 0),
    [course.streamSubjects]
  );
  const total = subjects.reduce((n, s) => n + s.count, 0);
  const active = subjects.find((s) => s.name === params.get('subject')) ?? subjects[0];

  return (
    <div className="space-y-6">
      <header className="text-center space-y-2">
        <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-[color:var(--brand-soft)] text-[color:var(--brand)] text-[12px] font-extrabold">
          <Star className="w-3.5 h-3.5 fill-current" /> {classLabel(course.classSort)}
          {course.stream && ` · ${course.stream.label} stream`}
          {total > 0 && ` · ${total} chapters`}
        </span>
        <h1 className="text-[32px] sm:text-[38px] leading-tight">Textbooks</h1>
        <p className="text-[14px] font-semibold text-[#6B7280]">Your NCERT books, chapter by chapter. Open any chapter to read it.</p>
        {course.stream && (
          <p className="text-[12.5px] font-semibold text-[#6B7280]">
            Showing your {course.stream.label} subjects.{' '}
            <Link to="/app/profile" className="font-extrabold text-[color:var(--brand)] hover:underline underline-offset-4">
              Change stream
            </Link>
          </p>
        )}
      </header>

      {course.hasStreams && !course.stream && (
        <div className={`${card} p-4 flex flex-wrap items-center gap-3`}>
          <Compass className="w-5 h-5 text-[color:var(--brand)] shrink-0" />
          <p className="text-[13px] font-semibold text-[#4B5168] flex-1 min-w-[220px]">
            Pick your stream and we'll show just the textbooks you need. Until then, every subject is here.
          </p>
          <Link to="/app/profile" className={`${btnPrimary} px-4 py-2 text-[13px]`}>Choose my stream</Link>
        </div>
      )}

      {total === 0 || !active ? (
        <EmptyState
          icon={<FileText className="w-6 h-6" />}
          title={course.loading ? 'Loading textbooks…' : 'No textbook PDFs yet'}
          body={course.loading ? undefined : "NCERT chapter PDFs for your class haven't been linked yet. Check back soon!"}
        />
      ) : (
        <>
          {/* Subject picker: one chunky button per subject, coloured like its subject card. */}
          <div role="tablist" aria-label="Subjects" className="flex flex-wrap justify-center gap-2.5">
            {subjects.map((s) => {
              const t = getSubjectTileStyle(s.name);
              const on = s.name === active.name;
              return (
                <button
                  key={s.name}
                  role="tab"
                  aria-selected={on}
                  onClick={() => setParams({ subject: s.name }, { replace: true, preventScrollReset: true })}
                  className="inline-flex items-center gap-2 pl-1.5 pr-4 py-1.5 rounded-full border-[3px] text-[13.5px] font-extrabold transition-transform hover:-translate-y-0.5 cursor-pointer"
                  style={{
                    background: on ? t.ink : '#fff',
                    borderColor: on ? t.ink : t.border,
                    color: on ? '#fff' : '#1E2233',
                    boxShadow: `0 4px 0 ${on ? `color-mix(in srgb, ${t.ink} 70%, #000)` : t.border}`,
                  }}
                >
                  <SubjectGlyph subject={s.name} className="w-8 h-8 rounded-full" />
                  {s.name}
                </button>
              );
            })}
          </div>

          {/* The chosen subject's books. */}
          <div role="tabpanel" aria-label={active.name} className="space-y-6">
            {active.books.map(([book, chapters]) => {
              const t = getSubjectTileStyle(active.name);
              return (
                <section
                  key={book}
                  className="rounded-[30px] bg-white border-[4px] overflow-hidden"
                  style={{ borderColor: t.ink, boxShadow: `0 8px 0 ${t.ink}` }}
                >
                  <header className="flex items-center gap-4 px-5 sm:px-6 py-4 text-white" style={{ background: t.ink }}>
                    <span className="w-12 h-12 shrink-0 rounded-2xl bg-white/20 flex items-center justify-center">
                      <BookOpen className="w-6 h-6" />
                    </span>
                    <div className="min-w-0">
                      <p className="text-[11px] font-extrabold tracking-[0.1em] text-white/80">{active.name.toUpperCase()} · TEXTBOOK</p>
                      <h2 className="font-display text-[22px] leading-tight truncate">{book}</h2>
                    </div>
                    <span className="ml-auto shrink-0 px-3 py-1 rounded-full bg-white/20 text-[12px] font-extrabold">
                      {chapters.length} chapter{chapters.length === 1 ? '' : 's'}
                    </span>
                  </header>
                  <ol className="grid sm:grid-cols-2 xl:grid-cols-3 gap-x-4 gap-y-1 p-3 sm:p-4">
                    {chapters.map(({ chapter, number, url }) => (
                      <li key={chapter.key}>
                        <button
                          onClick={() => setOpenChapter({ chapter, url })}
                          className="group w-full flex items-center gap-3 p-2.5 rounded-2xl text-left hover:bg-[color:var(--page)] cursor-pointer"
                        >
                          <span
                            className="w-9 h-9 shrink-0 rounded-full flex items-center justify-center font-display text-[15px]"
                            style={{ background: t.bg, color: t.ink }}
                          >
                            {number}
                          </span>
                          <span className="flex-1 min-w-0 text-[14px] font-extrabold text-[#1E2233] leading-snug line-clamp-2">
                            {toDisplayTitle(chapter.chapter_name)}
                          </span>
                          <span
                            className="shrink-0 inline-flex items-center gap-1 px-3 py-1.5 rounded-full text-[12px] font-extrabold border-2 transition-colors"
                            style={{ borderColor: t.border, color: t.ink }}
                          >
                            <FileText className="w-3.5 h-3.5" /> Read
                          </span>
                        </button>
                      </li>
                    ))}
                  </ol>
                </section>
              );
            })}
          </div>
        </>
      )}

      {openChapter && (
        <Suspense fallback={null}>
          <PdfViewer
            url={openChapter.url}
            title={toDisplayTitle(openChapter.chapter.chapter_name)}
            subtitle={[openChapter.chapter.subject, openChapter.chapter.textbook].filter(Boolean).join(' · ')}
            onClose={() => setOpenChapter(null)}
          />
        </Suspense>
      )}
    </div>
  );
};
