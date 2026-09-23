import React, { useEffect, useState } from 'react';
import { Plus, Pencil, Trash2, RefreshCw, FileText, Layers, Wand2 } from 'lucide-react';
import { ChapterNotes, CurriculumChapter, CurriculumClass, CurriculumSubject } from '../../types';
import { CurriculumService } from '../../services/content';
import { chapterKey, subjectKey } from '../../data/curriculumKeys';
import { AdminChapterNode, AdminClassNode, AdminSubjectNode, missingRecords } from './adminTree';
import {
  Card,
  EmptyState,
  Modal,
  Notify,
  SectionHeader,
  Toggle,
  dangerButton,
  inputClass,
  primaryButton,
  secondaryButton,
} from './adminUi';

interface CurriculumSectionProps {
  tree: AdminClassNode[];
  notes: ChapterNotes[];
  onRefreshCatalog: () => Promise<void>;
  notify: Notify;
  onEditNotes: (notesKey: string) => void;
}

type Editing =
  | { kind: 'class'; node?: AdminClassNode }
  | { kind: 'subject'; node?: AdminSubjectNode }
  | { kind: 'chapter'; node?: AdminChapterNode }
  | null;

const classRecord = (n: AdminClassNode, changes: Partial<CurriculumClass> = {}): CurriculumClass => ({
  id: n.class_sort,
  class_sort: n.class_sort,
  name: n.name,
  order: n.order,
  isActive: n.isActive,
  ...changes,
});

const subjectRecord = (n: AdminSubjectNode, changes: Partial<CurriculumSubject> = {}): CurriculumSubject => ({
  id: n.key,
  class_sort: n.class_sort,
  name: n.name,
  textbook: n.textbook,
  order: n.order === 999 ? 10 : n.order,
  isActive: n.isActive,
  ...changes,
});

const chapterRecord = (n: AdminChapterNode, changes: Partial<CurriculumChapter> = {}): CurriculumChapter => ({
  id: n.key,
  class_sort: n.class_sort,
  subject: n.subject,
  chapter_id: n.chapter_id,
  chapter_name: n.chapter_name,
  order: n.order === 999 ? 10 : n.order,
  isActive: n.isActive,
  ...changes,
});

const ItemRow: React.FC<{
  selected?: boolean;
  title: string;
  meta: string;
  active: boolean;
  onSelect?: () => void;
  onToggle: (v: boolean) => void;
  onEdit: () => void;
  extra?: React.ReactNode;
}> = ({ selected, title, meta, active, onSelect, onToggle, onEdit, extra }) => (
  <li
    className={`flex items-center gap-2 px-3 py-2.5 rounded-[14px] border transition-colors ${
      selected ? 'border-[#3B4FE0] bg-[#EEEDFE]/60' : 'border-transparent hover:bg-[#F5F6FA]'
    }`}
  >
    <button onClick={onSelect} disabled={!onSelect} className="flex-1 min-w-0 text-left cursor-pointer disabled:cursor-default">
      <p className={`text-sm font-bold truncate ${active ? 'text-[#1E2233]' : 'text-[#6B7280] line-through'}`}>{title}</p>
      <p className="text-[11px] text-[#6B7280] truncate">{meta}</p>
    </button>
    {extra}
    <Toggle checked={active} onChange={onToggle} label={`${active ? 'Hide' : 'Show'} ${title}`} />
    <button onClick={onEdit} aria-label={`Edit ${title}`} className="p-1.5 text-[#6B7280] hover:text-[#3B4FE0] rounded-xl cursor-pointer">
      <Pencil className="w-3.5 h-3.5" />
    </button>
  </li>
);

