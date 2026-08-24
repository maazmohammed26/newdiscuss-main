import { lazy, Suspense, useEffect, useState } from 'react';
import WelcomeOnboardingModal from '@/components/WelcomeOnboardingModal';
import FloatingNavbar from '@/components/FloatingNavbar';
import { BrowserRouter, Routes, Route, Navigate, useLocation, useNavigate } from 'react-router-dom';
import { AuthProvider, useAuth } from '@/contexts/AuthContext';
import { ThemeProvider, useTheme } from '@/contexts/ThemeContext';
import { HighlightsProvider } from '@/contexts/HighlightsContext';
import { SecurityProvider, useSecurity } from '@/contexts/SecurityContext';
import SecurityLockScreen from '@/components/SecurityLockScreen';
import { Toaster } from '@/components/ui/sonner';
import LoadingScreen from '@/components/LoadingScreen';
import AppErrorBoundary from '@/components/AppErrorBoundary';
import OfflineBanner from '@/components/OfflineBanner';
import { ConfirmDialogProvider } from '@/components/ui/ConfirmDialogProvider';
import '@/App.css';

// ── Lazy-loaded page components ──────────────────────────────────────────────
const LandingPage           = lazy(() => import('@/pages/LandingPage'));
const LoginPage             = lazy(() => import('@/pages/LoginPage'));
const RegisterPage          = lazy(() => import('@/pages/RegisterPage'));
const TermsPage             = lazy(() => import('@/pages/TermsPage'));
const PrivacyPage           = lazy(() => import('@/pages/PrivacyPage'));
const SupportPage           = lazy(() => import('@/pages/SupportPage'));
const FeedPage              = lazy(() => import('@/pages/FeedPage'));
const ProfilePage           = lazy(() => import('@/pages/ProfilePage'));
const PostDetailPage        = lazy(() => import('@/pages/PostDetailPage'));
const UserPostsPage         = lazy(() => import('@/pages/UserPostsPage'));
const ChatPage              = lazy(() => import('@/pages/ChatPage'));
const ChatConversationPage  = lazy(() => import('@/pages/ChatConversationPage'));
const GroupConversationPage = lazy(() => import('@/pages/GroupConversationPage'));
const GroupInfoPage         = lazy(() => import('@/pages/GroupInfoPage'));
const JoinRequestsPage      = lazy(() => import('@/pages/JoinRequestsPage'));
const PulsePage             = lazy(() => import('@/pages/PulsePage'));
const DevRadarPage          = lazy(() => import('@/pages/DevRadarPage'));
const NewsPage              = lazy(() => import('@/pages/NewsPage'));
const NewsDetailPage        = lazy(() => import('@/pages/NewsDetailPage'));
const JobsPage              = lazy(() => import('@/pages/JobsPage'));
const JobDetailPage         = lazy(() => import('@/pages/JobDetailPage'));
const EditorPage            = lazy(() => import('@/pages/EditorPage'));
const BookmarksPage         = lazy(() => import('@/pages/BookmarksPage'));
const AiChatPage            = lazy(() => import('@/pages/AiChatPage'));
const DiscussSherlockPage   = lazy(() => import('@/pages/DiscussSherlockPage'));
const TalentGraphPage       = lazy(() => import('@/pages/TalentGraphPage'));
import SkillsOnboardingModal from '@/components/SkillsOnboardingModal';

// Public static pages
const AboutPage   = lazy(() => import('@/pages/AboutPage'));
const CareersPage = lazy(() => import('@/pages/CareersPage'));
const BlogsPage   = lazy(() => import('@/pages/BlogsPage'));
const ContactPage = lazy(() => import('@/pages/ContactPage'));
const VerifyEmailPage = lazy(() => import('@/pages/VerifyEmailPage'));
const LoginBridgePage = lazy(() => import('@/pages/LoginBridgePage'));
const DownloadPage     = lazy(() => import('@/pages/DownloadPage'));
const SearchPage       = lazy(() => import('@/pages/SearchPage'));
const GuidelinesPage   = lazy(() => import('@/pages/GuidelinesPage'));

const PUBLIC_ROUTES = new Set([
  '/', '/about', '/careers', '/blogs', '/contact', '/login', '/register',
  '/terms', '/privacy', '/support', '/verify-email', '/login-bridge', '/download', '/guidelines',
]);

const isPublicPath = (pathname) => PUBLIC_ROUTES.has(pathname);

function RouteFallback() {
  return (
    <div className="fixed inset-x-0 top-0 z-[120] h-[2px] overflow-hidden bg-transparent" role="progressbar" aria-label="Opening page">
      <div className="h-full w-1/3 animate-[route-progress_900ms_ease-in-out_infinite] bg-gradient-to-r from-[#ED4956] via-[#8B5CF6] to-[#0095F6]" />
    </div>
  );
}

