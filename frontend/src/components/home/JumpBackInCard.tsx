import React from 'react';
import { Play, CheckCircle2, AlertCircle, ArrowRight, Sparkles, LayoutGrid } from 'lucide-react';
import { Video } from '../../types';

interface JumpBackInCardProps {
  lastWatchedVideo: Video | null;
  isCompleted: boolean;
  onSelectVideo: (video: Video) => void;
  onBrowse: () => void;
  className?: string;
}

// Static thumbnail image, not the YouTube Data API (SRS §4 constraint).
export const thumbnailUrl = (youtubeId: string) => `https://i.ytimg.com/vi/${youtubeId}/mqdefault.jpg`;

// SRS §3 homepage section 2: last_watched_video, or a first-time prompt that opens the Visual Grid.
export const JumpBackInCard: React.FC<JumpBackInCardProps> = ({
  lastWatchedVideo,
  isCompleted,
  onSelectVideo,
  onBrowse,
  className = '',
}) => {
  if (!lastWatchedVideo) {
    return (
      <section
        aria-labelledby="jump-back-in-title"
        className={`bento relative overflow-hidden p-6 sm:p-8 flex flex-col justify-between gap-6 ${className}`}
      >
        <div className="absolute inset-0 bg-mesh pointer-events-none" />
        <div className="relative space-y-3">
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold bg-white/80 border-2 border-[#E3E5EC] text-[color:var(--brand)]">
            <Sparkles className="w-3.5 h-3.5" />
            Jump back in
          </span>
          <h2 id="jump-back-in-title" className="text-2xl sm:text-3xl font-bold tracking-tight text-[#1E2233] text-balance">
            Start your first lesson!
          </h2>
          <p className="text-sm text-[#6B7280] max-w-md">
            Nothing watched yet. Pick a subject and your progress will show up right here.
          </p>
        </div>
        <button
          onClick={onBrowse}
          className="relative self-start flex items-center gap-2 px-5 py-3 rounded-[22px] text-sm font-bold text-white btn-3d [--edge:var(--brand-edge)] bg-[color:var(--brand)] hover:bg-[color:var(--brand-hover)] shadow-[0_8px_20px_-8px_rgba(59,79,224,0.6)] transition-colors cursor-pointer"
        >
          <LayoutGrid className="w-4 h-4" />
          Browse lessons
        </button>
      </section>
    );
  }

  const video = lastWatchedVideo;
  const isDeactivated = !video.isActive;

  return (
    <section
      aria-labelledby="jump-back-in-title"
      className={`bento relative overflow-hidden p-5 sm:p-6 flex flex-col gap-5 ${className}`}
    >
      <p className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-[#12A594]">
        <Play className="w-3.5 h-3.5 fill-[#12A594]" />
        Jump back in
      </p>

      <div className="flex flex-col sm:flex-row gap-5 flex-1">
        <button
          onClick={() => !isDeactivated && onSelectVideo(video)}
          disabled={isDeactivated}
          aria-label={isDeactivated ? undefined : `Play ${video.video_title}`}
          className="relative sm:w-56 lg:w-64 aspect-video rounded-[22px] overflow-hidden bg-[#1E2233] shrink-0 group cursor-pointer disabled:cursor-default"
        >
          <img
            src={thumbnailUrl(video.youtube_id)}
            alt=""
            loading="lazy"
            className={`w-full h-full object-cover transition-transform duration-300 group-hover:scale-105 ${isDeactivated ? 'grayscale opacity-60' : ''}`}
          />
          {!isDeactivated && (
            <span className="absolute inset-0 flex items-center justify-center bg-black/15 group-hover:bg-black/25 transition-colors">
              <span className="w-12 h-12 rounded-full bg-white/95 flex items-center justify-center shadow-lg">
                <Play className="w-5 h-5 text-[color:var(--brand)] fill-[color:var(--brand)] ml-0.5" />
              </span>
            </span>
          )}
        </button>

        <div className="flex-1 min-w-0 flex flex-col justify-between gap-4">
          <div className="space-y-2">
            <div className="flex flex-wrap items-center gap-2 text-xs">
              <span className="px-2 py-0.5 rounded-md font-bold bg-[#EEEDFE] text-[#26215C]">{video.class_display}</span>
              <span className="font-bold text-[#12A594]">{video.subject}</span>
              {isCompleted && (
                <span className="inline-flex items-center gap-1 font-semibold text-[#04342C] bg-[#E1F5EE] px-2 py-0.5 rounded-md">
                  <CheckCircle2 className="w-3 h-3 text-[#12A594]" />
                  Completed
                </span>
              )}
              {isDeactivated && (
                <span className="inline-flex items-center gap-1 font-semibold text-[#8A5A14] bg-[#FFF6E2] border border-[#FFD97A] px-2 py-0.5 rounded-md">
                  <AlertCircle className="w-3 h-3 text-[#C98A0E]" />
                  No longer available
                </span>
              )}
            </div>
            <h2 id="jump-back-in-title" className="text-xl sm:text-2xl font-bold tracking-tight text-[#1E2233] line-clamp-2">
              {video.chapter_name}
            </h2>
            <p className="text-sm text-[#6B7280] line-clamp-2">{video.video_title}</p>
          </div>

          {isDeactivated ? (
            <button
              onClick={onBrowse}
              className="self-start px-4 py-2.5 text-sm font-bold text-[color:var(--brand)] bg-[#EEEDFE] rounded-[22px] cursor-pointer"
            >
              Find another lesson
            </button>
          ) : (
            <button
              onClick={() => onSelectVideo(video)}
              className="self-start flex items-center gap-2 px-5 py-3 rounded-[22px] text-sm font-bold text-white bg-[#12A594] hover:bg-[#0E8577] shadow-[0_8px_20px_-8px_rgba(18,165,148,0.6)] transition-colors cursor-pointer"
            >
              <Play className="w-4 h-4 fill-white" />
              {isCompleted ? 'Watch again' : 'Continue'}
              <ArrowRight className="w-4 h-4" />
            </button>
          )}
        </div>
      </div>
    </section>
  );
};
