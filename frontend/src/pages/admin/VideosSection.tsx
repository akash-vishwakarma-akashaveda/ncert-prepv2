import React, { useMemo, useState } from 'react';
import { Plus, Search, Eye, Edit2, Trash2, CheckCircle2, AlertTriangle, Play, PlaySquare } from 'lucide-react';
import { Video } from '../../types';
import { VideoService } from '../../services/videos';
import { isFirebaseConfigured } from '../../services/firebase';
import { AdminClassNode } from './adminTree';
import { Card, EmptyState, Modal, Notify, SectionHeader, inputClass, primaryButton, secondaryButton } from './adminUi';

interface VideosSectionProps {
  videos: Video[];
  tree: AdminClassNode[];
  onRefreshCatalog: () => Promise<void>;
  notify: Notify;
  onSelectVideo: (video: Video) => void;
}

const EMPTY_FORM: Partial<Video> = {
  class_sort: '10',
  subject: '',
  textbook: '',
  chapter_id: '',
  chapter_name: '',
  video_title: '',
  youtube_id: '',
  duration_seconds: 1800,
  isActive: true,
  isPremium: false,
  pyq_available: false,
};

const YOUTUBE_ID = /^[A-Za-z0-9_-]{11}$/;

// Live mode: the Google Sheet owns lesson content (class, subject, book, chapter, title, publish state)
// and every sync overwrites it. Admin owns visibility and the PYQ flag only. Demo mode edits everything.
const SHEET_MANAGED = isFirebaseConfigured;

