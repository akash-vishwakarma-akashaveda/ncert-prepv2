import React, { useState } from 'react';
import { BrowserRouter, Navigate, Outlet, Route, Routes, useLocation, useNavigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import { ProgressProvider } from './context/ProgressContext';
import { DoubtsProvider } from './context/DoubtsContext';
import { ToastProvider } from './context/ToastContext';
import { CatalogProvider, useCatalogContext } from './context/CatalogContext';
import { Navbar } from './components/common/Navbar';
import { Footer } from './components/common/Footer';
import { AuthPages } from './components/auth/AuthPages';
import { SearchResultsModal } from './components/search/SearchResultsModal';
import { LandingPage } from './pages/LandingPage';
import { DemoPage } from './pages/DemoPage';
import { PrivacyPage } from './pages/PrivacyPage';
import { ParentConsentPage } from './pages/ParentConsentPage';
import { ResetPasswordPage, VerifyEmailPage } from './pages/EmailLinkPages';
import { StudentLayout } from './student/StudentLayout';
import { HomePage } from './student/pages/HomePage';
import { SubjectDetailPage, SubjectsPage } from './student/pages/SubjectsPage';
import { LessonPage } from './student/pages/LessonPage';
import { DoubtsPage, FocusPage, ProfilePage, RemindersPage, SavedPage } from './student/pages/AccountPages';
import { LeaderboardPage } from './student/pages/LeaderboardPage';
import { TextbooksPage } from './student/pages/TextbooksPage';
import { ErrorBoundary } from './components/common/ErrorBoundary';

type PublicTab = 'home' | 'browse' | 'demo' | 'profile' | 'privacy';
const FULL_BLEED = ['/', '/demo'];
const OPEN_WHEN_SIGNED_IN = ['/privacy', '/demo', '/parent-consent', '/verify-email', '/reset-password'];
const PUBLIC_PATHS: Partial<Record<PublicTab, string>> = { home: '/', browse: '/browse', demo: '/demo', privacy: '/privacy', profile: '/app' };

// Visitor pages: landing, syllabus explorer, privacy, public lesson view.
const PublicLayout: React.FC = () => {
  const { user, loading } = useAuth();
  const { activeVideos } = useCatalogContext();
  const navigate = useNavigate();
  const { pathname } = useLocation();
  const [searchOpen, setSearchOpen] = useState(false);

  // Signed-in users live in /app; privacy and syllabus browser stay readable for all.
  // /parent-consent stays open: a parent signs in there to approve their child's account; so do the
  // email-link pages, which a signed-in user reaches from their inbox.
  if (!loading && user && !OPEN_WHEN_SIGNED_IN.includes(pathname)) {
    const lesson = pathname.match(/^\/watch\/(.+)$/);
    return <Navigate to={lesson ? `/app/lesson/${lesson[1]}` : '/app'} replace />;
  }

  const go = (tab: PublicTab) => navigate(PUBLIC_PATHS[tab] || '/');

  return (
    <div className="min-h-screen flex flex-col text-[#1E2233] bg-[#F5F6FA]">
      <Navbar
        // Only '/' is 'home': elsewhere the section links must navigate home before scrolling.
        currentTab={pathname === '/' ? 'home' : pathname === '/demo' ? 'demo' : 'privacy'}
        onNavigate={go}
        onOpenSearch={() => setSearchOpen(true)}
        showSearch={pathname !== '/'}
      />
      {/* The landing and demo pages draw their own full-width bands; other public pages sit in the site column. */}
      <main className={FULL_BLEED.includes(pathname) ? 'flex-1 w-full min-w-0' : 'flex-1 w-full min-w-0 max-w-[1240px] mx-auto px-4 sm:px-6 lg:px-10 pt-6'}>
        <Outlet context={{ openSearch: () => setSearchOpen(true) }} />
      </main>
      <Footer onNavigate={go} />
      <SearchResultsModal
        isOpen={searchOpen}
        onClose={() => setSearchOpen(false)}
        videos={activeVideos}
        onSelectVideo={(v) => {
          setSearchOpen(false);
          navigate(`/watch/${encodeURIComponent(v.youtube_id)}`);
        }}
      />
    </div>
  );
};

const LandingRoute: React.FC = () => {
  const { classes, allVideos, loading } = useCatalogContext();
  const navigate = useNavigate();
  return (
    <LandingPage
      classes={classes}
      allVideos={allVideos}
      catalogLoading={loading}
      onExploreCurriculum={() => navigate('/demo#explore')}
      onSelectVideo={(v) => navigate(`/watch/${encodeURIComponent(v.youtube_id)}`)}
      onSelectClass={(classSort) => navigate(`/demo?class=${classSort}#explore`)}
      onLaunchDemo={() => navigate('/demo')}
    />
  );
};

// The syllabus explorer lives on the demo page now; old /browse links (and ?class/?subject) land on it.
const BrowseRedirect: React.FC = () => {
  const { search } = useLocation();
  return <Navigate to={`/demo${search}#explore`} replace />;
};

const AdminRoute: React.FC = () => {
  const { user, isAdmin, loading } = useAuth();
  if (loading && !user) return null;
  if (!isAdmin) return <Navigate to={user ? '/app' : '/'} replace />;
  return <Navigate to="/app" replace />;
};

const PrivacyRoute: React.FC = () => {
  const navigate = useNavigate();
  return <PrivacyPage onNavigateHome={() => navigate('/')} />;
};

export const App: React.FC = () => (
  <ErrorBoundary>
  <BrowserRouter>
    <AuthProvider>
      <CatalogProvider>
        <ProgressProvider>
          <ToastProvider>
          <DoubtsProvider>
            <Routes>
              <Route element={<PublicLayout />}>
                <Route path="/" element={<LandingRoute />} />
                <Route path="/browse" element={<BrowseRedirect />} />
                <Route path="/demo" element={<DemoPage />} />
                <Route path="/privacy" element={<PrivacyRoute />} />
                <Route path="/parent-consent" element={<ParentConsentPage />} />
                <Route path="/verify-email" element={<VerifyEmailPage />} />
                <Route path="/reset-password" element={<ResetPasswordPage />} />
                <Route path="/watch/:videoId" element={<LessonPage publicMode />} />
              </Route>

              <Route path="/app" element={<StudentLayout />}>
                <Route index element={<HomePage />} />
                <Route path="subjects" element={<SubjectsPage />} />
                <Route path="subjects/:subject" element={<SubjectDetailPage />} />
                <Route path="textbooks" element={<TextbooksPage />} />
                <Route path="lesson/:videoId" element={<LessonPage />} />
                <Route path="leaderboard" element={<LeaderboardPage />} />
                <Route path="doubts" element={<DoubtsPage />} />
                <Route path="saved" element={<SavedPage />} />
                <Route path="focus" element={<FocusPage />} />
                <Route path="reminders" element={<RemindersPage />} />
                <Route path="profile" element={<ProfilePage />} />
              </Route>

              <Route path="/admin" element={<AdminRoute />} />
              <Route path="*" element={<Navigate to="/" replace />} />
            </Routes>
            <AuthPages isModal />
          </DoubtsProvider>
          </ToastProvider>
        </ProgressProvider>
      </CatalogProvider>
    </AuthProvider>
  </BrowserRouter>
  </ErrorBoundary>
);

export default App;
