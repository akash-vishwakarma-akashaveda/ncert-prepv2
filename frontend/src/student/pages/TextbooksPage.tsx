import React, { Suspense, lazy, useMemo, useState } from 'react';
import { FileText } from 'lucide-react';
import { classLabel } from '../../data/gamification';
import { getSubjectTileStyle } from '../../data/colorTokens';
import { ChapterGroup } from '../../types';
import { useCourse } from '../useCourse';
import { EmptyState, PageHeader, SubjectGlyph, chapterNumbers } from '../ui';

// PDF.js is heavy, so the viewer (and the library) load only when a chapter is opened.
const PdfViewer = lazy(() => import('../../components/textbook/PdfViewer').then((m) => ({ default: m.PdfViewer })));

interface OpenChapter {
  chapter: ChapterGroup;
  url: string;
}

export const TextbooksPage: React.FC = () => {
  const course = useCourse();
  const [openChapter, setOpenChapter] = useState<OpenChapter | null>(null);

  const bySubject = useMemo(
    () =>
      course.subjects
        .map((s) => ({
          group: s.group,
          numbers: chapterNumbers(s.group.chapters),
          withPdf: s.group.chapters
            .map((chapter, index) => ({ chapter, index, url: chapter.videos.find((v) => v.pdf_url)?.pdf_url }))
            .filter((c): c is { chapter: ChapterGroup; index: number; url: string } => Boolean(c.url)),
        }))
        .filter((s) => s.withPdf.length > 0),
    [course.subjects]
  );
  const total = bySubject.reduce((n, s) => n + s.withPdf.length, 0);

  return (
    <div className="space-y-6">
      <PageHeader
        section="textbooks"
        title="Textbooks"
        description={`${classLabel(course.classSort)} · ${total} chapter PDF${total === 1 ? '' : 's'}`}
      />

      {total === 0 ? (
        <EmptyState
          icon={<FileText className="w-6 h-6" />}
          title={course.loading ? 'Loading textbooks…' : 'No textbook PDFs yet'}
          body={course.loading ? undefined : "NCERT chapter PDFs for your class haven't been linked yet. Check back soon!"}
        />
      ) : (
        <div className="space-y-5">
          {bySubject.map(({ group, numbers, withPdf }) => {
            const t = getSubjectTileStyle(group.name);
            return (
              <section key={group.name} className="bg-white rounded-[26px] border-[3px] p-5 space-y-3.5" style={{ borderColor: t.border }}>
                <div className="flex items-center gap-3">
                  <SubjectGlyph subject={group.name} className="w-11 h-11 rounded-[14px]" />
                  <div>
                    <h2 className="font-display text-lg leading-tight">{group.name}</h2>
                    <p className="text-[11.5px] font-bold text-[#6B7280]">
                      {withPdf.length} chapter{withPdf.length === 1 ? '' : 's'}
                    </p>
                  </div>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-2.5">
                  {withPdf.map(({ chapter, index, url }) => (
                    <button
                      key={chapter.key}
                      onClick={() => setOpenChapter({ chapter, url })}
                      className="btn-3d [--edge:#E3E5EC] flex items-center gap-2.5 p-3 rounded-2xl bg-[color:var(--page)] border-2 border-[#E3E5EC] hover:border-[color:var(--brand)] text-left cursor-pointer"
                    >
                      <span className="w-8 h-8 shrink-0 rounded-lg bg-[#FFE9E2] text-[#C24A2C] flex items-center justify-center">
                        <FileText className="w-4 h-4" />
                      </span>
                      <span className="min-w-0">
                        <span className="block text-[10.5px] font-extrabold tracking-[0.06em] text-[#6B7280]">CHAPTER {numbers[index]}</span>
                        <span className="block text-[13px] font-extrabold truncate">{chapter.chapter_name}</span>
                      </span>
                    </button>
                  ))}
                </div>
              </section>
            );
          })}
        </div>
      )}

      {openChapter && (
        <Suspense fallback={null}>
          <PdfViewer
            url={openChapter.url}
            title={openChapter.chapter.chapter_name}
            subtitle={[openChapter.chapter.subject, openChapter.chapter.textbook].filter(Boolean).join(' · ')}
            onClose={() => setOpenChapter(null)}
          />
        </Suspense>
      )}
    </div>
  );
};
