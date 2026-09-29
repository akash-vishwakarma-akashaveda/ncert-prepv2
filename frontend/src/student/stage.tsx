import React from 'react';
import { Home, BookOpen, MessageCircleQuestion, Bookmark, Timer, Bell, UserRound, Trophy, FileText } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { EducationalStage, getGradeStage } from '../data/stageThemes';

/** Theme stage of the signed-in student (admins and students without a class get none). */
export function useStage(): EducationalStage | null {
  const { user, isAdmin } = useAuth();
  return !isAdmin && user?.grade_preference ? getGradeStage(user.grade_preference) : null;
}

export type Section = 'home' | 'subjects' | 'doubts' | 'saved' | 'focus' | 'reminders' | 'profile' | 'leaderboard' | 'textbooks';

// Each student section has its own colour, used for nav and page-header icons in the Class 1–10 themes.
export const SECTIONS: Record<Section, { Icon: React.ElementType; ink: string; soft: string }> = {
  home: { Icon: Home, ink: '#6D3FE0', soft: '#F0E9FF' },
  subjects: { Icon: BookOpen, ink: '#1E7FCB', soft: '#E0F1FF' },
  doubts: { Icon: MessageCircleQuestion, ink: '#D9542F', soft: '#FFE8E0' },
  saved: { Icon: Bookmark, ink: '#C9447F', soft: '#FDE6F0' },
  focus: { Icon: Timer, ink: '#0C8F78', soft: '#DDF5EE' },
  reminders: { Icon: Bell, ink: '#B87A06', soft: '#FFF0CF' },
  profile: { Icon: UserRound, ink: '#7652DB', soft: '#ECE7FE' },
  leaderboard: { Icon: Trophy, ink: '#E0A81F', soft: '#FFF5D6' },
  textbooks: { Icon: FileText, ink: '#C24A2C', soft: '#FFE9E2' },
};

export const tintVars = (s: Section) =>
  ({ '--tint': SECTIONS[s].ink, '--tint-soft': SECTIONS[s].soft }) as React.CSSProperties;

/** Pip the owl, the Class 1–5 study buddy. */
export const Mascot: React.FC<{ className?: string }> = ({ className = 'w-24' }) => (
  <svg viewBox="0 0 120 142" className={className} aria-hidden="true">
    <ellipse cx="60" cy="136" rx="32" ry="5" fill="#1E2233" opacity="0.08" />
    <path d="M60 20c28 0 44 22 44 52c0 34-18 60-44 60S16 106 16 72c0-30 16-52 44-52z" fill="#8B6CF0" />
    <ellipse cx="60" cy="94" rx="26" ry="30" fill="#EAE2FF" />
    <path d="M44 86q4 5 8 0q4 5 8 0q4 5 8 0q4 5 8 0M48 100q4 5 8 0q4 5 8 0q4 5 8 0" stroke="#C9B8FA" strokeWidth="2.5" fill="none" strokeLinecap="round" />
    <path d="M19 68c-9 10-9 30 3 40c4-12 6-26-3-40zM101 68c9 10 9 30-3 40c-4-12-6-26 3-40z" fill="#6D3FE0" />
    <circle cx="42" cy="56" r="17" fill="#FFFFFF" />
    <circle cx="78" cy="56" r="17" fill="#FFFFFF" />
    <circle cx="44" cy="58" r="8" fill="#1E2233" />
    <circle cx="76" cy="58" r="8" fill="#1E2233" />
    <circle cx="47" cy="55" r="3" fill="#FFFFFF" />
    <circle cx="79" cy="55" r="3" fill="#FFFFFF" />
    <path d="M54 70l6 9l6-9z" fill="#FFB547" stroke="#F29A1F" strokeWidth="2" strokeLinejoin="round" />
    <circle cx="29" cy="73" r="5" fill="#FF9EB5" opacity="0.75" />
    <circle cx="91" cy="73" r="5" fill="#FF9EB5" opacity="0.75" />
    <path d="M46 130l-4 6M50 130v7M54 130l4 6M66 130l-4 6M70 130v7M74 130l4 6" stroke="#F29A1F" strokeWidth="3" strokeLinecap="round" />
    <path d="M32 21L60 9L88 21L60 33Z" fill="#1E2233" />
    <path d="M46 27v7c0 5 28 5 28 0v-7" fill="#2C3350" />
    <path d="M86 21v13" stroke="#FFC53D" strokeWidth="2.5" strokeLinecap="round" />
    <circle cx="86" cy="36" r="3.5" fill="#FFC53D" />
  </svg>
);

const Cloud: React.FC<{ className: string }> = ({ className }) => (
  <svg viewBox="0 0 80 44" className={className}>
    <path d="M12 40a14 14 0 0 1 4-27a20 20 0 0 1 37-6a15 15 0 0 1 19 17a11 11 0 0 1-2 16z" fill="#FFFFFF" />
  </svg>
);

/** Sky, sun, clouds and hills behind the Class 1–5 home banner. */
export const KidsScene: React.FC = () => (
  <div aria-hidden="true" className="absolute inset-0 pointer-events-none">
    <svg viewBox="0 0 64 64" className="absolute top-4 right-5 w-14 h-14 animate-spin-slow">
      <g stroke="#FFB020" strokeWidth="4" strokeLinecap="round">
        <path d="M32 4v7M32 53v7M4 32h7M53 32h7M12 12l5 5M47 47l5 5M12 52l5-5M47 17l5-5" />
      </g>
      <circle cx="32" cy="32" r="14" fill="#FFD23F" />
    </svg>
    <Cloud className="absolute top-7 right-[30%] w-24 animate-drift" />
    <Cloud className="absolute top-20 right-24 w-14 opacity-90" />
    <Cloud className="absolute top-3 left-[46%] w-12 opacity-70" />
    <svg viewBox="0 0 600 70" preserveAspectRatio="none" className="absolute bottom-0 inset-x-0 w-full h-16">
      <path d="M0 42C120 12 230 62 350 36S520 10 600 32V70H0Z" fill="#BDEBAE" />
      <path d="M0 56C150 36 270 70 410 52S540 40 600 52V70H0Z" fill="#93DB84" />
    </svg>
    <Mascot className="absolute bottom-3 right-4 w-14 sm:bottom-5 sm:right-8 sm:w-[104px] animate-bob" />
  </div>
);
