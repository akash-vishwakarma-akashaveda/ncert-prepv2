import React, { useEffect, useState } from 'react';
import { HelpCircle, Send, CheckCircle, AlertCircle, MessageCircle } from 'lucide-react';
import { Video } from '../../types';
import { useAuth } from '../../context/AuthContext';
import { useDoubts } from '../../context/DoubtsContext';
import { DOUBT_MAX_LENGTH, DOUBT_MIN_LENGTH } from '../../services/content';
import { DoubtStatusBadge } from '../doubts/DoubtStatusBadge';

interface AskDoubtFormProps {
  video: Video;
}

export const AskDoubtForm: React.FC<AskDoubtFormProps> = ({ video }) => {
  const { user, setAuthModalOpen } = useAuth();
  const { myDoubts, askDoubt, markRead } = useDoubts();
  const [question, setQuestion] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [state, setState] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const lessonDoubts = myDoubts.filter((d) => d.youtube_id === video.youtube_id);

  // Replies shown on this page count as seen.
  useEffect(() => {
    lessonDoubts.filter((d) => d.student_unread).forEach((d) => markRead(d).catch(() => undefined));
  }, [lessonDoubts.map((d) => `${d.id}:${d.student_unread}`).join('|')]); // eslint-disable-line react-hooks/exhaustive-deps

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) {
      setAuthModalOpen(true);
      return;
    }
    setSubmitting(true);
    setState(null);
    try {
      await askDoubt({
        youtube_id: video.youtube_id,
        video_title: video.video_title,
        class_sort: video.class_sort,
        subject: video.subject,
        chapter_id: video.chapter_id,
        chapter_name: video.chapter_name,
        question,
      });
      setQuestion('');
      setState({ type: 'success', text: 'Doubt sent. You will be notified here when your educator replies.' });
    } catch (err) {
      setState({ type: 'error', text: (err as Error).message });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <section aria-labelledby="ask-doubt-title" className="space-y-3">
      <div className="flex items-center gap-2">
        <div className="w-7 h-7 rounded-xl bg-[#12A594]/10 text-[#12A594] flex items-center justify-center">
          <HelpCircle className="w-4 h-4" />
        </div>
        <div>
          <h4 id="ask-doubt-title" className="text-sm font-bold text-[#1E2233]">
            Ask a doubt
          </h4>
          <p className="text-[11px] text-[#6B7280]">
            Private to you and your educator. Replies appear here and on your dashboard.
          </p>
        </div>
      </div>

      {state && (
        <div
          className={`p-3 rounded-[14px] text-xs flex items-center gap-2 border ${
            state.type === 'success'
              ? 'bg-[#E1F5EE] border-[#BCE8DC] text-[#04342C]'
              : 'bg-[#FFE9E2] border-[#FFC3B1] text-[#8A2E17]'
          }`}
        >
          {state.type === 'success' ? (
            <CheckCircle className="w-4 h-4 text-[#12A594] shrink-0" />
          ) : (
            <AlertCircle className="w-4 h-4 text-[#C24A2C] shrink-0" />
          )}
          <span>{state.text}</span>
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-2">
        <textarea
          rows={3}
          maxLength={DOUBT_MAX_LENGTH}
          disabled={!user || submitting}
          value={question}
          onChange={(e) => setQuestion(e.target.value)}
          placeholder={
            user
              ? `What didn't make sense in "${video.video_title}"? Mention the timestamp if you can.`
              : 'Sign in to ask your educator a doubt about this lesson.'
          }
          className="w-full p-3 text-xs sm:text-sm border-2 border-[#E3E5EC] rounded-[14px] outline-none focus:border-[#12A594] focus:ring-1 focus:ring-[#12A594] resize-none disabled:bg-[color:var(--page)] disabled:cursor-not-allowed"
        />
        <div className="flex items-center justify-between gap-2">
          <span className="text-[11px] text-[#6B7280]">
            {user ? `${question.trim().length}/${DOUBT_MAX_LENGTH} • up to 10 doubts a day` : ''}
          </span>
          {user ? (
            <button
              type="submit"
              disabled={submitting || question.trim().length < DOUBT_MIN_LENGTH}
              className="flex items-center gap-1.5 px-4 py-2 text-xs font-bold text-white bg-[#12A594] hover:bg-[#0E8576] disabled:bg-[#CBD5E1] rounded-[14px] transition-colors cursor-pointer disabled:cursor-not-allowed"
            >
              <Send className="w-3.5 h-3.5" />
              {submitting ? 'Sending...' : 'Send doubt'}
            </button>
          ) : (
            <button
              type="button"
              onClick={() => setAuthModalOpen(true)}
              className="px-4 py-2 text-xs font-bold text-[#12A594] bg-[#12A594]/10 hover:bg-[#12A594]/20 rounded-[14px] cursor-pointer"
            >
              Sign in to ask
            </button>
          )}
        </div>
      </form>

      {lessonDoubts.length > 0 && (
        <div className="pt-3 border-t border-[#E3E5EC] space-y-2">
          <p className="text-xs font-extrabold text-[#1E2233] flex items-center gap-1.5">
            <MessageCircle className="w-3.5 h-3.5 text-[#6B7280]" />
            Your doubts on this lesson
          </p>
          {lessonDoubts.map((d) => (
            <div
              key={d.id}
              className="p-3 rounded-[14px] bg-[color:var(--page)] border-2 border-[#E3E5EC] space-y-2 text-xs"
            >
              <div className="flex items-center justify-between gap-2">
                <DoubtStatusBadge status={d.status} unread={d.student_unread} />
                <span className="text-[11px] text-[#6B7280]">{new Date(d.created_at).toLocaleDateString()}</span>
              </div>
              <p className="text-[#1E2233] whitespace-pre-line">{d.question}</p>
              {d.answer && (
                <p className="p-2.5 rounded-xl bg-white border-2 border-[#BCE8DC] text-[#04342C] whitespace-pre-line">
                  <span className="font-extrabold">{d.answered_by || 'Educator'}: </span>
                  {d.answer}
                </p>
              )}
            </div>
          ))}
        </div>
      )}
    </section>
  );
};
