import React, { useEffect, useState } from 'react';
import {
  X,
  FileText,
  CheckCircle2,
  Lightbulb,
  BookmarkCheck,
  Sigma,
  Paperclip,
  Image as ImageIcon,
  ExternalLink,
} from 'lucide-react';
import { ChapterNotes, NoteAttachment, NotesTarget } from '../../types';
import { NotesService, openAttachment } from '../../services/content';
import { notesKey } from '../../data/curriculumKeys';

interface RevisionNotesModalProps {
  isOpen: boolean;
  onClose: () => void;
  target: NotesTarget;
  // Admin preview of unsaved notes; skips loading.
  previewNotes?: ChapterNotes;
}

export function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export const AttachmentRow: React.FC<{ attachment: NoteAttachment; action?: React.ReactNode }> = ({
  attachment,
  action,
}) => {
  const isPdf = attachment.contentType === 'application/pdf';
  return (
    <div className="flex items-center justify-between gap-3 p-3 rounded-[14px] bg-[color:var(--page)] border-2 border-[#E3E5EC]">
      <div className="flex items-center gap-2.5 min-w-0">
        <span
          className={`w-8 h-8 rounded-xl flex items-center justify-center shrink-0 ${
            isPdf ? 'bg-[#FFDCD0] text-[#C24A2C]' : 'bg-sky-100 text-sky-700'
          }`}
        >
          {isPdf ? <FileText className="w-4 h-4" /> : <ImageIcon className="w-4 h-4" />}
        </span>
        <div className="min-w-0">
          <p className="text-xs font-bold text-[#1E2233] truncate">{attachment.name}</p>
          <p className="text-[11px] text-[#6B7280]">
            {isPdf ? 'PDF' : 'Image'} • {formatBytes(attachment.size)}
          </p>
        </div>
      </div>
      <div className="flex items-center gap-1.5 shrink-0">
        <button
          type="button"
          onClick={() => openAttachment(attachment)}
          className="flex items-center gap-1 px-3 py-1.5 text-xs font-bold text-[color:var(--brand)] bg-white border-2 border-[#E3E5EC] hover:bg-[#EEEDFE] rounded-xl cursor-pointer"
        >
          <ExternalLink className="w-3.5 h-3.5" />
          Open
        </button>
        {action}
      </div>
    </div>
  );
};

export function useChapterNotes(target: NotesTarget, enabled: boolean, previewNotes?: ChapterNotes) {
  const [notes, setNotes] = useState<ChapterNotes | null>(previewNotes || null);
  const [loading, setLoading] = useState(!previewNotes);

  useEffect(() => {
    if (!enabled) return;
    if (previewNotes) {
      setNotes(previewNotes);
      setLoading(false);
      return;
    }
    let cancelled = false;
    setLoading(true);
    NotesService.getPublished(notesKey(target)).then((result) => {
      if (!cancelled) {
        setNotes(result);
        setLoading(false);
      }
    });
    return () => {
      cancelled = true;
    };
  }, [enabled, target.class_sort, target.subject, target.chapter_id, previewNotes]); // eslint-disable-line react-hooks/exhaustive-deps

  return { notes, loading };
}

