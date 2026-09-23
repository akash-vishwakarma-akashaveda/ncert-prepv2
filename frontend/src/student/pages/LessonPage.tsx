import React, { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import {
  CheckCircle2,
  Circle,
  Bookmark,
  ChevronDown,
  ChevronRight,
  ChevronLeft,
  FileText,
  PlayCircle,
  Video as VideoIcon,
  Lock,
  Sparkles,
} from 'lucide-react';
import { useProgress } from '../../context/ProgressContext';
import { useCatalogContext } from '../../context/CatalogContext';
import { useAuth } from '../../context/AuthContext';
import { isLessonUnlocked } from '../../services/accessControl';
import { useDashboardConfig } from '../../hooks/useDashboardConfig';
import { ChapterNotesContent, useChapterNotes } from '../../components/app/RevisionNotesModal';
import { AskDoubtForm } from '../../components/player/AskDoubtForm';
import { FeedbackForm } from '../../components/player/FeedbackForm';
import { LessonPlayer } from '../LessonPlayer';
import { EmptyState, btnAccent, btnPrimary, btnSecondary, btnTeal, card, chapterNumbers, formatDuration, lessonPath, subjectPath } from '../ui';

type TabId = 'overview' | 'notes' | 'doubts' | 'feedback';

// Visitors use /watch/:videoId (publicMode), signed-in students /app/lesson/:videoId.
export const LessonPage: React.FC<{ publicMode?: boolean }> = ({ publicMode = false }) => {
  const { videoId = '' } = useParams();
  const navigate = useNavigate();
  const { user, setAuthModalOpen } = useAuth();
  const { videoMap, getSubjectsForClass, loading } = useCatalogContext();
  const { isCompleted, isFavorited, toggleCompleted, toggleFavorite, recordVideoWatched } = useProgress();
  const [tab, setTab] = useState<TabId>('overview');
  const [celebrate, setCelebrate] = useState(false);
  useEffect(() => {
    if (!celebrate) return;
    const t = setTimeout(() => setCelebrate(false), 2600);
    return () => clearTimeout(t);
  }, [celebrate]);
  // Completing (never un-completing) a lesson shows the +50 XP toast.
  const complete = (id: string) => {
    if (isCompleted(id)) return toggleCompleted(id);
    toggleCompleted(id);
    setCelebrate(true);
  };

  const video = videoMap.get(videoId);
  const policy = useDashboardConfig().config?.policy;
  const topics = useMemo(
    () =>
      (video?.timestamps || '')
        .split('\n')
        .map((line) => line.match(/^\s*(\d{1,2}:\d{2}(?::\d{2})?)\s*[-–]\s*(.+)$/))
        .filter((m): m is RegExpMatchArray => Boolean(m))
        .map((m) => ({ time: m[1], text: m[2].trim() })),
    [video?.timestamps]
  );
  const pathFor = (id: string) => (publicMode ? `/watch/${encodeURIComponent(id)}` : lessonPath(id));

  useEffect(() => {
    if (video?.isActive) recordVideoWatched(video.youtube_id);
    setTab('overview');
  }, [video?.youtube_id]); // eslint-disable-line react-hooks/exhaustive-deps

  const subject = useMemo(
    () => (video ? getSubjectsForClass(video.class_sort).find((s) => s.name === video.subject) : undefined),
    [video, getSubjectsForClass]
  );
  const ordered = subject?.chapters.flatMap((c) => c.videos) || [];
  const outlineNumbers = chapterNumbers(subject?.chapters || []);
  const multiBook = new Set(subject?.chapters.map((c) => c.textbook)).size > 1;
  const index = ordered.findIndex((v) => v.youtube_id === videoId);
  const next = index >= 0 ? ordered[index + 1] : undefined;

  // Outline chapters are collapsible; the chapter holding the current lesson always opens.
  const currentChapterIndex = subject?.chapters.findIndex((c) => c.videos.some((v) => v.youtube_id === videoId)) ?? -1;
  const currentChapter = currentChapterIndex >= 0 ? subject?.chapters[currentChapterIndex] : undefined;
  const currentChapterKey = currentChapter?.key;
  const currentVideoIndexInChapter = currentChapter?.videos.findIndex((v) => v.youtube_id === videoId) ?? -1;

  // Access control: signed-in users unlock everything; visitors get what the admin's access policy allows.
  const isUnlocked = video
    ? isLessonUnlocked(
        video,
        user,
        currentChapterIndex >= 0 ? currentChapterIndex : undefined,
        currentVideoIndexInChapter >= 0 ? currentVideoIndexInChapter : undefined,
        policy
      )
    : false;
  const isFreePreview = !user && isUnlocked;

  const [openChapters, setOpenChapters] = useState<Set<string>>(new Set());
  useEffect(() => {
    if (currentChapterKey) setOpenChapters((prev) => (prev.has(currentChapterKey) ? prev : new Set(prev).add(currentChapterKey)));
  }, [currentChapterKey]);
  const toggleChapter = (key: string) =>
    setOpenChapters((prev) => {
      const nextSet = new Set(prev);
      if (nextSet.has(key)) nextSet.delete(key);
      else nextSet.add(key);
      return nextSet;
    });

  const notesTarget = video || { class_sort: '', subject: '', chapter_id: '', chapter_name: '' };
  const { notes, loading: notesLoading } = useChapterNotes(notesTarget, Boolean(video) && tab === 'notes');

  if (!video || !video.isActive) {
    return (
      <EmptyState
        icon={<VideoIcon className="w-5 h-5" />}
        title={loading ? 'Loading lesson…' : 'This lesson is not available'}
        body={loading ? undefined : 'It may have been removed. Pick another lesson from your subjects.'}
        action={!loading && <Link to={publicMode ? '/browse' : '/app/subjects'} className={btnPrimary}>Browse lessons</Link>}
      />
    );
  }

  const completed = isCompleted(video.youtube_id);
  const saved = isFavorited(video.youtube_id);
  const tabs: { id: TabId; label: string }[] = [
    { id: 'overview', label: 'Overview' },
    { id: 'notes', label: 'Notes & Cheat Sheet' },
    { id: 'doubts', label: 'Ask a doubt' },
    { id: 'feedback', label: 'Feedback' },
  ];

  return (
    <div className="space-y-4 pb-16">
      <Link
        to={publicMode ? '/browse' : subjectPath(video.subject)}
        className="inline-flex max-w-full items-center gap-1 px-4 py-2 rounded-full bg-white border-2 border-[#E3E5EC] text-xs font-extrabold text-[#6B7280] hover:text-[#1E2233]"
      >
        <ChevronLeft className="w-4 h-4 shrink-0" />
        <span className="truncate">{publicMode ? 'Back to syllabus' : `Back to ${video.class_display} ${video.subject}`}</span>
      </Link>

      {/* Free Preview Banner for Visitors */}
      {isFreePreview && (
        <div className="rounded-[22px] bg-[#E7F7F1] border-[3px] border-[#A9E6D3] p-3.5 sm:p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-[13px]">
          <div className="flex items-center gap-3">
            <span className="w-9 h-9 rounded-[12px] bg-[#12A594] text-white flex items-center justify-center shrink-0">
              <Sparkles className="w-4 h-4" />
            </span>
            <div className="font-semibold">
              <span className="font-extrabold text-[#0B7A67]">Free preview: </span>
              <span className="text-[#4B5168]">
                You are viewing the free preview lesson for {video.subject}. Sign in to unlock all {ordered.length} lessons and formula cheat sheets!
              </span>
            </div>
          </div>
          <button onClick={() => setAuthModalOpen(true)} className={`${btnPrimary} shrink-0 self-start sm:self-auto`}>
            Sign in free
          </button>
        </div>
      )}

      <div className="grid grid-cols-1 xl:grid-cols-[minmax(0,1fr)_340px] gap-6">
        <div className="min-w-0 space-y-5">
          {/* Main Video Screen: Player if Unlocked, or Member Lock Screen if Visitor on Locked Video */}
          {isUnlocked ? (
            <LessonPlayer
              youtubeId={video.youtube_id}
              title={video.video_title}
              onEnded={() => !isCompleted(video.youtube_id) && complete(video.youtube_id)}
            />
          ) : (
            <div className="relative aspect-video rounded-[26px] overflow-hidden bg-[#12203A] border-[3px] border-[#1E2233] shadow-[0_7px_0_#1E2233] text-white flex flex-col items-center justify-center p-6 sm:p-10 text-center">
              <div className="w-16 h-16 rounded-full bg-[#FFC53D] border-4 border-white flex items-center justify-center text-[#1E2233] mb-4 animate-bob">
                <Lock className="w-7 h-7" strokeWidth={2.4} />
              </div>
              <span className="text-[11px] font-extrabold tracking-[0.1em] text-[#FFD97A] mb-2">FREE ACCOUNT REQUIRED</span>
              <h2 className="text-xl sm:text-2xl max-w-lg text-white">
                {video.video_title}
              </h2>
              <p className="mt-2 text-xs sm:text-sm font-semibold text-white/75 max-w-md">
                Full chapter revision, formula cheat sheets, PYQs, and educator doubts require a free student account. It takes 10 seconds to sign in!
              </p>
              <div className="mt-6 flex flex-wrap items-center justify-center gap-3">
                <button onClick={() => setAuthModalOpen(true)} className={btnAccent}>
                  Sign in free
                </button>
                <Link to="/browse" className="px-5 py-2.5 rounded-2xl text-sm font-extrabold text-white bg-white/10 hover:bg-white/20 border-2 border-white/30">
                  Back to syllabus
                </Link>
              </div>
            </div>
          )}

          <div className="flex flex-col gap-4">
            <div className="min-w-0">
              <p className="text-[10.5px] font-extrabold tracking-[0.1em] text-[#6B7280]">
                {currentChapter ? `CHAPTER ${outlineNumbers[currentChapterIndex]} · ` : ''}
                {video.subject.toUpperCase()}
                {formatDuration(video.duration_seconds) && ` · ${formatDuration(video.duration_seconds).toUpperCase()}`}
              </p>
              <h1 className="mt-1 text-2xl sm:text-[28px] leading-tight">{video.video_title}</h1>
              <p className="mt-1 text-sm font-semibold text-[#6B7280]">
                {video.class_display} · {video.textbook ? `${video.textbook} · ` : ''}{video.chapter_name}
              </p>
            </div>
            <div className="flex flex-wrap items-center gap-2.5">
              <button
                onClick={() => {
                  if (!user) {
                    setAuthModalOpen(true);
                  } else {
                    toggleFavorite(video.youtube_id);
                  }
                }}
                aria-pressed={saved}
                className={btnSecondary}
                title={!user ? 'Sign in to save favorites' : saved ? 'Remove from saved' : 'Save to favorites'}
              >
                <Bookmark className={`w-4 h-4 ${saved ? 'fill-[color:var(--brand)] text-[color:var(--brand)]' : ''}`} />
                {saved ? 'Saved' : 'Save'}
              </button>
              <button
                onClick={() => {
                  if (!user) {
                    setAuthModalOpen(true);
                  } else {
                    complete(video.youtube_id);
                  }
                }}
                aria-pressed={completed}
                className={completed ? btnTeal : btnAccent}
                title={!user ? 'Sign in to track progress' : completed ? 'Completed' : 'Mark complete'}
              >
                <CheckCircle2 className="w-4 h-4" />
                {completed ? 'Completed' : 'Mark complete'}
              </button>
              {next && (
                <button onClick={() => navigate(pathFor(next.youtube_id))} className={`${btnPrimary} sm:ml-auto`}>
                  Next lesson <ChevronRight className="w-4 h-4" />
                </button>
              )}
            </div>
          </div>

          <div className={card}>
            <div role="tablist" aria-label="Lesson sections" className="m-3 mb-0 flex gap-1.5 p-1.5 rounded-2xl bg-[color:var(--page)] border-2 border-[#E3E5EC] overflow-x-auto">
              {tabs.map((t) => (
                <button
                  key={t.id}
                  role="tab"
                  aria-selected={tab === t.id}
                  onClick={() => setTab(t.id)}
                  className={`flex-1 px-3 py-2 rounded-xl text-[12.5px] font-extrabold whitespace-nowrap cursor-pointer ${
                    tab === t.id ? 'bg-white text-[color:var(--brand)] shadow-[0_2px_0_#E3E5EC]' : 'text-[#6B7280] hover:text-[#1E2233]'
                  }`}
                >
                  {t.label}
                </button>
              ))}
            </div>
            <div role="tabpanel" className="p-4 sm:p-5 text-sm font-semibold">
              {tab === 'overview' && (
                <div className="space-y-4">
                  {topics.length > 0 && (
                    <div className="rounded-[20px] bg-[#F7F8FC] border-2 border-[color:var(--card-line)] p-4 sm:p-5 space-y-2.5">
                      <div className="flex items-center gap-2.5">
                        <span className="w-7 h-7 rounded-[9px] bg-[#FFC53D] flex items-center justify-center font-extrabold text-[#1E2233]">!</span>
                        <h3 className="text-base">What you'll learn</h3>
                      </div>
                      <ol className="space-y-2">
                        {topics.map((t, i) => (
                          <li key={i} className="flex gap-2.5 items-start">
                            <span className="shrink-0 mt-0.5 font-mono text-[11px] font-bold text-[#0B7A67] bg-[#E7F7F1] rounded-md px-1.5 py-0.5">{t.time}</span>
                            <span className="text-[13.5px] leading-relaxed text-[#4B5168]">{t.text}</span>
                          </li>
                        ))}
                      </ol>
                    </div>
                  )}
                  <dl className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {[
                      ['Class', video.class_display],
                      ['Subject', video.subject],
                      ['Book', video.textbook || '—'],
                      ['Chapter', `${video.chapter_id} · ${video.chapter_name}`],
                    ].map(([k, val]) => (
                      <div key={k} className="rounded-2xl bg-[#F7F8FC] border-2 border-[color:var(--card-line)] px-4 py-3">
                        <dt className="text-[10.5px] font-extrabold tracking-[0.08em] text-[#9AA1B4]">{k.toUpperCase()}</dt>
                        <dd className="font-extrabold">{val}</dd>
                      </div>
                    ))}
                  </dl>
                  {video.pdf_url && (
                    <a href={video.pdf_url} target="_blank" rel="noopener noreferrer" className={`${btnSecondary} w-full sm:w-auto`}>
                      <FileText className="w-4 h-4 text-[#E0603F]" /> Read this chapter in the NCERT textbook (PDF)
                    </a>
                  )}
                  <p className="text-xs text-[#6B7280]">Plays without recommendations or comments. Finishing the video marks it complete.</p>
                </div>
              )}
              {tab === 'notes' && (
                <div className="space-y-5">
                  {!user && !(isUnlocked && policy?.allowGuestNotes) ? (
                    <div className="p-6 text-center bg-[color:var(--brand-soft)] border-[3px] border-[color:var(--brand-line)] rounded-[22px] space-y-3">
                      <Lock className="w-8 h-8 text-[color:var(--brand)] mx-auto" />
                      <h3 className="text-lg text-[#1E2233]">Revision Notes & Formula Cheat Sheets</h3>
                      <p className="text-xs text-[#6B7280] max-w-sm mx-auto">
                        Sign in to access comprehensive formula cheat sheets, definitions, and exam notes for this chapter.
                      </p>
                      <button onClick={() => setAuthModalOpen(true)} className={btnPrimary}>
                        Sign in free to view notes
                      </button>
                    </div>
                  ) : (
                    <ChapterNotesContent notes={notes} loading={notesLoading} />
                  )}
                </div>
              )}
              {tab === 'doubts' && (
                <div>
                  {!user ? (
                    <div className="p-6 text-center bg-[color:var(--brand-soft)] border-[3px] border-[color:var(--brand-line)] rounded-[22px] space-y-3">
                      <Lock className="w-8 h-8 text-[color:var(--brand)] mx-auto" />
                      <h3 className="text-lg text-[#1E2233]">Ask Educator Doubts</h3>
                      <p className="text-xs text-[#6B7280] max-w-sm mx-auto">
                        Stuck on a concept in this video? Sign in to ask doubts and get personal explanations from verified educators.
                      </p>
                      <button onClick={() => setAuthModalOpen(true)} className={btnPrimary}>
                        Sign in free to ask doubts
                      </button>
                    </div>
                  ) : (
                    <AskDoubtForm video={video} />
                  )}
                </div>
              )}
              {tab === 'feedback' && <FeedbackForm youtubeId={video.youtube_id} videoTitle={video.video_title} />}
            </div>
          </div>
        </div>

        <aside className="self-start overflow-hidden xl:sticky xl:top-24 rounded-[24px] bg-[#E7F7F1] border-[3px] border-[#A9E6D3]">
          <div className="px-4 pt-4 pb-3">
            <h3 className="text-[17px]">{video.subject} lessons</h3>
            <p className="text-xs font-bold text-[#0B7A67]">
              {ordered.filter((v) => isCompleted(v.youtube_id)).length} of {ordered.length} lessons completed
            </p>
          </div>
          <ol className="max-h-[70vh] overflow-y-auto px-2.5 pb-2.5 space-y-1.5">
            {subject?.chapters.map((chapter, ci) => {
              const bookHeading =
                multiBook && chapter.textbook !== subject.chapters[ci - 1]?.textbook ? (
                  <p className="px-1.5 pt-1.5 text-[10.5px] font-extrabold tracking-[0.08em] text-[#0B7A67]">{(chapter.textbook || 'Other').toUpperCase()}</p>
                ) : null;
              const open = openChapters.has(chapter.key);
              const done = chapter.videos.filter((v) => isCompleted(v.youtube_id)).length;
              const hasCurrent = chapter.key === currentChapterKey;
              const panelId = `outline-${chapter.key}`;
              return (
                <React.Fragment key={chapter.key}>
                {bookHeading}
                <li className="rounded-2xl bg-white border-2 border-[#CDEFE4] overflow-hidden">
                  <button
                    type="button"
                    onClick={() => toggleChapter(chapter.key)}
                    aria-expanded={open}
                    aria-controls={panelId}
                    className={`w-full flex items-start gap-3 px-3 py-2.5 text-left text-sm cursor-pointer hover:bg-[#F7F8FC] ${
                      hasCurrent ? 'text-[color:var(--brand)]' : 'text-[#1E2233]'
                    }`}
                  >
                    <span className="w-6 h-6 shrink-0 rounded-full bg-[#F1F3FB] text-[11px] font-extrabold text-[#6B7280] flex items-center justify-center">{outlineNumbers[ci]}</span>
                    <span className="flex-1 min-w-0">
                      <span className="block font-extrabold">{chapter.chapter_name}</span>
                      <span className="block text-[11px] font-bold text-[#6B7280]">
                        {chapter.videos.length
                          ? `${done}/${chapter.videos.length} ${chapter.videos.length === 1 ? 'lecture' : 'lectures'}`
                          : 'Coming soon'}
                      </span>
                    </span>
                    {chapter.videos.length > 0 && done === chapter.videos.length ? (
                      <CheckCircle2 className="w-4 h-4 mt-0.5 text-[#12A594] shrink-0" aria-label="Chapter completed" />
                    ) : null}
                    <ChevronDown
                      className={`w-4 h-4 mt-0.5 text-[#6B7280] shrink-0 transition-transform ${open ? 'rotate-180' : ''}`}
                      aria-hidden="true"
                    />
                  </button>

                  {open && chapter.videos.length > 0 && (
                    <ul id={panelId} className="pb-2">
                      {chapter.videos.map((v, li) => {
                        const current = v.youtube_id === video.youtube_id;
                        const isVidUnlocked = isLessonUnlocked(v, user, ci, li, policy);

                        return (
                          <li key={v.youtube_id}>
                            <Link
                              to={pathFor(v.youtube_id)}
                              aria-current={current ? 'page' : undefined}
                              className={`flex items-start gap-3 pl-12 pr-3 py-2 text-[13px] font-bold ${
                                current ? 'bg-[color:var(--brand-soft)] text-[color:var(--brand)]' : 'text-[#4B5168] hover:bg-[#F7F8FC]'
                              }`}
                            >
                              {current ? (
                                <PlayCircle className="w-4 h-4 mt-0.5 text-[color:var(--brand)] shrink-0" aria-label="Now playing" />
                              ) : isCompleted(v.youtube_id) ? (
                                <CheckCircle2 className="w-4 h-4 mt-0.5 text-[#12A594] shrink-0" aria-label="Completed" />
                              ) : !isVidUnlocked ? (
                                <Lock className="w-3.5 h-3.5 mt-0.5 text-[#9AA1B4] shrink-0" aria-label="Locked" />
                              ) : (
                                <Circle className="w-4 h-4 mt-0.5 text-[#D1D5DB] shrink-0" aria-label="Not started" />
                              )}
                              <span className="flex-1 min-w-0">
                                <span className="block text-[11px] font-extrabold text-[#9AA1B4]">
                                  Lecture {li + 1} {!isVidUnlocked && '· Sign in to watch'}
                                </span>
                                <span className="block">{v.video_title}</span>
                              </span>
                              <span className="text-xs font-normal text-[#6B7280] shrink-0">{formatDuration(v.duration_seconds)}</span>
                            </Link>
                          </li>
                        );
                      })}
                    </ul>
                  )}
                </li>
                </React.Fragment>
              );
            })}
          </ol>
        </aside>
      </div>

      {celebrate && (
        <div role="status" className="fixed right-4 sm:right-6 bottom-24 md:bottom-6 z-50 rounded-[22px] bg-[#12A594] text-white px-5 py-4 shadow-[0_8px_24px_rgba(18,165,148,0.4)] flex items-center gap-3 animate-pop-soft">
          <span className="w-9 h-9 rounded-full bg-white/20 flex items-center justify-center">
            <CheckCircle2 className="w-5 h-5" />
          </span>
          <span className="flex flex-col">
            <span className="font-display text-base">Lesson complete!</span>
            <span className="text-xs font-bold opacity-90">+50 XP · streak kept alive</span>
          </span>
        </div>
      )}
    </div>
  );
};
