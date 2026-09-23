import React, { useEffect, useMemo, useState } from 'react';
import { Play, Flame, Star, BookOpenCheck, Timer, Sparkles, NotebookPen } from 'lucide-react';
import { Video } from '../../types';
import { EducationalStage } from '../../data/stageThemes';
import { KidsScene } from '../../student/stage';
import { SubjectGlyph, card } from '../../student/ui';

export const STAGES: {
  id: EducationalStage;
  classSort: string;
  label: string;
  name: string;
  learner: string;
  blurb: string;
  Icon: React.ElementType;
}[] = [
  {
    id: 'primary',
    classSort: '03',
    label: 'Class 1–5',
    name: 'Sky garden',
    learner: 'Aanya',
    blurb: 'Big friendly buttons, colourful stickers and Pip the owl keep young learners curious.',
    Icon: Sparkles,
  },
  {
    id: 'middle',
    classSort: '08',
    label: 'Class 6–10',
    name: 'Notebook',
    learner: 'Rohan',
    blurb: 'A clean study notebook with science doodles, streaks and a steady path to board exams.',
    Icon: NotebookPen,
  },
  {
    id: 'senior',
    classSort: '12',
    label: 'Class 11–12',
    name: 'Focus desk',
    learner: 'Meera',
    blurb: 'A calm, distraction-free desk with a focus timer and chapter notes for serious revision.',
    Icon: Timer,
  },
];

const STATS = [
  { label: 'LESSONS', value: '12', Icon: BookOpenCheck, ink: '#0C8F78', soft: '#DDF5EE' },
  { label: 'STREAK', value: '5', Icon: Flame, ink: '#E0603F', soft: '#FFE8E0' },
  { label: 'XP', value: '600', Icon: Star, ink: '#B87A06', soft: '#FFF0CF' },
];

/** A small student home rendered with the real stage theme (data-stage), using real catalogue data. */
export const StagePreview: React.FC<{ stage: (typeof STAGES)[number]; videos: Video[]; compact?: boolean }> = ({ stage, videos, compact = false }) => {
  const kids = stage.id === 'primary';
  const sample = useMemo(() => {
    const inClass = videos.filter((v) => v.isActive && v.class_sort === stage.classSort);
    return {
      lesson: inClass[0],
      subjects: Array.from(new Set(inClass.map((v) => v.subject))).slice(0, compact ? 2 : 3),
    };
  }, [videos, stage.classSort, compact]);

  return (
    <div data-stage={stage.id} className="stage-bg relative rounded-[26px] border-[3px] border-[color:var(--card-line)] p-3.5 sm:p-4 flex flex-col gap-3 overflow-hidden">
      <div
        className={`relative overflow-hidden rounded-[22px] p-4 h-[176px] flex flex-col gap-2 ${
          kids ? 'hero-kids text-[#1E2233] pr-28' : 'text-white bg-gradient-to-br from-[color:var(--brand)] to-[color:var(--brand-to)]'
        }`}
      >
        {kids ? <KidsScene /> : <span className="hero-doodles opacity-90" />}
        <span className={`relative text-[10px] font-extrabold tracking-[0.1em] ${kids ? 'text-[#1E6FB0]' : 'opacity-80'}`}>
          CLASS {parseInt(stage.classSort, 10)}
          {sample.lesson && ` · ${sample.lesson.subject.toUpperCase()}`}
        </span>
        <span className="relative font-display text-[19px] leading-tight line-clamp-2">
          Hi {stage.learner}! Ready for {sample.lesson?.chapter_name || 'your next chapter'}?
        </span>
        <span className="relative self-start mt-auto inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-[#FFC53D] text-[#1E2233] text-xs font-extrabold shadow-[0_3px_0_#E0A81F]">
          <Play className="w-3.5 h-3.5 fill-current" /> {kids ? "Let's go" : 'Continue lesson'}
        </span>
      </div>

      <div className="grid grid-cols-3 gap-2">
        {STATS.map((s) => (
          <div
            key={s.label}
            className={`${card} stat-tile px-2.5 py-2 flex items-center gap-2`}
            style={{ ['--tint' as string]: s.ink, ['--tint-soft' as string]: s.soft }}
          >
            <span className="stat-icon w-7 h-7 shrink-0 rounded-[9px] flex items-center justify-center">
              <s.Icon className="w-3.5 h-3.5" />
            </span>
            <span className="min-w-0">
              <span className="block font-display text-base leading-none" style={{ color: s.ink }}>
                {s.value}
              </span>
              <span className="block text-[9px] font-extrabold text-[#6B7280]">{s.label}</span>
            </span>
          </div>
        ))}
      </div>

      {!compact && (
        <div className="flex flex-wrap gap-2">
          {sample.subjects.map((name) => (
            <span key={name} className={`${card} inline-flex items-center gap-2 pl-1.5 pr-3 py-1.5 !rounded-2xl`}>
              <SubjectGlyph subject={name} className="w-7 h-7 rounded-[9px]" />
              <span className="text-xs font-extrabold text-[#1E2233]">{name}</span>
            </span>
          ))}
        </div>
      )}
    </div>
  );
};