export const CurriculumSection: React.FC<CurriculumSectionProps> = ({ tree, notes, onRefreshCatalog, notify, onEditNotes }) => {
  const [classSort, setClassSort] = useState<string>(tree[0]?.class_sort || '');
  const [subjectId, setSubjectId] = useState<string>('');
  const [editing, setEditing] = useState<Editing>(null);
  const [busy, setBusy] = useState(false);

  const selectedClass = tree.find((c) => c.class_sort === classSort);
  const selectedSubject = selectedClass?.subjects.find((s) => s.key === subjectId);
  const noteKeys = new Map(notes.map((n) => [n.id, n]));
  const missing = missingRecords(tree);
  const missingCount = missing.classes.length + missing.subjects.length + missing.chapters.length;

  useEffect(() => {
    if (!selectedClass && tree[0]) setClassSort(tree[0].class_sort);
  }, [tree, selectedClass]);

  useEffect(() => {
    if (selectedClass && !selectedClass.subjects.some((s) => s.key === subjectId)) {
      setSubjectId(selectedClass.subjects[0]?.key || '');
    }
  }, [selectedClass, subjectId]);

  const run = async (action: () => Promise<void>, success: string) => {
    setBusy(true);
    try {
      await action();
      await onRefreshCatalog();
      notify(success);
    } catch (err) {
      notify((err as Error).message || 'Save failed. Check your admin role and connection.', 'error');
    } finally {
      setBusy(false);
    }
  };

  const importMissing = () =>
    run(async () => {
      await CurriculumService.saveMany(missing);
    }, `Created ${missingCount} class, subject and chapter records from existing videos.`);

  return (
    <div className="space-y-6">
      <SectionHeader
        title="Classes & Chapters"
        description="Organise the syllabus students browse. Hidden items disappear from the student app; their lessons, notes and progress are kept."
        actions={
          <>
            {missingCount > 0 && (
              <button onClick={importMissing} disabled={busy} className={secondaryButton} title="Create editable records for items that only exist in video rows">
                <Wand2 className="w-3.5 h-3.5" />
                Create {missingCount} records from videos
              </button>
            )}
            <button onClick={() => run(async () => undefined, 'Catalog refreshed.')} disabled={busy} className={secondaryButton}>
              <RefreshCw className={`w-3.5 h-3.5 ${busy ? 'animate-spin' : ''}`} />
              Refresh
            </button>
          </>
        }
      />

      {tree.length === 0 ? (
        <Card>
          <EmptyState
            icon={<Layers className="w-8 h-8" />}
            title="No classes yet"
            body="Sync videos from the Google Sheet or add your first class."
            action={
              <button onClick={() => setEditing({ kind: 'class' })} className={primaryButton}>
                <Plus className="w-3.5 h-3.5" /> Add class
              </button>
            }
          />
        </Card>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 items-start">
          <Card className="p-3 space-y-2">
            <div className="flex items-center justify-between px-1">
              <h3 className="text-xs font-extrabold uppercase tracking-wider text-[#6B7280]">Classes</h3>
              <button onClick={() => setEditing({ kind: 'class' })} className="text-xs font-extrabold text-[#3B4FE0] flex items-center gap-1 cursor-pointer">
                <Plus className="w-3.5 h-3.5" /> Add
              </button>
            </div>
            <ul className="space-y-1">
              {tree.map((c) => (
                <ItemRow
                  key={c.class_sort}
                  selected={c.class_sort === classSort}
                  title={c.name}
                  meta={`${c.subjects.length} subjects • ${c.videoCount} lessons`}
                  active={c.isActive}
                  onSelect={() => setClassSort(c.class_sort)}
                  onToggle={(v) =>
                    run(() => CurriculumService.save('classes', classRecord(c, { isActive: v })), `${c.name} is now ${v ? 'visible' : 'hidden'}.`)
                  }
                  onEdit={() => setEditing({ kind: 'class', node: c })}
                />
              ))}
            </ul>
          </Card>

          <Card className="p-3 space-y-2">
            <div className="flex items-center justify-between px-1">
              <h3 className="text-xs font-extrabold uppercase tracking-wider text-[#6B7280]">
                Subjects {selectedClass && `• ${selectedClass.name}`}
              </h3>
              {selectedClass && (
                <button onClick={() => setEditing({ kind: 'subject' })} className="text-xs font-extrabold text-[#3B4FE0] flex items-center gap-1 cursor-pointer">
                  <Plus className="w-3.5 h-3.5" /> Add
                </button>
              )}
            </div>
            {selectedClass?.subjects.length ? (
              <ul className="space-y-1">
                {selectedClass.subjects.map((s) => (
                  <ItemRow
                    key={s.key}
                    selected={s.key === subjectId}
                    title={s.name}
                    meta={`${s.chapters.length} chapters • ${s.videoCount} lessons${s.textbook ? ` • ${s.textbook}` : ''}`}
                    active={s.isActive}
                    onSelect={() => setSubjectId(s.key)}
                    onToggle={(v) =>
                      run(() => CurriculumService.save('subjects', subjectRecord(s, { isActive: v })), `${s.name} is now ${v ? 'visible' : 'hidden'}.`)
                    }
                    onEdit={() => setEditing({ kind: 'subject', node: s })}
                  />
                ))}
              </ul>
            ) : (
              <p className="text-xs text-[#6B7280] p-3">No subjects in this class yet.</p>
            )}
          </Card>

          <Card className="p-3 space-y-2">
            <div className="flex items-center justify-between px-1">
              <h3 className="text-xs font-extrabold uppercase tracking-wider text-[#6B7280]">
                Chapters {selectedSubject && `• ${selectedSubject.name}`}
              </h3>
              {selectedSubject && (
                <button onClick={() => setEditing({ kind: 'chapter' })} className="text-xs font-extrabold text-[#3B4FE0] flex items-center gap-1 cursor-pointer">
                  <Plus className="w-3.5 h-3.5" /> Add
                </button>
              )}
            </div>
            {selectedSubject?.chapters.length ? (
              <ul className="space-y-1">
                {selectedSubject.chapters.map((ch) => {
                  const n = noteKeys.get(ch.key);
                  return (
                    <ItemRow
                      key={ch.key}
                      title={`${ch.chapter_id} · ${ch.chapter_name}`}
                      meta={`${ch.videoCount} lessons • ${n ? (n.isPublished ? 'Notes published' : 'Notes draft') : 'No notes'}`}
                      active={ch.isActive}
                      onToggle={(v) =>
                        run(
                          () => CurriculumService.save('chapters', chapterRecord(ch, { isActive: v })),
                          `${ch.chapter_name} is now ${v ? 'visible' : 'hidden'}.`
                        )
                      }
                      onEdit={() => setEditing({ kind: 'chapter', node: ch })}
                      extra={
                        <button
                          onClick={() => onEditNotes(ch.key)}
                          aria-label={`Notes for ${ch.chapter_name}`}
                          title="Edit notes & cheat sheet"
                          className={`p-1.5 rounded-xl cursor-pointer ${n?.isPublished ? 'text-[#12A594]' : 'text-[#6B7280] hover:text-[#3B4FE0]'}`}
                        >
                          <FileText className="w-3.5 h-3.5" />
                        </button>
                      }
                    />
                  );
                })}
              </ul>
            ) : (
              <p className="text-xs text-[#6B7280] p-3">{selectedSubject ? 'No chapters yet.' : 'Select a subject.'}</p>
            )}
          </Card>
        </div>
      )}

      {editing && (
        <EditDialog
          editing={editing}
          tree={tree}
          classSort={classSort}
          subject={selectedSubject}
          notes={noteKeys}
          busy={busy}
          onClose={() => setEditing(null)}
          onSave={async (action, success) => {
            await run(action, success);
            setEditing(null);
          }}
          onCreated={(kind, id) => {
            if (kind === 'class') setClassSort(id);
            if (kind === 'subject') setSubjectId(id);
          }}
        />
      )}
    </div>
  );
};

