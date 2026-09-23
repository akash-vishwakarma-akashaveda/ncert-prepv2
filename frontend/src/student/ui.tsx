import React from 'react';
import {
  Atom,
  FlaskConical,
  Sigma,
  Leaf,
  Microscope,
  Languages,
  Globe2,
  BookOpen,
  Calculator,
  Landmark,
  Monitor,
  Brain,
  Users,
  Briefcase,
  Dna,
} from 'lucide-react';
import { getSubjectTileStyle } from '../data/colorTokens';
import { Mascot, SECTIONS, Section, tintVars, useStage } from './stage';

// EduPlay tokens: thick borders, solid ledge shadows, press-down buttons (see .chunky / .btn-3d in index.css).
export const card = 'bg-white border-[3px] border-[color:var(--card-line)] rounded-[var(--card-r)] shadow-[0_var(--ledge)_0_var(--card-line)]';
const btnBase =
  'btn-3d inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-2xl text-sm font-extrabold cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed';
export const btnPrimary = `${btnBase} [--edge:var(--brand-edge)] text-white bg-[color:var(--brand)] hover:bg-[color:var(--brand-hover)]`;
export const btnSecondary = `${btnBase} [--edge:#E3E5EC] text-[#4B5168] bg-white border-[3px] border-[#E3E5EC] hover:bg-[#F7F8FC]`;
export const btnAccent = `${btnBase} [--edge:#E0A81F] text-[#1E2233] bg-[#FFC53D] hover:bg-[#FFCD55]`;
export const btnTeal = `${btnBase} [--edge:#0B7A67] text-white bg-[#12A594] hover:bg-[#10988A]`;
export const linkText = 'text-sm font-extrabold text-[color:var(--brand)] hover:text-[color:var(--brand-edge)] cursor-pointer';
export const pill = 'inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[11px] font-extrabold';

const MEDALS: Record<number, [string, string, string]> = {
  1: ['#FFD66B', '#E0A81F', '#5C3D05'],
  2: ['#E6EBF2', '#9AA7BA', '#334155'],
  3: ['#FFD9B8', '#D97706', '#7C2D12'],
};

/** Numbered rank circle: gold, silver and bronze for the top three. */
export const RankBadge: React.FC<{ rank: number; className?: string }> = ({ rank, className = 'w-8 h-8 text-sm' }) => {
  const [bg, border, ink] = MEDALS[rank] || ['#F1F3FB', '#E3E5EC', '#6B7280'];
  return (
    <span
      aria-label={`Rank ${rank}`}
      className={`inline-flex shrink-0 items-center justify-center rounded-full border-[3px] font-display ${className}`}
      style={{ background: bg, borderColor: border, color: ink }}
    >
      {rank}
    </span>
  );
};

export const subjectPath = (subject: string) => `/app/subjects/${encodeURIComponent(subject)}`;
export const lessonPath = (youtubeId: string) => `/app/lesson/${encodeURIComponent(youtubeId)}`;

// Chapter number within its own book: subjects can hold several books that each restart at 1.
export function chapterNumbers(chapters: { textbook?: string }[]): number[] {
  return chapters.map((c, i) => {
    let n = 1;
    for (let j = i - 1; j >= 0 && chapters[j].textbook === c.textbook; j--) n++;
    return n;
  });
}

export const formatDuration = (seconds?: number) => (seconds ? `${Math.max(1, Math.round(seconds / 60))} min` : '');

export const PageHeader: React.FC<{ title: string; description?: string; actions?: React.ReactNode; section?: Section }> = ({
  title,
  description,
  actions,
  section,
}) => {
  const Icon = section && SECTIONS[section].Icon;
  return (
    <header className="flex flex-col sm:flex-row sm:items-end justify-between gap-3" style={section ? tintVars(section) : undefined}>
      <div className="flex items-center gap-3.5">
        {Icon && (
          <span className="page-icon shrink-0 w-12 h-12 rounded-[16px] flex items-center justify-center" aria-hidden="true">
            <Icon className="w-6 h-6" strokeWidth={2.4} />
          </span>
        )}
        <div>
          <h1 className="page-title text-[27px] leading-tight text-[#1E2233]">{title}</h1>
          {description && <p className="mt-1 text-sm font-semibold text-[#6B7280]">{description}</p>}
        </div>
      </div>
      {actions}
    </header>
  );
};

