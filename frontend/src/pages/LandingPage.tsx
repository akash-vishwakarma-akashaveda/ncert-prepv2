import React, { useEffect, useMemo, useRef, useState } from 'react';
import { ArrowRight, Play, FileText, MessageCircleQuestion, Bell, Check, Star, ChevronDown, Flame, BookOpen, NotebookPen, Route } from 'lucide-react';
import { ClassGroup, Video } from '../types';
import { JumpBackInCard } from '../components/home/JumpBackInCard';
import { ClassCard } from '../components/home/ClassGrid';
import { ClassGridSkeleton } from '../components/common/SkeletonLoader';
import { useProgress } from '../context/ProgressContext';
import { useAuth } from '../context/AuthContext';
import { SubjectGlyph, btnAccent, card } from '../student/ui';
import { Mascot } from '../student/stage';
import { STAGES, StagePreview, StageShowcase } from '../components/home/StageShowcase';
import { TAGLINE } from '../components/common/Logo';
import { StatsService } from '../services/stats';
import { getGradeStage } from '../data/stageThemes';

interface LandingPageProps {
  classes: ClassGroup[];
  allVideos: Video[];
  catalogLoading: boolean;
  onExploreCurriculum: () => void;
  onSelectVideo: (video: Video) => void;
  onSelectClass: (classSort: string) => void;
  onLaunchDemo: () => void;
}

/** Site column shared by the navbar, footer and every landing band. */
const WRAP = 'max-w-[1240px] mx-auto px-4 sm:px-6 lg:px-10';

/** Chunky tilted label, like a sticker slapped on the page. Decorative unless it carries real text. */
export const Sticker: React.FC<{ children: React.ReactNode; className?: string; bg: string; edge: string; ink?: string; rotate?: number }> = ({
  children,
  className = '',
  bg,
  edge,
  ink = '#1E2233',
  rotate = -3,
}) => (
  <span
    className={`inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-2xl border-[3px] font-extrabold whitespace-nowrap ${className}`}
    style={{ background: bg, borderColor: edge, color: ink, boxShadow: `0 4px 0 ${edge}`, transform: `rotate(${rotate}deg)` }}
  >
    {children}
  </span>
);

/** Wavy edge that melts one band into the next: sits at the bottom of a band, filled with the next band's colour. */
export const Wave: React.FC<{ fill: string; flip?: boolean }> = ({ fill, flip }) => (
  <svg aria-hidden="true" viewBox="0 0 1440 80" preserveAspectRatio="none" className={`block w-full h-10 sm:h-16 ${flip ? '-scale-x-100' : ''}`}>
    <path d="M0 44C180 8 360 8 540 36s360 44 540 20S1320 4 1440 28V80H0Z" fill={fill} />
  </svg>
);

export const SectionTitle: React.FC<{ id: string; eyebrow: string; title: string; light?: boolean; tone?: [string, string] }> = ({
  id,
  eyebrow,
  title,
  light,
  tone = ['#FFC53D', '#E0A81F'],
}) => (
  <div data-reveal className="max-w-2xl mx-auto text-center flex flex-col items-center gap-3">
    <Sticker bg={tone[0]} edge={tone[1]} className="text-[11px] tracking-[0.1em]" rotate={-2}>
      {eyebrow}
    </Sticker>
    <h2 id={id} className={`text-[30px] sm:text-[44px] leading-[1.08] text-balance ${light ? 'text-white' : 'text-[#1E2233]'}`}>
      {title}
    </h2>
  </div>
);

const FAQ: [string, string][] = [
  ['Are there ads?', "Lessons play from YouTube, so YouTube's own ads can appear there — that's outside our control. Nothing inside NCERT Prep itself is for sale."],
  ['Is it really free?', 'Yes. Create a free account and every lesson, chapter note and doubt reply is included — no premium tier to unlock.'],
  ["Is my child's data safe?", "We only collect what's needed to save progress, and follow India's data protection law: a parent approves the account for anyone under 18. Full details are in our Privacy Notice."],
  ['Can my child ask a question if they get stuck?', "Yes — every lesson has an 'Ask a doubt' box. A teacher replies privately inside the app, never in public comments."],
  ['Does this replace school or tuition?', "No — it's a clear, distraction-free way to revise NCERT chapters at your own pace, alongside school."],
];

