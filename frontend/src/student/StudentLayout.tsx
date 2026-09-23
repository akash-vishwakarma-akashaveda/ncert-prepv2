import React, { useEffect, useState } from 'react';
import { NavLink, Navigate, Outlet, useLocation, useNavigate, useOutletContext, useSearchParams } from 'react-router-dom';
import {
  Home,
  BookOpen,
  MessageCircleQuestion,
  Bookmark,
  Timer,
  Bell,
  UserRound,
  Shield,
  LogOut,
  Menu,
  X,
  Search,
  PanelLeftClose,
  PanelLeftOpen,
  LayoutDashboard,
  Sliders,
  Layers,
  PlaySquare,
  FileText,
  MessageSquare,
  Database,
  Eye,
  Trophy,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useDoubts } from '../context/DoubtsContext';
import { useCatalogContext } from '../context/CatalogContext';
import { DoubtsService } from '../services/content';
import { FirestoreService } from '../services/firestore';
import { SearchResultsModal } from '../components/search/SearchResultsModal';
import { OnboardingWizard } from '../components/onboarding/OnboardingWizard';
import { ConsentGate } from '../components/consent/ConsentGate';
import { NotificationCard } from '../components/notifications/NotificationCard';
import { classLabel, currentStreak, xpStats } from '../data/gamification';
import { Mascot, Section, tintVars, useStage } from './stage';
import { LogoMark } from '../components/common/Logo';
import { FocusTimer, useFocusTimer } from './useFocusTimer';
import { FloatingPomodoroWidget } from '../components/pomodoro/FloatingPomodoroWidget';
import { ProgressBar, lessonPath, pill } from './ui';
import { useCourse } from './useCourse';
import { UserAvatar } from '../data/avatars';

export interface StudentOutletContext {
  timer: FocusTimer;
  openSearch: () => void;
}

export const useStudentContext = () => useOutletContext<StudentOutletContext>();

const COLLAPSE_KEY = 'ncert_prep_sidebar_collapsed';

interface NavItem {
  to: string;
  label: string;
  icon: React.ElementType;
  end?: boolean;
  badge?: number;
  hint?: string;
  section?: Section;
}

