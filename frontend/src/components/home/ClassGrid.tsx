import React from 'react';
import { getClassTileStyle } from '../../data/colorTokens';

const ROMAN = ['I', 'II', 'III', 'IV', 'V', 'VI', 'VII', 'VIII', 'IX', 'X', 'XI', 'XII'];
export const romanClass = (classSort: string) => ROMAN[parseInt(classSort, 10) - 1] || classSort;

/** Roman numeral as puffy balloon lettering: a dark extruded layer, a solid face and a lighter highlight on the
 * top half (flat colours, no gradients; see .numeral-3d). */
export const Numeral3D: React.FC<{ classSort?: string; text?: string; ink: string; className?: string }> = ({ classSort = '', text, ink, className = '' }) => {
  const r = text ?? romanClass(classSort);
  return (
    <span className={`numeral-3d font-display ${className}`} style={{ ['--ink' as string]: ink }}>
      <span className="numeral-3d-depth" aria-hidden="true">{r}</span>
      <span className="numeral-3d-face">{r}</span>
      <span className="numeral-3d-shine" aria-hidden="true">{r}</span>
    </span>
  );
};

/** EduPlay class tile: 3D Roman numeral on the class colour, with a ledge that presses down. Selected = yellow with a ring. */
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
      <Numeral3D
        classSort={classSort}
        ink={selected ? '#1E2233' : t.ink}
        className={size === 'lg' ? 'text-[27px]' : size === 'md' ? 'text-[22px]' : 'text-[18px]'}
      />
      <span className={`whitespace-nowrap font-extrabold text-[#6B7280] ${size === 'sm' ? 'text-[8.5px]' : 'text-[9.5px]'} tracking-[0.06em]`}>
        CLASS {n}
      </span>
    </button>
  );
};

/** Landing class card: pastel tile, balloon Roman numeral in a white badge, then CLASS and the number.
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
      <span className="class-card-badge">
        <Numeral3D classSort={classSort} ink={selected ? '#1E2233' : t.ink} className="class-card-roman" />
      </span>
      <span className="relative text-[9.5px] font-extrabold tracking-[0.14em] text-[#6B7280] mt-1">CLASS</span>
      <span className={`relative font-display leading-none ${compact ? 'text-[17px]' : 'text-[24px]'}`} style={{ color: selected ? '#1E2233' : t.ink }}>
        {n}
      </span>
      {lessons && !compact ? <span className="relative text-[10.5px] font-bold text-[#6B7280]">{lessons} lessons</span> : null}
    </button>
  );
};
