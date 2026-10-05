import React from 'react';
import { FileText, Lock } from 'lucide-react';
import { Video, ChapterGroup, NotesTarget } from '../../types';
import { LessonCard } from './LessonCard';
import { useProgress } from '../../context/ProgressContext';
import { useAuth } from '../../context/AuthContext';
import { isLessonUnlocked } from '../../services/accessControl';
import { chapterNumbers } from '../../student/ui';
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

  return (
    <div className="space-y-6 pb-20">
      {chapters.map((chapter, chapterIndex, all) => (
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
                  title={!user && chapterIndex > 0 ? 'Sign in to access notes' : 'View notes'}
                >
                  <FileText className="w-3.5 h-3.5" />
                  <span>Notes</span>
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
          <ul className="grid grid-cols-1 min-[420px]:grid-cols-2 lg:grid-cols-3 gap-3.5">
            {chapter.videos.map((video, videoIndex) => {
              const deactivated = !video.isActive;
              // Per-book position: a subject with two books has two "Chapter 1"s, and both are free previews.
              const unlocked = isLessonUnlocked(video, user, chapterNumbers(all)[chapterIndex] - 1, videoIndex, policy);
              const signIn = () => setAuthModalOpen(true);
              return (
                <li key={video.youtube_id}>
                  <LessonCard
                    video={video}
                    number={videoIndex + 1}
                    onOpen={unlocked ? () => onSelectVideo(video) : signIn}
                    locked={!unlocked}
                    preview={!user && unlocked}
                    archived={deactivated}
                    completed={isCompleted(video.youtube_id)}
                    saved={isFavorited(video.youtube_id)}
                    onToggleComplete={user ? () => toggleCompleted(video.youtube_id) : signIn}
                    onToggleSave={user ? () => toggleFavorite(video.youtube_id) : signIn}
                  />
                </li>
              );
            })}
          </ul>
        </div>
      ))}
    </div>
  );
};
