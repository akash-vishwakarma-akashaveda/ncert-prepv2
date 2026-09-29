import React, { useEffect, useState } from 'react';
import { Search, LogIn, LayoutDashboard, Shield } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { Logo as BrandLogo } from './Logo';

type NavTab = 'home' | 'browse' | 'demo' | 'privacy' | 'profile';

interface NavbarProps {
  currentTab: NavTab;
  onNavigate: (tab: NavTab) => void;
  onOpenSearch: () => void;
  // Home has its own hero search, so the bar is hidden there to keep one search per screen.
  showSearch?: boolean;
}

// Same order as the sections appear on the landing page.
const SECTIONS: [id: string, label: string][] = [
  ['grows', 'For every age'],
  ['features', 'Features'],
  ['visual-grid', 'Classes'],
  ['how-it-works', 'How it works'],
];

/** Which landing section is under the middle band of the screen (null over the hero or off the landing page). */
function useActiveSection(enabled: boolean): string | null {
  const [active, setActive] = useState<string | null>(null);
  useEffect(() => {
    setActive(null);
    if (!enabled || !('IntersectionObserver' in window)) return;
    const els = SECTIONS.map(([id]) => document.getElementById(id)).filter((el): el is HTMLElement => Boolean(el));
    const visible = new Set<string>();
    const io = new IntersectionObserver(
      (entries) => {
        entries.forEach((e) => (e.isIntersecting ? visible.add(e.target.id) : visible.delete(e.target.id)));
        setActive(SECTIONS.find(([id]) => visible.has(id))?.[0] ?? null);
      },
      { rootMargin: '-45% 0px -50% 0px' }
    );
    els.forEach((el) => io.observe(el));
    return () => io.disconnect();
  }, [enabled]);
  return active;
}

const Logo: React.FC<{ onClick: () => void }> = ({ onClick }) => (
  <button onClick={onClick} className="text-left cursor-pointer shrink-0" aria-label="NCERT Prep home">
    <BrandLogo tagline />
  </button>
);

export const Navbar: React.FC<NavbarProps> = ({
  currentTab,
  onNavigate,
  onOpenSearch,
  showSearch = true,
}) => {
  const { user, isAdmin, setAuthModalOpen } = useAuth();
  const isUserAdmin = isAdmin;

  const goToSection = (id: string) => {
    if (currentTab !== 'home') onNavigate('home');
    setTimeout(() => document.getElementById(id)?.scrollIntoView({ behavior: 'smooth', block: 'start' }), currentTab === 'home' ? 0 : 150);
  };

  const activeSection = useActiveSection(currentTab === 'home');

  const linkClass = (active: boolean) =>
    `px-3.5 py-2 rounded-[14px] text-sm font-bold border-2 transition-all duration-200 cursor-pointer ${
      active
        ? 'text-[color:var(--brand)] bg-[color:var(--brand-soft)] border-[color:var(--brand-line)] shadow-[0_3px_0_var(--brand-line)] -translate-y-px'
        : 'text-[#4B5168] border-transparent hover:bg-[#FFF6E2] hover:text-[#1E2233]'
    }`;

  return (
    <header className="sticky top-0 z-40 bg-white/95 backdrop-blur border-b-[3px] border-[color:var(--card-line)]">
      <div className="w-full max-w-[1240px] mx-auto px-4 sm:px-6 lg:px-10 h-[74px] flex items-center justify-between gap-4">
        <Logo onClick={() => onNavigate('home')} />

        <nav aria-label="Main" className="hidden md:flex items-center gap-1">
          {SECTIONS.map(([id, label]) => (
            <button key={id} onClick={() => goToSection(id)} aria-current={activeSection === id ? 'true' : undefined} className={linkClass(activeSection === id)}>
              {label}
            </button>
          ))}
          <button onClick={() => onNavigate('demo')} aria-current={currentTab === 'demo' ? 'page' : undefined} className={linkClass(currentTab === 'demo')}>
            Try demo
          </button>
        </nav>

        <div className="flex items-center gap-2">
          {showSearch && (
            <button onClick={onOpenSearch} aria-label="Search lessons" className="p-2 rounded-[14px] text-[#1E2233] hover:bg-[color:var(--page)] cursor-pointer">
              <Search className="w-5 h-5 text-[color:var(--brand)]" />
            </button>
          )}

          {user ? (
            <button
              onClick={() => onNavigate('profile')}
              className="btn-3d [--edge:var(--brand-edge)] inline-flex items-center gap-2 px-4 py-2.5 text-[13px] font-extrabold text-white bg-[color:var(--brand)] hover:bg-[color:var(--brand-hover)] rounded-[14px] cursor-pointer"
            >
              {isUserAdmin ? <Shield className="w-4 h-4 text-[#A9E6D3]" /> : <LayoutDashboard className="w-4 h-4" />}
              <span>{isUserAdmin ? 'Admin Console' : 'Go to App'}</span>
            </button>
          ) : (
            <>
              <button
                onClick={() => setAuthModalOpen(true)}
                className="hidden sm:inline-flex px-[18px] py-2.5 text-[13px] font-extrabold text-[color:var(--brand)] bg-[color:var(--brand-soft)] border-2 border-[color:var(--brand-line)] rounded-[14px] cursor-pointer"
              >
                Sign in
              </button>
              <button
                onClick={() => setAuthModalOpen(true)}
                className="btn-3d [--edge:#E0A81F] inline-flex items-center gap-1.5 px-5 py-2.5 text-[13px] font-extrabold text-[#1E2233] bg-[#FFC53D] hover:bg-[#FFCD55] rounded-[14px] cursor-pointer"
              >
                <LogIn className="w-4 h-4 sm:hidden" />
                <span className="sm:hidden">Sign in</span>
                <span className="hidden sm:inline">Start free</span>
              </button>
            </>
          )}
        </div>
      </div>
    </header>
  );
};
