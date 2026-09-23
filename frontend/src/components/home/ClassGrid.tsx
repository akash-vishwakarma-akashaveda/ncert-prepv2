import React from 'react';
import { ClassGroup } from '../../types';
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

interface ClassGridProps {
  classes: ClassGroup[];
  onSelectClass: (classSort: string) => void;
}

export const ClassGrid: React.FC<ClassGridProps> = ({ classes, onSelectClass }) => (
  <div className="space-y-4">
    <div>
      <h2 id="visual-grid-title" className="text-[25px] text-[#1E2233]">
        Browse any class
      </h2>
      <p className="text-[13.5px] font-semibold text-[#6B7280]">
        Visitors can look around and watch free preview lessons. Sign in to save progress, streaks and doubts.
      </p>
    </div>

    <div className="grid grid-cols-[repeat(auto-fill,minmax(104px,1fr))] gap-3.5">
      {classes.map((cls, i) => (
        <ClassTile
          key={cls.class_sort}
          classSort={cls.class_sort}
          size="lg"
          onClick={() => onSelectClass(cls.class_sort)}
          label={`${cls.class_display}: ${cls.subjects.length} subjects, ${cls.videoCount} lessons`}
          data-reveal=""
          style={{ '--reveal-delay': `${Math.min(i, 11) * 40}ms` } as React.CSSProperties}
        />
      ))}
    </div>
  </div>
);