export const StudentLayout: React.FC = () => {
  const { user, isAdmin, loading, signOut } = useAuth();
  const { unreadCount } = useDoubts();
  const { activeVideos, classes } = useCatalogContext();
  const navigate = useNavigate();
  const location = useLocation();
  const [searchParams] = useSearchParams();
  const timer = useFocusTimer();
  const { completedCount } = useCourse();
  const stage = useStage();

  const [drawerOpen, setDrawerOpen] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const [onboardingOpen, setOnboardingOpen] = useState(false);
  const [collapsed, setCollapsed] = useState(() => {
    try {
      return localStorage.getItem(COLLAPSE_KEY) === 'true';
    } catch {
      return false;
    }
  });

  const [adminOpenDoubts, setAdminOpenDoubts] = useState(0);
  const [adminFeedbackCount, setAdminFeedbackCount] = useState(0);
  const [notificationOpen, setNotificationOpen] = useState(false);

  const isUserAdmin = isAdmin;

  useEffect(() => {
    setDrawerOpen(false);
    setNotificationOpen(false);
  }, [location.pathname, location.search]);

  useEffect(() => {
    if (!isUserAdmin) return;
    let active = true;
    const loadCounts = async () => {
      try {
        const doubts = await DoubtsService.listAll();
        if (active) {
          setAdminOpenDoubts(doubts.filter((d) => d.status === 'open').length);
        }
      } catch {
        // ignore
      }
      try {
        const feedback = await FirestoreService.getFeedbackList();
        if (active) {
          setAdminFeedbackCount(feedback.filter((f) => f.status !== 'reviewed').length);
        }
      } catch {
        // ignore
      }
    };
    loadCounts();
    const onLocal = () => loadCounts();
    window.addEventListener('quickprep-local-change', onLocal);
    window.addEventListener('storage', onLocal);
    return () => {
      active = false;
      window.removeEventListener('quickprep-local-change', onLocal);
      window.removeEventListener('storage', onLocal);
    };
  }, [isUserAdmin]);

  useEffect(() => {
    if (!user || isUserAdmin || user.consent?.status !== 'granted') return; // onboarding only after consent
    const done = localStorage.getItem(`ncert_prep_onboarded_${user.userId}`) === 'true' || user.onboarding_completed;
    if (!done || !user.grade_preference) setOnboardingOpen(true);
  }, [user?.userId, user?.grade_preference, user?.onboarding_completed, user?.consent?.status, isUserAdmin]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const tag = (document.activeElement as HTMLElement | null)?.tagName;
      if (e.key === '/' && tag !== 'INPUT' && tag !== 'TEXTAREA' && tag !== 'SELECT') {
        e.preventDefault();
        setSearchOpen(true);
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  if (loading && !user) {
    return <div className="min-h-screen flex items-center justify-center text-sm text-[#6B7280]">Loading…</div>;
  }
  if (!user) return <Navigate to="/" replace />;

  const toggleCollapsed = () =>
    setCollapsed((c) => {
      try {
        localStorage.setItem(COLLAPSE_KEY, String(!c));
      } catch {
        // Preference just won't persist.
      }
      return !c;
    });

  const handleLogout = async () => {
    await signOut();
    navigate('/', { replace: true });
  };

  const classVideos = user.grade_preference && !isUserAdmin
    ? activeVideos.filter((v) => v.class_sort === user.grade_preference)
    : activeVideos;

  const adminNav: NavItem[] = [
    { to: '/app', label: 'Overview', icon: LayoutDashboard, end: true },
    { to: '/app?tab=student-control', label: 'Dashboard Control', icon: Sliders },
    { to: '/app?tab=curriculum', label: 'Classes & Chapters', icon: Layers },
    { to: '/app?tab=videos', label: 'Video Catalog', icon: PlaySquare },
    { to: '/app?tab=notes', label: 'Notes & Cheat Sheets', icon: FileText },
    { to: '/app?tab=doubts', label: 'Student Doubts', icon: MessageCircleQuestion, badge: adminOpenDoubts },
    { to: '/app?tab=feedback', label: 'Student Feedback', icon: MessageSquare, badge: adminFeedbackCount },
    { to: '/app?tab=data', label: 'Data & Sync', icon: Database },
  ];

  const adminAccountNav: NavItem[] = [
    { to: '/browse', label: 'Student Syllabus View', icon: Eye },
    { to: '/app/profile', label: 'Profile & settings', icon: UserRound },
  ];

  const studentNav: NavItem[] = [
    { to: '/app', label: 'Home', icon: Home, end: true, section: 'home' },
    { to: '/app/subjects', label: 'My subjects', icon: BookOpen, section: 'subjects' },
    { to: '/app/leaderboard', label: 'Leaderboard', icon: Trophy, section: 'leaderboard' },
    { to: '/app/doubts', label: 'Doubts', icon: MessageCircleQuestion, badge: unreadCount, section: 'doubts' },
    { to: '/app/saved', label: 'Saved', icon: Bookmark, section: 'saved' },
    { to: '/app/focus', label: 'Focus timer', icon: Timer, hint: timer.running ? timer.label : undefined, section: 'focus' },
    { to: '/app/reminders', label: 'Reminders', icon: Bell, section: 'reminders' },
  ];

  const studentAccountNav: NavItem[] = [
    { to: '/app/profile', label: 'Profile & settings', icon: UserRound, section: 'profile' },
  ];

  const nav: NavItem[] = isUserAdmin ? adminNav : studentNav;
  const accountNav: NavItem[] = isUserAdmin ? adminAccountNav : studentAccountNav;

  const isItemActive = (item: NavItem) => {
    if (isUserAdmin) {
      const currentTab = searchParams.get('tab') || 'overview';
      if (item.to.startsWith('/app?tab=')) {
        const itemTab = new URLSearchParams(item.to.split('?')[1]).get('tab');
        return location.pathname === '/app' && currentTab === itemTab;
      }
      if (item.to === '/app') {
        return location.pathname === '/app' && (!searchParams.get('tab') || currentTab === 'overview');
      }
      if (item.end) {
        return location.pathname === item.to;
      }
      return location.pathname === item.to || location.pathname.startsWith(item.to + '/');
    }

    if (item.end) {
      return location.pathname === item.to;
    }
    return location.pathname === item.to || location.pathname.startsWith(item.to + '/');
  };

  const { level, xp, xpInLevel } = xpStats(completedCount);
  const streak = currentStreak(user);
  const goalMinutes = user.study_goal_minutes || 50;
  const focusMinutes = timer.minutesToday;
  const bellCount = isUserAdmin ? adminOpenDoubts : unreadCount;

  const logo = (compact: boolean, dark: boolean) => (
    <NavLink to="/app" className="flex items-center gap-2.5 min-w-0" aria-label="NCERT Prep home">
      <LogoMark />
      {!compact &&
        (dark ? (
          <span className="flex flex-col leading-tight">
            <span className="font-display text-[15px] text-white">Admin</span>
            <span className="text-[10px] font-bold text-[#8A90A8]">Console</span>
          </span>
        ) : (
          <span className="font-display text-[19px] whitespace-nowrap">
            <span className="text-[#1E2233]">NCERT</span>
            <span className="text-[#12A594]"> Prep</span>
          </span>
        ))}
    </NavLink>
  );

  const sidebar = (compact: boolean) => {
    const dark = isUserAdmin;
    return (
      <div className={`h-full flex flex-col gap-1.5 px-3 py-[18px] ${dark ? 'bg-[#1E2233]' : 'stage-chrome'}`}>
        <div className={`flex items-center pb-4 ${compact ? 'justify-center' : 'justify-between px-1.5'}`}>
          {logo(compact, dark)}
          {!compact && drawerOpen && (
            <button
              onClick={() => setDrawerOpen(false)}
              aria-label="Close menu"
              className={`md:hidden p-1.5 rounded-xl cursor-pointer ${dark ? 'text-[#8A90A8] hover:bg-[#2C3350]' : 'text-[#6B7280] hover:bg-[#F1F3FB]'}`}
            >
              <X className="w-5 h-5" />
            </button>
          )}
        </div>

        {!compact && !dark && (
          <p className="px-2 pb-1 text-[11px] font-extrabold tracking-[0.08em] text-[#9AA1B4]">
            {classLabel(user.grade_preference).toUpperCase()}
          </p>
        )}

        <nav aria-label={dark ? 'Educator' : 'Student'} className="flex-1 overflow-y-auto space-y-1.5 -mx-1 px-1">
          {[...nav, null, ...accountNav].map((item, i) => {
            if (item === null) {
              return <div key={`sep-${i}`} className={`my-2 border-t-2 ${dark ? 'border-[#2C3350]' : 'border-[color:var(--card-line)]'}`} />;
            }
            const active = isItemActive(item);
            const tone = dark
              ? active
                ? 'bg-[#2C3350] text-white'
                : 'text-[#8A90A8] hover:bg-[#262C44] hover:text-white'
              : active
                ? 'bg-[color:var(--brand-soft)] border-[color:var(--brand-line)] text-[color:var(--brand)]'
                : 'text-[#4B5168] hover:bg-[#F1F3FB]';
            return (
              <NavLink
                key={item.to}
                to={item.to}
                title={compact ? item.label : undefined}
                data-active={active || undefined}
                style={item.section ? tintVars(item.section) : undefined}
                className={`nav-item relative flex items-center gap-3 rounded-2xl border-2 border-transparent text-[13px] font-extrabold transition-colors ${
                  compact ? 'justify-center p-2' : 'px-2.5 py-2'
                } ${tone}`}
              >
                {dark ? (
                  <item.icon className="w-[18px] h-[18px] shrink-0" />
                ) : (
                  <span className="section-icon shrink-0 w-7 h-7 rounded-[10px] flex items-center justify-center">
                    <item.icon className="w-4 h-4" strokeWidth={2.4} />
                  </span>
                )}
                {!compact && <span className="flex-1 truncate">{item.label}</span>}
                {!compact && item.hint && <span className="text-xs font-mono text-[#12A594]">{item.hint}</span>}
                {item.badge ? (
                  compact ? (
                    <span className="absolute top-1 right-1 w-2.5 h-2.5 rounded-full bg-[#FF7A59] border-2 border-white" />
                  ) : (
                    <span className="min-w-5 h-5 px-1.5 rounded-full bg-[#FF7A59] text-white text-[10px] font-black flex items-center justify-center">
                      {item.badge > 9 ? '9+' : item.badge}
                    </span>
                  )
                ) : null}
              </NavLink>
            );
          })}
        </nav>

        {!compact && !dark && (
          <NavLink to="/app/focus" className="relative rounded-[18px] bg-[#FFF6E2] border-2 border-dashed border-[#FFD97A] p-3 flex flex-col gap-1.5">
            {stage === 'primary' && <Mascot className="absolute top-1.5 right-2 w-10 animate-bob" />}
            <span className="text-[11px] font-extrabold text-[#8A5A14]">DAILY TARGET</span>
            <span className="font-display text-base text-[#1E2233]">
              {focusMinutes} / {goalMinutes} min
            </span>
            <ProgressBar value={Math.min(100, (focusMinutes / goalMinutes) * 100)} color="#FFC53D" className="!bg-[#FFE7B5]" />
          </NavLink>
        )}

        <div className="pt-1 space-y-1">
          <button
            onClick={handleLogout}
            title={compact ? 'Log out' : undefined}
            className={`w-full flex items-center gap-3 rounded-2xl text-[13px] font-extrabold cursor-pointer ${compact ? 'justify-center p-2.5' : 'px-3 py-2'} ${
              dark ? 'text-[#8A90A8] hover:bg-[#262C44] hover:text-white' : 'text-[#6B7280] hover:bg-[#F1F3FB]'
            }`}
          >
            <LogOut className="w-[18px] h-[18px]" />
            {!compact && 'Log out'}
          </button>
          <button
            onClick={toggleCollapsed}
            aria-label={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
            className={`hidden md:flex w-full items-center gap-3 rounded-2xl text-[13px] font-extrabold cursor-pointer ${compact ? 'justify-center p-2.5' : 'px-3 py-2'} ${
              dark ? 'text-[#8A90A8] hover:bg-[#262C44]' : 'text-[#9AA1B4] hover:bg-[#F1F3FB]'
            }`}
          >
            {collapsed ? <PanelLeftOpen className="w-[18px] h-[18px]" /> : <PanelLeftClose className="w-[18px] h-[18px]" />}
            {!compact && 'Collapse'}
          </button>
        </div>
      </div>
    );
  };

  const mobileNav: NavItem[] = isUserAdmin
    ? [
        { to: '/app', label: 'Overview', icon: LayoutDashboard, end: true },
        { to: '/app?tab=student-control', label: 'Control', icon: Sliders },
        { to: '/app?tab=curriculum', label: 'Classes', icon: Layers },
        { to: '/app?tab=doubts', label: 'Doubts', icon: MessageCircleQuestion, badge: adminOpenDoubts },
        { to: '/app/profile', label: 'Profile', icon: UserRound },
      ]
    : [
        { to: '/app', label: 'Home', icon: Home, end: true, section: 'home' },
        { to: '/app/subjects', label: 'Subjects', icon: BookOpen, section: 'subjects' },
        { to: '/app/leaderboard', label: 'Ranks', icon: Trophy, section: 'leaderboard' },
        { to: '/app/focus', label: 'Focus', icon: Timer, section: 'focus' },
        { to: '/app/doubts', label: 'Doubts', icon: MessageCircleQuestion, badge: unreadCount, section: 'doubts' },
        { to: '/app/profile', label: 'Profile', icon: UserRound, section: 'profile' },
      ];

  return (
    <ConsentGate>
    <div
      className="min-h-screen flex stage-bg text-[#1E2233]"
      data-stage={stage || undefined}
    >
      <aside
        className={`hidden md:block sticky top-0 h-screen shrink-0 transition-[width] duration-200 ${
          isUserAdmin ? '' : 'border-r-[3px] border-[color:var(--card-line)]'
        } ${collapsed ? 'w-[78px]' : 'w-[244px]'}`}
      >
        {sidebar(collapsed)}
      </aside>

      {drawerOpen && (
        <div className="md:hidden fixed inset-0 z-50" role="dialog" aria-modal="true" aria-label="Menu">
          <button className="absolute inset-0 bg-[#1E2233]/50 cursor-default" aria-label="Close menu" onClick={() => setDrawerOpen(false)} />
          <div className="absolute inset-y-0 left-0 w-72 max-w-[85vw] shadow-xl">{sidebar(false)}</div>
        </div>
      )}

      <div className="flex-1 min-w-0 flex flex-col">
        <header className="sticky top-0 z-30 bg-[color:var(--chrome)]/90 backdrop-blur border-b-[3px] border-[color:var(--card-line)] flex items-center gap-2.5 sm:gap-3.5 px-4 sm:px-6 py-3">
          <button onClick={() => setDrawerOpen(true)} aria-label="Open menu" className="md:hidden p-2 -ml-1 rounded-xl hover:bg-[#F1F3FB] cursor-pointer">
            <Menu className="w-5 h-5" />
          </button>

          <button
            onClick={() => setSearchOpen(true)}
            className="flex-1 min-w-0 max-w-[460px] flex items-center gap-2.5 px-3.5 h-11 rounded-2xl bg-[color:var(--page)] border-2 border-[color:var(--card-line)] hover:border-[color:var(--brand-line)] text-[13.5px] font-semibold text-[#9AA1B4] cursor-pointer"
          >
            <Search className="w-4 h-4 shrink-0" strokeWidth={2.6} />
            <span className="flex-1 text-left truncate">
              {isUserAdmin ? 'Search lessons, chapters & catalog…' : 'Search lessons, chapters, subjects…'}
            </span>
            <kbd className="hidden sm:inline text-[11px] px-1.5 py-0.5 rounded-md border-2 border-[#E3E5EC] bg-white font-mono text-[#6B7280]">/</kbd>
          </button>

          <div className="ml-auto flex items-center gap-2 sm:gap-2.5">
            {timer.running && !isUserAdmin && (
              <NavLink
                to="/app/focus"
                title="Focus session running"
                className={`${pill} max-sm:hidden h-10 px-3 font-mono text-[#0B7A67] bg-[#E7F7F1] border-2 border-[#A9E6D3]`}
              >
                <Timer className="w-4 h-4" /> {timer.label}
              </NavLink>
            )}
            {!isUserAdmin && streak > 0 && (
              <span className={`${pill} max-lg:hidden h-10 px-3.5 text-[12.5px] font-black text-[#8A5A14] bg-[#FFF1D6] border-2 border-[#FFD97A]`}>
                <span className="w-2.5 h-2.5 rounded-full bg-[#FF7A59]" /> {streak} day streak
              </span>
            )}
            {!isUserAdmin && (
              <NavLink
                to="/app/leaderboard"
                className={`${pill} max-sm:hidden h-10 px-3.5 gap-2 text-[#0B7A67] bg-[#E7F7F1] border-2 border-[#A9E6D3] hover:border-[#12A594] transition-colors`}
                title={`${xp} XP · View Leaderboard`}
              >
                <Trophy className="w-3.5 h-3.5 text-[#E0A81F]" />
                <span className="text-[12.5px] font-black">Lv {level}</span>
                <span className="w-16 h-2.5 rounded-full bg-[#CDEFE4] overflow-hidden">
                  <span className="block h-full rounded-full bg-[#12A594] transition-all duration-500" style={{ width: `${xpInLevel}%` }} />
                </span>
                <span className="text-[11.5px] text-[#12A594]">{xp} XP</span>
              </NavLink>
            )}
            {/* Notification Bell Icon with Dropdown Flyout Card */}
            <div className="relative">
              <button
                type="button"
                onClick={() => setNotificationOpen((prev) => !prev)}
                className={`relative w-10 h-10 rounded-[14px] border-2 flex items-center justify-center cursor-pointer transition-colors ${
                  notificationOpen
                    ? 'bg-[color:var(--brand-soft)] border-[color:var(--brand)] text-[color:var(--brand)] shadow-sm'
                    : 'bg-[color:var(--page)] border-[color:var(--card-line)] hover:border-[color:var(--brand-line)] text-[#6B7280]'
                }`}
                aria-label={isUserAdmin ? `Notifications (${adminOpenDoubts} open doubts)` : `Notifications${unreadCount ? `, ${unreadCount} new replies` : ''}`}
                aria-expanded={notificationOpen}
                aria-haspopup="dialog"
              >
                <Bell className="w-[18px] h-[18px]" strokeWidth={2.4} />
                {bellCount > 0 && (
                  <span className="absolute -top-1.5 -right-1.5 min-w-5 h-5 px-1 rounded-full bg-[#FF7A59] border-2 border-white text-white text-[10px] font-black flex items-center justify-center shadow-xs">
                    {bellCount > 9 ? '9+' : bellCount}
                  </span>
                )}
              </button>

              <NotificationCard
                isOpen={notificationOpen}
                onClose={() => setNotificationOpen(false)}
                adminOpenDoubts={adminOpenDoubts}
                adminFeedbackCount={adminFeedbackCount}
              />
            </div>
            <NavLink
              to="/app/profile"
              aria-label="Profile"
              className="relative shrink-0 hover:opacity-90 transition-opacity"
            >
              {isUserAdmin ? (
                <div className="w-10 h-10 rounded-[14px] bg-[#1E2233] text-white font-display text-[15px] flex items-center justify-center">
                  <Shield className="w-4 h-4 text-[#A9E6D3]" />
                </div>
              ) : (
                <UserAvatar
                  photoURL={user.photoURL}
                  displayName={user.displayName}
                  size="md"
                  className="ring-2 ring-[color:var(--card-line)]"
                />
              )}
            </NavLink>
          </div>
        </header>

        <main className="flex-1 w-full min-w-0 px-4 sm:px-6 lg:px-8 py-5 sm:py-7 pb-24 md:pb-10">
          <Outlet context={{ timer, openSearch: () => setSearchOpen(true) } satisfies StudentOutletContext} />
        </main>

        <nav
          aria-label={isUserAdmin ? 'Educator navigation' : 'Student navigation'}
          className="md:hidden fixed bottom-0 inset-x-0 z-40 stage-chrome border-t-[3px] border-[color:var(--card-line)] px-1 py-1.5 pb-[max(0.375rem,env(safe-area-inset-bottom))] flex"
        >
          {mobileNav.map((item) => {
            const active = isItemActive(item);
            return (
              <NavLink
                key={item.to}
                to={item.to}
                data-active={active || undefined}
                style={item.section ? tintVars(item.section) : undefined}
                className={`m-nav relative flex-1 min-w-0 flex flex-col items-center py-1 rounded-xl text-[10.5px] font-extrabold ${active ? 'text-[color:var(--brand)]' : 'text-[#9AA1B4]'}`}
              >
                <span className={`m-bubble w-9 h-7 rounded-[10px] flex items-center justify-center ${active ? 'bg-[color:var(--brand-soft)]' : ''}`}>
                  <item.icon className="w-5 h-5" strokeWidth={2.4} />
                </span>
                {item.label}
                {item.badge ? (
                  <span className="absolute top-0 right-2 min-w-4 h-4 px-1 rounded-full bg-[#FF7A59] text-white text-[9px] font-black flex items-center justify-center">
                    {item.badge > 9 ? '9+' : item.badge}
                  </span>
                ) : null}
              </NavLink>
            );
          })}
        </nav>
      </div>

      <SearchResultsModal
        isOpen={searchOpen}
        onClose={() => setSearchOpen(false)}
        videos={classVideos}
        onSelectVideo={(v) => {
          setSearchOpen(false);
          navigate(lessonPath(v.youtube_id));
        }}
      />
      <OnboardingWizard
        isOpen={onboardingOpen}
        onClose={() => setOnboardingOpen(false)}
        onCompleted={() => navigate('/app')}
        classes={classes}
      />
      {!isUserAdmin && <FloatingPomodoroWidget timer={timer} />}
    </div>
    </ConsentGate>
  );
};
