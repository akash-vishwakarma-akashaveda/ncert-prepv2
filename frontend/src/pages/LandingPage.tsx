import React, { useEffect, useMemo, useRef, useState } from 'react';
import { ArrowRight, Play, FileText, MessageCircleQuestion, Bell, Check, Star } from 'lucide-react';
import { ClassGroup, Video } from '../types';
import { JumpBackInCard } from '../components/home/JumpBackInCard';
import { ClassGrid } from '../components/home/ClassGrid';
import { ClassGridSkeleton } from '../components/common/SkeletonLoader';
import { useProgress } from '../context/ProgressContext';
import { SubjectGlyph, btnPrimary, btnSecondary, card } from '../student/ui';
import { STAGES, StagePreview, StageShowcase } from '../components/home/StageShowcase';
import { TAGLINE } from '../components/common/Logo';

interface LandingPageProps {
  classes: ClassGroup[];
  allVideos: Video[];
  catalogLoading: boolean;
  onExploreCurriculum: () => void;
  onSelectVideo: (video: Video) => void;
  onSelectClass: (classSort: string) => void;
  onLaunchDemoAuth: () => void;
}

/** Site column shared by the navbar, footer and every landing band. */
const WRAP = 'max-w-[1240px] mx-auto px-4 sm:px-6 lg:px-10';

const SectionTitle: React.FC<{ id: string; eyebrow: string; title: string; children?: React.ReactNode }> = ({ id, eyebrow, title, children }) => (
  <div data-reveal className="max-w-2xl mx-auto text-center">
    <p className="text-[11px] font-extrabold tracking-[0.12em] text-[#3B4FE0]">{eyebrow}</p>
    <h2 id={id} className="mt-1 text-[26px] sm:text-[36px] leading-tight text-[#1E2233] text-balance">
      {title}
    </h2>
    {children && <p className="mt-2 text-[14.5px] font-semibold text-[#4B5168]">{children}</p>}
  </div>
);

const FEATURES = [
  { Icon: Check, title: 'Progress you can see', body: 'Every chapter shows done, current or up ahead, so a student always knows the next step.', tint: '#E7F7F1', ink: '#12A594' },
  { Icon: MessageCircleQuestion, title: 'Private doubts', body: 'Ask the teacher a question on any lesson and get a reply in the app, never in public comments.', tint: '#EEF0FE', ink: '#3B4FE0' },
  { Icon: Star, title: 'Streaks and XP', body: '50 XP per finished lesson and an honest daily streak. No fake numbers to start with.', tint: '#FFF1D6', ink: '#C98A0E' },
  { Icon: FileText, title: 'Notes & cheat sheets', body: 'Summaries, key formulas, exam tips and downloadable PDFs for each chapter.', tint: '#EDEAFE', ink: '#7A5BE0' },
  { Icon: Play, title: 'Just the lesson', body: 'Privacy-enhanced playback with no recommendations, comments or autoplay rabbit holes.', tint: '#FFE9E2', ink: '#E0603F' },
  { Icon: Bell, title: 'Gentle reminders', body: 'Optional daily or weekly emails at the IST time you choose, with one-click unsubscribe.', tint: '#FDE8F1', ink: '#D2538C' },
];

const STEPS = [
  ['Pick your class', 'Tell us the class you study in. Your dashboard, syllabus and search follow it.', '#3B4FE0', '#2A3BB8'],
  ['Follow the trail', 'Go chapter by chapter. Finished lessons are ticked off automatically.', '#12A594', '#0B7A67'],
  ['Revise & ask', 'Open the cheat sheet before exams, use the focus timer, and ask doubts when stuck.', '#FFC53D', '#E0A81F'],
];

const scrollToGrid = () =>
  document.getElementById('visual-grid')?.scrollIntoView({ behavior: 'smooth', block: 'start' });

