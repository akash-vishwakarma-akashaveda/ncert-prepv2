import React from 'react';
import { Shield, Sparkles } from 'lucide-react';
import { Logo, TAGLINE } from './Logo';

interface FooterProps {
  onNavigate: (tab: 'home' | 'browse' | 'profile' | 'privacy') => void;
}

export const Footer: React.FC<FooterProps> = ({ onNavigate }) => {
  return (
    <footer className="mt-auto bg-white border-t-[3px] border-[color:var(--card-line)] py-10">
      <div className="w-full max-w-[1240px] mx-auto px-4 sm:px-6 lg:px-10">
        <div className="flex flex-col md:flex-row items-center justify-between gap-6">
          {/* Logo & Description */}
          <div className="flex flex-col items-center md:items-start text-center md:text-left">
            <Logo />
            <p className="mt-2.5 text-xs font-semibold text-[#6B7280] max-w-sm">
              {TAGLINE}. Distraction-free video lessons for Class 1 to 12, chapter by chapter.
            </p>
          </div>

          {/* Quick Links */}
          <div className="flex items-center gap-6 text-xs font-extrabold text-[#6B7280]">
            <button
              onClick={() => onNavigate('home')}
              className="hover:text-[color:var(--brand)] transition-colors cursor-pointer"
            >
              Home
            </button>
            <button
              onClick={() => onNavigate('browse')}
              className="hover:text-[color:var(--brand)] transition-colors cursor-pointer"
            >
              Browse Curriculum
            </button>
            <button
              onClick={() => onNavigate('privacy')}
              className="flex items-center gap-1 hover:text-[color:var(--brand)] transition-colors cursor-pointer"
            >
              <Shield className="w-3.5 h-3.5" />
              Privacy Policy (DPDP Act)
            </button>
          </div>
        </div>

        {/* Disclaimer per SRS Naming Note */}
        <div className="mt-8 pt-6 border-t border-[#E3E5EC] flex flex-col sm:flex-row items-center justify-between text-[11px] text-[#6B7280] gap-4">
          <p className="text-center sm:text-left">
            Educational revision platform. Curated from public educational resources. NCERT Prep is not officially affiliated with or endorsed by NCERT.
          </p>
          <div className="flex items-center gap-1.5 text-[#12A594] font-semibold">
            <Sparkles className="w-3 h-3" />
            <span>Built for distraction-free revision</span>
          </div>
        </div>
      </div>
    </footer>
  );
};