/** Hero showcase: cycles through the three age themes; visitors can also pick one. */
export const StageShowcase: React.FC<{ videos: Video[] }> = ({ videos }) => {
  const [index, setIndex] = useState(0);
  const [paused, setPaused] = useState(false);
  // Once a visitor picks an age group, stop rotating so the view they chose stays put.
  const [picked, setPicked] = useState(false);
  const rotating = !paused && !picked;

  useEffect(() => {
    if (!rotating || window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    const id = window.setInterval(() => setIndex((i) => (i + 1) % STAGES.length), 4500);
    return () => window.clearInterval(id);
  }, [rotating]);

  const stage = STAGES[index];

  return (
    <div
      className="relative mx-auto w-full max-w-[500px] flex flex-col gap-3"
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
      onFocusCapture={() => setPaused(true)}
      onBlurCapture={() => setPaused(false)}
    >
      <span aria-hidden="true" className="absolute -top-6 right-0 w-52 h-52 rounded-full bg-[#FFC53D]/30 blur-2xl animate-float" />
      <span aria-hidden="true" className="absolute -bottom-6 left-0 w-52 h-52 rounded-full bg-[#12A594]/20 blur-2xl animate-float [animation-delay:-4s]" />

      <div role="tablist" aria-label="See the app for each age group" className="relative grid grid-cols-3 gap-1.5 p-1.5 rounded-[20px] bg-white border-[3px] border-[#EDEFF6] shadow-[0_5px_0_#EDEFF6]">
        {STAGES.map((s, i) => {
          const active = i === index;
          return (
            <button
              key={s.id}
              role="tab"
              aria-selected={active}
              aria-controls="stage-preview"
              onClick={() => {
                setIndex(i);
                setPicked(true);
              }}
              className={`relative overflow-hidden flex flex-col items-center px-2 py-2 rounded-[14px] cursor-pointer transition-colors ${
                active ? 'bg-[#3B4FE0] text-white' : 'text-[#4B5168] hover:bg-[#F5F6FA]'
              }`}
            >
              <span className="text-[12.5px] font-extrabold whitespace-nowrap">{s.label}</span>
              <span className={`text-[10.5px] font-bold ${active ? 'text-white/80' : 'text-[#9AA1B4]'}`}>{s.name}</span>
              {active && rotating && (
                <span aria-hidden="true" key={index} className="absolute bottom-0 left-0 h-1 w-full bg-[#FFC53D] origin-left animate-[grow-x_4.5s_linear]" />
              )}
            </button>
          );
        })}
      </div>

      <div id="stage-preview" role="tabpanel" aria-label={`${stage.label}: ${stage.name}`} className="relative">
        <div key={stage.id} className="animate-pop-soft">
          <StagePreview stage={stage} videos={videos} />
        </div>
      </div>
    </div>
  );
};
