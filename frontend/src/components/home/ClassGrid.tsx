import React from 'react';
import { getClassTileStyle } from '../../data/colorTokens';

const ROMAN = ['I', 'II', 'III', 'IV', 'V', 'VI', 'VII', 'VIII', 'IX', 'X', 'XI', 'XII'];
export const romanClass = (classSort: string) => ROMAN[parseInt(classSort, 10) - 1] || classSort;

/** The class's Roman numeral artwork (public/roman/class-01…12.webp, 320px). Decorative: buttons carry the label. */
export const RomanImage: React.FC<{ classSort: string; className?: string }> = ({ classSort, className = '' }) => (
  <img
    src={`/roman/class-${String(parseInt(classSort, 10)).padStart(2, '0')}.webp`}
    alt=""
    aria-hidden="true"
    loading="lazy"
    draggable={false}
    className={`aspect-square object-cover select-none ${className}`}
  />
);

/** EduPlay class tile: Roman numeral artwork on the class colour, with a ledge that presses down. Selected = yellow with a ring. */
export const ClassTile: React.FC<{
  classSort: string;
  selected?: boolean;
  onClick: () => void;
  size?: 'sm' | 'md' | 'lg';
  label?: string;
  className?: string;
  style?: React.CSSProperties;
}> = ({ classSort, selected, onClick, size = 'md', label, className = '', style, ...rest }) => {
  const t = getClassTileStyle(classSort);
  const bg = selected ? '#FFC53D' : t.bg;
  const edge = selected ? '#E0A81F' : t.border;
  const n = parseInt(classSort, 10);
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={selected}
      aria-label={label || `Class ${n}`}
      className={`btn-3d border-[3px] flex flex-col items-center justify-center gap-0.5 cursor-pointer ${
        size === 'lg' ? 'rounded-[22px] py-4 px-3' : size === 'md' ? 'rounded-[20px] aspect-square' : 'rounded-[18px] aspect-square'
      } ${selected ? 'outline-[3px] outline-solid outline-offset-[3px] outline-[#3B4FE0]' : ''} ${className}`}
      style={{ background: bg, borderColor: edge, ['--edge' as string]: edge, ...style }}
      {...rest}
    >
      <RomanImage
        classSort={classSort}
        className={size === 'lg' ? 'w-16 rounded-[16px]' : size === 'md' ? 'w-[70%] rounded-[14px]' : 'w-[68%] rounded-[12px]'}
      />
    </button>
  );
};

/** Landing class card: pastel tile, Roman numeral artwork and the lesson count.
 * On hover it lifts and tilts, the corner blob swells and the numeral pops (all CSS, see .class-card). */
export const ClassCard: React.FC<{
  classSort: string;
  label: string;
  lessons?: number;
  onClick: () => void;
  tilt?: number;
  selected?: boolean;
  compact?: boolean;
}> = ({ classSort, label, lessons, onClick, tilt = -3, selected, compact }) => {
  const t = getClassTileStyle(classSort);
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={label}
      aria-pressed={selected}
      className={`class-card ${compact ? 'class-card-sm' : ''}`}
      style={{ ['--bg' as string]: t.bg, ['--line' as string]: t.border, ['--ink' as string]: t.ink, ['--tilt' as string]: `${tilt}deg` }}
    >
      <span aria-hidden="true" className="class-card-blob" />
      <RomanImage classSort={classSort} className="class-card-roman class-card-img" />
      {/* The artwork is the class; the button's aria-label still says "Class n" for screen readers. */}
      {lessons && !compact ? (
        <span className="relative mt-1.5 text-[11.5px] font-extrabold" style={{ color: selected ? '#1E2233' : t.ink }}>
          {lessons} lessons
        </span>
      ) : null}
    </button>
  );
};