export const ProgressBar: React.FC<{ value: number; className?: string; color?: string }> = ({ value, className = '', color = '#12A594' }) => (
  <div
    className={`h-2.5 w-full bg-[#F1F3FB] rounded-full overflow-hidden ${className}`}
    role="progressbar"
    aria-valuenow={Math.round(value)}
    aria-valuemin={0}
    aria-valuemax={100}
  >
    <div className="h-full rounded-full transition-all duration-500" style={{ width: `${value}%`, background: color }} />
  </div>
);

export const EmptyState: React.FC<{ icon: React.ReactNode; title: string; body?: string; action?: React.ReactNode }> = ({
  icon,
  title,
  body,
  action,
}) => {
  const stage = useStage();
  return (
    <div className={`${card} px-6 py-12 text-center`}>
      {stage === 'primary' ? (
        <Mascot className="mx-auto w-24 animate-bob" />
      ) : (
        <div className="mx-auto w-14 h-14 rounded-[18px] bg-[color:var(--brand-soft)] text-[color:var(--brand)] flex items-center justify-center animate-bob">{icon}</div>
      )}
      <p className="mt-4 font-display text-lg text-[#1E2233]">{title}</p>
      {body && <p className="mt-1 text-sm font-semibold text-[#6B7280] max-w-md mx-auto">{body}</p>}
      {action && <div className="mt-4">{action}</div>}
    </div>
  );
};

const SUBJECT_ICONS: [RegExp, React.ElementType][] = [
  [/physics/i, Atom],
  [/chem/i, FlaskConical],
  [/math/i, Sigma],
  [/bio/i, Dna],
  [/computer/i, Monitor],
  [/psycholog/i, Brain],
  [/sociolog/i, Users],
  [/business/i, Briefcase],
  [/evs|environment/i, Leaf],
  [/english|hindi|sanskrit|language/i, Languages],
  [/geograph/i, Globe2],
  [/history|civics|political|social/i, Landmark],
  [/science/i, Microscope],
  [/account|econom/i, Calculator],
];

export const subjectIcon = (subject: string): React.ElementType =>
  SUBJECT_ICONS.find(([re]) => re.test(subject))?.[1] || BookOpen;

// Subject tile generated from the subject name; never depends on remote thumbnails.
export const SubjectCover: React.FC<{ subject: string; className?: string; size?: 'sm' | 'lg' }> = ({
  subject,
  className = '',
  size = 'lg',
}) => {
  const tint = getSubjectTileStyle(subject);
  const Icon = subjectIcon(subject);
  return (
    <div
      aria-hidden="true"
      className={`relative overflow-hidden flex items-center justify-center ${className}`}
      style={{ background: tint.bg, color: tint.ink }}
    >
      <Icon className={size === 'lg' ? 'w-10 h-10' : 'w-6 h-6'} strokeWidth={2.2} />
      <span className="absolute -right-5 -bottom-5 w-20 h-20 rounded-full opacity-40" style={{ background: tint.border }} />
    </div>
  );
};

/** Square subject badge used in lists and cards (EduPlay "glyph" tile). */
export const SubjectGlyph: React.FC<{ subject: string; className?: string }> = ({ subject, className = 'w-12 h-12' }) => {
  const tint = getSubjectTileStyle(subject);
  const Icon = subjectIcon(subject);
  return (
    <span
      aria-hidden="true"
      className={`subject-glyph shrink-0 rounded-[16px] flex items-center justify-center bg-[color:var(--glyph-bg)] ${className}`}
      style={{ ['--glyph-bg' as string]: tint.bg, color: tint.ink }}
    >
      <Icon className="w-1/2 h-1/2" strokeWidth={2.4} />
    </span>
  );
};