const STEPS = [
  { title: 'Pick your class', body: 'Tell us the class you study in. Your dashboard, syllabus and search follow it.', Icon: BookOpen, bg: '#FFC53D', edge: '#E0A81F' },
  { title: 'Follow the trail', body: 'Go chapter by chapter. Finished lessons are ticked off automatically.', Icon: Route, bg: '#FFFFFF', edge: '#CDEFE4' },
  { title: 'Revise & ask', body: 'Read the chapter in your NCERT book before exams, use the focus timer, and ask doubts when stuck.', Icon: NotebookPen, bg: '#FF9EB5', edge: '#E07A95' },
];

// One colour block per age look; the dark one mirrors the Class 11–12 "focus desk" theme.
/** "Class 1 to 12" cards: who each age group is and what they study (the stage previews show how it looks). */
const STAGE_COPY: Record<string, { eyebrow: string; blurb: string }> = {
  primary: {
    eyebrow: 'PRIMARY SCHOOL',
    blurb: 'English, Maths, EVS and Hindi in short, friendly videos, with Pip the owl cheering on every finished chapter.',
  },
  middle: {
    eyebrow: 'MIDDLE SCHOOL',
    blurb: 'Science, Maths, Social Science and languages, chapter by chapter, building a steady path to the Class 10 boards.',
  },
  senior: {
    eyebrow: 'SENIOR SECONDARY',
    blurb: 'Science, Commerce and Humanities streams, with clear revision of every chapter before the board exams.',
  },
};

