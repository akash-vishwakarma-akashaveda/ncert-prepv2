import React from 'react';
import { Link } from 'react-router-dom';
import { AlertCircle, Bookmark, Check, CheckCircle2, Clock, Gift, Lock, Play, Target } from 'lucide-react';
import { Video } from '../../types';
import { youtubeThumbnail } from '../../services/youtubeApi';

const minutes = (seconds?: number) => (seconds ? `${Math.max(1, Math.round(seconds / 60))} min` : '');

/**
 * One lesson as a card: thumbnail on top, then lecture number, title and tags. Used by the subject page,
 * the demo explorer and the lesson page outline. The card opens the lesson through `to` (a link) or `onOpen`;
 * locked lessons call `onOpen` too, so the caller can ask the visitor to sign in.
 */
export const LessonCard: React.FC<{
  video: Video;
  number: number;
  to?: string;
  onOpen?: () => void;
  completed?: boolean;
  saved?: boolean;
  onToggleSave?: () => void;
  onToggleComplete?: () => void;
  locked?: boolean;
  preview?: boolean;
  archived?: boolean;
  current?: boolean;
  /** Smaller text and no tags, for narrow sidebars. */
  compact?: boolean;
}> = ({ video, number, to, onOpen, completed, saved, onToggleSave, onToggleComplete, locked, preview, archived, current, compact }) => {
  const duration = minutes(video.duration_seconds);
  const tone = current
    ? 'border-[color:var(--brand)] shadow-[0_4px_0_var(--brand-line)]'
    : archived
      ? 'border-[#FFD97A] opacity-80'
      : completed
        ? 'border-[#A9E6D3] shadow-[0_4px_0_#CDEFE4]'
        : 'border-[color:var(--card-line)] shadow-[0_4px_0_var(--card-line)] hover:border-[#D7DCEF]';

  const body = (
    <>
      <span className="relative block aspect-video overflow-hidden bg-[#F1F3FB]">
        <img
          src={youtubeThumbnail(video.youtube_id)}
          alt=""
          loading="lazy"
          className={`w-full h-full object-cover transition-transform duration-300 group-hover:scale-105 ${locked ? 'blur-[2px] brightness-75' : ''}`}
        />
        <span
          className={`absolute left-2 top-2 h-6 min-w-6 px-1.5 rounded-full flex items-center justify-center text-[11px] font-extrabold ${
            completed ? 'bg-[#12A594] text-white' : 'bg-black/60 text-white'
          }`}
        >
          {completed ? <Check className="w-3.5 h-3.5" strokeWidth={3.5} aria-label="Completed" /> : number}
        </span>
        {duration && (
          <span className="absolute right-2 bottom-2 flex items-center gap-1 rounded-full bg-black/60 px-2 py-0.5 text-[10.5px] font-bold text-white">
            <Clock className="w-3 h-3" /> {duration}
          </span>
        )}
        <span className="absolute inset-0 flex items-center justify-center" aria-hidden="true">
          {locked ? (
            <span className="w-10 h-10 rounded-full bg-white/90 flex items-center justify-center text-[color:var(--brand)]">
              <Lock className="w-4 h-4" />
            </span>
          ) : (
            <span
              className={`w-10 h-10 rounded-full bg-[color:var(--brand)] text-white flex items-center justify-center transition-[opacity,transform] duration-200 ${
                current ? 'opacity-100' : 'opacity-0 scale-75 group-hover:opacity-100 group-hover:scale-100'
              }`}
            >
              <Play className="w-4 h-4 fill-white" />
            </span>
          )}
        </span>
      </span>
      <span className={`flex flex-col gap-1 ${compact ? 'p-2.5' : 'p-3'}`}>
        <span className="text-[10.5px] font-extrabold tracking-[0.06em] text-[#9AA1B4]">
          {current ? 'NOW PLAYING' : `LECTURE ${number}`}
          {locked && ' · SIGN IN TO WATCH'}
        </span>
        <span
          className={`font-extrabold leading-snug line-clamp-2 group-hover:text-[color:var(--brand)] ${
            current ? 'text-[color:var(--brand)]' : 'text-[#1E2233]'
          } ${compact ? 'text-[12.5px]' : 'text-[13.5px]'}`}
        >
          {video.video_title}
        </span>
        {!compact && (video.pyq_available || preview || archived) && (
          <span className="flex flex-wrap gap-1.5 pt-0.5">
            {video.pyq_available && (
              <span className="inline-flex items-center gap-1 rounded-md bg-[color:var(--brand-soft)] px-1.5 py-0.5 text-[10.5px] font-extrabold text-[color:var(--brand)]">
                <Target className="w-3 h-3" /> PYQs
              </span>
            )}
            {preview && (
              <span className="inline-flex items-center gap-1 rounded-md bg-[#E7F7F1] px-1.5 py-0.5 text-[10.5px] font-extrabold text-[#0B7A67]">
                <Gift className="w-3 h-3" /> Free preview
              </span>
            )}
            {archived && (
              <span className="inline-flex items-center gap-1 rounded-md bg-[#FFF1D6] px-1.5 py-0.5 text-[10.5px] font-extrabold text-[#8A5A14]">
                <AlertCircle className="w-3 h-3" /> Archived
              </span>
            )}
          </span>
        )}
      </span>
    </>
  );

  const opener = 'group flex flex-col h-full text-left cursor-pointer';
  return (
    <div className={`relative rounded-[18px] border-2 bg-white overflow-hidden transition-[transform,border-color] duration-200 hover:-translate-y-0.5 ${tone}`}>
      {archived ? (
        <div className="group flex flex-col h-full cursor-not-allowed">{body}</div>
      ) : to && !locked ? (
        <Link to={to} aria-current={current ? 'page' : undefined} className={opener}>
          {body}
        </Link>
      ) : (
        <button type="button" onClick={onOpen} className={`${opener} w-full`}>
          {body}
        </button>
      )}
      {(onToggleSave || onToggleComplete) && (
        <span className="absolute right-2 top-2 flex gap-1.5">
          {onToggleComplete && (
            <button
              type="button"
              onClick={onToggleComplete}
              aria-label={completed ? 'Mark as not done' : 'Mark as done'}
              aria-pressed={completed}
              className={`w-7 h-7 rounded-full flex items-center justify-center cursor-pointer ${
                completed ? 'bg-[#12A594] text-white' : 'bg-white/90 text-[#6B7280] hover:text-[#12A594]'
              }`}
            >
              <CheckCircle2 className="w-4 h-4" />
            </button>
          )}
          {onToggleSave && (
            <button
              type="button"
              onClick={onToggleSave}
              aria-label={saved ? 'Remove from saved' : 'Save lesson'}
              aria-pressed={saved}
              className="w-7 h-7 rounded-full bg-white/90 flex items-center justify-center cursor-pointer hover:bg-white"
            >
              <Bookmark className={`w-4 h-4 ${saved ? 'fill-[color:var(--brand)] text-[color:var(--brand)]' : 'text-[#6B7280]'}`} />
            </button>
          )}
        </span>
      )}
    </div>
  );
};