/** Shows `to`; the first time it scrolls into view it counts up from 0 (skipped with reduced motion). */
const CountUp: React.FC<{ to: number }> = ({ to }) => {
  // null = show the real value. Only a running animation replaces it, so crawlers and stalled tabs never see 0.
  const [n, setN] = useState<number | null>(null);
  const ref = useRef<HTMLSpanElement>(null);
  useEffect(() => {
    const el = ref.current;
    if (!el || !to || !('IntersectionObserver' in window) || window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    let raf = 0;
    let done = 0;
    const io = new IntersectionObserver(([entry]) => {
      if (!entry.isIntersecting) return;
      io.disconnect();
      done = window.setTimeout(() => setN(null), 1400);
      const start = performance.now();
      const tick = (now: number) => {
        const p = Math.min(1, (now - start) / 1200);
        setN(p < 1 ? Math.round(to * (1 - Math.pow(1 - p, 3))) : null);
        if (p < 1) raf = requestAnimationFrame(tick);
      };
      raf = requestAnimationFrame(tick);
    });
    io.observe(el);
    return () => {
      io.disconnect();
      cancelAnimationFrame(raf);
      window.clearTimeout(done);
      setN(null);
    };
  }, [to]);
  return <span ref={ref}>{(n ?? to).toLocaleString('en-IN')}</span>;
};

export const LandingPage: React.FC<LandingPageProps> = ({
  classes,
  allVideos,
  catalogLoading,
  onExploreCurriculum,
  onSelectVideo,
  onSelectClass,
  onLaunchDemoAuth,
}) => {
  const { lastWatchedId, isCompleted } = useProgress();
  const lastWatchedVideo = lastWatchedId ? allVideos.find((v) => v.youtube_id === lastWatchedId) || null : null;

  const stats = useMemo(() => {
    const active = allVideos.filter((v) => v.isActive);
    return {
      lessons: active.length,
      subjects: new Set(active.map((v) => v.subject)).size,
      subjectNames: Array.from(new Set(active.map((v) => v.subject))).sort(),
      sample: active.find((v) => v.class_sort === '10') || active[0],
    };
  }, [allVideos]);


  // Reveal sections as they scroll into view; re-scan when the class grid finishes loading.
  const rootRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const root = rootRef.current;
    if (!root || !('IntersectionObserver' in window)) return;
    const observer = new IntersectionObserver(
      (entries) =>
        entries.forEach((entry) => {
          if (!entry.isIntersecting) return;
          const el = entry.target as HTMLElement;
          el.classList.add('is-visible');
          observer.unobserve(el);
          // Hand the element back to its own hover transitions once the reveal has played.
          const delay = parseInt(el.style.getPropertyValue('--reveal-delay'), 10) || 0;
          window.setTimeout(() => el.removeAttribute('data-reveal'), delay + 700);
        }),
      { threshold: 0.12, rootMargin: '0px 0px -40px 0px' }
    );
    root.querySelectorAll('[data-reveal]:not(.is-visible)').forEach((el) => observer.observe(el));
    root.classList.add('reveal-ready');
    return () => observer.disconnect();
  }, [classes.length]);

  const stagger = (i: number, step = 80) => ({ '--reveal-delay': `${i * step}ms` }) as React.CSSProperties;


  return (
    <div ref={rootRef}>
      {/* Hero band. Its background blends the three looks: confetti (1–5), graph paper (6–10), formulas (11–12). */}
      <section className="landing-hero relative overflow-hidden">
        <span aria-hidden="true" className="landing-mix-left" />
        <span aria-hidden="true" className="landing-mix-right" />
        <div className={`${WRAP} relative pt-10 sm:pt-16 pb-10 grid lg:grid-cols-[1.1fr_1fr] gap-12 items-center`}>
          <div className="flex flex-col gap-4 sm:gap-5">
            <span className="animate-fade-up self-start inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-white/80 border-2 border-[#A9E6D3] text-[11px] font-extrabold tracking-[0.08em] text-[#0B7A67]">
              <span className="w-2 h-2 rounded-full bg-[#12A594] animate-pulse" /> CLASS 1–12 · GROWS WITH YOU
            </span>
            <h1 className="animate-fade-up [animation-delay:80ms] text-[40px] sm:text-[56px] leading-[1.05] text-[#1E2233] text-balance">
              Every chapter,{' '}
              <span className="relative inline-block text-[#3B4FE0]">
                explained simply.
                <svg aria-hidden="true" viewBox="0 0 300 16" preserveAspectRatio="none" className="absolute left-0 -bottom-2 w-full h-3.5">
                  <path d="M4 11C60 3 120 3 176 8S264 13 296 5" fill="none" stroke="#FFC53D" strokeWidth="6" strokeLinecap="round" className="animate-draw" />
                </svg>
              </span>
            </h1>
            <p className="animate-fade-up [animation-delay:160ms] text-[15.5px] font-semibold leading-relaxed text-[#4B5168] max-w-[520px]">
              Short, clear video lessons for every NCERT chapter, in syllabus order. The app changes its look as your child grows:
              playful for Class 1–5, a study notebook for 6–10 and a calm focus desk for 11–12. No ads, no rabbit holes.
            </p>
            <div className="animate-fade-up [animation-delay:240ms] flex flex-wrap gap-3">
              <button onClick={onLaunchDemoAuth} className={`${btnPrimary} px-6 py-3.5 text-[14.5px] rounded-[18px] group`}>
                Start learning free <ArrowRight className="w-4 h-4 transition-transform group-hover:translate-x-1" />
              </button>
              <button onClick={onExploreCurriculum} className={`${btnSecondary} px-6 py-3.5 text-[14.5px] rounded-[18px]`}>
                Try the demo
              </button>
            </div>
            {stats.lessons > 0 && (
            <dl className="animate-fade-up [animation-delay:320ms] grid grid-cols-2 sm:grid-cols-4 gap-3 mt-2 max-w-[560px]">
              {(
                [
                  [<CountUp key="l" to={stats.lessons} />, 'LESSONS', '#12A594'],
                  [<CountUp key="c" to={classes.length} />, 'CLASSES', '#3B4FE0'],
                  [<CountUp key="s" to={stats.subjects} />, 'SUBJECTS', '#7A5BE0'],
                  ['0 ads', 'EVER', '#C98A0E'],
                ] as [React.ReactNode, string, string][]
              ).map(([value, label, color]) => (
                <div key={label} className="flex flex-col px-3.5 py-2.5 rounded-[18px] bg-white border-2 border-[#EDEFF6] shadow-[0_4px_0_#EDEFF6]">
                  <dd className="font-display text-[24px] leading-tight tabular-nums" style={{ color }}>
                    {value}
                  </dd>
                  <dt className="text-[10.5px] font-extrabold tracking-[0.06em] text-[#6B7280]">{label}</dt>
                </div>
              ))}
            </dl>
            )}
          </div>

          <div className="animate-fade-up [animation-delay:200ms]">
            <StageShowcase videos={allVideos} />
          </div>
        </div>

        {/* Subjects marquee (real subjects from the catalogue) */}
        {stats.subjectNames.length > 0 && (
          <div
            aria-label="Subjects covered"
            role="region"
            className="marquee relative overflow-hidden pb-12 [mask-image:linear-gradient(90deg,transparent,black_8%,black_92%,transparent)]"
          >
            <ul className="flex w-max gap-3 animate-marquee">
              {[...stats.subjectNames, ...stats.subjectNames].map((name, i) => (
                <li
                  key={`${name}-${i}`}
                  aria-hidden={i >= stats.subjectNames.length || undefined}
                  className="flex items-center gap-2.5 pl-2 pr-4 py-2 rounded-2xl bg-white border-2 border-[#EDEFF6] whitespace-nowrap"
                >
                  <SubjectGlyph subject={name} className="w-8 h-8 rounded-[11px]" />
                  <span className="text-[13px] font-extrabold text-[#1E2233]">{name}</span>
                </li>
              ))}
            </ul>
          </div>
        )}

        <svg aria-hidden="true" viewBox="0 0 1440 60" preserveAspectRatio="none" className="relative block w-full h-10 sm:h-14 text-white">
          <path d="M0 38C240 8 480 0 720 22S1200 62 1440 30V60H0Z" fill="currentColor" />
        </svg>
      </section>

      {/* One app, three looks: each panel uses that age group's real theme */}
      <section id="grows" aria-labelledby="grows-title" className="bg-white scroll-mt-20">
        <div className={`${WRAP} py-14 sm:py-20 space-y-10`}>
          <SectionTitle id="grows-title" eyebrow="GROWS WITH YOU" title="One app, three looks. It grows up with every class.">
            Students see the look that fits their age automatically, from the class they pick.
          </SectionTitle>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {STAGES.map((stage, i) => (
              <article key={stage.id} data-reveal style={stagger(i, 140)} className="flex flex-col gap-4">
                <StagePreview stage={stage} videos={allVideos} compact />
                <div className="flex items-start gap-3 px-1">
                  <span className="w-10 h-10 shrink-0 rounded-[13px] bg-[#EEF0FE] text-[#3B4FE0] flex items-center justify-center">
                    <stage.Icon className="w-5 h-5" />
                  </span>
                  <div>
                    <p className="text-[11px] font-extrabold tracking-[0.08em] text-[#6B7280]">{stage.label.toUpperCase()}</p>
                    <h3 className="text-lg text-[#1E2233]">{stage.name}</h3>
                    <p className="mt-0.5 text-[13px] font-semibold leading-relaxed text-[#4B5168]">{stage.blurb}</p>
                  </div>
                </div>
              </article>
            ))}
          </div>
        </div>
      </section>

      {/* Classes: jump back in + class grid */}
      <section className="bg-[#F5F6FA]">
        <div className={`${WRAP} py-14 sm:py-20 space-y-10`}>
          <div data-reveal>
            <JumpBackInCard
              lastWatchedVideo={lastWatchedVideo}
              isCompleted={lastWatchedVideo ? isCompleted(lastWatchedVideo.youtube_id) : false}
              onSelectVideo={onSelectVideo}
              onBrowse={scrollToGrid}
            />
          </div>
          <div id="visual-grid" className="scroll-mt-24">
            {catalogLoading && classes.length === 0 ? (
              <ClassGridSkeleton />
            ) : classes.length === 0 ? (
              <p className={`${card} px-6 py-10 text-center text-sm font-semibold text-[#6B7280]`}>
                Lessons are being added. Check back soon, or sign up now and we'll be ready when you are.
              </p>
            ) : (
              <ClassGrid classes={classes} onSelectClass={onSelectClass} />
            )}
          </div>
        </div>
      </section>

      {/* Features */}
      <section id="features" aria-labelledby="features-title" className="bg-white scroll-mt-20">
        <div className={`${WRAP} py-14 sm:py-20 space-y-10`}>
          <SectionTitle id="features-title" eyebrow="EVERYTHING FOR REVISION" title="One calm place to watch, revise and ask." />
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-5">
            {FEATURES.map((f, i) => (
              <div key={f.title} data-reveal style={stagger(i)} className={`${card} p-5 flex flex-col gap-2.5 group`}>
                <span
                  className="w-11 h-11 rounded-[16px] flex items-center justify-center transition-transform duration-300 group-hover:scale-110 group-hover:-rotate-6"
                  style={{ background: f.tint, color: f.ink }}
                >
                  <f.Icon className="w-5 h-5" strokeWidth={2.6} />
                </span>
                <h3 className="text-lg text-[#1E2233]">{f.title}</h3>
                <p className="text-[13px] font-semibold leading-relaxed text-[#4B5168]">{f.body}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* How it works */}
      <section id="how-it-works" aria-labelledby="how-title" className="bg-[#F5F6FA] scroll-mt-20">
        <div className={`${WRAP} py-14 sm:py-20 space-y-10`}>
          <SectionTitle id="how-title" eyebrow="HOW IT WORKS" title="Three steps to a calmer study routine." />
          <ol className="grid md:grid-cols-3 gap-5">
            {STEPS.map(([title, body, bg, edge], i) => (
              <li key={title} data-reveal style={stagger(i + 1, 150)} className={`${card} p-6 flex flex-col gap-2.5`}>
                <span
                  className="w-11 h-11 rounded-[15px] font-display text-lg flex items-center justify-center"
                  style={{ background: bg, boxShadow: `0 4px 0 ${edge}`, color: i === 2 ? '#1E2233' : '#fff' }}
                >
                  {i + 1}
                </span>
                <h3 className="text-lg text-[#1E2233]">{title}</h3>
                <p className="text-[13px] font-semibold leading-relaxed text-[#4B5168]">{body}</p>
              </li>
            ))}
          </ol>
        </div>
      </section>

      {/* Closing CTA */}
      <section className="bg-[#F5F6FA]">
        <div className={`${WRAP} pb-20`}>
          <div data-reveal className="relative overflow-hidden rounded-[32px] p-8 sm:p-14 text-center bg-[#FFC53D] border-[3px] border-[#E0A81F] shadow-[0_7px_0_#E0A81F]">
            <span aria-hidden="true" className="absolute -top-16 -left-16 w-56 h-56 rounded-full bg-white/25 animate-float [animation-duration:9s]" />
            <span aria-hidden="true" className="absolute -bottom-20 -right-12 w-64 h-64 rounded-full bg-[#FF7A59]/20 animate-float [animation-delay:-3s] [animation-duration:11s]" />
            <div className="relative flex flex-col items-center gap-4 max-w-2xl mx-auto">
              <h2 className="text-[30px] sm:text-[38px] leading-tight text-[#1E2233] text-balance">Your next chapter is one tap away.</h2>
              <p className="text-[15px] font-bold text-[#7A5C10]">{TAGLINE}. Free to use: pick your class and start where it matters most.</p>
              <div className="flex flex-col sm:flex-row justify-center gap-3 mt-2">
                <button onClick={onLaunchDemoAuth} className={`${btnPrimary} px-6 py-3.5`}>
                  Start learning free
                </button>
                <button onClick={onExploreCurriculum} className={`${btnSecondary} px-6 py-3.5`}>
                  Try the demo
                </button>
              </div>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
};