const STAGE_BLOCKS = [
  { bg: '#DDF1FF', edge: '#A9D8FA', ink: '#1E2233', sub: '#1E6FB0', rotate: -2 },
  { bg: '#3B4FE0', edge: '#2A3BB8', ink: '#FFFFFF', sub: '#C7CDF8', rotate: 1.5 },
  { bg: '#1E2233', edge: '#0E1120', ink: '#FFFFFF', sub: '#A9E6D3', rotate: -1 },
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
  onLaunchDemo,
}) => {
  const { lastWatchedId, isCompleted } = useProgress();
  const { setAuthModalOpen } = useAuth();
  const lastWatchedVideo = lastWatchedId ? allVideos.find((v) => v.youtube_id === lastWatchedId) || null : null;
  const [openFaq, setOpenFaq] = useState<number | null>(0);
  // Registered students, from the public stats endpoint (the visitor count lives in the footer).
  const [reach, setReach] = useState({ visitors: 0, students: 0 });
  useEffect(() => {
    StatsService.getPublic().then(setReach);
  }, []);

  const stats = useMemo(() => {
    const active = allVideos.filter((v) => v.isActive);
    return {
      lessons: active.length,
      subjects: new Set(active.map((v) => v.subject)).size,
      subjectNames: Array.from(new Set(active.map((v) => v.subject))).sort(),
    };
  }, [allVideos]);

  // Lessons across each whole class range (1–5, 6–10, 11–12).
  const lessonsPerStage = useMemo(() => {
    const counts: Record<string, number> = {};
    allVideos.forEach((v) => {
      if (v.isActive) counts[getGradeStage(v.class_sort)] = (counts[getGradeStage(v.class_sort)] || 0) + 1;
    });
    return counts;
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
  const startFree = () => setAuthModalOpen(true);

  return (
    <div ref={rootRef} className="overflow-x-clip">
      {/* ---------- Hero: bold indigo band, stickers, the live app card and Pip the owl ---------- */}
      <section
        // With the subject tapes below, the blue runs straight into them (they are the divider); without them the
        // hero ends in a wave.
        className={`landing-hero-indigo relative text-white ${stats.subjectNames.length > 0 ? '' : 'wave-above'}`}
      >
        <div className={`${WRAP} relative pt-12 sm:pt-20 pb-6 grid lg:grid-cols-[1.05fr_1fr] gap-14 lg:gap-10 items-center`}>
          <div className="flex flex-col items-start gap-5 sm:gap-6">
            <Sticker bg="#FFC53D" edge="#E0A81F" className="animate-fade-up text-[11.5px] tracking-[0.08em]" rotate={-3}>
              <Star className="w-3.5 h-3.5 fill-current" /> CLASS 1–12 · 100% FREE
            </Sticker>
            <h1 className="animate-fade-up [animation-delay:80ms] text-[44px] sm:text-[68px] leading-[1.02] text-balance">
              Every chapter,{' '}
              <span className="relative inline-block">
                explained
                <svg aria-hidden="true" viewBox="0 0 300 24" preserveAspectRatio="none" className="absolute left-0 -bottom-2 sm:-bottom-3 w-full h-3 sm:h-4">
                  <path d="M4 16C60 4 120 22 170 12S260 4 296 14" stroke="#FFC53D" strokeWidth="7" strokeLinecap="round" fill="none" className="animate-draw" />
                </svg>
              </span>{' '}
              <span
                className="inline-block mt-2 px-3 sm:px-4 rounded-[20px] bg-[#12A594] border-[3px] border-[#0B7A67] shadow-[0_6px_0_#0B7A67] rotate-[-3deg]"
              >
                simply!
              </span>
            </h1>
            <p className="animate-fade-up [animation-delay:160ms] text-[16px] sm:text-[17px] font-semibold leading-relaxed text-white/85 max-w-[520px]">
              Short, clear video lessons for every NCERT chapter, in syllabus order — no recommendations, no rabbit holes, just the
              next lesson.
            </p>
            <div className="animate-fade-up [animation-delay:240ms] flex flex-wrap gap-3.5">
              <button onClick={startFree} className={`${btnAccent} px-7 py-4 text-[15px] rounded-[20px] group`}>
                Start learning free <ArrowRight className="w-4 h-4 transition-transform group-hover:translate-x-1" />
              </button>
              <button
                onClick={onLaunchDemo}
                className="btn-3d [--edge:#2A3BB8] inline-flex items-center gap-2 px-7 py-4 text-[15px] font-extrabold rounded-[20px] bg-white/10 border-[3px] border-white/40 hover:bg-white/20 cursor-pointer"
              >
                <Play className="w-4 h-4 fill-current" /> Try the demo
              </button>
            </div>
            {stats.lessons > 0 && (
              <dl className="animate-fade-up [animation-delay:320ms] flex flex-wrap gap-3 mt-1">
                {(
                  [
                    [<CountUp key="l" to={stats.lessons} />, 'lessons', '#FFC53D', -3],
                    [<CountUp key="c" to={classes.length} />, 'classes', '#A9E6D3', 2],
                    [<CountUp key="s" to={stats.subjects} />, 'subjects', '#FFB8C9', -2],
                    // Only shown once there is someone to count.
                    ...(reach.students > 0 ? [[<CountUp key="u" to={reach.students} />, 'students', '#C7CDF8', 3]] : []),
                  ] as [React.ReactNode, string, string, number][]
                ).map(([value, label, ink, rot]) => (
                  <div
                    key={label}
                    className="flex items-baseline gap-2 px-4 py-2.5 rounded-2xl bg-white/10 border-2 border-white/25 transition-transform duration-300 hover:rotate-0 hover:-translate-y-1"
                    style={{ transform: `rotate(${rot}deg)` }}
                  >
                    <dd className="font-display text-[26px] leading-none tabular-nums" style={{ color: ink }}>
                      {value}
                    </dd>
                    <dt className="text-[12px] font-extrabold text-white/80">{label}</dt>
                  </div>
                ))}
              </dl>
            )}
          </div>

          {/* Live app card in a tilted frame, with stickers and Pip around it */}
          <div className="animate-fade-up [animation-delay:200ms] relative px-2 sm:px-8 pt-16 sm:pt-20 pb-6">
            <div className="relative rotate-[2deg] hover:rotate-0 transition-transform duration-500 rounded-[34px] bg-white p-3 sm:p-4 border-[3px] border-[#1E2233]/10 shadow-[0_14px_0_#2A3BB8] text-[#1E2233]">
              <StageShowcase videos={allVideos} />
            </div>
            <div aria-hidden="true" className="hidden sm:block">
              <Sticker bg="#FFC53D" edge="#E0A81F" className="absolute -bottom-2 left-2 text-[13px] animate-float" rotate={-8}>
                <Star className="w-4 h-4 fill-current" /> +50 XP
              </Sticker>
              <Sticker bg="#FF7A59" edge="#E0603F" ink="#fff" className="absolute -bottom-2 right-8 text-[13px] animate-float [animation-delay:-2s]" rotate={6}>
                <Flame className="w-4 h-4" /> 5 day streak
              </Sticker>
              <Sticker bg="#fff" edge="#C7CDF8" className="absolute bottom-24 -right-4 font-mono text-[13px] animate-float [animation-delay:-4s]" rotate={-6}>
                a² + b² = c²
              </Sticker>
            </div>
            {/* Pip perches on the frame's top edge, clear of the card's content */}
            <div className="absolute top-0 sm:top-1 left-6 sm:left-14 flex items-start gap-1" aria-hidden="true">
              <Mascot className="w-16 sm:w-20 animate-bob" />
              <span className="hidden sm:block mt-2 px-3 py-2 rounded-2xl rounded-bl-sm bg-white text-[#1E2233] text-[12.5px] font-extrabold shadow-[0_4px_0_#2A3BB8]">
                Hoot! Pick a class 👋
              </span>
            </div>
          </div>
        </div>
      </section>

      {/* ---------- Subjects: two crossed tapes ---------- */}
      {stats.subjectNames.length > 0 && (
        <section
          aria-label="Subjects covered"
          // Blue above the tapes, cream below: the crossed tapes cover the join, so there is no gap or curve here.
          className="relative py-10 sm:py-14 bg-[linear-gradient(#3B4FE0_50%,#FFF8E7_50%)]"
        >
          <div aria-hidden="true" className="absolute inset-x-[-5%] top-1/2 -translate-y-1/2 h-14 bg-[#12A594] rotate-[2.5deg] border-y-[3px] border-[#0B7A67]" />
          <div className="marquee relative -mx-[5%] rotate-[-2deg] bg-[#FFC53D] border-y-[3px] border-[#E0A81F] py-3 overflow-hidden">
            <ul className="flex w-max gap-3 animate-marquee">
              {[...stats.subjectNames, ...stats.subjectNames].map((name, i) => (
                <li
                  key={`${name}-${i}`}
                  aria-hidden={i >= stats.subjectNames.length || undefined}
                  className="flex items-center gap-2.5 pl-1.5 pr-4 py-1.5 rounded-2xl bg-white border-2 border-[#E0A81F] whitespace-nowrap"
                >
                  <SubjectGlyph subject={name} className="w-8 h-8 rounded-[11px]" />
                  <span className="text-[13.5px] font-extrabold text-[#1E2233]">{name}</span>
                </li>
              ))}
            </ul>
          </div>
        </section>
      )}

      {/* ---------- One app, three looks: tilted colour blocks ---------- */}
      <section
        id="grows"
        aria-labelledby="grows-title"
        // Takes the hero's curve itself when there is no subject strip between them.
        className={`section-doodles wave-above relative bg-[#FFF8E7] scroll-mt-20 ${stats.subjectNames.length > 0 ? '' : 'wave-top'}`}
      >
        <div className={`${WRAP} pt-8 pb-16 sm:pb-24 space-y-12 sm:space-y-16`}>
          <div className="space-y-4">
            <SectionTitle id="grows-title" eyebrow="CLASS 1 TO 12" title="Every class from 1 to 12, in one place." />
            <p data-reveal className="max-w-2xl mx-auto text-center text-[15.5px] sm:text-[16.5px] font-semibold leading-relaxed text-[#4B5168]">
              Whichever class you are in, every NCERT chapter is here, explained at your level. The app even changes its look as
              you grow, from playful in primary school to calm and focused for the boards.
            </p>
          </div>
          <div className="grid md:grid-cols-3 gap-8 md:gap-6 lg:gap-8">
            {STAGES.map((stage, i) => {
              const b = STAGE_BLOCKS[i];
              const count = lessonsPerStage[stage.id] || 0;
              const copy = STAGE_COPY[stage.id];
              return (
                <div key={stage.id} data-reveal style={stagger(i, 140)}>
                  <div
                    className="h-full flex flex-col gap-4 p-4 sm:p-5 rounded-[32px] border-[3px] transition-transform duration-300 hover:!rotate-0 hover:-translate-y-2"
                    style={{ background: b.bg, borderColor: b.edge, color: b.ink, boxShadow: `0 8px 0 ${b.edge}`, transform: `rotate(${b.rotate}deg)` }}
                  >
                    <StagePreview stage={stage} videos={allVideos} compact />
                    <div className="px-1 flex flex-col gap-1.5 flex-1">
                      <span className="text-[11px] font-extrabold tracking-[0.1em]" style={{ color: b.sub }}>
                        {copy.eyebrow}
                      </span>
                      <h3 className="font-display text-[28px] leading-tight">{stage.label}</h3>
                      <p className="text-[13.5px] font-semibold leading-relaxed opacity-85">{copy.blurb}</p>
                    </div>
                    <button
                      onClick={() => onSelectClass(stage.classSort)}
                      className="btn-3d [--edge:#E0A81F] self-start inline-flex items-center gap-2 px-5 py-2.5 rounded-2xl bg-[#FFC53D] text-[#1E2233] text-[13.5px] font-extrabold cursor-pointer group"
                    >
                      Explore {stage.label}
                      {count > 0 && <span className="text-[11px] font-bold opacity-70">· {count} lessons</span>}
                      <ArrowRight className="w-3.5 h-3.5 transition-transform group-hover:translate-x-1" />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* ---------- Features: colourful bento ---------- */}
      <section id="features" aria-labelledby="features-title" className="landing-dots wave-top-flip wave-above relative bg-white scroll-mt-20">
        <div className={`${WRAP} pt-6 pb-16 sm:pb-24 space-y-12`}>
          <SectionTitle id="features-title" eyebrow="EVERYTHING FOR REVISION" title="Watch, revise and ask. All in one happy place." tone={['#A9E6D3', '#12A594']} />
          <div className="grid sm:grid-cols-2 lg:grid-cols-4 lg:auto-rows-[minmax(150px,auto)] gap-5">
            {/* Progress: big teal tile with a chapter trail */}
            <div data-reveal className="fun-tile sm:col-span-2 lg:row-span-2 bg-[#12A594] border-[#0B7A67] text-white [--edge:#0B7A67]">
              <Check className="fun-tile-icon bg-white text-[#12A594]" strokeWidth={3} />
              <h3 className="text-[26px] sm:text-[30px] leading-tight">Progress you can see</h3>
              <p className="text-[14px] font-semibold text-white/85 max-w-sm">Every chapter shows done, current or up ahead, so a student always knows the next step.</p>
              <ol aria-hidden="true" className="mt-auto pt-6 flex items-center">
                {['done', 'done', 'done', 'now', 'next', 'next'].map((s, i) => (
                  <li key={i} className="flex items-center flex-1 last:flex-none">
                    <span
                      className={`shrink-0 rounded-full flex items-center justify-center border-[3px] ${
                        s === 'done'
                          ? 'w-9 h-9 bg-white border-white text-[#12A594]'
                          : s === 'now'
                          ? 'w-12 h-12 bg-[#FFC53D] border-[#E0A81F] text-[#1E2233] shadow-[0_4px_0_#E0A81F] animate-bob'
                          : 'w-9 h-9 bg-transparent border-white/50'
                      }`}
                    >
                      {s === 'done' ? <Check className="w-4 h-4" strokeWidth={3.5} /> : s === 'now' ? <Play className="w-4 h-4 fill-current" /> : null}
                    </span>
                    {i < 5 && <span className={`h-1 flex-1 mx-1 rounded-full ${s === 'done' ? 'bg-white' : 'bg-white/30 [background:repeating-linear-gradient(90deg,rgba(255,255,255,.5)_0_6px,transparent_6px_12px)]'}`} />}
                  </li>
                ))}
              </ol>
            </div>

            {/* Doubts: chat bubbles */}
            <div data-reveal style={stagger(1)} className="fun-tile sm:col-span-2 bg-[#EEF0FE] border-[#C7CDF8] [--edge:#C7CDF8]">
              <div className="flex flex-col sm:flex-row gap-5 h-full">
                <div className="flex flex-col gap-2 sm:w-1/2">
                  <MessageCircleQuestion className="fun-tile-icon bg-[#3B4FE0] text-white" />
                  <h3 className="text-[22px] text-[#1E2233]">Private doubts</h3>
                  <p className="text-[13.5px] font-semibold text-[#4B5168]">Ask the teacher on any lesson and get a reply in the app, never in public comments.</p>
                </div>
                <div aria-hidden="true" className="flex-1 flex flex-col justify-center gap-2.5 text-[12.5px] font-bold">
                  <span className="self-end max-w-[90%] px-3.5 py-2 rounded-2xl rounded-br-sm bg-white border-2 border-[#C7CDF8] text-[#1E2233] rotate-[1.5deg]">
                    Why does ice float on water? 🤔
                  </span>
                  <span className="self-start max-w-[90%] px-3.5 py-2 rounded-2xl rounded-bl-sm bg-[#3B4FE0] text-white -rotate-1 shadow-[0_3px_0_#2A3BB8]">
                    Great question! Ice is less dense because…
                  </span>
                </div>
              </div>
            </div>

            <div data-reveal style={stagger(2)} className="fun-tile bg-[#FFC53D] border-[#E0A81F] [--edge:#E0A81F] text-[#1E2233]">
              <Star className="fun-tile-icon bg-white text-[#E0A81F] fill-current" />
              <h3 className="text-[20px]">Streaks & XP</h3>
              <p className="text-[13px] font-bold text-[#6B4E0A]">50 XP per finished lesson and an honest daily streak.</p>
            </div>

            <div data-reveal style={stagger(3)} className="fun-tile bg-[#EDE6FF] border-[#CDBDFA] [--edge:#CDBDFA] text-[#1E2233]">
              <FileText className="fun-tile-icon bg-[#8B6CF0] text-white" />
              <h3 className="text-[20px]">NCERT books</h3>
              <p className="text-[13px] font-semibold text-[#4B5168]">Every chapter's NCERT textbook, one tap away from its lesson.</p>
            </div>

            <div data-reveal style={stagger(4)} className="fun-tile sm:col-span-2 bg-[#FF7A59] border-[#E0603F] [--edge:#E0603F] text-white">
              <div className="flex items-start gap-4">
                <Play className="fun-tile-icon bg-white text-[#FF7A59] fill-current shrink-0" />
                <div className="flex flex-col gap-1.5">
                  <h3 className="text-[22px]">Just the lesson</h3>
                  <p className="text-[13.5px] font-semibold text-white/90">No suggested videos or autoplay pulling attention away mid-chapter.</p>
                </div>
              </div>
            </div>

            <div data-reveal style={stagger(5)} className="fun-tile sm:col-span-2 bg-[#FFE3EC] border-[#FFB8C9] [--edge:#FFB8C9] text-[#1E2233]">
              <div className="flex items-start gap-4">
                <Bell className="fun-tile-icon bg-[#D2538C] text-white shrink-0" />
                <div className="flex flex-col gap-1.5">
                  <h3 className="text-[22px]">Gentle reminders</h3>
                  <p className="text-[13.5px] font-semibold text-[#4B5168]">Optional daily or weekly emails at the IST time you choose, with one-click unsubscribe.</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ---------- Classes: jump back in + class cards ---------- */}
      <section className="section-doodles wave-top wave-above relative bg-[#E6F4FF]">
        <div className={`${WRAP} pt-6 pb-16 sm:pb-24 space-y-10`}>
          <SectionTitle id="classes-title" eyebrow="FREE PREVIEWS" title="Pick your class and start exploring." tone={['#FFB8C9', '#E07A95']} />
          {/* Only when there is something to resume: an empty "start your first lesson" box made this band look flat. */}
          {lastWatchedVideo && (
            <div data-reveal>
              <JumpBackInCard
                lastWatchedVideo={lastWatchedVideo}
                isCompleted={lastWatchedVideo ? isCompleted(lastWatchedVideo.youtube_id) : false}
                onSelectVideo={onSelectVideo}
                onBrowse={scrollToGrid}
              />
            </div>
          )}
          <div id="visual-grid" className="scroll-mt-24">
            {catalogLoading && classes.length === 0 ? (
              <ClassGridSkeleton />
            ) : classes.length === 0 ? (
              <p className={`${card} px-6 py-10 text-center text-sm font-semibold text-[#6B7280]`}>
                Lessons are being added. Check back soon, or sign up now and we'll be ready when you are.
              </p>
            ) : (
              <>
                <ul className="grid grid-cols-3 sm:grid-cols-4 lg:grid-cols-6 gap-3 sm:gap-5 max-w-5xl mx-auto">
                  {classes.map((cls, i) => (
                    <li key={cls.class_sort} data-reveal style={stagger(Math.min(i, 11), 40)} className="flex justify-center">
                      <ClassCard
                        classSort={cls.class_sort}
                        lessons={cls.videoCount}
                        tilt={i % 2 ? 3 : -3}
                        onClick={() => onSelectClass(cls.class_sort)}
                        label={`${cls.class_display}: ${cls.subjects.length} subjects, ${cls.videoCount} lessons`}
                      />
                    </li>
                  ))}
                </ul>
                <p className="mt-6 text-center text-[13px] font-bold text-[#6B7280]">
                  Look around and watch free previews.{' '}
                  <button onClick={onExploreCurriculum} className="text-[#3B4FE0] underline decoration-2 underline-offset-4 cursor-pointer">
                    Browse the full syllabus
                  </button>
                </p>
              </>
            )}
          </div>
        </div>
      </section>

      {/* ---------- How it works: teal band, winding path ---------- */}
      <section id="how-it-works" aria-labelledby="how-title" className="wave-top-flip wave-above relative bg-[#12A594] scroll-mt-20 overflow-hidden">
        <div className={`${WRAP} pt-6 pb-16 sm:pb-24 space-y-12`}>
          <SectionTitle id="how-title" eyebrow="HOW IT WORKS" title="Three steps to a calmer study routine." light />
          <ol className="relative grid md:grid-cols-3 gap-10 md:gap-8">
            <svg aria-hidden="true" viewBox="0 0 1000 120" preserveAspectRatio="none" className="hidden md:block absolute top-2 left-[12%] w-[76%] h-24">
              <path d="M0 40C150 120 330 -30 500 50S850 110 1000 30" stroke="rgba(255,255,255,0.55)" strokeWidth="5" strokeDasharray="4 14" strokeLinecap="round" fill="none" />
            </svg>
            {STEPS.map((s, i) => (
              <li key={s.title} data-reveal style={stagger(i + 1, 150)} className="relative flex flex-col items-center text-center gap-3 px-2">
                <span
                  className="relative z-10 w-24 h-24 rounded-[30px] border-[3px] flex items-center justify-center text-[#1E2233]"
                  style={{ background: s.bg, borderColor: s.edge, boxShadow: `0 7px 0 ${s.edge}`, transform: `rotate(${[-6, 4, -3][i]}deg)` }}
                >
                  <s.Icon className="w-10 h-10" strokeWidth={2.2} />
                  <span className="absolute -top-3 -right-3 w-9 h-9 rounded-full bg-[#1E2233] text-white font-display text-lg flex items-center justify-center border-[3px] border-white">
                    {i + 1}
                  </span>
                </span>
                <h3 className="mt-2 text-[22px] text-white">{s.title}</h3>
                <p className="text-[14px] font-semibold leading-relaxed text-white/85 max-w-[280px]">{s.body}</p>
              </li>
            ))}
          </ol>
        </div>
      </section>

      {/* ---------- FAQ: Pip on the left, answers on the right ---------- */}
      <section id="faq" aria-labelledby="faq-title" className="section-doodles wave-top relative bg-white scroll-mt-20">
        <div className={`${WRAP} pt-6 pb-16 sm:pb-24 grid lg:grid-cols-[0.8fr_1.2fr] gap-10 lg:gap-16 items-start`}>
          <div data-reveal className="lg:sticky lg:top-24 flex flex-col items-start gap-4">
            <Sticker bg="#EEF0FE" edge="#C7CDF8" className="text-[11px] tracking-[0.1em] text-[#3B4FE0]" rotate={-2}>
              GOOD TO KNOW
            </Sticker>
            <h2 id="faq-title" className="text-[30px] sm:text-[42px] leading-[1.08] text-[#1E2233] text-balance">
              A few honest answers before you sign up.
            </h2>
            <div className="flex items-end gap-2 mt-2" aria-hidden="true">
              <Mascot className="w-24 animate-bob" />
              <span className="mb-16 px-3.5 py-2 rounded-2xl rounded-bl-sm bg-[#FFC53D] text-[#1E2233] text-[13px] font-extrabold shadow-[0_4px_0_#E0A81F]">
                Still curious? Ask away!
              </span>
            </div>
          </div>
          <div className="space-y-3.5">
            {FAQ.map(([q, a], i) => {
              const open = openFaq === i;
              return (
                <div
                  key={q}
                  data-reveal
                  style={stagger(i, 90)}
                  className={`rounded-[24px] border-[3px] overflow-hidden transition-colors ${
                    open ? 'bg-[#FFF8E7] border-[#FFC53D] shadow-[0_5px_0_#E0A81F]' : 'bg-white border-[#E3E5EC] shadow-[0_5px_0_#E3E5EC]'
                  }`}
                >
                  <button
                    onClick={() => setOpenFaq(open ? null : i)}
                    aria-expanded={open}
                    className="w-full flex items-center justify-between gap-3 p-4 sm:p-5 text-left cursor-pointer"
                  >
                    <span className="font-extrabold text-[#1E2233] text-[15px]">{q}</span>
                    <span className={`w-8 h-8 shrink-0 rounded-xl flex items-center justify-center transition-colors ${open ? 'bg-[#FFC53D]' : 'bg-[#F1F3FB]'}`}>
                      <ChevronDown className={`w-4 h-4 text-[#1E2233] transition-transform ${open ? 'rotate-180' : ''}`} />
                    </span>
                  </button>
                  {open && <p className="px-4 pb-5 sm:px-5 -mt-1 text-[14px] font-semibold leading-relaxed text-[#4B5168]">{a}</p>}
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* ---------- Closing CTA ---------- */}
      <section className="section-doodles relative bg-white">
        <div className={`${WRAP} pb-20`}>
          <div
            data-reveal
            className="relative overflow-hidden rounded-[36px] px-6 py-12 sm:p-16 text-center bg-[#3B4FE0] border-[3px] border-[#2A3BB8] shadow-[0_10px_0_#2A3BB8] landing-confetti"
          >
            <Mascot className="hidden sm:block absolute -bottom-3 left-6 lg:left-14 w-28 lg:w-36 animate-bob" />
            <div aria-hidden="true" className="hidden sm:block">
              <Sticker bg="#FFC53D" edge="#E0A81F" className="absolute top-8 right-10 text-[13px] animate-float" rotate={10}>
                <Star className="w-4 h-4 fill-current" /> Free forever
              </Sticker>
              <Sticker bg="#12A594" edge="#0B7A67" ink="#fff" className="absolute bottom-10 right-16 text-[13px] animate-float [animation-delay:-3s]" rotate={-8}>
                <Check className="w-4 h-4" strokeWidth={3} /> Syllabus order
              </Sticker>
            </div>
            <div className="relative flex flex-col items-center gap-4 max-w-2xl mx-auto">
              <h2 className="text-[34px] sm:text-[48px] leading-[1.05] text-white text-balance">Your next chapter is one tap away.</h2>
              <p className="text-[15.5px] font-bold text-white/85">{TAGLINE}. Pick your class and start where it matters most.</p>
              <div className="flex flex-col sm:flex-row justify-center gap-3.5 mt-3">
                <button onClick={startFree} className={`${btnAccent} px-7 py-4 text-[15px] rounded-[20px] group`}>
                  Start learning free <ArrowRight className="w-4 h-4 transition-transform group-hover:translate-x-1" />
                </button>
                <button
                  onClick={onLaunchDemo}
                  className="btn-3d [--edge:#2A3BB8] inline-flex items-center justify-center gap-2 px-7 py-4 text-[15px] font-extrabold rounded-[20px] bg-white/10 border-[3px] border-white/40 text-white hover:bg-white/20 cursor-pointer"
                >
                  <Play className="w-4 h-4 fill-current" /> Try the demo
                </button>
              </div>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
};
