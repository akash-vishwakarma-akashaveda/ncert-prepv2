import React from 'react';
import { useLocation } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { YOUTUBE_SUBSCRIBE_URL } from '../../data/youtube';

const HIDDEN_ON = ['/parent-consent', '/verify-email', '/reset-password'];

/** YouTube's play mark, drawn inline (brand icons are not in the icon set). */
const YouTubeMark: React.FC<{ className?: string; play?: string }> = ({ className = 'w-5 h-5', play = '#fff' }) => (
  <svg viewBox="0 0 24 24" className={className} aria-hidden="true">
    <path fill="currentColor" d="M23 7.2a3 3 0 0 0-2.1-2.1C19 4.6 12 4.6 12 4.6s-7 0-8.9.5A3 3 0 0 0 1 7.2 31 31 0 0 0 .5 12 31 31 0 0 0 1 16.8a3 3 0 0 0 2.1 2.1c1.9.5 8.9.5 8.9.5s7 0 8.9-.5a3 3 0 0 0 2.1-2.1 31 31 0 0 0 .5-4.8 31 31 0 0 0-.5-4.8Z" />
    <path fill={play} d="M9.75 15.02 15.5 12 9.75 8.98v6.04Z" />
  </svg>
);

/** Floating "Subscribe on YouTube" pill in the bottom-right corner of the public pages. Inside the app the
 * same action lives in the top bar (SubscribeNavButton), so it never floats over the content there. */
export const SubscribePill: React.FC = () => {
  const { pathname } = useLocation();
  const { isAdmin } = useAuth();
  // Lesson pages already show the subscribe banner under the video, so the pill would only repeat it.
  if (isAdmin || pathname.startsWith('/app') || HIDDEN_ON.includes(pathname) || /^\/watch\//.test(pathname)) return null;
  return (
    <div className="fixed z-40 pointer-events-none right-4 bottom-4 sm:right-6 sm:bottom-6">
      <a
        href={YOUTUBE_SUBSCRIBE_URL}
        target="_blank"
        rel="noopener noreferrer"
        // Same chunky style as the site's buttons: solid fill, thick edge and a ledge that presses down.
        className="pointer-events-auto btn-3d [--edge:#B3000C] inline-flex items-center gap-2 pl-2 pr-4 py-2 rounded-[18px] bg-[#FF0000] hover:bg-[#E60000] text-white text-[13px] sm:text-[13.5px] font-extrabold border-[3px] border-[#B3000C]"
      >
        <span className="w-7 h-7 rounded-full bg-white flex items-center justify-center text-[#FF0000]">
          <YouTubeMark className="w-4 h-4" />
        </span>
        <span>
          Subscribe<span className="hidden sm:inline"> on YouTube</span>
        </span>
      </a>
    </div>
  );
};

/** Compact subscribe button for the app's top bar, sized like the streak and XP pills beside it. */
export const SubscribeNavButton: React.FC = () => (
  <a
    href={YOUTUBE_SUBSCRIBE_URL}
    target="_blank"
    rel="noopener noreferrer"
    title="Subscribe to NCERT QuickPrep on YouTube"
    className="btn-3d [--edge:#B3000C] shrink-0 inline-flex items-center gap-1.5 h-10 pl-1.5 pr-3 rounded-full bg-[#FF0000] hover:bg-[#E60000] text-white text-[12.5px] font-extrabold border-2 border-[#B3000C]"
  >
    <span className="w-7 h-7 rounded-full bg-white flex items-center justify-center text-[#FF0000]">
      <YouTubeMark className="w-4 h-4" />
    </span>
    <span className="max-sm:sr-only">Subscribe</span>
  </a>
);

/** Big call to action under the video player. */
export const SubscribeBanner: React.FC = () => (
  <a
    href={YOUTUBE_SUBSCRIBE_URL}
    target="_blank"
    rel="noopener noreferrer"
    className="group flex flex-wrap items-center gap-3 sm:gap-4 p-4 sm:p-5 rounded-[24px] bg-white border-[3px] border-[#FFC9C9] shadow-[0_6px_0_#FFC9C9] hover:-translate-y-0.5 transition-transform"
  >
    <span className="w-11 h-11 rounded-[14px] bg-[#FF0000] text-white flex items-center justify-center shrink-0 shadow-[0_3px_0_#B3000C]">
      <YouTubeMark className="w-6 h-6" play="#FF0000" />
    </span>
    <span className="flex-1 min-w-[180px]">
      <span className="block font-display text-[19px] leading-tight text-[#1E2233]">Enjoyed this lesson?</span>
      <span className="block text-[13px] font-semibold text-[#6B7280]">Subscribe to NCERT QuickPrep on YouTube so you never miss a new chapter.</span>
    </span>
    <span className="btn-3d [--edge:#B3000C] inline-flex items-center gap-2 px-5 py-2.5 rounded-2xl bg-[#FF0000] text-white text-sm font-extrabold">
      <YouTubeMark className="w-4 h-4" play="#FF0000" /> Subscribe
    </span>
  </a>
);
