import React, { useState } from 'react';
import { ExternalLink, MessageSquare, RefreshCw } from 'lucide-react';
import { Feedback } from '../../types';
import { FeedbackService } from '../../services/feedback';
import { useCatalogContext } from '../../context/CatalogContext';
import { thumbnailUrl } from '../../components/home/JumpBackInCard';
import { toDisplayTitle } from '../../components/home/StageShowcase';
import { Card, EmptyState, Notify, SectionHeader, secondaryButton } from './adminUi';

interface FeedbackSectionProps {
  feedbacks: Feedback[];
  reloadFeedback: () => Promise<void>;
  notify: Notify;
}

type Status = 'new' | 'reviewed';

export const FeedbackSection: React.FC<FeedbackSectionProps> = ({ feedbacks, reloadFeedback, notify }) => {
  const { videoMap } = useCatalogContext();
  const [showReviewed, setShowReviewed] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  // The checkbox flips at once (not after the list reloads), and a second click is ignored while saving,
  // so a slow connection can never send the same status twice.
  const [overrides, setOverrides] = useState<Record<string, Status>>({});
  const [saving, setSaving] = useState<Set<string>>(new Set());
  const statusOf = (fb: Feedback): Status => overrides[fb.feedbackId || ''] ?? (fb.status === 'reviewed' ? 'reviewed' : 'new');
  const list = feedbacks.filter((f) => showReviewed || statusOf(f) !== 'reviewed');

  const setReviewed = async (fb: Feedback, reviewed: boolean) => {
    const id = fb.feedbackId || '';
    if (!id || saving.has(id)) return;
    const next: Status = reviewed ? 'reviewed' : 'new';
    setOverrides((o) => ({ ...o, [id]: next }));
    setSaving((s) => new Set(s).add(id));
    try {
      await FeedbackService.updateStatus(id, next);
      await reloadFeedback();
      setOverrides(({ [id]: _done, ...rest }) => rest);
      notify(`Marked as ${next}.`);
    } catch {
      setOverrides(({ [id]: _failed, ...rest }) => rest);
      notify('Could not update feedback.', 'error');
    } finally {
      setSaving((s) => {
        const n = new Set(s);
        n.delete(id);
        return n;
      });
    }
  };

  return (
    <div className="space-y-6">
      <SectionHeader
        title="Feedback"
        description="One-way comments students leave under lessons (max 5 per hour). Use Doubts for questions that need a reply."
        actions={
          <>
            <label className="flex items-center gap-2 text-xs font-bold text-[#1E2233] cursor-pointer">
              <input type="checkbox" checked={showReviewed} onChange={(e) => setShowReviewed(e.target.checked)} />
              Show reviewed
            </label>
            <button
              onClick={async () => {
                setRefreshing(true);
                await reloadFeedback();
                setRefreshing(false);
              }}
              className={secondaryButton}
            >
              <RefreshCw className={`w-3.5 h-3.5 ${refreshing ? 'animate-spin' : ''}`} /> Refresh
            </button>
          </>
        }
      />

      <Card className="overflow-hidden">
        {list.length === 0 ? (
          <EmptyState icon={<MessageSquare className="w-8 h-8" />} title={showReviewed ? 'No feedback yet' : 'No new feedback'} />
        ) : (
          <ul className="divide-y divide-[#E3E5EC]">
            {list.map((fb) => {
              const id = fb.feedbackId || '';
              const status = statusOf(fb);
              const video = videoMap.get(fb.youtube_id);
              const title = video ? toDisplayTitle(video.video_title) : fb.videoTitle;
              return (
                <li key={id} className={`p-4 space-y-3 ${status === 'reviewed' ? 'bg-slate-50' : ''}`}>
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    {/* The lesson the comment is about: thumbnail, title, class and subject, opens the lesson. */}
                    <a
                      href={`/watch/${encodeURIComponent(fb.youtube_id)}`}
                      target="_blank"
                      rel="noreferrer"
                      className="group flex items-center gap-3 min-w-0 flex-1"
                      title="Open this lesson in a new tab"
                    >
                      <img
                        src={thumbnailUrl(fb.youtube_id)}
                        alt=""
                        loading="lazy"
                        className="w-28 aspect-video shrink-0 rounded-[10px] object-cover bg-[#1E2233]"
                      />
                      <span className="min-w-0">
                        {video && (
                          <span className="block text-[10.5px] font-extrabold tracking-[0.06em] text-[#6B7280] truncate">
                            {`${video.class_display} · ${video.subject} · ${video.chapter_id}`.toUpperCase()}
                          </span>
                        )}
                        <span className="flex items-center gap-1.5 text-sm font-extrabold text-[#1E2233] group-hover:text-[#3B4FE0]">
                          <span className="truncate">{title || 'Lesson no longer in the catalog'}</span>
                          <ExternalLink className="w-3.5 h-3.5 shrink-0 opacity-60" />
                        </span>
                        {!video && <span className="block text-[11px] text-[#6B7280]">Video ID {fb.youtube_id}</span>}
                      </span>
                    </a>
                    <div className="flex items-center gap-3 shrink-0">
                      <span className="text-[11px] text-[#6B7280]">{new Date(Number(fb.created_at)).toLocaleString()}</span>
                      <label className={`flex items-center gap-1.5 text-xs font-extrabold cursor-pointer ${saving.has(id) ? 'opacity-60' : ''}`}>
                        <input
                          type="checkbox"
                          checked={status === 'reviewed'}
                          disabled={saving.has(id)}
                          onChange={(e) => setReviewed(fb, e.target.checked)}
                          className="w-4 h-4 accent-[#3B4FE0]"
                        />
                        Reviewed
                      </label>
                    </div>
                  </div>
                  <p className="text-sm text-[#1E2233] bg-[#F5F6FA] p-3 rounded-[14px] whitespace-pre-line">{fb.message}</p>
                  <p className="text-[11px] text-[#6B7280]">From {fb.userEmail || fb.userId}</p>
                </li>
              );
            })}
          </ul>
        )}
      </Card>
    </div>
  );
};