export const VideosSection: React.FC<VideosSectionProps> = ({ videos, tree, onRefreshCatalog, notify, onSelectVideo }) => {
  const [queryText, setQueryText] = useState('');
  const [filterClass, setFilterClass] = useState('all');
  const [filterSubject, setFilterSubject] = useState('all');
  const [filterStatus, setFilterStatus] = useState<'all' | 'active' | 'inactive' | 'unpublished'>('all');
  const [form, setForm] = useState<Partial<Video> | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [preview, setPreview] = useState<Video | null>(null);
  const [saving, setSaving] = useState(false);

  const subjects = useMemo(() => Array.from(new Set(videos.map((v) => v.subject))).sort(), [videos]);

  const filtered = videos.filter((v) => {
    if (filterClass !== 'all' && v.class_sort !== filterClass) return false;
    if (filterSubject !== 'all' && v.subject !== filterSubject) return false;
    if (filterStatus === 'active' && !v.isActive) return false;
    if (filterStatus === 'inactive' && v.isActive) return false;
    if (filterStatus === 'unpublished' && v.yt_public !== false) return false;
    const q = queryText.trim().toLowerCase();
    if (!q) return true;
    return [v.video_title, v.chapter_name, v.subject, v.textbook || '', v.youtube_id].some((f) => f.toLowerCase().includes(q));
  });

  const formClass = tree.find((c) => c.class_sort === form?.class_sort);
  const formSubject = formClass?.subjects.find((s) => s.name === form?.subject);

  const save = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form) return;
    if (SHEET_MANAGED && editingId) {
      setSaving(true);
      try {
        await VideoService.updateVideo(editingId, { isActive: Boolean(form.isActive), pyq_available: Boolean(form.pyq_available) });
        await onRefreshCatalog();
        notify(`Updated "${form.video_title}".`);
        setForm(null);
        setEditingId(null);
      } catch (err) {
        notify((err as Error).message || 'Failed to save video.', 'error');
      } finally {
        setSaving(false);
      }
      return;
    }
    const youtubeId = (form.youtube_id || '').trim();
    if (!YOUTUBE_ID.test(youtubeId)) return notify('YouTube ID must be exactly 11 letters, numbers, - or _.', 'error');
    if (!form.subject?.trim() || !form.chapter_id?.trim() || !form.chapter_name?.trim() || !form.video_title?.trim()) {
      return notify('Fill in subject, chapter ID, chapter name and video title.', 'error');
    }
    if (!editingId && videos.some((v) => v.youtube_id === youtubeId)) {
      return notify('A video with this YouTube ID already exists.', 'error');
    }

    const video: Video = {
      youtube_id: youtubeId,
      class_sort: form.class_sort || '10',
      class_display: `Class ${parseInt(form.class_sort || '10', 10)}`,
      subject: form.subject.trim(),
      textbook: form.textbook?.trim() || formSubject?.textbook || `NCERT ${form.subject.trim()}`,
      chapter_id: form.chapter_id.trim(),
      chapter_name: form.chapter_name.trim(),
      video_title: form.video_title.trim(),
      duration_seconds: Number(form.duration_seconds) || 1800,
      isActive: Boolean(form.isActive),
      isPremium: Boolean(form.isPremium),
      pyq_available: Boolean(form.pyq_available),
    };

    setSaving(true);
    try {
      if (editingId) await VideoService.updateVideo(editingId, video);
      else await VideoService.addVideo(video);
      await onRefreshCatalog();
      notify(`${editingId ? 'Updated' : 'Added'} "${video.video_title}".`);
      setForm(null);
      setEditingId(null);
    } catch (err) {
      notify((err as Error).message || 'Failed to save video.', 'error');
    } finally {
      setSaving(false);
    }
  };

  const toggleActive = async (video: Video) => {
    try {
      await VideoService.toggleVideoActive(video.youtube_id, !video.isActive);
      await onRefreshCatalog();
      notify(`"${video.video_title}" is now ${video.isActive ? 'hidden' : 'visible'}.`);
    } catch {
      notify('Failed to update status.', 'error');
    }
  };

  const remove = async (video: Video) => {
    if (!window.confirm(`Delete "${video.video_title}"? Students' history keeps a "No longer available" entry.`)) return;
    try {
      await VideoService.deleteVideo(video.youtube_id);
      await onRefreshCatalog();
      notify(`Deleted "${video.video_title}".`);
    } catch {
      notify('Failed to delete video.', 'error');
    }
  };

  return (
    <div className="space-y-6">
      <SectionHeader
        title="Videos"
        description={
          SHEET_MANAGED
            ? 'Lessons come from the Google Sheet (NCERT Prep → Sync videos to backend). Edit titles, chapters and books in the sheet; here you control visibility.'
            : "Demo mode: lessons are edited here. Hiding a video keeps it in students' history as “No longer available”."
        }
        actions={
          !SHEET_MANAGED && <button
            onClick={() => {
              setEditingId(null);
              setForm({ ...EMPTY_FORM, class_sort: filterClass !== 'all' ? filterClass : '10' });
            }}
            className={primaryButton}
          >
            <Plus className="w-4 h-4" /> Add video
          </button>
        }
      />

      <Card className="p-4 space-y-4">
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3">
          <label className="relative">
            <span className="sr-only">Search videos</span>
            <Search className="w-4 h-4 text-[#6B7280] absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              value={queryText}
              onChange={(e) => setQueryText(e.target.value)}
              placeholder="Search title, chapter, ID…"
              className={`${inputClass} pl-9`}
            />
          </label>
          <select value={filterClass} onChange={(e) => setFilterClass(e.target.value)} className={inputClass} aria-label="Filter by class">
            <option value="all">All classes</option>
            {tree.map((c) => (
              <option key={c.class_sort} value={c.class_sort}>
                {c.name}
              </option>
            ))}
          </select>
          <select value={filterSubject} onChange={(e) => setFilterSubject(e.target.value)} className={inputClass} aria-label="Filter by subject">
            <option value="all">All subjects</option>
            {subjects.map((s) => (
              <option key={s} value={s}>
                {s}
              </option>
            ))}
          </select>
          <select
            value={filterStatus}
            onChange={(e) => setFilterStatus(e.target.value as 'all' | 'active' | 'inactive')}
            className={inputClass}
            aria-label="Filter by status"
          >
            <option value="all">All statuses</option>
            <option value="active">Visible</option>
            <option value="inactive">Hidden</option>
            <option value="unpublished">Not public on YouTube</option>
          </select>
        </div>

        {filtered.length === 0 ? (
          <EmptyState icon={<PlaySquare className="w-8 h-8" />} title="No videos match these filters" />
        ) : (
          <div className="overflow-x-auto border-2 border-[#E3E5EC] rounded-[14px]">
            <table className="w-full text-left text-xs text-[#1E2233]">
              <thead className="bg-[#F5F6FA] border-b border-[#E3E5EC] text-[#6B7280] font-extrabold">
                <tr>
                  <th className="py-3 px-4">Class & subject</th>
                  <th className="py-3 px-4">Chapter & lesson</th>
                  <th className="py-3 px-4">YouTube ID</th>
                  <th className="py-3 px-4">Status</th>
                  <th className="py-3 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#E3E5EC]">
                {filtered.map((v) => (
                  <tr key={v.youtube_id} className={v.isActive ? '' : 'bg-[#FFF6E2]/40'}>
                    <td className="py-3 px-4 whitespace-nowrap">
                      <div className="font-extrabold">{v.class_display}</div>
                      <div className="text-[11px] text-[#12A594] font-bold">{v.subject}</div>
                      {v.textbook && <div className="text-[11px] text-[#6B7280] font-bold max-w-[180px] truncate">{v.textbook}</div>}
                    </td>
                    <td className="py-3 px-4">
                      <div className="font-extrabold line-clamp-1">
                        {v.chapter_id} · {v.chapter_name}
                      </div>
                      <div className="text-[11px] text-[#6B7280] line-clamp-1">{v.video_title}</div>
                    </td>
                    <td className="py-3 px-4 whitespace-nowrap font-mono text-[11px]">{v.youtube_id}</td>
                    <td className="py-3 px-4 whitespace-nowrap">
                      <button
                        onClick={() => toggleActive(v)}
                        className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-extrabold cursor-pointer ${
                          v.isActive ? 'bg-[#E7F7F1] text-[#0B7A67]' : 'bg-[#FFDCD0] text-[#8A2E17]'
                        }`}
                        title="Toggle visibility"
                      >
                        {v.isActive ? <CheckCircle2 className="w-3 h-3" /> : <AlertTriangle className="w-3 h-3" />}
                        {v.isActive ? 'Visible' : 'Hidden'}
                      </button>
                      {v.yt_public === false && (
                        <span className="ml-1.5 inline-flex px-2.5 py-1 rounded-full text-[11px] font-extrabold bg-[#F1F3FB] text-[#6B7280]" title="Sheet says the YouTube upload is not public yet. Students can't see it until the sheet shows PUBLISH_OK.">
                          Not public yet
                        </span>
                      )}
                    </td>
                    <td className="py-3 px-4 whitespace-nowrap text-right space-x-1">
                      <button onClick={() => setPreview(v)} aria-label="Preview" className="p-1.5 text-slate-600 hover:text-[#3B4FE0] rounded-xl cursor-pointer">
                        <Eye className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => {
                          setEditingId(v.youtube_id);
                          setForm(v);
                        }}
                        aria-label="Edit"
                        className="p-1.5 text-slate-600 hover:text-[#12A594] rounded-xl cursor-pointer"
                      >
                        <Edit2 className="w-4 h-4" />
                      </button>
                      {!SHEET_MANAGED && <button onClick={() => remove(v)} aria-label="Delete" className="p-1.5 text-slate-600 hover:text-[#C24A2C] rounded-xl cursor-pointer">
                        <Trash2 className="w-4 h-4" />
                      </button>}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
        <p className="text-xs text-[#6B7280]">
          Showing {filtered.length} of {videos.length} videos
        </p>
      </Card>

      {form && (
        <Modal
          title={editingId ? 'Edit video' : 'Add video'}
          subtitle={SHEET_MANAGED ? 'Content comes from the Google Sheet. Change it there and sync; visibility and PYQs are set here.' : undefined}
          onClose={() => setForm(null)}
        >
          <form onSubmit={save} className="space-y-4">
            <fieldset disabled={SHEET_MANAGED} className="space-y-4 disabled:opacity-70">
            <div className="grid grid-cols-2 gap-3">
              <label className="space-y-1">
                <span className="text-xs font-extrabold">Class</span>
                <select value={form.class_sort} onChange={(e) => setForm({ ...form, class_sort: e.target.value })} className={inputClass}>
                  {Array.from({ length: 12 }, (_, i) => String(i + 1).padStart(2, '0')).map((c) => (
                    <option key={c} value={c}>
                      Class {parseInt(c, 10)}
                    </option>
                  ))}
                </select>
              </label>
              <label className="space-y-1">
                <span className="text-xs font-extrabold">Subject</span>
                <input
                  list="admin-subjects"
                  value={form.subject}
                  onChange={(e) => setForm({ ...form, subject: e.target.value })}
                  placeholder="e.g. Science"
                  className={inputClass}
                />
                <datalist id="admin-subjects">
                  {formClass?.subjects.map((s) => <option key={s.key} value={s.name} />)}
                </datalist>
              </label>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <label className="space-y-1">
                <span className="text-xs font-extrabold">Chapter ID</span>
                <input
                  list="admin-chapters"
                  value={form.chapter_id}
                  onChange={(e) => {
                    const match = formSubject?.chapters.find((c) => c.chapter_id === e.target.value);
                    setForm({ ...form, chapter_id: e.target.value, chapter_name: match ? match.chapter_name : form.chapter_name });
                  }}
                  placeholder="e.g. CH-01"
                  className={inputClass}
                />
                <datalist id="admin-chapters">
                  {formSubject?.chapters.map((c) => <option key={c.key} value={c.chapter_id}>{c.chapter_name}</option>)}
                </datalist>
              </label>
              <label className="space-y-1">
                <span className="text-xs font-extrabold">Duration (minutes)</span>
                <input
                  type="number"
                  min={1}
                  value={Math.round((form.duration_seconds || 0) / 60)}
                  onChange={(e) => setForm({ ...form, duration_seconds: Number(e.target.value) * 60 })}
                  className={inputClass}
                />
              </label>
            </div>

            <label className="block space-y-1">
              <span className="text-xs font-extrabold">Chapter name</span>
              <input value={form.chapter_name} onChange={(e) => setForm({ ...form, chapter_name: e.target.value })} className={inputClass} />
            </label>
            <label className="block space-y-1">
              <span className="text-xs font-extrabold">Video title</span>
              <input value={form.video_title} onChange={(e) => setForm({ ...form, video_title: e.target.value })} className={inputClass} />
            </label>
            <label className="block space-y-1">
              <span className="text-xs font-extrabold">YouTube video ID</span>
              <input
                value={form.youtube_id}
                disabled={Boolean(editingId)}
                onChange={(e) => setForm({ ...form, youtube_id: e.target.value })}
                placeholder="11 characters, e.g. d4b_B295xY8"
                className={`${inputClass} font-mono`}
              />
            </label>

            </fieldset>
            {form.pdf_url && (
              <a href={form.pdf_url} target="_blank" rel="noopener noreferrer" className="block text-xs font-extrabold text-[#3B4FE0]">
                NCERT chapter PDF ↗
              </a>
            )}
            <div className="flex flex-wrap items-center gap-5 pt-2 border-t border-[#E3E5EC]">
              <label className="flex items-center gap-2 text-xs font-extrabold cursor-pointer">
                <input type="checkbox" checked={Boolean(form.isActive)} onChange={(e) => setForm({ ...form, isActive: e.target.checked })} />
                Visible to students
              </label>
              <label className="flex items-center gap-2 text-xs font-extrabold cursor-pointer">
                <input type="checkbox" checked={Boolean(form.pyq_available)} onChange={(e) => setForm({ ...form, pyq_available: e.target.checked })} />
                Includes PYQs
              </label>
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <button type="button" onClick={() => setForm(null)} className={secondaryButton}>
                Cancel
              </button>
              <button type="submit" disabled={saving} className={primaryButton}>
                {saving ? 'Saving…' : editingId ? 'Save changes' : 'Add video'}
              </button>
            </div>
          </form>
        </Modal>
      )}

      {preview && (
        <Modal title={preview.video_title} subtitle={`${preview.class_display} • ${preview.subject} • ${preview.chapter_name}`} onClose={() => setPreview(null)} wide>
          <div className="space-y-4">
            <div className="aspect-video w-full rounded-[22px] overflow-hidden bg-black">
              <iframe
                src={`https://www.youtube-nocookie.com/embed/${preview.youtube_id}?controls=1&rel=0&modestbranding=1`}
                title={preview.video_title}
                className="w-full h-full border-0"
                allow="accelerometer; encrypted-media; gyroscope; picture-in-picture"
                allowFullScreen
              />
            </div>
            <div className="flex justify-end">
              <button
                onClick={() => {
                  setPreview(null);
                  onSelectVideo(preview);
                }}
                className={primaryButton}
              >
                <Play className="w-3.5 h-3.5 fill-white" /> Open in student player
              </button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
};
