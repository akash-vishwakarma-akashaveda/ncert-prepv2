import React, { useEffect, useRef } from 'react';
import { Search, X, Video as VideoIcon, Book, Sparkles } from 'lucide-react';
import { useSearch } from '../../hooks/useSearch';
import { Video } from '../../types';
import { getClassTileStyle } from '../../data/colorTokens';

interface SearchResultsModalProps {
  isOpen: boolean;
  onClose: () => void;
  videos: Video[];
  onSelectVideo: (video: Video) => void;
}

export const SearchResultsModal: React.FC<SearchResultsModalProps> = ({
  isOpen,
  onClose,
  videos,
  onSelectVideo,
}) => {
  const { query, setQuery, results, isSearching } = useSearch(videos, { maxResults: 10 });
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (isOpen) {
      setTimeout(() => {
        inputRef.current?.focus();
      }, 50);
    } else {
      setQuery('');
    }
  }, [isOpen, setQuery]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        onClose();
      }
      if (e.key === '/' && !isOpen && document.activeElement?.tagName !== 'INPUT') {
        e.preventDefault();
        // Triggered outside if needed
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  // Students search only their own class, so the class badge is noise unless results span several classes.
  const multiClass = new Set(videos.map((v) => v.class_sort)).size > 1;
  const pick = (video: Video) => {
    onSelectVideo(video);
    onClose();
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-start justify-center pt-16 sm:pt-24 px-4 bg-[#1E2233]/60 backdrop-blur-xs animate-in fade-in duration-150"
      onMouseDown={onClose}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-label="Search lessons"
        onMouseDown={(e) => e.stopPropagation()}
        className="relative w-full max-w-2xl bg-white rounded-[24px] border-[3px] border-[color:var(--card-line)] shadow-[0_6px_0_var(--card-line),0_24px_60px_rgba(30,34,51,0.25)] overflow-hidden"
      >
        <div className="flex items-center gap-2 px-4 border-b-[3px] border-[color:var(--card-line)] focus-within:border-[color:var(--brand)] transition-colors">
          <Search className="w-5 h-5 text-[color:var(--brand)] shrink-0" strokeWidth={2.6} />
          <input
            ref={inputRef}
            type="search"
            aria-label="Search lessons, chapters or subjects"
            placeholder="Search a lesson or chapter…"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && results[0]) pick(results[0].item);
            }}
            className="flex-1 min-w-0 px-1 py-4 text-base font-semibold text-[#1E2233] bg-transparent outline-none placeholder:text-[#9AA1B4] [&::-webkit-search-cancel-button]:hidden"
          />
          {query && (
            <button
              onClick={() => {
                setQuery('');
                inputRef.current?.focus();
              }}
              aria-label="Clear search"
              className="p-1.5 text-[#9AA1B4] hover:text-[#1E2233] rounded-full cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>
          )}
          <button
            onClick={onClose}
            aria-label="Close search"
            className="shrink-0 h-8 min-w-8 px-2 flex items-center justify-center text-[11px] font-extrabold text-[#6B7280] bg-[color:var(--page)] hover:text-[#1E2233] rounded-[10px] border-2 border-[color:var(--card-line)] cursor-pointer"
          >
            <span className="hidden sm:inline">ESC</span>
            <X className="w-4 h-4 sm:hidden" />
          </button>
        </div>

        <div className="max-h-[60vh] overflow-y-auto p-2">
          {!isSearching && (
            <div className="px-6 py-10 text-center">
              <span className="mx-auto mb-3 w-12 h-12 rounded-[16px] bg-[color:var(--brand-soft)] text-[color:var(--brand)] flex items-center justify-center">
                <Sparkles className="w-6 h-6" />
              </span>
              <p className="font-display text-lg text-[#1E2233]">Find a lesson</p>
              <p className="mt-1 text-sm font-semibold text-[#6B7280]">Type at least 2 letters to search lesson titles, chapters and subjects.</p>
            </div>
          )}

          {isSearching && results.length === 0 && (
            <div className="px-6 py-10 text-center">
              <span className="mx-auto mb-3 w-12 h-12 rounded-[16px] bg-[#F1F3FB] text-[#9AA1B4] flex items-center justify-center">
                <Book className="w-6 h-6" />
              </span>
              <p className="font-display text-lg text-[#1E2233]">No lessons match &ldquo;{query.trim()}&rdquo;</p>
              <p className="mt-1 text-sm font-semibold text-[#6B7280]">Check the spelling, or try a chapter or subject name.</p>
            </div>
          )}

          {isSearching && results.length > 0 && (
            <div className="space-y-1">
              <p className="px-3 pt-1.5 pb-1 text-[11px] font-extrabold tracking-[0.08em] text-[#9AA1B4]">
                {results.length} {results.length === 1 ? 'LESSON' : 'LESSONS'} · PRESS ENTER TO OPEN THE FIRST
              </p>
              {results.map(({ item: video }) => {
                const style = getClassTileStyle(video.class_sort);
                return (
                  <button
                    key={video.youtube_id}
                    onClick={() => pick(video)}
                    className="w-full text-left p-3 rounded-[16px] border-2 border-transparent hover:bg-[color:var(--brand-soft)] hover:border-[color:var(--brand-line)] focus-visible:bg-[color:var(--brand-soft)] transition-colors flex items-center gap-3 cursor-pointer group"
                  >
                    {multiClass ? (
                      <span className="shrink-0 px-2 py-1 rounded-xl text-xs font-extrabold" style={{ backgroundColor: style.bg, color: style.text }}>
                        {video.class_display}
                      </span>
                    ) : (
                      <span className="shrink-0 w-9 h-9 rounded-[12px] bg-[color:var(--brand-soft)] text-[color:var(--brand)] flex items-center justify-center group-hover:bg-white">
                        <VideoIcon className="w-4 h-4" />
                      </span>
                    )}
                    <span className="flex-1 min-w-0">
                      <span className="block text-sm font-extrabold text-[#1E2233] group-hover:text-[color:var(--brand)] truncate">{video.video_title}</span>
                      <span className="block mt-0.5 text-xs font-semibold text-[#6B7280] truncate">
                        <span className="text-[#0C8F78]">{video.subject}</span> · {video.chapter_name}
                      </span>
                    </span>
                  </button>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
