import React, { useEffect, useMemo, useRef, useState } from 'react';
import { FileText, Upload, Eye, Trash2, Search, CheckCircle2, Paperclip, X } from 'lucide-react';
import { ChapterNotes, NoteAttachment } from '../../types';
import { ALLOWED_ATTACHMENT_TYPES, NotesService } from '../../services/content';
import { AttachmentRow, RevisionNotesModal } from '../../components/app/RevisionNotesModal';
import { AdminChapterNode, AdminClassNode } from './adminTree';
import {
  Card,
  EmptyState,
  Notify,
  SectionHeader,
  dangerButton,
  inputClass,
  linesToList,
  primaryButton,
  secondaryButton,
} from './adminUi';

interface NotesSectionProps {
  tree: AdminClassNode[];
  notes: ChapterNotes[];
  reloadNotes: () => Promise<void>;
  notify: Notify;
  adminName: string;
  initialKey?: string;
}

interface NotesForm {
  title: string;
  summary: string;
  keyPoints: string;
  formulas: string;
  examTips: string;
  attachments: NoteAttachment[];
}

const EMPTY_FORM: NotesForm = { title: '', summary: '', keyPoints: '', formulas: '', examTips: '', attachments: [] };

const formFromNotes = (n?: ChapterNotes): NotesForm =>
  n
    ? {
        title: n.title,
        summary: n.summary,
        keyPoints: n.key_points.join('\n'),
        formulas: n.formulas.join('\n'),
        examTips: n.exam_tips.join('\n'),
        attachments: n.attachments,
      }
    : EMPTY_FORM;

type StatusFilter = 'all' | 'published' | 'draft' | 'none';

