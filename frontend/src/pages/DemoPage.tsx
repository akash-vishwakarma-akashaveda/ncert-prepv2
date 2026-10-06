import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Link, useLocation, useNavigate, useSearchParams } from 'react-router-dom';
import { Play, ArrowRight, Star, Lock, ChevronLeft } from 'lucide-react';
import { NotesTarget, Video } from '../types';
import { VideoService } from '../services/videos';
import { NotesService } from '../services/content';
import { useAuth } from '../context/AuthContext';
import { useCatalogContext } from '../context/CatalogContext';
import { useDocumentTitle } from '../hooks/useDocumentTitle';
import { useDashboardConfig } from '../hooks/useDashboardConfig';
import { SubjectGlyph, btnAccent, btnSecondary, card, chapterNumbers } from '../student/ui';
import { Mascot } from '../student/stage';
import { STAGES, toDisplayTitle } from '../components/home/StageShowcase';
import { thumbnailUrl } from '../components/home/JumpBackInCard';
import { ClassCard } from '../components/home/ClassGrid';
import { ChapterPath } from '../student/kids/KidsScreens';
import { isLessonUnlocked } from '../services/accessControl';
import { useProgress } from '../context/ProgressContext';
import { ChapterListSkeleton } from '../components/common/SkeletonLoader';
import { RevisionNotesModal } from '../components/app/RevisionNotesModal';
import { getSubjectTileStyle } from '../data/colorTokens';
import { getGradeStage } from '../data/stageThemes';
import { SectionTitle, Sticker } from './LandingPage';

const WRAP = 'max-w-[1240px] mx-auto px-4 sm:px-6 lg:px-10';

// Same three colour blocks as the landing page's "one app, three looks".
const STAGE_BLOCKS = {
  primary: { bg: '#DDF1FF', edge: '#A9D8FA', ink: '#1E2233', sub: '#1E6FB0', rotate: -1.5 },
  middle: { bg: '#3B4FE0', edge: '#2A3BB8', ink: '#FFFFFF', sub: '#C7CDF8', rotate: 1 },
  senior: { bg: '#1E2233', edge: '#0E1120', ink: '#FFFFFF', sub: '#A9E6D3', rotate: -1 },
} as const;

const StepLabel: React.FC<{ n: number; children: React.ReactNode }> = ({ n, children }) => (
  <h3 className="flex items-center gap-2.5 text-[18px] sm:text-[20px] text-[#1E2233]">
    <span className="w-8 h-8 rounded-full bg-[#1E2233] text-white font-display text-[15px] flex items-center justify-center">{n}</span>
    {children}
  </h3>
);

const DemoCard: React.FC<{ video: Video; onPlay: () => void }> = ({ video, onPlay }) => {
  const title = toDisplayTitle(video.video_title);
  const chapter = toDisplayTitle(video.chapter_name);
  return (
    <button
      onClick={onPlay}
      className="group w-full text-left rounded-[22px] bg-white border-[3px] border-white/80 shadow-[0_5px_0_rgba(0,0,0,0.12)] overflow-hidden cursor-pointer transition-transform duration-300 hover:-translate-y-1 hover:rotate-[-0.6deg] focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-[#FFC53D]"
    >
      <span className="relative block aspect-video bg-[#1E2233] overflow-hidden">
        <img src={thumbnailUrl(video.youtube_id)} alt="" loading="lazy" className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105" />
        <span className="absolute inset-0 bg-black/15" />
        <span className="absolute inset-0 flex items-center justify-center">
          <span className="w-14 h-14 rounded-full bg-[#FFC53D] border-[3px] border-[#E0A81F] shadow-[0_4px_0_#E0A81F] flex items-center justify-center transition-transform duration-300 group-hover:scale-110">
            <Play className="w-6 h-6 ml-0.5 fill-[#1E2233] text-[#1E2233]" />
          </span>
        </span>
      </span>
      <span className="flex items-start gap-3 p-3.5">
        <SubjectGlyph subject={video.subject} className="w-10 h-10 rounded-[13px] shrink-0" />
        <span className="min-w-0">
          <span className="block text-[10.5px] font-extrabold tracking-[0.06em] text-[#6B7280] truncate">{`${video.class_display} · ${video.subject}`.toUpperCase()}</span>
          <span className="block text-[14.5px] font-extrabold text-[#1E2233] leading-snug line-clamp-2">{title}</span>
          {chapter !== title && <span className="block text-[12px] font-semibold text-[#6B7280] truncate">{chapter}</span>}
        </span>
      </span>
    </button>
  );
};