const EditDialog: React.FC<{
  editing: NonNullable<Editing>;
  tree: AdminClassNode[];
  classSort: string;
  subject?: AdminSubjectNode;
  notes: Map<string, ChapterNotes>;
  busy: boolean;
  onClose: () => void;
  onSave: (action: () => Promise<void>, success: string) => Promise<void>;
  onCreated: (kind: 'class' | 'subject', id: string) => void;
}> = ({ editing, tree, classSort, subject, notes, busy, onClose, onSave, onCreated }) => {
  const node = editing.node;
  const isNew = !node;

  const [classNumber, setClassNumber] = useState(() => {
    const used = new Set(tree.map((c) => c.class_sort));
    return Array.from({ length: 12 }, (_, i) => String(i + 1).padStart(2, '0')).find((c) => !used.has(c)) || '';
  });
  const [name, setName] = useState(
    editing.kind === 'chapter' ? (node as AdminChapterNode | undefined)?.chapter_name || '' : (node as AdminClassNode | AdminSubjectNode | undefined)?.name || ''
  );
  const [chapterId, setChapterId] = useState((node as AdminChapterNode | undefined)?.chapter_id || '');
  const [textbook, setTextbook] = useState((node as AdminSubjectNode | undefined)?.textbook || '');
  const [order, setOrder] = useState<number>(node && node.order !== 999 ? node.order : 10);
  const [active, setActive] = useState(node?.isActive ?? true);
  const [error, setError] = useState<string | null>(null);

  const title = `${isNew ? 'Add' : 'Edit'} ${editing.kind}`;
  const videoCount = node?.videoCount ?? 0;
  const hasNotes = editing.kind === 'chapter' && node ? notes.has((node as AdminChapterNode).key) : false;
  const hasChildren =
    editing.kind === 'class'
      ? ((node as AdminClassNode | undefined)?.subjects.length ?? 0) > 0
      : editing.kind === 'subject'
      ? ((node as AdminSubjectNode | undefined)?.chapters.length ?? 0) > 0
      : false;
  const canDelete = !isNew && Boolean(node?.record) && videoCount === 0 && !hasNotes && !hasChildren;
  const subtitle =
    editing.kind === 'subject'
      ? `Class ${parseInt(classSort, 10)}`
      : editing.kind === 'chapter' && subject
      ? `Class ${parseInt(subject.class_sort, 10)} • ${subject.name}`
      : undefined;

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (editing.kind === 'class') {
      const sort = isNew ? classNumber : (node as AdminClassNode).class_sort;
      if (!sort) return setError('All 12 classes already exist.');
      const record: CurriculumClass = {
        id: sort,
        class_sort: sort,
        name: name.trim() || `Class ${parseInt(sort, 10)}`,
        order: Number(order) || parseInt(sort, 10),
        isActive: active,
      };
      await onSave(() => CurriculumService.save('classes', record), `Saved ${record.name}.`);
      if (isNew) onCreated('class', sort);
      return;
    }

    if (editing.kind === 'subject') {
      const subjectName = isNew ? name.trim() : (node as AdminSubjectNode).name;
      if (!subjectName) return setError('Subject name is required.');
      const id = subjectKey(classSort, subjectName);
      if (isNew && tree.find((c) => c.class_sort === classSort)?.subjects.some((s) => s.key === id)) {
        return setError('This class already has that subject.');
      }
      const record: CurriculumSubject = {
        id,
        class_sort: classSort,
        name: subjectName,
        textbook: textbook.trim(),
        order: Number(order) || 10,
        isActive: active,
      };
      await onSave(() => CurriculumService.save('subjects', record), `Saved ${subjectName}.`);
      if (isNew) onCreated('subject', id);
      return;
    }

    if (!subject) return setError('Select a subject first.');
    const cid = isNew ? chapterId.trim() : (node as AdminChapterNode).chapter_id;
    if (!cid || !name.trim()) return setError('Chapter ID and chapter name are required.');
    const book = isNew ? subject.textbook : (node as AdminChapterNode).textbook || '';
    const id = chapterKey(subject.class_sort, subject.name, cid, book);
    if (isNew && subject.chapters.some((c) => c.key === id)) return setError('That chapter ID already exists in this subject.');
    const record: CurriculumChapter = {
      id,
      class_sort: subject.class_sort,
      subject: subject.name,
      ...(book ? { textbook: book } : {}),
      chapter_id: cid,
      chapter_name: name.trim(),
      order: Number(order) || 10,
      isActive: active,
    };
    await onSave(() => CurriculumService.save('chapters', record), `Saved ${record.chapter_name}.`);
  };

  const remove = async () => {
    if (!node || !window.confirm(`Delete this ${editing.kind} record? This cannot be undone.`)) return;
    const kind = editing.kind === 'class' ? 'classes' : editing.kind === 'subject' ? 'subjects' : 'chapters';
    const id =
      editing.kind === 'class'
        ? (node as AdminClassNode).class_sort
        : (node as AdminSubjectNode | AdminChapterNode).key;
    await onSave(() => CurriculumService.remove(kind, id), `Deleted ${editing.kind}.`);
  };

  const used = new Set(tree.map((c) => c.class_sort));

  return (
    <Modal title={title.charAt(0).toUpperCase() + title.slice(1)} subtitle={subtitle} onClose={onClose}>
      <form onSubmit={submit} className="space-y-4">
        {error && <p className="p-3 text-xs text-[#8A2E17] bg-[#FFE9E2] border border-[#FFC3B1] rounded-[14px]">{error}</p>}

        {editing.kind === 'class' && isNew && (
          <label className="block space-y-1">
            <span className="text-xs font-extrabold text-[#1E2233]">Class number</span>
            <select value={classNumber} onChange={(e) => setClassNumber(e.target.value)} className={inputClass}>
              {Array.from({ length: 12 }, (_, i) => String(i + 1).padStart(2, '0')).map((c) => (
                <option key={c} value={c} disabled={used.has(c)}>
                  Class {parseInt(c, 10)} {used.has(c) ? '(exists)' : ''}
                </option>
              ))}
            </select>
          </label>
        )}

        {editing.kind === 'chapter' && (
          <label className="block space-y-1">
            <span className="text-xs font-extrabold text-[#1E2233]">Chapter ID</span>
            <input
              value={chapterId}
              onChange={(e) => setChapterId(e.target.value)}
              disabled={!isNew}
              placeholder="e.g. CH-01"
              className={inputClass}
            />
            {!isNew && <span className="text-[11px] text-[#6B7280]">Chapter IDs link videos and notes, so they can't be changed.</span>}
          </label>
        )}

        <label className="block space-y-1">
          <span className="text-xs font-extrabold text-[#1E2233]">
            {editing.kind === 'class' ? 'Display name' : editing.kind === 'subject' ? 'Subject name' : 'Chapter name'}
          </span>
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            disabled={editing.kind === 'subject' && !isNew}
            placeholder={editing.kind === 'class' ? `Class ${parseInt(classNumber || classSort, 10)}` : editing.kind === 'subject' ? 'e.g. Science' : 'e.g. Chemical Reactions and Equations'}
            className={inputClass}
          />
          {editing.kind === 'subject' && (
            <span className="text-[11px] text-[#6B7280]">
              {isNew ? 'Must match the subject column in the Google Sheet for videos to appear under it.' : "Subject names link videos and notes, so they can't be renamed here."}
            </span>
          )}
        </label>

        {editing.kind === 'subject' && (
          <label className="block space-y-1">
            <span className="text-xs font-extrabold text-[#1E2233]">Textbook</span>
            <input value={textbook} onChange={(e) => setTextbook(e.target.value)} placeholder="e.g. NCERT Science (Class X)" className={inputClass} />
          </label>
        )}

        <div className="grid grid-cols-2 gap-3">
          <label className="block space-y-1">
            <span className="text-xs font-extrabold text-[#1E2233]">Display order</span>
            <input type="number" min={0} value={order} onChange={(e) => setOrder(Number(e.target.value))} className={inputClass} />
          </label>
          <div className="space-y-1">
            <span className="text-xs font-extrabold text-[#1E2233] block">Visible to students</span>
            <div className="pt-2">
              <Toggle checked={active} onChange={setActive} label="Visible to students" />
            </div>
          </div>
        </div>

        <div className="pt-3 border-t border-[#E3E5EC] flex items-center justify-between gap-2">
          {canDelete ? (
            <button type="button" onClick={remove} disabled={busy} className={dangerButton}>
              <Trash2 className="w-3.5 h-3.5" /> Delete
            </button>
          ) : (
            <span className="text-[11px] text-[#6B7280]">
              {!isNew && 'Items with lessons, notes or children can only be hidden.'}
            </span>
          )}
          <div className="flex gap-2">
            <button type="button" onClick={onClose} className={secondaryButton}>
              Cancel
            </button>
            <button type="submit" disabled={busy} className={primaryButton}>
              {busy ? 'Saving…' : 'Save'}
            </button>
          </div>
        </div>
      </form>
    </Modal>
  );
};