export const NotesSection: React.FC<NotesSectionProps> = ({ tree, notes, reloadNotes, notify, adminName, initialKey }) => {
  const notesByKey = useMemo(() => new Map(notes.map((n) => [n.id, n])), [notes]);
  const allChapters = useMemo(
    () => tree.flatMap((c) => c.subjects.flatMap((s) => s.chapters.map((ch) => ({ ...ch, classActive: c.isActive, subjectActive: s.isActive })))),
    [tree]
  );

  const initialChapter = allChapters.find((c) => c.key === initialKey);
  const [classSort, setClassSort] = useState(initialChapter?.class_sort || tree[0]?.class_sort || '');
  const [subject, setSubject] = useState(initialChapter?.subject || 'all');
  const [status, setStatus] = useState<StatusFilter>('all');
  const [search, setSearch] = useState('');
  const [selectedKey, setSelectedKey] = useState<string | undefined>(initialChapter?.key);

  const [form, setForm] = useState<NotesForm>(EMPTY_FORM);
  const [baseline, setBaseline] = useState(JSON.stringify(EMPTY_FORM));
  const [saving, setSaving] = useState(false);
  const [uploads, setUploads] = useState<{ name: string; pct: number }[]>([]);
  const [previewOpen, setPreviewOpen] = useState(false);
  const fileInput = useRef<HTMLInputElement>(null);

  const selected = allChapters.find((c) => c.key === selectedKey);
  const saved = selectedKey ? notesByKey.get(selectedKey) : undefined;
  const dirty = JSON.stringify(form) !== baseline;

  useEffect(() => {
    const next = formFromNotes(saved);
    setForm(next);
    setBaseline(JSON.stringify(next));
    // Only reset when switching chapters, not on every notes reload.
  }, [selectedKey]); // eslint-disable-line react-hooks/exhaustive-deps

  const classNode = tree.find((c) => c.class_sort === classSort);
  const statusOf = (key: string): Exclude<StatusFilter, 'all'> => {
    const n = notesByKey.get(key);
    return !n ? 'none' : n.isPublished ? 'published' : 'draft';
  };

  const visibleChapters = allChapters.filter((ch) => {
    if (ch.class_sort !== classSort) return false;
    if (subject !== 'all' && ch.subject !== subject) return false;
    if (status !== 'all' && statusOf(ch.key) !== status) return false;
    const q = search.trim().toLowerCase();
    return !q || `${ch.chapter_id} ${ch.chapter_name}`.toLowerCase().includes(q);
  });

  const selectChapter = (key: string) => {
    if (key === selectedKey) return;
    if (dirty && !window.confirm('You have unsaved changes to these notes. Discard them?')) return;
    setSelectedKey(key);
  };

  const buildNotes = (node: AdminChapterNode, f: NotesForm, isPublished: boolean): ChapterNotes => ({
    id: node.key,
    class_sort: node.class_sort,
    subject: node.subject,
    chapter_id: node.chapter_id,
    chapter_name: node.chapter_name,
    title: f.title.trim(),
    summary: f.summary.trim(),
    key_points: linesToList(f.keyPoints),
    formulas: linesToList(f.formulas),
    exam_tips: linesToList(f.examTips),
    attachments: f.attachments,
    isPublished,
    updated_at: Date.now(),
  });

  const persist = async (f: NotesForm, isPublished: boolean, message: string) => {
    if (!selected) return;
    const next = buildNotes(selected, f, isPublished);
    if (isPublished && !next.summary && !next.key_points.length && !next.formulas.length && !next.exam_tips.length && !next.attachments.length) {
      notify('Add some content or a file before publishing.', 'error');
      return;
    }
    setSaving(true);
    try {
      await NotesService.save(next, adminName);
      setForm(f);
      setBaseline(JSON.stringify(f));
      await reloadNotes();
      notify(message);
    } catch (err) {
      notify((err as Error).message || 'Could not save notes.', 'error');
    } finally {
      setSaving(false);
    }
  };

  const handleFiles = async (files: FileList | null) => {
    if (!files?.length || !selected) return;
    const list = Array.from(files);
    const invalid = list.map((f) => NotesService.validateFile(f)).filter(Boolean);
    if (invalid.length) {
      notify(invalid.join(' '), 'error');
      return;
    }

    setUploads(list.map((f) => ({ name: f.name, pct: 0 })));
    const uploaded: NoteAttachment[] = [];
    try {
      for (let i = 0; i < list.length; i++) {
        uploaded.push(
          await NotesService.uploadAttachment(selected.key, list[i], (pct) =>
            setUploads((u) => u.map((x, idx) => (idx === i ? { ...x, pct } : x)))
          )
        );
      }
    } catch (err) {
      notify((err as Error).message || 'Upload failed.', 'error');
    } finally {
      setUploads([]);
      if (fileInput.current) fileInput.current.value = '';
    }

    if (uploaded.length) {
      // Save straight away so uploaded files are never orphaned by an unsaved editor.
      await persist(
        { ...form, attachments: [...form.attachments, ...uploaded] },
        saved?.isPublished ?? false,
        `Uploaded ${uploaded.length} file${uploaded.length > 1 ? 's' : ''} and saved the notes.`
      );
    }
  };

  const removeAttachment = async (attachment: NoteAttachment) => {
    if (!window.confirm(`Remove "${attachment.name}"? Students will no longer be able to open it.`)) return;
    try {
      await NotesService.deleteAttachment(attachment);
    } catch (err) {
      notify('Could not delete the file from storage.', 'error');
      return;
    }
    await persist(
      { ...form, attachments: form.attachments.filter((a) => a.path !== attachment.path) },
      saved?.isPublished ?? false,
      `Removed "${attachment.name}".`
    );
  };

  const deleteNotes = async () => {
    if (!saved || !window.confirm('Delete these notes and all attached files? This cannot be undone.')) return;
    setSaving(true);
    try {
      await NotesService.remove(saved);
      await reloadNotes();
      setForm(EMPTY_FORM);
      setBaseline(JSON.stringify(EMPTY_FORM));
      notify('Notes deleted.');
    } catch (err) {
      notify((err as Error).message || 'Could not delete notes.', 'error');
    } finally {
      setSaving(false);
    }
  };

  const published = saved?.isPublished ?? false;

  return (
    <div className="space-y-6">
      <SectionHeader
        title="Notes & Cheat Sheets"
        description="Write chapter notes and attach PDF or image cheat sheets. Students see them only after you publish."
      />

      <div className="grid grid-cols-1 xl:grid-cols-[320px_1fr] gap-4 items-start">
        <Card className="p-3 space-y-3 xl:sticky xl:top-24">
          <div className="grid grid-cols-2 gap-2">
            <select
              aria-label="Class"
              value={classSort}
              onChange={(e) => {
                setClassSort(e.target.value);
                setSubject('all');
              }}
              className={inputClass}
            >
              {tree.map((c) => (
                <option key={c.class_sort} value={c.class_sort}>
                  {c.name}
                </option>
              ))}
            </select>
            <select aria-label="Subject" value={subject} onChange={(e) => setSubject(e.target.value)} className={inputClass}>
              <option value="all">All subjects</option>
              {classNode?.subjects.map((s) => (
                <option key={s.key} value={s.name}>
                  {s.name}
                </option>
              ))}
            </select>
          </div>
          <div className="grid grid-cols-2 gap-2">
            <select aria-label="Status" value={status} onChange={(e) => setStatus(e.target.value as StatusFilter)} className={inputClass}>
              <option value="all">Any status</option>
              <option value="published">Published</option>
              <option value="draft">Draft</option>
              <option value="none">No notes</option>
            </select>
            <label className="relative">
              <span className="sr-only">Search chapters</span>
              <Search className="w-3.5 h-3.5 text-[#6B7280] absolute left-2.5 top-1/2 -translate-y-1/2" />
              <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search" className={`${inputClass} pl-8`} />
            </label>
          </div>

          <ul className="max-h-[60vh] overflow-y-auto space-y-1 -mx-1 px-1">
            {visibleChapters.length === 0 && <li className="text-xs text-[#6B7280] p-3">No chapters match.</li>}
            {visibleChapters.map((ch) => {
              const st = statusOf(ch.key);
              const n = notesByKey.get(ch.key);
              const hidden = !ch.isActive || !ch.subjectActive || !ch.classActive;
              return (
                <li key={ch.key}>
                  <button
                    onClick={() => selectChapter(ch.key)}
                    aria-current={ch.key === selectedKey ? 'true' : undefined}
                    className={`w-full text-left px-3 py-2.5 rounded-[14px] border cursor-pointer transition-colors ${
                      ch.key === selectedKey ? 'border-[#3B4FE0] bg-[#EEEDFE]/60' : 'border-transparent hover:bg-[#F5F6FA]'
                    }`}
                  >
                    <p className="text-sm font-bold text-[#1E2233] truncate">
                      {ch.chapter_id} · {ch.chapter_name}
                    </p>
                    <p className="text-[11px] text-[#6B7280] flex items-center gap-1.5 flex-wrap">
                      <span>{ch.subject}</span>
                      <span
                        className={`font-extrabold px-1.5 rounded ${
                          st === 'published' ? 'bg-[#E7F7F1] text-[#0B7A67]' : st === 'draft' ? 'bg-[#FFF1D6] text-[#8A5A14]' : 'bg-slate-100 text-slate-600'
                        }`}
                      >
                        {st === 'published' ? 'Published' : st === 'draft' ? 'Draft' : 'No notes'}
                      </span>
                      {n?.attachments.length ? (
                        <span className="flex items-center gap-0.5">
                          <Paperclip className="w-3 h-3" />
                          {n.attachments.length}
                        </span>
                      ) : null}
                      {hidden && <span className="font-extrabold text-slate-500">Hidden</span>}
                    </p>
                  </button>
                </li>
              );
            })}
          </ul>
        </Card>

        {!selected ? (
          <Card>
            <EmptyState
              icon={<FileText className="w-8 h-8" />}
              title="Pick a chapter to write notes"
              body="Chapters come from Classes & Chapters. Add a chapter there first if it isn't listed."
            />
          </Card>
        ) : (
          <Card className="p-5 sm:p-6 space-y-5">
            <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3">
              <div>
                <p className="text-[11px] font-extrabold uppercase tracking-wider text-[#3B4FE0]">
                  Class {parseInt(selected.class_sort, 10)} • {selected.subject} • {selected.chapter_id}
                </p>
                <h3 className="text-lg font-extrabold text-[#1E2233]">{selected.chapter_name}</h3>
                <p className="text-xs text-[#6B7280]">
                  {saved
                    ? `${published ? 'Published' : 'Draft'} • last saved ${new Date(saved.updated_at).toLocaleString()}${saved.updated_by ? ` by ${saved.updated_by}` : ''}`
                    : 'No notes yet'}
                  {dirty && <span className="ml-1 font-extrabold text-[#8A5A14]">• Unsaved changes</span>}
                </p>
              </div>
              <button onClick={() => setPreviewOpen(true)} className={secondaryButton}>
                <Eye className="w-3.5 h-3.5" /> Preview as student
              </button>
            </div>

            <label className="block space-y-1">
              <span className="text-xs font-extrabold text-[#1E2233]">Title (optional)</span>
              <input
                value={form.title}
                onChange={(e) => setForm({ ...form, title: e.target.value })}
                placeholder={selected.chapter_name}
                maxLength={150}
                className={inputClass}
              />
            </label>

            <label className="block space-y-1">
              <span className="text-xs font-extrabold text-[#1E2233]">Summary</span>
              <textarea
                rows={4}
                value={form.summary}
                onChange={(e) => setForm({ ...form, summary: e.target.value })}
                placeholder="The core idea of the chapter in a few sentences."
                maxLength={4000}
                className={`${inputClass} resize-y`}
              />
            </label>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
              {(
                [
                  ['keyPoints', 'Key points', 'One point per line'],
                  ['formulas', 'Formulas & equations', 'One formula per line'],
                  ['examTips', 'Exam tips', 'One tip per line'],
                ] as const
              ).map(([field, label, hint]) => (
                <label key={field} className="block space-y-1">
                  <span className="text-xs font-extrabold text-[#1E2233]">{label}</span>
                  <textarea
                    rows={7}
                    value={form[field]}
                    onChange={(e) => setForm({ ...form, [field]: e.target.value })}
                    placeholder={hint}
                    className={`${inputClass} resize-y ${field === 'formulas' ? 'font-mono' : ''}`}
                  />
                  <span className="text-[11px] text-[#6B7280]">
                    {hint} • {linesToList(form[field]).length} items
                  </span>
                </label>
              ))}
            </div>

            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs font-extrabold text-[#1E2233] flex items-center gap-1.5">
                  <Paperclip className="w-3.5 h-3.5" /> Cheat sheets & files
                </span>
                <button onClick={() => fileInput.current?.click()} disabled={saving || uploads.length > 0} className={secondaryButton}>
                  <Upload className="w-3.5 h-3.5" /> Upload PDF / image
                </button>
                <input
                  ref={fileInput}
                  type="file"
                  multiple
                  accept={ALLOWED_ATTACHMENT_TYPES.join(',')}
                  className="hidden"
                  onChange={(e) => handleFiles(e.target.files)}
                />
              </div>
              {uploads.map((u) => (
                <div key={u.name} className="p-3 rounded-[14px] border-2 border-[#E3E5EC] space-y-1.5">
                  <p className="text-xs font-bold text-[#1E2233] truncate">Uploading {u.name}</p>
                  <div className="h-1.5 bg-[#E3E5EC] rounded-full overflow-hidden">
                    <div className="h-full bg-[#3B4FE0] transition-all" style={{ width: `${u.pct}%` }} />
                  </div>
                </div>
              ))}
              {form.attachments.length === 0 && uploads.length === 0 ? (
                <p className="text-xs text-[#6B7280] p-3 border border-dashed border-[#E3E5EC] rounded-[14px]">
                  No files yet. PDF, PNG, JPG or WEBP up to 20 MB. Files are saved to the notes as soon as they upload.
                </p>
              ) : (
                form.attachments.map((a) => (
                  <AttachmentRow
                    key={a.path}
                    attachment={a}
                    action={
                      <button
                        onClick={() => removeAttachment(a)}
                        aria-label={`Remove ${a.name}`}
                        disabled={saving}
                        className="p-1.5 text-[#6B7280] hover:text-[#C24A2C] rounded-xl cursor-pointer"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    }
                  />
                ))
              )}
            </div>

            <div className="pt-4 border-t border-[#E3E5EC] flex flex-col-reverse sm:flex-row sm:items-center justify-between gap-3">
              {saved ? (
                <button onClick={deleteNotes} disabled={saving} className={dangerButton}>
                  <Trash2 className="w-3.5 h-3.5" /> Delete notes
                </button>
              ) : (
                <span />
              )}
              <div className="flex flex-wrap gap-2 justify-end">
                {published ? (
                  <>
                    <button onClick={() => persist(form, false, 'Notes unpublished. Students can no longer see them.')} disabled={saving} className={secondaryButton}>
                      Unpublish
                    </button>
                    <button onClick={() => persist(form, true, 'Changes published.')} disabled={saving || !dirty} className={primaryButton}>
                      <CheckCircle2 className="w-3.5 h-3.5" /> {saving ? 'Saving…' : 'Save & keep published'}
                    </button>
                  </>
                ) : (
                  <>
                    <button onClick={() => persist(form, false, 'Draft saved.')} disabled={saving || (!dirty && Boolean(saved))} className={secondaryButton}>
                      {saving ? 'Saving…' : 'Save draft'}
                    </button>
                    <button onClick={() => persist(form, true, 'Notes published. Students can now open them.')} disabled={saving} className={primaryButton}>
                      <CheckCircle2 className="w-3.5 h-3.5" /> Publish
                    </button>
                  </>
                )}
              </div>
            </div>
          </Card>
        )}
      </div>

      {previewOpen && selected && (
        <RevisionNotesModal
          isOpen
          onClose={() => setPreviewOpen(false)}
          target={selected}
          previewNotes={buildNotes(selected, form, published)}
        />
      )}
    </div>
  );
};
