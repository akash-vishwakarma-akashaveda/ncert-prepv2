import React from 'react';
import { ChevronRight, Home } from 'lucide-react';

export interface BreadcrumbItem {
  label: string;
  onClick?: () => void;
  active?: boolean;
}

interface BreadcrumbsProps {
  items: BreadcrumbItem[];
}

export const Breadcrumbs: React.FC<BreadcrumbsProps> = ({ items }) => {
  return (
    // A white pill, like the lesson page's "Back" link, so it stays readable on the doodle wallpaper.
    <nav
      aria-label="Breadcrumb"
      className="inline-flex max-w-full items-center space-x-1 px-4 py-2 rounded-full bg-white border-2 border-[#E3E5EC] text-xs font-bold text-[#6B7280] overflow-x-auto"
    >
      <button
        onClick={items[0]?.onClick}
        className="flex items-center gap-1 hover:text-[color:var(--brand)] transition-colors cursor-pointer shrink-0"
      >
        <Home className="w-3.5 h-3.5" />
        <span>Home</span>
      </button>

      {items.slice(1).map((item, index) => (
        <React.Fragment key={index}>
          <ChevronRight className="w-3.5 h-3.5 text-[#6B7280]/50 shrink-0" />
          {item.active || !item.onClick ? (
            <span className="font-bold text-[#1E2233] truncate max-w-[200px]" aria-current="page">
              {item.label}
            </span>
          ) : (
            <button
              onClick={item.onClick}
              className="hover:text-[color:var(--brand)] transition-colors cursor-pointer truncate max-w-[150px]"
            >
              {item.label}
            </button>
          )}
        </React.Fragment>
      ))}
    </nav>
  );
};