// Notes content without modal chrome; used by the modal and the lesson page Notes tab.
export const ChapterNotesContent: React.FC<{ notes: ChapterNotes | null; loading: boolean }> = ({ notes, loading }) => {
  const hasText =
    notes && (notes.summary || notes.key_points.length || notes.formulas.length || notes.exam_tips.length);
  return (
    <>
    {loading ? (
      <div className="space-y-3 animate-pulse">
        <div className="h-20 bg-[color:var(--page)] rounded-[22px]" />
        <div className="h-10 bg-[color:var(--page)] rounded-[14px]" />
        <div className="h-10 bg-[color:var(--page)] rounded-[14px]" />
      </div>
    ) : !notes ? (
      <div className="py-10 text-center space-y-2">
        <FileText className="w-8 h-8 mx-auto text-slate-400" />
        <p className="text-sm font-bold text-[#1E2233]">No notes for this chapter yet</p>
        <p className="text-xs text-[#6B7280]">
          Your educator hasn&apos;t published notes or a cheat sheet for this chapter. Check back later.
        </p>
      </div>
    ) : (
      <>
        {notes.summary && (
          <section className="space-y-1.5 bg-[#EEEDFE]/40 p-4 rounded-[22px] border-2 border-[#D7D4FC]">
            <h4 className="text-xs font-extrabold uppercase tracking-wider text-[#26215C] flex items-center gap-1.5">
              <BookmarkCheck className="w-4 h-4 text-[color:var(--brand)]" />
              Summary
            </h4>
            <p className="text-xs text-[#1E2233] leading-relaxed whitespace-pre-line">{notes.summary}</p>
          </section>
        )}

        {notes.key_points.length > 0 && (
          <section className="space-y-2">
            <h4 className="text-xs font-extrabold uppercase tracking-wider text-[#1E2233]">Key points</h4>
            {notes.key_points.map((pt, i) => (
              <div key={i} className="flex items-start gap-2.5 p-3 rounded-[14px] bg-[color:var(--page)] border-2 border-[#E3E5EC] text-xs">
                <CheckCircle2 className="w-4 h-4 text-[#12A594] shrink-0 mt-0.5" />
                <span className="text-[#1E2233] font-semibold">{pt}</span>
              </div>
            ))}
          </section>
        )}

        {notes.formulas.length > 0 && (
          <section className="space-y-2">
            <h4 className="text-xs font-extrabold uppercase tracking-wider text-[#1E2233] flex items-center gap-1.5">
              <Sigma className="w-4 h-4 text-[color:var(--brand)]" />
              Formulas & equations
            </h4>
            {notes.formulas.map((f, i) => (
              <div key={i} className="p-3 rounded-[14px] bg-white border-2 border-[#D7D4FC] text-xs font-mono text-[#26215C]">
                {f}
              </div>
            ))}
          </section>
        )}

        {notes.exam_tips.length > 0 && (
          <section className="space-y-2">
            <h4 className="text-xs font-extrabold uppercase tracking-wider text-[#1E2233] flex items-center gap-1.5">
              <Lightbulb className="w-4 h-4 text-[#C98A0E]" />
              Exam tips
            </h4>
            {notes.exam_tips.map((tip, i) => (
              <div key={i} className="flex items-start gap-2 p-3 rounded-[14px] bg-[#FFF6E2]/70 border border-[#FFD97A] text-xs text-[#8A5A14]">
                <span className="font-extrabold">•</span>
                <span>{tip}</span>
              </div>
            ))}
          </section>
        )}

        {notes.attachments.length > 0 && (
          <section className="space-y-2">
            <h4 className="text-xs font-extrabold uppercase tracking-wider text-[#1E2233] flex items-center gap-1.5">
              <Paperclip className="w-4 h-4 text-[#6B7280]" />
              Cheat sheets & downloads
            </h4>
            {notes.attachments.map((a) => (
              <AttachmentRow key={a.path} attachment={a} />
            ))}
          </section>
        )}

        {!hasText && notes.attachments.length === 0 && (
          <p className="text-xs text-[#6B7280] text-center py-6">These notes are empty.</p>
        )}
      </>
    )}
    </>
  );
};

export const RevisionNotesModal: React.FC<RevisionNotesModalProps> = ({ isOpen, onClose, target, previewNotes }) => {
  const { notes, loading } = useChapterNotes(target, isOpen, previewNotes);

  useEffect(() => {
    if (!isOpen) return;
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose();
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-[#1E2233]/60 backdrop-blur-xs animate-in fade-in"
      role="dialog"
      aria-modal="true"
      aria-labelledby="notes-title"
      onClick={onClose}
    >
      <div
        className="relative w-full max-w-2xl max-h-[88vh] flex flex-col bg-white rounded-[28px] shadow-2xl border-2 border-[#E3E5EC] overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="px-6 py-4 border-b border-[#E3E5EC] flex items-center justify-between bg-[color:var(--page)]">
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="w-9 h-9 rounded-[14px] bg-[color:var(--brand)] text-white flex items-center justify-center shadow-[0_4px_0_var(--card-line)] shrink-0">
              <FileText className="w-5 h-5" />
            </div>
            <div className="min-w-0">
              <span className="text-[10px] font-extrabold text-[color:var(--brand)] uppercase tracking-wider">
                Class {parseInt(target.class_sort, 10)} • {target.subject} • {target.chapter_id}
                {previewNotes && ' • Preview'}
              </span>
              <h3 id="notes-title" className="text-base font-extrabold text-[#1E2233] line-clamp-1">
                {notes?.title || target.chapter_name || 'Chapter notes'}
              </h3>
            </div>
          </div>
          <button
            onClick={onClose}
            aria-label="Close notes"
            className="p-1.5 text-[#6B7280] hover:text-[#1E2233] hover:bg-white rounded-[14px] transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-6 space-y-5 text-sm">
          <ChapterNotesContent notes={notes} loading={loading} />
        </div>

        <div className="px-6 py-3 border-t border-[#E3E5EC] bg-[color:var(--page)] flex items-center justify-between text-xs text-[#6B7280]">
          <span>
            {notes?.updated_at ? `Updated ${new Date(notes.updated_at).toLocaleDateString()}` : 'Chapter notes'}
          </span>
          <button
            onClick={onClose}
            className="px-4 py-1.5 text-xs font-bold text-white btn-3d [--edge:var(--brand-edge)] bg-[color:var(--brand)] hover:bg-[color:var(--brand-hover)] rounded-[14px] cursor-pointer"
          >
            Done
          </button>
        </div>
      </div>
    </div>
  );
};
