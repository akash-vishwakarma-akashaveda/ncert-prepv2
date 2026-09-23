import React from 'react';
import { ArrowUpRight } from 'lucide-react';
import { getSubjectTileStyle } from '../../data/colorTokens';
import { ProgressRing } from '../common/ProgressRing';

export interface SubjectTile {
  name: string;
  total: number;
  completed: number;
  chapterCount?: number;
  isFocus?: boolean;
}

interface SubjectGridProps {
  subjects: SubjectTile[];
  onSelectSubject: (subject: string) => void;
}

export const SubjectGrid: React.FC<SubjectGridProps> = ({ subjects, onSelectSubject }) => (
  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
    {subjects.map((sub) => {
      const style = getSubjectTileStyle(sub.name);
      const percent = sub.total > 0 ? Math.round((sub.completed / sub.total) * 100) : 0;
      return (
        <button
          key={sub.name}
          onClick={() => onSelectSubject(sub.name)}
          className="bento bento-hover text-left p-5 flex flex-col justify-between gap-5 cursor-pointer group min-h-[168px]"
        >
          <div className="flex items-start justify-between gap-3">
            <span
              className="px-2.5 py-1 rounded-xl text-[11px] font-bold"
              style={{ backgroundColor: style.bg, color: style.text }}
            >
              {sub.isFocus ? 'Focus subject' : 'Subject'}
            </span>
            <ArrowUpRight className="w-4 h-4 text-[#6B7280] group-hover:text-[color:var(--brand)] transition-colors" />
          </div>

          <div className="flex items-end justify-between gap-3">
            <div className="min-w-0">
              <h3 className="text-lg font-bold tracking-tight text-[#1E2233] truncate">{sub.name}</h3>
              <p className="text-xs text-[#6B7280]">
                {sub.chapterCount !== undefined && `${sub.chapterCount} chapters · `}
                {sub.completed}/{sub.total} lessons
              </p>
            </div>
            <ProgressRing
              percent={percent}
              size={56}
              stroke={6}
              color={style.text}
              trackColor={style.bg}
              label={<span className="text-[11px] font-bold text-[#1E2233]">{percent}%</span>}
            />
          </div>
        </button>
      );
    })}
  </div>
);
