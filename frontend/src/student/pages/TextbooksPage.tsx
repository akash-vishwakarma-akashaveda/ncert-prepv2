import React, { useMemo, useState } from 'react';
import { FileText, X, ExternalLink } from 'lucide-react';
import { classLabel } from '../../data/gamification';
import { getSubjectTileStyle } from '../../data/colorTokens';
import { ChapterGroup } from '../../types';
import { useCourse } from '../useCourse';
import { EmptyState, PageHeader, SubjectGlyph, chapterNumbers } from '../ui';
import { API_URL } from '../../services/api/client';

// ncert.nic.in refuses to be framed (X-Frame-Options), so the viewer loads the PDF through our own API.
const viewerSrc = (pdfUrl: string) => `${API_URL}/api/textbooks/pdf?url=${encodeURIComponent(pdfUrl)}`;
// Phone browsers (iOS Safari especially) cannot render a PDF inside an iframe, so they get a real tab.
const prefersNewTab = () => typeof window !== 'undefined' && window.matchMedia('(max-width: 640px)').matches;

interface OpenChapter {
  chapter: ChapterGroup;
  url: string;
}

const PdfViewerModal: React.FC<{ target: OpenChapter; onClose: () => void }> = ({ target, onClose }) => {
  const { chapter, url } = target;
  return (
    <div className="fixed inset-0 z-50 flex flex-col bg-[#1E2233]/70 backdrop-blur-xs p-3 sm:p-6" role="dialog" aria-modal="true" aria-label={chapter.chapter_name}>
      <div className="bg-white rounded-[22px] border-[3px] border-[color:var(--card-line)] flex-1 min-h-0 flex flex-col overflow-hidden animate-pop-soft">
        <div className="flex items-center gap-3 px-4 sm:px-5 py-3.5 border-b-2 border-[#E3E5EC] shrink-0">
          <span className="w-9 h-9 rounded-xl bg-[#FFE9E2] text-[#C24A2C] flex items-center justify-center shrink-0">
            <FileText className="w-4.5 h-4.5" />
          </span>
          <div className="min-w-0">
            <p className="text-sm font-extrabold text-[#1E2233] truncate">{chapter.chapter_name}</p>
            <p className="text-[11px] font-semibold text-[#6B7280] truncate">
              {chapter.subject}
              {chapter.textbook ? ` · ${chapter.textbook}` : ''}
            </p>
          </div>
          <a
            href={url}
            target="_blank"
            rel="noopener noreferrer"
            className="ml-auto shrink-0 flex items-center gap-1.5 px-3 py-1.5 text-xs font-extrabold text-[color:var(--brand)] bg-[color:var(--brand-soft)] rounded-xl"
          >
            <ExternalLink className="w-3.5 h-3.5" /> <span className="hidden sm:inline">Open in new tab</span>
          </a>
          <button
            onClick={onClose}
            aria-label="Close"
            className="w-9 h-9 shrink-0 flex items-center justify-center text-[#6B7280] hover:text-[#1E2233] bg-[color:var(--page)] border-2 border-[#E3E5EC] rounded-xl cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
        <iframe src={viewerSrc(url)} title={chapter.chapter_name} className="flex-1 w-full border-0 bg-[color:var(--page)]" />
      </div>
    </div>
  );
};

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
                      onClick={() => (prefersNewTab() ? window.open(url, '_blank', 'noopener') : setOpenChapter({ chapter, url }))}
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

      {openChapter && <PdfViewerModal target={openChapter} onClose={() => setOpenChapter(null)} />}
    </div>
  );
};