// ── ProtectedRoute ────────────────────────────────────────────────────────────
// Gate for authenticated routes. Shows a loading screen while auth resolves.
// Once resolved, redirects to /login if no user, otherwise renders children.
function ProtectedRoute({ children }) {
  const { user, loading } = useAuth();
  const location = useLocation();

  if (loading) {
    return <LoadingScreen message="Opening Discuss…" compact />;
  }

  if (!user) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  return children;
}

// ── AuthRedirect ──────────────────────────────────────────────────────────────
// Wraps login/register pages. Redirects already-authenticated users to /feed.
function AuthRedirect({ children }) {
  const { user } = useAuth();

  if (user) {
    return <Navigate to="/feed" replace />;
  }

  return children;
}

function HomeRoute() {
  const { user } = useAuth();
  return user ? <Navigate to="/feed" replace /> : <LandingPage />;
}

// ── AppRoutes ─────────────────────────────────────────────────────────────────
function AppRoutes() {
  const { user } = useAuth();
  const location = useLocation();
  const { theme } = useTheme();

  useEffect(() => {
    const root = document.documentElement;
    
    // Public routes that should always render in default light theme
    const isPublicRoute = isPublicPath(location.pathname) && !(location.pathname === '/' && user);

    const isAppRoute = location.pathname === '/feed' || location.pathname === '/search' || location.pathname.startsWith('/post/') || location.pathname.startsWith('/user/');

    if (isPublicRoute || (!user && !isAppRoute)) {
      // Force default light theme (remove all active theme selectors)
      root.classList.remove('dark', 'discuss', 'discuss-light', 'discuss-black', 'discuss-retro');
      root.style.setProperty('--splash-bg', '#F5F5F7');
    } else {
      // Restore selected inside-app theme
      root.classList.remove('dark', 'discuss', 'discuss-light', 'discuss-black', 'discuss-retro');
      
      if (theme === 'dark') {
        root.classList.add('dark');
        root.style.setProperty('--splash-bg', '#000000');
      } else {
        root.classList.remove('dark');
        root.style.setProperty('--splash-bg', '#FFFFFF');
      }
    }
  }, [location.pathname, user, theme]);

  return (
    <Suspense fallback={<RouteFallback />}>
      <Routes>
        {/* Public */}
        <Route path="/" element={<HomeRoute />} />
        <Route path="/about"   element={<AboutPage />} />
        <Route path="/careers" element={<CareersPage />} />
        <Route path="/blogs"   element={<BlogsPage />} />
        <Route path="/contact" element={<ContactPage />} />
        <Route path="/terms"   element={<TermsPage />} />
        <Route path="/privacy" element={<PrivacyPage />} />
        <Route path="/support" element={<SupportPage />} />
        <Route path="/download" element={<DownloadPage />} />
        <Route path="/search" element={<SearchPage />} />
        <Route path="/guidelines" element={<GuidelinesPage />} />

        {/* Auth (redirect if already logged in) */}
        <Route path="/login"    element={<AuthRedirect><LoginPage /></AuthRedirect>} />
        <Route path="/register" element={<AuthRedirect><RegisterPage /></AuthRedirect>} />
        <Route path="/verify-email" element={<VerifyEmailPage />} />
        <Route path="/login-bridge" element={<LoginBridgePage />} />

        {/* Guest Allowed (Public but customized inside) */}
        <Route path="/feed"                    element={<FeedPage />} />
        <Route path="/post/:postId"            element={<PostDetailPage />} />
        <Route path="/user/:userId"            element={<UserPostsPage />} />
        <Route path="/chat"                    element={<ProtectedRoute><ChatPage /></ProtectedRoute>} />
        <Route path="/chat/:otherUserId"       element={<ProtectedRoute><ChatConversationPage /></ProtectedRoute>} />
        <Route path="/group/:groupId"          element={<ProtectedRoute><GroupConversationPage /></ProtectedRoute>} />
        <Route path="/group/:groupId/info"     element={<ProtectedRoute><GroupInfoPage /></ProtectedRoute>} />
        <Route path="/join-requests"           element={<ProtectedRoute><JoinRequestsPage /></ProtectedRoute>} />
        <Route path="/profile"                 element={<ProtectedRoute><ProfilePage /></ProtectedRoute>} />
        <Route path="/pulse"                   element={<ProtectedRoute><PulsePage /></ProtectedRoute>} />
        <Route path="/devradar"                element={<ProtectedRoute><DevRadarPage /></ProtectedRoute>} />
        <Route path="/news"                    element={<NewsPage />} />
        <Route path="/news/:newsId"            element={<NewsDetailPage />} />
        <Route path="/jobs"                    element={<JobsPage />} />
        <Route path="/jobs/:jobId"             element={<JobDetailPage />} />
        <Route path="/editor"                  element={<EditorPage />} />
        <Route path="/bookmarks"               element={<ProtectedRoute><BookmarksPage /></ProtectedRoute>} />
        <Route path="/ai-assistant"            element={<ProtectedRoute><AiChatPage /></ProtectedRoute>} />
        <Route path="/talentgraph"             element={<ProtectedRoute><TalentGraphPage /></ProtectedRoute>} />
        <Route path="/sherlock"                element={<ProtectedRoute><DiscussSherlockPage /></ProtectedRoute>} />

        {/* Fallback */}
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </Suspense>
  );
}

