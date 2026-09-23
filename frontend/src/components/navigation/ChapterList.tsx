import React from 'react';
import {
  Play,
  CheckCircle2,
  Bookmark,
  Clock,
  AlertCircle,
  FileText,
  Target,
  Lock,
  Sparkles,
} from 'lucide-react';
import { Video, ChapterGroup, NotesTarget } from '../../types';
import { useProgress } from '../../context/ProgressContext';
import { useAuth } from '../../context/AuthContext';
import { isLessonUnlocked } from '../../services/accessControl';
import { useDashboardConfig } from '../../hooks/useDashboardConfig';

interface ChapterListProps {
  chapters: ChapterGroup[];
  onSelectVideo: (video: Video) => void;
  onOpenNotes?: (target: NotesTarget) => void;
  // Chapter keys that have published notes; the notes button only shows for these.
  notesKeys?: Set<string>;
}

export const ChapterList: React.FC<ChapterListProps> = ({
  chapters,
  onSelectVideo,
  onOpenNotes,
  notesKeys,
}) => {
  const { user, setAuthModalOpen } = useAuth();
  const policy = useDashboardConfig().config?.policy;
  const { isCompleted, isFavorited, toggleCompleted, toggleFavorite } = useProgress();

  const formatDuration = (seconds?: number) => {
    if (!seconds) return '35 mins';
    const mins = Math.floor(seconds / 60);
    return `${mins} mins`;
  };

  return (
    <div className="space-y-6 pb-20">
      {chapters.map((chapter, chapterIndex) => (
        <div
          key={chapter.key}
          className="bg-white border-2 border-[#E3E5EC] rounded-[28px] p-5 sm:p-7 shadow-[0_4px_0_var(--card-line)] space-y-5 transition-all duration-300 hover:shadow-md"
        >
          {/* Chapter Header */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-[#E3E5EC] pb-4">
            <div className="flex items-center gap-3">
              <span className="font-mono text-xs font-extrabold text-[color:var(--brand)] bg-[#EEEDFE] px-3 py-1 rounded-[14px]">
                {chapter.chapter_id}
              </span>
              <div>
                <h3 className="text-base sm:text-lg font-extrabold text-[#1E2233] tracking-tight">
                  {chapter.chapter_name}
                </h3>
              </div>
            </div>
            <div className="flex items-center gap-2 self-start sm:self-auto">
              {onOpenNotes && notesKeys?.has(chapter.key) && (
                <button
                  onClick={() => {
                    if (!user && chapterIndex > 0) {
                      setAuthModalOpen(true);
                    } else {
                      onOpenNotes(chapter);
                    }
                  }}
                  className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-extrabold text-[color:var(--brand)] bg-[#EEEDFE] hover:bg-[#DDD6FE] rounded-full transition-colors cursor-pointer"
                  title={!user && chapterIndex > 0 ? 'Sign in to access notes' : 'View notes & cheat sheet'}
                >
                  <FileText className="w-3.5 h-3.5" />
                  <span>Notes & cheat sheet</span>
                  {!user && chapterIndex > 0 && <Lock className="w-3 h-3 text-[color:var(--brand)]" />}
                </button>
              )}
              <span className="text-xs font-bold text-[#6B7280] bg-[color:var(--page)] px-3 py-1 rounded-full">
                {chapter.videos.length} {chapter.videos.length === 1 ? 'lesson' : 'lessons'}
              </span>
            </div>
          </div>

          {chapter.videos.length === 0 && (
            <p className="text-xs text-[#6B7280] bg-[color:var(--page)] border border-dashed border-[#E3E5EC] rounded-[22px] p-4">
              Video lessons for this chapter are coming soon.
              {notesKeys?.has(chapter.key) && ' Notes are already available above.'}
            </p>
          )}

          {/* Video Lesson Cards under Chapter */}
          <div className="space-y-3.5">
            {chapter.videos.map((video, videoIndex) => {
              const completed = isCompleted(video.youtube_id);
              const favorited = isFavorited(video.youtube_id);
              const deactivated = !video.isActive;
              const unlocked = isLessonUnlocked(video, user, chapterIndex, videoIndex, policy);
              const isPreview = !user && unlocked;
              const isLocked = !unlocked;

              return (
                <div
                  key={video.youtube_id}
                  className={`p-4 sm:p-5 rounded-[22px] border transition-all duration-200 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 group ${
                    deactivated
                      ? 'bg-[#FFF6E2]/50 border-[#FFD97A] opacity-80'
                      : completed
                      ? 'bg-[#E7F7F1]/30 border-[#A9E6D3]/80 hover:border-[#A9E6D3]'
                      : isLocked
                      ? 'bg-slate-50/70 border-slate-200 hover:border-[color:var(--brand-line)]'
                      : 'bg-[#F8F9FD] border-[#E3E5EC] hover:bg-white hover:border-[color:var(--brand)]/50 hover:shadow-[0_4px_0_var(--card-line)]'
                  }`}
                >
                  <div className="flex-1 space-y-2">
                    <div className="flex items-center gap-2 flex-wrap">
                      <p className="text-sm sm:text-base font-extrabold text-[#1E2233] group-hover:text-[color:var(--brand)] transition-colors line-clamp-1">
                        {video.video_title}
                      </p>
                    </div>

                    {/* Metadata tags */}
                    <div className="flex items-center gap-2.5 text-xs text-[#6B7280] flex-wrap">
                      <span className="flex items-center gap-1.5 font-semibold">
                        <Clock className="w-3.5 h-3.5 text-[#6B7280]" />
                        <span>{formatDuration(video.duration_seconds)}</span>
                      </span>

                      <span className="text-slate-300">•</span>

                      <span className="text-[11px] font-extrabold text-[#12A594] bg-[#E1F5EE] px-2 py-0.5 rounded-md">
                        One-Shot Revision
                      </span>

                      {video.pyq_available && (
                        <span className="flex items-center gap-1 text-[11px] font-extrabold text-[color:var(--brand)] bg-[color:var(--brand-soft)] border border-[color:var(--brand-line)] px-2 py-0.5 rounded-md">
                          <Target className="w-3 h-3 text-[color:var(--brand)]" />
                          <span>PYQ Included</span>
                        </span>
                      )}

                      {/* Free Preview badge for unauthenticated visitor */}
                      {isPreview && (
                        <span className="flex items-center gap-1 text-[11px] font-extrabold text-[#0B7A67] bg-[#E7F7F1]/90 border border-[#A9E6D3] px-2 py-0.5 rounded-md">
                          <Sparkles className="w-3 h-3 text-[#0B7A67]" />
                          <span>Free Preview</span>
                        </span>
                      )}

                      {/* Locked badge for unauthenticated visitor */}
                      {isLocked && (
                        <span className="flex items-center gap-1 text-[11px] font-extrabold text-indigo-800 bg-[color:var(--brand-soft)] border border-[color:var(--brand-line)] px-2 py-0.5 rounded-md">
                          <Lock className="w-3 h-3 text-[color:var(--brand)]" />
                          <span>Sign In to Unlock</span>
                        </span>
                      )}

                      {completed && (
                        <span className="flex items-center gap-1 text-[11px] font-extrabold text-[#0B7A67] bg-[#E7F7F1]/90 px-2 py-0.5 rounded-md">
                          <CheckCircle2 className="w-3.5 h-3.5 text-[#0B7A67]" />
                          <span>Completed</span>
                        </span>
                      )}

                      {deactivated && (
                        <span className="flex items-center gap-1 text-[11px] font-extrabold text-[#8A5A14] bg-[#FFF1D6] px-2 py-0.5 rounded-md border border-[#FFD97A]">
                          <AlertCircle className="w-3.5 h-3.5 text-[#8A5A14]" />
                          <span>No longer available (Archived)</span>
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Actions Right Side */}
                  <div className="flex items-center gap-2 self-end sm:self-center shrink-0">
                    {/* Mark Completed Button (Gates for sign-in if guest) */}
                    <button
                      onClick={() => {
                        if (!user) {
                          setAuthModalOpen(true);
                        } else {
                          toggleCompleted(video.youtube_id);
                        }
                      }}
                      className={`p-2 rounded-[14px] border transition-all cursor-pointer ${
                        completed
                          ? 'bg-[#12A594] text-white border-[#12A594] shadow-[0_4px_0_var(--card-line)]'
                          : 'bg-white text-[#6B7280] border-[#E3E5EC] hover:text-[#12A594] hover:border-[#12A594]/40'
                      }`}
                      title={!user ? 'Sign in to track progress' : completed ? 'Mark as incomplete' : 'Mark lesson as completed'}
                      aria-label="Toggle completed"
                    >
                      <CheckCircle2 className="w-4 h-4" />
                    </button>

                    {/* Bookmark Favorite Button (Gates for sign-in if guest) */}
                    <button
                      onClick={() => {
                        if (!user) {
                          setAuthModalOpen(true);
                        } else {
                          toggleFavorite(video.youtube_id);
                        }
                      }}
                      className={`p-2 rounded-[14px] border transition-all cursor-pointer ${
                        favorited
                          ? 'bg-[#FFF1D6] text-[#8A5A14] border-[#FFD97A]'
                          : 'bg-white text-[#6B7280] border-[#E3E5EC] hover:text-[#C98A0E] hover:border-[#FFD97A]'
                      }`}
                      title={!user ? 'Sign in to save favorites' : favorited ? 'Remove from saved favorites' : 'Save to favorites'}
                      aria-label="Toggle favorite"
                    >
                      <Bookmark className={`w-4 h-4 ${favorited ? 'fill-amber-500 text-[#C98A0E]' : ''}`} />
                    </button>

                    {/* Start Video or Unlock Button */}
                    {deactivated ? (
                      <span className="px-4 py-2 text-xs font-bold text-[#6B7280] bg-slate-200/80 rounded-[14px] cursor-not-allowed">
                        Archived
                      </span>
                    ) : isLocked ? (
                      <button
                        onClick={() => setAuthModalOpen(true)}
                        className="flex items-center gap-1.5 px-3.5 py-2 text-xs font-extrabold text-[color:var(--brand)] bg-[#EEEDFE] hover:bg-[#DDD6FE] border border-[color:var(--brand-line)] rounded-[14px] transition-all cursor-pointer shadow-[0_4px_0_var(--card-line)] hover:scale-[1.02]"
                        title="Sign in or create free student account to watch"
                      >
                        <Lock className="w-3.5 h-3.5" />
                        <span>Unlock Free</span>
                      </button>
                    ) : (
                      <button
                        onClick={() => onSelectVideo(video)}
                        className="flex items-center gap-2 px-4 py-2 text-xs font-extrabold text-white btn-3d [--edge:var(--brand-edge)] bg-[color:var(--brand)] hover:bg-[color:var(--brand-hover)] rounded-[14px] shadow-[0_2px_10px_rgba(59,79,224,0.3)] transition-all cursor-pointer hover:scale-[1.02]"
                      >
                        <Play className="w-3.5 h-3.5 fill-white" />
                        <span>{isPreview ? 'Watch Preview' : 'Watch'}</span>
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      ))}
    </div>
  );
};
