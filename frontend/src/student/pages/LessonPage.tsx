import React, { Suspense, lazy, useEffect, useMemo, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { thumbnailUrl } from '../../components/home/JumpBackInCard';
import { toDisplayTitle } from '../../components/home/StageShowcase';
import { SubscribeBanner } from '../../components/common/SubscribePill';
import {
  CheckCircle2,
  Bookmark,
  Play,
  ChevronRight,
  ChevronLeft,
  FileText,
  Video as VideoIcon,
  MessageCircleQuestion,
  Lock,
  Gift,
} from 'lucide-react';
import { useProgress } from '../../context/ProgressContext';
import { useCatalogContext } from '../../context/CatalogContext';
import { useAuth } from '../../context/AuthContext';
import { isLessonUnlocked } from '../../services/accessControl';
import { useDashboardConfig } from '../../hooks/useDashboardConfig';
import { AskDoubtForm } from '../../components/player/AskDoubtForm';
import { COMING_SOON_NOTE, DOUBTS_COMING_SOON } from '../../data/featureFlags';
import { FeedbackForm } from '../../components/player/FeedbackForm';
import { LessonPlayer } from '../LessonPlayer';
import { useDocumentTitle } from '../../hooks/useDocumentTitle';

const PdfViewer = lazy(() => import('../../components/textbook/PdfViewer').then((m) => ({ default: m.PdfViewer })));
import { EmptyState, btnAccent, btnPrimary, btnSecondary, btnTeal, card, chapterNumbers, formatDuration, lessonPath, subjectPath } from '../ui';

type TabId = 'overview' | 'doubts' | 'feedback';

// Visitors use /watch/:videoId (publicMode), signed-in students /app/lesson/:videoId.
export const LessonPage: React.FC<{ publicMode?: boolean }> = ({ publicMode = false }) => {
  const { videoId = '' } = useParams();
  const navigate = useNavigate();
  const { user, isAdmin, setAuthModalOpen } = useAuth();
  const { videoMap, getSubjectsForClass, loading } = useCatalogContext();
  const { isCompleted, isFavorited, toggleCompleted, toggleFavorite, recordVideoWatched } = useProgress();
  const [tab, setTab] = useState<TabId>('overview');
  const [celebrate, setCelebrate] = useState(false);
  const [pdfOpen, setPdfOpen] = useState(false);
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
  useDocumentTitle(video ? `${video.video_title} — ${video.chapter_name} — NCERT Prep` : 'NCERT Prep');
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

  // The chapter holding the current lesson (its number labels the lesson header).
  const currentChapterIndex = subject?.chapters.findIndex((c) => c.videos.some((v) => v.youtube_id === videoId)) ?? -1;
  const currentChapter = currentChapterIndex >= 0 ? subject?.chapters[currentChapterIndex] : undefined;
  const currentVideoIndexInChapter = currentChapter?.videos.findIndex((v) => v.youtube_id === videoId) ?? -1;

  // Access control: signed-in users unlock everything; visitors get what the admin's access policy allows.
  const isUnlocked = video
    ? isLessonUnlocked(
        video,
        user,
        // Per-book position (matches /api/videos/featured): each book's first chapters are free previews.
        currentChapterIndex >= 0 ? outlineNumbers[currentChapterIndex] - 1 : undefined,
        currentVideoIndexInChapter >= 0 ? currentVideoIndexInChapter : undefined,
        policy
      )
    : false;
  const isFreePreview = !user && isUnlocked;


  if (!video || !video.isActive) {
    return (
      <EmptyState
        icon={<VideoIcon className="w-5 h-5" />}
        title={loading ? 'Loading lesson…' : 'This lesson is coming soon'}
        body={loading ? undefined : "The video for this chapter isn't up yet. The chapter PDF may already be available under Textbooks."}
        action={!loading && <Link to={publicMode ? '/browse' : '/app/subjects'} className={btnPrimary}>Browse lessons</Link>}
      />
    );
  }

  const completed = isCompleted(video.youtube_id);
  const saved = isFavorited(video.youtube_id);
  const tabs: { id: TabId; label: string }[] = [
    { id: 'overview', label: 'Overview' },
    { id: 'doubts', label: DOUBTS_COMING_SOON ? 'Doubts (soon)' : 'Ask a doubt' },
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
        <div className="rounded-[20px] bg-white border-[3px] border-[#CDEFE4] shadow-[0_5px_0_#CDEFE4] p-3.5 sm:px-5 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-[13.5px]">
          <div className="flex items-center gap-3">
            <span className="w-9 h-9 rounded-[12px] bg-[#12A594] text-white flex items-center justify-center shrink-0">
              <Gift className="w-4 h-4" />
            </span>
            <div className="font-semibold">
              <span className="font-extrabold text-[#0B7A67]">Free preview: </span>
              <span className="text-[#4B5168]">
                this {video.subject} lesson is free to watch. Sign in to unlock all {ordered.length} lessons.
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
                Every lesson in this subject opens with a free student account, along with progress saving and doubts. Signing in takes a few seconds.
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

          {/* On a card, not the wallpaper: the title and details must read clearly on every class background. */}
          <div className={`${card} p-4 sm:p-5 flex flex-col gap-4`}>
            <div className="min-w-0">
              <p className="text-[10.5px] font-extrabold tracking-[0.1em] text-[#6B7280]">
                {currentChapter ? `CHAPTER ${outlineNumbers[currentChapterIndex]} · ` : ''}
                {currentChapter && currentChapter.videos.length > 1
                  ? `LECTURE ${currentVideoIndexInChapter + 1} OF ${currentChapter.videos.length} · `
                  : ''}
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
                  {currentChapter?.videos.some((v) => v.youtube_id === next.youtube_id) ? 'Next lecture' : 'Next chapter'}{' '}
                  <ChevronRight className="w-4 h-4" />
                </button>
              )}
            </div>
          </div>

          {!isAdmin && <SubscribeBanner />}

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
                    <button type="button" onClick={() => setPdfOpen(true)} className={`${btnSecondary} w-full sm:w-auto cursor-pointer`}>
                      <FileText className="w-4 h-4 text-[#E0603F]" /> Read this chapter in the NCERT textbook (PDF)
                    </button>
                  )}
                  {pdfOpen && video.pdf_url && (
                    <Suspense fallback={null}>
                      <PdfViewer
                        url={video.pdf_url}
                        title={video.chapter_name}
                        subtitle={[video.subject, video.textbook].filter(Boolean).join(' · ')}
                        onClose={() => setPdfOpen(false)}
                      />
                    </Suspense>
                  )}
                </div>
              )}
              {tab === 'doubts' && (
                <div>
                  {DOUBTS_COMING_SOON ? (
                    <div className="p-6 text-center bg-[color:var(--brand-soft)] border-[3px] border-[color:var(--brand-line)] rounded-[22px] space-y-2">
                      <MessageCircleQuestion className="w-8 h-8 text-[color:var(--brand)] mx-auto" />
                      <h3 className="text-lg text-[#1E2233]">Coming soon</h3>
                      <p className="text-xs text-[#6B7280] max-w-sm mx-auto">{COMING_SOON_NOTE}</p>
                    </div>
                  ) : !user ? (
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

        {/* Playlist: every lesson in the subject as a thumbnail row, like a video course outline. */}
        <aside className="self-start overflow-hidden xl:sticky xl:top-24 rounded-[24px] bg-white border-[3px] border-[#E3E5EC] shadow-[0_6px_0_#E3E5EC]">
          <div className="px-4 pt-4 pb-3 border-b-2 border-[#F1F3FB] space-y-2.5">
            <div className="flex items-baseline justify-between gap-3">
              <h3 className="text-[17px] text-[#1E2233]">{video.subject} lessons</h3>
              <span className="text-[12px] font-extrabold text-[#6B7280] tabular-nums">
                {ordered.filter((v) => isCompleted(v.youtube_id)).length}/{ordered.length} done
              </span>
            </div>
            <div className="h-2 rounded-full bg-[#F1F3FB] overflow-hidden" aria-hidden="true">
              <div className="h-full rounded-full bg-[#12A594]" style={{ width: `${ordered.length ? (ordered.filter((v) => isCompleted(v.youtube_id)).length / ordered.length) * 100 : 0}%` }} />
            </div>
          </div>
          <ol className="max-h-[70vh] overflow-y-auto p-2 space-y-0.5">
            {subject?.chapters.map((chapter, ci) => (
              <React.Fragment key={chapter.key}>
                {multiBook && chapter.textbook !== subject.chapters[ci - 1]?.textbook && (
                  <li className="px-2 pt-3 pb-1 text-[10.5px] font-extrabold tracking-[0.08em] text-[#0B7A67]">{(chapter.textbook || 'Other').toUpperCase()}</li>
                )}
                {chapter.videos.length === 0 ? (
                  <li className="flex items-center gap-3 p-2 rounded-2xl opacity-60">
                    <span className="w-24 aspect-video rounded-xl bg-[#F1F3FB] shrink-0" />
                    <span className="min-w-0">
                      <span className="block text-[10.5px] font-extrabold tracking-[0.06em] text-[#9AA1B4]">CHAPTER {outlineNumbers[ci]} · SOON</span>
                      <span className="block text-[13px] font-extrabold text-[#4B5168] line-clamp-2">{chapter.chapter_name}</span>
                    </span>
                  </li>
                ) : (
                  <>
                    {chapter.videos.length > 1 && (
                      <li className="flex items-center gap-3 px-2 pt-3 pb-1.5">
                        <span className="w-7 h-7 shrink-0 rounded-full bg-[color:var(--brand-soft)] text-[color:var(--brand)] text-[12px] font-extrabold flex items-center justify-center">
                          {outlineNumbers[ci]}
                        </span>
                        <span className="flex-1 min-w-0">
                          <span className="block text-[13.5px] font-extrabold text-[#1E2233] leading-snug line-clamp-2">{chapter.chapter_name}</span>
                          <span className="block text-[11px] font-bold text-[#6B7280]">
                            {chapter.videos.length} lectures · {chapter.videos.filter((v) => isCompleted(v.youtube_id)).length} done
                          </span>
                        </span>
                      </li>
                    )}
                    {chapter.videos.map((v, li) => {
                      const current = v.youtube_id === video.youtube_id;
                      const isDone = isCompleted(v.youtube_id);
                      const locked = !isLessonUnlocked(v, user, outlineNumbers[ci] - 1, li, policy);
                      const multi = chapter.videos.length > 1;
                      return (
                        <li key={v.youtube_id} className={multi ? 'pl-4 relative before:absolute before:left-[21px] before:top-0 before:bottom-0 before:w-0.5 before:bg-[#EDEFF6]' : undefined}>
                          <Link
                            to={pathFor(v.youtube_id)}
                            aria-current={current ? 'true' : undefined}
                            className={`relative flex items-center gap-3 p-2 rounded-2xl transition-colors ${
                              current ? 'bg-[color:var(--brand-soft)] ring-2 ring-[color:var(--brand-line)]' : 'hover:bg-[#F7F8FC]'
                            }`}
                          >
                            <span className={`relative ${multi ? 'w-20' : 'w-24'} aspect-video rounded-xl overflow-hidden bg-[#1E2233] shrink-0`}>
                              <img src={thumbnailUrl(v.youtube_id)} alt="" loading="lazy" className="w-full h-full object-cover" />
                              {(locked || current) && (
                                <span className="absolute inset-0 bg-black/40 flex items-center justify-center text-white">
                                  {locked ? <Lock className="w-4 h-4" /> : <Play className="w-4 h-4 fill-current" />}
                                </span>
                              )}
                              {isDone && !current && (
                                <span className="absolute right-1 bottom-1 w-5 h-5 rounded-full bg-[#12A594] text-white flex items-center justify-center">
                                  <CheckCircle2 className="w-3.5 h-3.5" />
                                </span>
                              )}
                            </span>
                            <span className="min-w-0">
                              <span className={`block text-[10.5px] font-extrabold tracking-[0.06em] ${current ? 'text-[color:var(--brand)]' : 'text-[#9AA1B4]'}`}>
                                {current ? 'NOW PLAYING' : multi ? `LECTURE ${li + 1}` : `CHAPTER ${outlineNumbers[ci]}`}
                              </span>
                              <span className={`block text-[13px] font-extrabold leading-snug line-clamp-2 ${current ? 'text-[color:var(--brand)]' : 'text-[#1E2233]'}`}>
                                {multi ? toDisplayTitle(v.video_title) : chapter.chapter_name}
                              </span>
                            </span>
                          </Link>
                        </li>
                      );
                    })}
                  </>
                )}
              </React.Fragment>
            ))}
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