// ── App ───────────────────────────────────────────────────────────────────────
function App() {
  useEffect(() => {
    // Warm the most frequently visited route chunks after first paint. This
    // keeps navigation instant without making the initial bundle heavy.
    const warmRoutes = () => Promise.allSettled([
      import('@/pages/FeedPage'),
      import('@/pages/ChatPage'),
      import('@/pages/ChatConversationPage'),
      import('@/pages/GroupConversationPage'),
      import('@/pages/ProfilePage'),
      import('@/pages/SearchPage'),
    ]);
    const idleId = window.requestIdleCallback
      ? window.requestIdleCallback(warmRoutes, { timeout: 1800 })
      : window.setTimeout(warmRoutes, 700);
    return () => {
      if (window.cancelIdleCallback && typeof idleId === 'number') window.cancelIdleCallback(idleId);
      else window.clearTimeout(idleId);
    };
  }, []);

  return (
    <AppErrorBoundary>
      <BrowserRouter>
        <ThemeProvider>
          <AuthProvider>
            <SecurityProvider>
              <HighlightsProvider>
                <ConfirmDialogProvider>
                  <SecurityWrapper>
                    <OnboardingWrapper>
                      {/* Global offline indicator — always rendered */}
                      <OfflineBanner />
                      <AppRoutes />
                      <Toaster position="top-center" />
                    </OnboardingWrapper>
                  </SecurityWrapper>
                </ConfirmDialogProvider>
              </HighlightsProvider>
            </SecurityProvider>
          </AuthProvider>
        </ThemeProvider>
      </BrowserRouter>
    </AppErrorBoundary>
  );
}

function SecurityWrapper({ children }) {
  const { isLocked, resolving } = useSecurity();
  const { user } = useAuth();

  if (resolving && user) {
    return <LoadingScreen message="Securing your session…" compact />;
  }

  if (isLocked) {
    return <SecurityLockScreen />;
  }

  return children;
}

function OnboardingWrapper({ children }) {
  const { user, loading } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const [showModal, setShowModal] = useState(false);
  const accountId = user?.uid || user?.id;

  useEffect(() => {
    if (!loading && accountId) {
      const key = `discuss2LightNoticeSeen_${accountId}`;
      setShowModal(window.localStorage.getItem(key) !== 'true');
    }
  }, [accountId, loading]);

  const handleClose = () => {
    if (accountId) {
      window.localStorage.setItem(`discuss2LightNoticeSeen_${accountId}`, 'true');
    }
    setShowModal(false);
  };

  const handleOpenThemeSettings = () => {
    handleClose();
    navigate('/profile?section=theme');
  };

  const publicRoutes = ['/', '/about', '/careers', '/blogs', '/contact', '/login', '/register', '/terms', '/privacy', '/support', '/verify-email', '/login-bridge', '/download', '/guidelines'];
  const isPublicRoute = publicRoutes.includes(location.pathname);
  const isAppRoute = location.pathname === '/feed' || location.pathname === '/search' || location.pathname === '/guidelines' || location.pathname.startsWith('/post/') || location.pathname.startsWith('/user/') || location.pathname.startsWith('/news') || location.pathname.startsWith('/jobs');
  const isAiChatRoute = location.pathname === '/ai-assistant';
  const showNavbar = (user || isAppRoute) && !loading && !isPublicRoute && !isAiChatRoute;

  return (
    <>
      <div className={showNavbar ? "md:pl-[100px] lg:pl-0 transition-all duration-300 min-h-screen w-full flex flex-col" : "min-h-screen w-full flex flex-col"}>
        {children}
      </div>
      <WelcomeOnboardingModal open={showModal} onClose={handleClose} onThemeSettings={handleOpenThemeSettings} />
      {user && location.pathname !== '/login-bridge' && <SkillsOnboardingModal />}
      {showNavbar && <div className="lg:hidden"><FloatingNavbar /></div>}
    </>
  );
}

export default App;