/**
 * The public demo: hand-picked lessons anyone can watch without signing in (from /api/videos/featured,
 * which only returns visitor-playable lessons), then the whole syllabus to explore: class → subject →
 * chapters. /browse redirects here; the class and subject live in the URL so links can be shared.
 */
export const DemoPage: React.FC = () => {
  useDocumentTitle('Free demo & syllabus explorer — NCERT Prep');
  const navigate = useNavigate();
  const { user, setAuthModalOpen } = useAuth();
  const { isCompleted } = useProgress();
  const { classes, getSubjectsForClass, loading: catalogLoading } = useCatalogContext();
  const [params, setParams] = useSearchParams();
  const [videos, setVideos] = useState<Video[] | null>(null);
  const [failed, setFailed] = useState(false);
  const [notesKeys, setNotesKeys] = useState<Set<string>>(new Set());
  const [notesTarget, setNotesTarget] = useState<NotesTarget | null>(null);
  const exploreRef = useRef<HTMLElement>(null);
  // The admin can switch free previews off (Dashboard Control -> access policy); the copy must follow it.
  const { config } = useDashboardConfig();
  const previewOn = config?.policy?.freePreviewEnabled !== false;
  const { hash } = useLocation();

  useEffect(() => {
    VideoService.fetchFeatured()
      .then(setVideos)
      .catch(() => setFailed(true));
  }, []);

  const classSort = params.get('class') && classes.some((c) => c.class_sort === params.get('class')) ? params.get('class')! : classes.find((c) => c.class_sort === '10')?.class_sort || classes[0]?.class_sort || '';
  const subjects = useMemo(() => (classSort ? getSubjectsForClass(classSort) : []), [classSort, getSubjectsForClass]);
  const activeSubject = subjects.find((s) => s.name === params.get('subject'));
  const classDisplay = classes.find((c) => c.class_sort === classSort)?.class_display ?? '';

  useEffect(() => {
    if (!classSort) return;
    let cancelled = false;
    NotesService.publishedKeysForClass(classSort).then((keys) => !cancelled && setNotesKeys(keys));
    return () => {
      cancelled = true;
    };
  }, [classSort]);

  // Arriving with a class or subject (from the landing page, a lesson's "back", an old /browse link): go straight to the explorer.
  const scrolledOnce = useRef(false);
  useEffect(() => {
    if (scrolledOnce.current || catalogLoading || !(hash === '#explore' || params.get('class') || params.get('subject'))) return;
    scrolledOnce.current = true;
    exploreRef.current?.scrollIntoView({ block: 'start' });
  }, [catalogLoading, params, hash]);

  const pick = (next: { class?: string; subject?: string }) => {
    const p: Record<string, string> = { class: next.class ?? classSort };
    if (next.subject) p.subject = next.subject;
    setParams(p, { replace: true, preventScrollReset: true });
  };

  // One block per age look, in landing-page order, holding that stage's demo lessons.
  const groups = useMemo(
    () => STAGES.map((stage) => ({ stage, videos: (videos ?? []).filter((v) => getGradeStage(v.class_sort) === stage.id) })).filter((g) => g.videos.length),
    [videos]
  );

  return (
    <div className="overflow-x-clip">
      <section className="landing-hero-indigo wave-above relative text-white">
        <div className={`${WRAP} relative pt-12 sm:pt-16 pb-4 flex flex-col items-center text-center gap-5`}>
          <Sticker bg="#FFC53D" edge="#E0A81F" className="animate-fade-up text-[11.5px] tracking-[0.08em]" rotate={-3}>
            <Star className="w-3.5 h-3.5 fill-current" /> {previewOn ? 'FREE DEMO · NO SIGN-UP' : 'FREE SYLLABUS EXPLORER'}
          </Sticker>
          <h1 className="animate-fade-up [animation-delay:80ms] text-[40px] sm:text-[60px] leading-[1.04] text-balance">
            Press{' '}
            <span className="relative inline-block">
              play
              <svg aria-hidden="true" viewBox="0 0 300 24" preserveAspectRatio="none" className="absolute left-0 -bottom-2 w-full h-3 sm:h-4">
                <path d="M4 16C60 4 120 22 170 12S260 4 296 14" stroke="#FFC53D" strokeWidth="7" strokeLinecap="round" fill="none" className="animate-draw" />
              </svg>
            </span>
            . Learn something{' '}
            <span className="inline-block px-3 rounded-[18px] text-white bg-[#12A594] border-[3px] border-[#0B7A67] shadow-[0_5px_0_#0B7A67] rotate-[-2deg]">now!</span>
          </h1>
          <p className="animate-fade-up [animation-delay:160ms] text-[16px] sm:text-[17px] font-semibold text-white/85 max-w-xl">
            {previewOn
              ? 'Start with a hand-picked lesson, or explore every class and subject below. No account, no email, just watch.'
              : 'See every class, subject and chapter below. Sign up free whenever you are ready to press play.'}
          </p>
          <div className="flex items-end gap-2" aria-hidden="true">
            <Mascot className="w-16 sm:w-20 animate-bob" />
            <span className="mb-10 px-3 py-2 rounded-2xl rounded-bl-sm bg-white text-[#1E2233] text-[12.5px] font-extrabold shadow-[0_4px_0_#2A3BB8]">
              Pick any lesson 👇
            </span>
          </div>
        </div>
      </section>

      {/* ---------- Hand-picked lessons, one block per age look (hidden when there are none to offer) ---------- */}
      {videos?.length !== 0 && (
      <section aria-labelledby="picks-title" className="section-doodles wave-top wave-above relative bg-[#FFF8E7]">
        <div className={`${WRAP} pt-8 pb-16 sm:pb-20 space-y-12`}>
          <SectionTitle id="picks-title" eyebrow="HAND-PICKED" title="Start with these free lessons." />
          {failed ? (
            <p className={`${card} max-w-xl mx-auto px-6 py-8 text-center text-sm font-semibold text-[#6B7280]`}>
              The hand-picked lessons couldn't be loaded just now. You can still explore the syllabus below.
            </p>
          ) : !videos ? (
            <div className="grid md:grid-cols-3 gap-6">
              {Array.from({ length: 3 }, (_, i) => (
                <div key={i} className="h-[520px] rounded-[32px] skeleton-shimmer" aria-label="Loading" />
              ))}
            </div>
          ) : (
            <div className={`grid gap-8 md:gap-6 lg:gap-8 ${groups.length >= 3 ? 'md:grid-cols-3' : groups.length === 2 ? 'md:grid-cols-2' : 'max-w-md mx-auto'}`}>
              {groups.map(({ stage, videos: stageVideos }) => {
                const b = STAGE_BLOCKS[stage.id];
                return (
                  <div
                    key={stage.id}
                    className="flex flex-col gap-4 p-4 sm:p-5 rounded-[32px] border-[3px] transition-transform duration-300 hover:!rotate-0"
                    style={{ background: b.bg, borderColor: b.edge, color: b.ink, boxShadow: `0 8px 0 ${b.edge}`, transform: `rotate(${b.rotate}deg)` }}
                  >
                    <div className="px-1 flex items-center justify-between gap-2">
                      <div>
                        <span className="block text-[11px] font-extrabold tracking-[0.1em]" style={{ color: b.sub }}>
                          {stage.name.toUpperCase()}
                        </span>
                        <h3 className="font-display text-[26px] leading-tight">{stage.label}</h3>
                      </div>
                      <span className="w-11 h-11 rounded-[14px] bg-white/20 flex items-center justify-center rotate-6">
                        <stage.Icon className="w-5 h-5" />
                      </span>
                    </div>
                    {stageVideos.map((video) => (
                      <DemoCard key={video.youtube_id} video={video} onPlay={() => navigate(`/watch/${encodeURIComponent(video.youtube_id)}`)} />
                    ))}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </section>
      )}

      {/* ---------- Explorer: class -> subject -> chapters ---------- */}
      <section id="explore" ref={exploreRef} aria-labelledby="explore-title" className="section-doodles wave-top-flip relative bg-white scroll-mt-24">
        <div className={`${WRAP} pt-8 pb-20 space-y-10`}>
          <div className="text-center flex flex-col items-center gap-3">
            <SectionTitle id="explore-title" eyebrow="EXPLORE EVERY LECTURE" title="Pick a class, open a subject, press play." tone={['#A9E6D3', '#12A594']} />
            {!user && (
              <p className="text-[14px] font-semibold text-[#4B5168] max-w-xl">
                {previewOn
                  ? 'Chapter 1 of every subject is free to watch. Locked lessons open with a free account.'
                  : 'Browse every chapter here, then sign up free to watch any lesson.'}
              </p>
            )}
          </div>

          {catalogLoading && classes.length === 0 ? (
            <ChapterListSkeleton />
          ) : classes.length === 0 ? (
            <p className={`${card} px-6 py-10 text-center text-sm font-semibold text-[#6B7280]`}>Lessons are being added. Check back soon.</p>
          ) : (
            <>
              <div className="space-y-4">
                <StepLabel n={1}>Choose a class</StepLabel>
                <ul className="grid grid-cols-4 sm:grid-cols-6 lg:grid-cols-12 gap-2.5 sm:gap-3">
                  {classes.map((cls, i) => (
                    <li key={cls.class_sort}>
                      <ClassCard
                        compact
                        classSort={cls.class_sort}
                        selected={cls.class_sort === classSort}
                        tilt={i % 2 ? 3 : -3}
                        onClick={() => pick({ class: cls.class_sort })}
                        label={`${cls.class_display}: ${cls.subjects.length} subjects, ${cls.videoCount} lessons`}
                      />
                    </li>
                  ))}
                </ul>
              </div>

              <div className="space-y-4">
                <StepLabel n={2}>Open a {classDisplay} subject</StepLabel>
                {subjects.length === 0 ? (
                  <p className={`${card} px-6 py-8 text-center text-sm font-semibold text-[#6B7280]`}>No lessons have been published for this class yet.</p>
                ) : (
                  <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3 sm:gap-4">
                    {subjects.map((sub) => {
                      const t = getSubjectTileStyle(sub.name);
                      const active = sub.name === activeSubject?.name;
                      return (
                        <button
                          key={sub.name}
                          onClick={() => pick({ subject: active ? undefined : sub.name })}
                          aria-pressed={active}
                          className="group text-left flex flex-col gap-3 p-4 rounded-[24px] border-[3px] cursor-pointer transition-all duration-200 hover:-translate-y-1"
                          style={{
                            background: active ? t.ink : t.bg,
                            borderColor: active ? t.ink : t.border,
                            boxShadow: `0 5px 0 ${active ? `color-mix(in srgb, ${t.ink} 70%, #000)` : t.border}`,
                          }}
                        >
                          <SubjectGlyph subject={sub.name} className="w-11 h-11 rounded-[14px] transition-transform group-hover:rotate-[-8deg]" />
                          <span className="min-w-0">
                            <span className={`block text-[15px] font-extrabold leading-tight ${active ? 'text-white' : 'text-[#1E2233]'}`}>{sub.name}</span>
                            <span className={`block text-[11.5px] font-bold ${active ? 'text-white/80' : 'text-[#6B7280]'}`}>
                              {sub.chapters.length} chapters · {sub.videoCount} lessons
                            </span>
                          </span>
                        </button>
                      );
                    })}
                  </div>
                )}
              </div>

              {activeSubject && (
                <div className="space-y-4">
                  <StepLabel n={3}>Press play</StepLabel>
                  <div className="rounded-[30px] border-[3px] border-[#E3E5EC] bg-[#F7F8FC] shadow-[0_6px_0_#E3E5EC] p-4 sm:p-6 space-y-5">
                    <div className="flex flex-wrap items-center justify-between gap-3">
                      <div className="flex items-center gap-3">
                        <SubjectGlyph subject={activeSubject.name} className="w-12 h-12 rounded-[16px]" />
                        <div>
                          <p className="text-[11px] font-extrabold tracking-[0.08em] text-[#6B7280]">{classDisplay.toUpperCase()}</p>
                          <h3 className="text-[22px] text-[#1E2233] leading-tight">{activeSubject.name}</h3>
                        </div>
                      </div>
                      <button onClick={() => pick({})} className={`${btnSecondary} px-4 py-2 text-[13px]`}>
                        <ChevronLeft className="w-4 h-4" /> All subjects
                      </button>
                    </div>
                    {!user && (
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-4 rounded-[20px] bg-[#FFF6E2] border-2 border-[#FFD97A]">
                        <p className="flex items-start gap-2.5 text-[13px] font-bold text-[#5E3D0C]">
                          <Lock className="w-4 h-4 mt-0.5 shrink-0" />
                          {previewOn ? 'Chapter 1 is free to watch. ' : ''}Sign up free to unlock all {activeSubject.chapters.length} chapters and save your progress.
                        </p>
                        <button onClick={() => setAuthModalOpen(true)} className={`${btnAccent} px-4 py-2 text-[13px] shrink-0`}>
                          Unlock everything free
                        </button>
                      </div>
                    )}
                    {/* Same width as the student's subject page, so the road keeps its shape. */}
                    <div className="max-w-[720px] mx-auto">
                    <ChapterPath
                      subject={activeSubject.name}
                      chapters={activeSubject.chapters}
                      stage={getGradeStage(classSort)}
                      notesKeys={notesKeys}
                      onOpenNotes={setNotesTarget}
                      onOpen={(c) => {
                        const next = c.videos.find((v) => !isCompleted(v.youtube_id)) ?? c.videos[0];
                        if (next) navigate(`/watch/${encodeURIComponent(next.youtube_id)}`);
                      }}
                      isLocked={(c, i) => c.videos.length > 0 && !isLessonUnlocked(c.videos[0], user, chapterNumbers(activeSubject.chapters)[i] - 1, 0, config?.policy)}
                      onLocked={() => setAuthModalOpen(true)}
                    />
                    </div>
                  </div>
                </div>
              )}
            </>
          )}

          {!user && (
            <div className="relative overflow-hidden rounded-[36px] px-6 py-12 sm:p-16 text-center bg-[#3B4FE0] border-[3px] border-[#2A3BB8] shadow-[0_10px_0_#2A3BB8] landing-confetti">
              <Mascot className="hidden sm:block absolute -bottom-3 left-6 lg:left-14 w-28 lg:w-32 animate-bob" />
              <div className="relative flex flex-col items-center gap-3 max-w-xl mx-auto">
                <h2 className="text-[30px] sm:text-[44px] leading-[1.05] text-white text-balance">Liked it? Every chapter is free.</h2>
                <p className="text-[15.5px] font-bold text-white/85">Sign up to unlock all lessons, save progress, earn XP and ask doubts.</p>
                <button
                  onClick={() => setAuthModalOpen(true)}
                  className={`${btnAccent} mt-3 px-7 py-4 text-[15px] rounded-[20px] group`}
                >
                  Start learning free <ArrowRight className="w-4 h-4 transition-transform group-hover:translate-x-1" />
                </button>
              </div>
            </div>
          )}
          {user && (
            <p className="text-center">
              <Link to="/app" className="text-sm font-extrabold text-[#3B4FE0] underline decoration-2 underline-offset-4">
                Back to the app
              </Link>
            </p>
          )}
        </div>
      </section>
      {notesTarget && <RevisionNotesModal isOpen onClose={() => setNotesTarget(null)} target={notesTarget} />}
    </div>
  );
};
