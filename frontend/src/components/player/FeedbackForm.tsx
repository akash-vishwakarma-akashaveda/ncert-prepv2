import React, { useState } from 'react';
import { Send, MessageSquare, CheckCircle, AlertCircle, Sparkles } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { FeedbackService } from '../../services/feedback';
import { StorageService } from '../../services/storage';

interface FeedbackFormProps {
  youtubeId: string;
  videoTitle: string;
}

export const FeedbackForm: React.FC<FeedbackFormProps> = ({ youtubeId, videoTitle }) => {
  const { user, setAuthModalOpen } = useAuth();
  const [message, setMessage] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [feedbackState, setFeedbackState] = useState<{
    status: 'idle' | 'success' | 'error';
    text: string;
  }>({ status: 'idle', text: '' });

  const userId = user?.userId || '';
  const currentCount = userId ? StorageService.getFeedbackTimestamps(userId).length : 0;
  const remaining = Math.max(0, 5 - currentCount);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!user) {
      setAuthModalOpen(true);
      return;
    }

    if (!message.trim()) return;

    setSubmitting(true);
    setFeedbackState({ status: 'idle', text: '' });

    try {
      const result = await FeedbackService.submitFeedback(user.userId, youtubeId, message);
      if (result.success) {
        setFeedbackState({
          status: 'success',
          text: result.message,
        });
        setMessage('');
      } else {
        setFeedbackState({
          status: 'error',
          text: result.message,
        });
      }
    } catch {
      setFeedbackState({
        status: 'error',
        text: 'An unexpected error occurred while sending your note.',
      });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 rounded-xl bg-[color:var(--brand)]/10 text-[color:var(--brand)] flex items-center justify-center">
            <MessageSquare className="w-4 h-4" />
          </div>
          <div>
            <h4 className="text-sm font-bold text-[#1E2233]">Private Educator Feedback</h4>
            <p className="text-[11px] text-[#6B7280]">
              Direct one-way note to the channel educator (write-only, confidential)
            </p>
          </div>
        </div>

        {user && (
          <span className="text-[11px] font-semibold px-2 py-0.5 rounded-full bg-[color:var(--page)] border-2 border-[#E3E5EC] text-[#6B7280]">
            {remaining} / 5 submissions left this hr
          </span>
        )}
      </div>

      {feedbackState.status === 'success' && (
        <div className="p-3 bg-[#E1F5EE] border-2 border-[#BCE8DC] text-[#04342C] rounded-[14px] text-xs flex items-center gap-2">
          <CheckCircle className="w-4 h-4 text-[#12A594] shrink-0" />
          <span>{feedbackState.text}</span>
        </div>
      )}

      {feedbackState.status === 'error' && (
        <div className="p-3 bg-[#FFE9E2] border border-[#FFC3B1] text-[#8A2E17] rounded-[14px] text-xs flex items-center gap-2">
          <AlertCircle className="w-4 h-4 text-[#C24A2C] shrink-0" />
          <span>{feedbackState.text}</span>
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-2">
        <textarea
          rows={3}
          maxLength={1000}
          placeholder={
            user
              ? `Have a question, feedback, or suggestion about "${videoTitle}"? Let the educator know...`
              : 'Sign in to leave a private note or query for the educator.'
          }
          value={message}
          disabled={!user || submitting}
          onChange={(e) => setMessage(e.target.value)}
          className="w-full p-3 text-xs sm:text-sm border-2 border-[#E3E5EC] rounded-[14px] outline-none focus:border-[color:var(--brand)] focus:ring-1 focus:ring-[color:var(--brand)] resize-none disabled:bg-[color:var(--page)] disabled:cursor-not-allowed"
        />

        <div className="flex items-center justify-between">
          <span className="text-[11px] text-[#6B7280]">
            Max 5 submissions/hr • Only the educator can read this
          </span>

          {user ? (
            <button
              type="submit"
              disabled={submitting || !message.trim() || remaining === 0}
              className="flex items-center gap-1.5 px-4 py-2 text-xs font-semibold text-white btn-3d [--edge:var(--brand-edge)] bg-[color:var(--brand)] hover:bg-[color:var(--brand-hover)] disabled:bg-[#CBD5E1] rounded-[14px] shadow-[0_4px_0_var(--card-line)] transition-colors cursor-pointer disabled:cursor-not-allowed"
            >
              <Send className="w-3.5 h-3.5" />
              <span>{submitting ? 'Sending...' : 'Submit Feedback'}</span>
            </button>
          ) : (
            <button
              type="button"
              onClick={() => setAuthModalOpen(true)}
              className="flex items-center gap-1.5 px-4 py-2 text-xs font-semibold text-[color:var(--brand)] bg-[color:var(--brand)]/10 hover:bg-[color:var(--brand)]/20 rounded-[14px] transition-colors cursor-pointer"
            >
              <Sparkles className="w-3.5 h-3.5" />
              <span>Sign in to Submit</span>
            </button>
          )}
        </div>
      </form>
    </div>
  );
};
