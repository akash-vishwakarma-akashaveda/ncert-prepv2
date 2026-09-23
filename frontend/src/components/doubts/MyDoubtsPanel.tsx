import React, { useState } from 'react';
import { MessageCircleQuestion, ChevronDown, ChevronUp, Play } from 'lucide-react';
import { Doubt, Video } from '../../types';
import { useDoubts } from '../../context/DoubtsContext';
import { DoubtStatusBadge } from './DoubtStatusBadge';

interface MyDoubtsPanelProps {
  videoMap: Map<string, Video>;
  onSelectVideo: (video: Video) => void;
  // Full-page use: no section heading, every doubt listed.
  standalone?: boolean;
}

const COLLAPSED_COUNT = 3;

export const MyDoubtsPanel: React.FC<MyDoubtsPanelProps> = ({ videoMap, onSelectVideo, standalone = false }) => {
  const { myDoubts, unreadCount, markRead, closeDoubt } = useDoubts();
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [showAll, setShowAll] = useState(standalone);

  // Unread replies first, then open questions, then the rest by date.
  const rank = (d: Doubt) => (d.student_unread ? 0 : d.status === 'open' ? 1 : 2);
  const sorted = [...myDoubts].sort((a, b) => rank(a) - rank(b) || b.created_at - a.created_at);
  const visible = showAll ? sorted : sorted.slice(0, COLLAPSED_COUNT);

  const toggle = (doubt: Doubt) => {
    const next = expandedId === doubt.id ? null : doubt.id;
    setExpandedId(next);
    if (next) markRead(doubt).catch(() => undefined);
  };

  return (
    <section id="my-doubts" aria-labelledby="my-doubts-title" className="space-y-4 scroll-mt-24">
      <div className={standalone ? 'hidden' : 'flex items-center justify-between'}>
        <h2 id="my-doubts-title" className="text-2xl font-bold tracking-tight text-[#1E2233] flex items-center gap-2">
          <MessageCircleQuestion className="w-5 h-5 text-[#12A594]" />
          My Doubts
          {unreadCount > 0 && (
            <span className="text-[11px] font-extrabold px-2 py-0.5 rounded-full bg-[color:var(--brand)] text-white">
              {unreadCount} new {unreadCount === 1 ? 'reply' : 'replies'}
            </span>
          )}
        </h2>
        {sorted.length > COLLAPSED_COUNT && (
          <button
            onClick={() => setShowAll((v) => !v)}
            className="text-sm font-bold text-[color:var(--brand)] hover:underline cursor-pointer"
          >
            {showAll ? 'Show less' : `View all ${sorted.length}`}
          </button>
        )}
      </div>

      {sorted.length === 0 ? (
        <p className="bg-white border-2 border-[#E3E5EC] rounded-[14px] text-sm text-[#6B7280] p-6">
          Stuck on something? Open any lesson and use <strong>Ask a doubt</strong> below the video. Your
          educator&apos;s replies will show up here.
        </p>
      ) : (
        <ul className="bg-white border-2 border-[#E3E5EC] rounded-[14px] divide-y divide-[#E3E5EC] overflow-hidden">
          {visible.map((d) => {
            const expanded = expandedId === d.id;
            const video = videoMap.get(d.youtube_id);
            return (
              <li key={d.id} className={d.student_unread ? 'bg-[#EEEDFE]/40' : ''}>
                <button
                  onClick={() => toggle(d)}
                  aria-expanded={expanded}
                  className="w-full text-left p-4 flex items-start justify-between gap-3 cursor-pointer hover:bg-[color:var(--page)]"
                >
                  <div className="min-w-0 space-y-1">
                    <DoubtStatusBadge status={d.status} unread={d.student_unread} />
                    <p className="text-sm font-bold text-[#1E2233] line-clamp-1">{d.question}</p>
                    <p className="text-[11px] text-[#6B7280] truncate">
                      {d.subject} • {d.chapter_name} • {new Date(d.created_at).toLocaleDateString()}
                    </p>
                  </div>
                  {expanded ? (
                    <ChevronUp className="w-4 h-4 text-[#6B7280] shrink-0 mt-1" />
                  ) : (
                    <ChevronDown className="w-4 h-4 text-[#6B7280] shrink-0 mt-1" />
                  )}
                </button>

                {expanded && (
                  <div className="px-4 pb-4 space-y-3 text-xs">
                    <p className="text-[#1E2233] whitespace-pre-line">{d.question}</p>
                    {d.answer ? (
                      <div className="p-3 rounded-[14px] bg-[#E1F5EE] border-2 border-[#BCE8DC] text-[#04342C] space-y-1">
                        <p className="font-extrabold">
                          {d.answered_by || 'Educator'}
                          {d.answered_at && (
                            <span className="font-normal text-[11px]"> • {new Date(d.answered_at).toLocaleString()}</span>
                          )}
                        </p>
                        <p className="whitespace-pre-line">{d.answer}</p>
                      </div>
                    ) : (
                      <p className="text-[#6B7280]">No reply yet. You&apos;ll see it here as soon as your educator answers.</p>
                    )}
                    <div className="flex items-center gap-2">
                      {video?.isActive && (
                        <button
                          onClick={() => onSelectVideo(video)}
                          className="flex items-center gap-1.5 px-3 py-1.5 font-bold text-white btn-3d [--edge:var(--brand-edge)] bg-[color:var(--brand)] hover:bg-[color:var(--brand-hover)] rounded-xl cursor-pointer"
                        >
                          <Play className="w-3 h-3 fill-white" />
                          Open lesson
                        </button>
                      )}
                      {d.status !== 'closed' && (
                        <button
                          onClick={() => closeDoubt(d)}
                          className="px-3 py-1.5 font-bold text-[#6B7280] bg-[color:var(--page)] border-2 border-[#E3E5EC] hover:text-[#1E2233] rounded-xl cursor-pointer"
                        >
                          {d.status === 'answered' ? 'Mark resolved' : 'Withdraw'}
                        </button>
                      )}
                    </div>
                  </div>
                )}
              </li>
            );
          })}
        </ul>
      )}
    </section>
  );
};
