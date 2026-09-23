import React, { useState } from 'react';
import { MessageSquare, RefreshCw } from 'lucide-react';
import { Feedback } from '../../types';
import { FirestoreService } from '../../services/firestore';
import { Card, EmptyState, Notify, SectionHeader, secondaryButton } from './adminUi';

interface FeedbackSectionProps {
  feedbacks: Feedback[];
  reloadFeedback: () => Promise<void>;
  notify: Notify;
}

export const FeedbackSection: React.FC<FeedbackSectionProps> = ({ feedbacks, reloadFeedback, notify }) => {
  const [showReviewed, setShowReviewed] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const list = feedbacks.filter((f) => showReviewed || f.status !== 'reviewed');

  const toggle = async (fb: Feedback) => {
    const next = fb.status === 'reviewed' ? 'new' : 'reviewed';
    try {
      await FirestoreService.updateFeedbackStatus(fb.feedbackId || '', next);
      await reloadFeedback();
      notify(`Marked as ${next}.`);
    } catch {
      notify('Could not update feedback.', 'error');
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
            {list.map((fb) => (
              <li key={fb.feedbackId} className={`p-4 space-y-2 ${fb.status === 'reviewed' ? 'bg-slate-50' : ''}`}>
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div className="flex items-center gap-2 min-w-0">
                    <span
                      className={`text-[10px] font-extrabold uppercase px-2 py-0.5 rounded-md ${
                        fb.status === 'reviewed' ? 'bg-slate-200 text-slate-700' : 'bg-[#EEF0FE] text-[#2A3BB8]'
                      }`}
                    >
                      {fb.status || 'new'}
                    </span>
                    <span className="text-xs font-extrabold text-[#1E2233] truncate">{fb.videoTitle || fb.youtube_id}</span>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="text-[11px] text-[#6B7280]">{new Date(Number(fb.created_at)).toLocaleString()}</span>
                    <button onClick={() => toggle(fb)} className="text-xs font-extrabold text-[#3B4FE0] hover:underline cursor-pointer">
                      {fb.status === 'reviewed' ? 'Mark new' : 'Mark reviewed'}
                    </button>
                  </div>
                </div>
                <p className="text-sm text-[#1E2233] bg-[#F5F6FA] p-3 rounded-[14px] whitespace-pre-line">{fb.message}</p>
                <p className="text-[11px] text-[#6B7280]">From {fb.userEmail || fb.userId}</p>
              </li>
            ))}
          </ul>
        )}
      </Card>
    </div>
  );
};
