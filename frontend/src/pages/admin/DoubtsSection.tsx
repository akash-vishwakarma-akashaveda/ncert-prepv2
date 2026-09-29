import React, { useEffect, useMemo, useState } from 'react';
import { MessageCircleQuestion, RefreshCw, Search, Send, Play } from 'lucide-react';
import { Doubt, DoubtStatus, Video } from '../../types';
import { DoubtsService } from '../../services/content';
import { DoubtStatusBadge } from '../../components/doubts/DoubtStatusBadge';
import { AdminClassNode } from './adminTree';
import { Card, EmptyState, Notify, SectionHeader, inputClass, primaryButton, secondaryButton } from './adminUi';

interface DoubtsSectionProps {
  doubts: Doubt[];
  reloadDoubts: () => Promise<void>;
  notify: Notify;
  adminName: string;
  initialDoubtId?: string;
  videos: Video[];
  onSelectVideo: (video: Video) => void;
  tree: AdminClassNode[];
}

type Filter = DoubtStatus | 'all';

export const DoubtsSection: React.FC<DoubtsSectionProps> = ({
  doubts,
  reloadDoubts,
  notify,
  adminName,
  initialDoubtId,
  videos,
  onSelectVideo,
  tree,
}) => {
  const [filter, setFilter] = useState<Filter>('open');
  const [classFilter, setClassFilter] = useState('all');
  const [search, setSearch] = useState('');
  const [selectedId, setSelectedId] = useState<string | undefined>(initialDoubtId);
  const [answer, setAnswer] = useState('');
  const [busy, setBusy] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  const counts = useMemo(
    () => ({
      open: doubts.filter((d) => d.status === 'open').length,
      answered: doubts.filter((d) => d.status === 'answered').length,
      closed: doubts.filter((d) => d.status === 'closed').length,
      all: doubts.length,
    }),
    [doubts]
  );

  const list = doubts
    .filter((d) => filter === 'all' || d.status === filter)
    .filter((d) => classFilter === 'all' || d.class_sort === classFilter)
    .filter((d) => {
      const q = search.trim().toLowerCase();
      return !q || [d.question, d.userName, d.userEmail, d.chapter_name, d.subject].some((f) => f?.toLowerCase().includes(q));
    })
    // Oldest open doubts first so nobody waits forever; everything else newest first.
    .sort((a, b) => (filter === 'open' ? a.created_at - b.created_at : b.created_at - a.created_at));

  const selected = doubts.find((d) => d.id === selectedId);

  useEffect(() => {
    setAnswer(selected?.answer || '');
  }, [selectedId]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (initialDoubtId) {
      setSelectedId(initialDoubtId);
      setFilter('all');
    }
  }, [initialDoubtId]);

  const refresh = async () => {
    setRefreshing(true);
    await reloadDoubts();
    setRefreshing(false);
  };

  const act = async (action: () => Promise<void>, message: string) => {
    setBusy(true);
    try {
      await action();
      await reloadDoubts();
      notify(message);
    } catch (err) {
      notify((err as Error).message || 'Could not update the doubt.', 'error');
    } finally {
      setBusy(false);
    }
  };

  const video = selected ? videos.find((v) => v.youtube_id === selected.youtube_id) : undefined;
  const tabs: { id: Filter; label: string }[] = [
    { id: 'open', label: 'Open' },
    { id: 'answered', label: 'Answered' },
    { id: 'closed', label: 'Closed' },
    { id: 'all', label: 'All' },
  ];

  return (
    <div className="space-y-6">
      <SectionHeader
        title="Doubts"
        description="Private questions students ask under lessons. Only the student who asked sees your reply."
        actions={
          <button onClick={refresh} className={secondaryButton}>
            <RefreshCw className={`w-3.5 h-3.5 ${refreshing ? 'animate-spin' : ''}`} /> Refresh
          </button>
        }
      />

      <div className="flex flex-wrap items-center gap-2">
        <div className="flex bg-white border-2 border-[#E3E5EC] rounded-[14px] p-1" role="tablist">
          {tabs.map((t) => (
            <button
              key={t.id}
              role="tab"
              aria-selected={filter === t.id}
              onClick={() => setFilter(t.id)}
              className={`px-3 py-1.5 text-xs font-extrabold rounded-xl cursor-pointer ${
                filter === t.id ? 'bg-[#3B4FE0] text-white' : 'text-[#6B7280] hover:text-[#1E2233]'
              }`}
            >
              {t.label} ({counts[t.id]})
            </button>
          ))}
        </div>
        <select aria-label="Class" value={classFilter} onChange={(e) => setClassFilter(e.target.value)} className={`${inputClass} w-auto`}>
          <option value="all">All classes</option>
          {tree.map((c) => (
            <option key={c.class_sort} value={c.class_sort}>
              {c.name}
            </option>
          ))}
        </select>
        <label className="relative flex-1 min-w-[180px]">
          <span className="sr-only">Search doubts</span>
          <Search className="w-3.5 h-3.5 text-[#6B7280] absolute left-2.5 top-1/2 -translate-y-1/2" />
          <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search question, student, chapter" className={`${inputClass} pl-8`} />
        </label>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-[minmax(0,2fr)_minmax(0,3fr)] gap-4 items-start">
        <Card className="overflow-hidden">
          {list.length === 0 ? (
            <EmptyState icon={<MessageCircleQuestion className="w-8 h-8" />} title={filter === 'open' ? 'No open doubts' : 'Nothing here'} />
          ) : (
            <ul className="divide-y divide-[#E3E5EC] max-h-[70vh] overflow-y-auto">
              {list.map((d) => (
                <li key={d.id}>
                  <button
                    onClick={() => setSelectedId(d.id)}
                    aria-current={d.id === selectedId ? 'true' : undefined}
                    className={`w-full text-left p-4 space-y-1 cursor-pointer ${d.id === selectedId ? 'bg-[#EEEDFE]/60' : 'hover:bg-[#F5F6FA]'}`}
                  >
                    <div className="flex items-center justify-between gap-2">
                      <DoubtStatusBadge status={d.status} adminView />
                      <span className="text-[11px] text-[#6B7280]">{new Date(d.created_at).toLocaleDateString()}</span>
                    </div>
                    <p className="text-sm font-bold text-[#1E2233] line-clamp-2">{d.question}</p>
                    <p className="text-[11px] text-[#6B7280] truncate">
                      {d.userName || d.userEmail || 'Student'} • Class {parseInt(d.class_sort, 10)} {d.subject} • {d.chapter_name}
                    </p>
                  </button>
                </li>
              ))}
            </ul>
          )}
        </Card>

        {!selected ? (
          <Card>
            <EmptyState icon={<MessageCircleQuestion className="w-8 h-8" />} title="Select a doubt to reply" />
          </Card>
        ) : (
          <Card className="p-5 sm:p-6 space-y-4">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div className="space-y-1">
                <DoubtStatusBadge status={selected.status} adminView />
                <p className="text-sm font-extrabold text-[#1E2233]">
                  {selected.userName || 'Student'}
                  {selected.userEmail && <span className="font-normal text-[#6B7280]"> • {selected.userEmail}</span>}
                </p>
                <p className="text-xs text-[#6B7280]">
                  Class {parseInt(selected.class_sort, 10)} • {selected.subject} • {selected.chapter_id} {selected.chapter_name}
                </p>
                <p className="text-xs text-[#6B7280]">
                  Lesson: {selected.video_title} • asked {new Date(selected.created_at).toLocaleString()}
                </p>
              </div>
              {video && (
                <button onClick={() => onSelectVideo(video)} className={secondaryButton}>
                  <Play className="w-3.5 h-3.5" /> Open lesson
                </button>
              )}
            </div>

            <div className="p-4 rounded-[22px] bg-[#F5F6FA] border-2 border-[#E3E5EC] text-sm text-[#1E2233] whitespace-pre-line">
              {selected.question}
            </div>

            {selected.answer && selected.answered_at && (
              <p className="text-[11px] text-[#6B7280]">
                Last replied by {selected.answered_by || 'an admin'} on {new Date(selected.answered_at).toLocaleString()}
                {selected.student_unread ? ' • not yet seen by student' : ' • seen by student'}
              </p>
            )}

            <label className="block space-y-1">
              <span className="text-xs font-extrabold text-[#1E2233]">{selected.answer ? 'Edit reply' : 'Your reply'}</span>
              <textarea
                rows={6}
                value={answer}
                maxLength={4000}
                onChange={(e) => setAnswer(e.target.value)}
                placeholder="Explain step by step. Link to a chapter or timestamp if it helps."
                className={`${inputClass} resize-y`}
              />
            </label>

            <div className="flex flex-wrap items-center justify-between gap-2">
              <div className="flex gap-2">
                {selected.status !== 'closed' ? (
                  <button onClick={() => act(() => DoubtsService.setStatus(selected, 'closed'), 'Doubt closed.')} disabled={busy} className={secondaryButton}>
                    Close without reply
                  </button>
                ) : (
                  <button
                    onClick={() => act(() => DoubtsService.setStatus(selected, selected.answer ? 'answered' : 'open'), 'Doubt reopened.')}
                    disabled={busy}
                    className={secondaryButton}
                  >
                    Reopen
                  </button>
                )}
              </div>
              <button
                onClick={() => act(() => DoubtsService.answer(selected, answer, adminName), 'Reply sent. The student will see it in the app.')}
                disabled={busy || !answer.trim() || answer.trim() === selected.answer}
                className={primaryButton}
              >
                <Send className="w-3.5 h-3.5" /> {busy ? 'Sending…' : selected.answer ? 'Update reply' : 'Send reply'}
              </button>
            </div>
          </Card>
        )}
      </div>
    </div>
  );
};
