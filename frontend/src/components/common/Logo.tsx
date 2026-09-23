import React, { useId } from 'react';

export const TAGLINE = 'Every chapter, explained simply';

/** App mark: an open book whose right page carries a play button (video lessons for every chapter). */
export const LogoMark: React.FC<{ className?: string }> = ({ className = 'w-[42px] h-[42px]' }) => {
  const id = useId();
  return (
    <svg viewBox="0 0 48 48" className={`shrink-0 drop-shadow-[0_3px_0_#2436A8] ${className}`} aria-hidden="true">
      <defs>
        <linearGradient id={id} x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#4A5CF0" />
          <stop offset="1" stopColor="#2F3FC4" />
        </linearGradient>
      </defs>
      <rect width="48" height="48" rx="14" fill={`url(#${id})`} />
      <path d="M8 14.5c5.5-1.6 11-.8 15 2.2v20.6c-4-3-9.5-3.8-15-2.2Z" fill="#FFFFFF" />
      <path d="M40 14.5c-5.5-1.6-11-.8-15 2.2v20.6c4-3 9.5-3.8 15-2.2Z" fill="#FFC53D" />
      <path d="M29.5 21.5l6 4l-6 4Z" fill="#2F3FC4" />
    </svg>
  );
};

/** Mark + "NCERT Prep" wordmark, with the tagline underneath when there is room. */
export const Logo: React.FC<{ tagline?: boolean; size?: 'md' | 'lg'; className?: string }> = ({ tagline = false, size = 'md', className = '' }) => (
  <span className={`flex items-center gap-2.5 min-w-0 ${className}`}>
    <LogoMark className={size === 'lg' ? 'w-12 h-12' : 'w-[42px] h-[42px]'} />
    <span className="flex flex-col min-w-0 leading-none">
      <span className={`font-display whitespace-nowrap ${size === 'lg' ? 'text-[24px]' : 'text-[20px]'}`}>
        <span className="text-[#1E2233]">NCERT</span>
        <span className="text-[#12A594]"> Prep</span>
      </span>
      {tagline && <span className="hidden sm:block mt-1 text-[11px] font-bold text-[#6B7280] whitespace-nowrap">{TAGLINE}</span>}
    </span>
  </span>
);
