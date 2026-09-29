import React from 'react';
import { getClassTileStyle } from '../../data/colorTokens';

const ROMAN = ['I', 'II', 'III', 'IV', 'V', 'VI', 'VII', 'VIII', 'IX', 'X', 'XI', 'XII'];
export const romanClass = (classSort: string) => ROMAN[parseInt(classSort, 10) - 1] || classSort;

/** EduPlay class tile: roman numeral on the class colour, with a ledge that presses down. Selected = yellow. */
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
      } ${className}`}
      style={{ background: bg, borderColor: edge, ['--edge' as string]: edge, ...style }}
      {...rest}
    >
      <span
        className={`font-display leading-none ${size === 'lg' ? 'text-[25px]' : size === 'md' ? 'text-xl' : 'text-[17px]'}`}
        style={{ color: selected ? '#1E2233' : t.ink }}
      >
        {romanClass(classSort)}
      </span>
      <span className={`whitespace-nowrap font-extrabold text-[#6B7280] ${size === 'sm' ? 'text-[8.5px]' : 'text-[9.5px]'} tracking-[0.06em]`}>
        CLASS {n}
      </span>
    </button>
  );
};

/** Landing class card: flat colour, big roman numeral. On hover it lifts and tilts, a light sheen
 * sweeps across, the corner blob swells and the numeral pops (all CSS, see .class-card). */
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
  const n = parseInt(classSort, 10);
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
      <span aria-hidden="true" className="class-card-sheen" />
      <span className="class-card-roman font-display">{romanClass(classSort)}</span>
      <span className="relative text-[10.5px] font-extrabold tracking-[0.1em] text-[#4B5168]">CLASS {n}</span>
      {lessons && !compact ? <span className="relative text-[10.5px] font-bold text-[#6B7280]">{lessons} lessons</span> : null}
    </button>
  );
};
