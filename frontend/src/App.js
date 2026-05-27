import { lazy, Suspense, useState, useEffect } from 'react';
import WelcomeOnboardingModal from '@/components/WelcomeOnboardingModal';
import FloatingNavbar from '@/components/FloatingNavbar';
import { BrowserRouter, Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { AuthProvider, useAuth } from '@/contexts/AuthContext';
import { ThemeProvider, useTheme } from '@/contexts/ThemeContext';
import { HighlightsProvider } from '@/contexts/HighlightsContext';
import { SecurityProvider, useSecurity } from '@/contexts/SecurityContext';
import SecurityLockScreen from '@/components/SecurityLockScreen';
import { Toaster } from '@/components/ui/sonner';
import LoadingScreen from '@/components/LoadingScreen';
import AppErrorBoundary from '@/components/AppErrorBoundary';
import PageRouteSkeleton from '@/components/PageRouteSkeleton';
import OfflineBanner from '@/components/OfflineBanner';
import '@/App.css';

// ── Lazy-loaded page components ──────────────────────────────────────────────
const LandingPage           = lazy(() => import('@/pages/LandingPage'));
const LoginPage             = lazy(() => import('@/pages/LoginPage'));
const RegisterPage          = lazy(() => import('@/pages/RegisterPage'));
const TermsPage             = lazy(() => import('@/pages/TermsPage'));
const PrivacyPage           = lazy(() => import('@/pages/PrivacyPage'));
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

// Public static pages
const AboutPage   = lazy(() => import('@/pages/AboutPage'));
const CareersPage = lazy(() => import('@/pages/CareersPage'));
const BlogsPage   = lazy(() => import('@/pages/BlogsPage'));
const ContactPage = lazy(() => import('@/pages/ContactPage'));
const VerifyEmailPage = lazy(() => import('@/pages/VerifyEmailPage'));

// ── ProtectedRoute ────────────────────────────────────────────────────────────
// Gate for authenticated routes. Shows a loading screen while auth resolves.
// Once resolved, redirects to /login if no user, otherwise renders children.
function ProtectedRoute({ children }) {
  const { user, loading } = useAuth();
  const location = useLocation();

  if (loading) {
    return <LoadingScreen message="Checking authentication…" />;
  }

  if (!user) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  return children;
}

// ── AuthRedirect ──────────────────────────────────────────────────────────────
// Wraps login/register pages. Redirects already-authenticated users to /feed.
function AuthRedirect({ children }) {
  const { user, loading } = useAuth();

  if (loading) {
    return <LoadingScreen message="Loading…" />;
  }

  if (user) {
    return <Navigate to="/feed" replace />;
  }

  return children;
}

// ── AppRoutes ─────────────────────────────────────────────────────────────────
function AppRoutes() {
  const { user } = useAuth();
  const location = useLocation();
  const { theme } = useTheme();

  useEffect(() => {
    const root = document.documentElement;
    
    // Public routes that should always render in default light theme
    const publicRoutes = ['/', '/about', '/careers', '/blogs', '/contact', '/login', '/register', '/terms', '/privacy', '/verify-email'];
    const isPublicRoute = publicRoutes.includes(location.pathname);

    const isAppRoute = location.pathname === '/feed' || location.pathname.startsWith('/post/') || location.pathname.startsWith('/user/');

    if (isPublicRoute || (!user && !isAppRoute)) {
      // Force default light theme (remove all active theme selectors)
      root.classList.remove('dark', 'discuss', 'discuss-light', 'discuss-black');
      root.style.setProperty('--splash-bg', '#F5F5F7');
    } else {
      // Restore selected inside-app theme
      root.classList.remove('dark', 'discuss', 'discuss-light', 'discuss-black');
      
      if (theme === 'dark') {
        root.classList.add('dark');
        root.style.setProperty('--splash-bg', '#000000');
      } else if (theme === 'discuss-light') {
        root.classList.add('discuss', 'discuss-light');
        root.style.setProperty('--splash-bg', '#F5F5F7');
      } else if (theme === 'discuss-black') {
        root.classList.add('discuss-black');
        root.style.setProperty('--splash-bg', '#0D0D12');
      } else {
        root.style.setProperty('--splash-bg', '#F5F5F7');
      }
    }
  }, [location.pathname, user, theme]);

  return (
    <Suspense fallback={<PageRouteSkeleton />}>
      <Routes>
        {/* Public */}
        <Route path="/" element={<LandingPage />} />
        <Route path="/about"   element={<AboutPage />} />
        <Route path="/careers" element={<CareersPage />} />
        <Route path="/blogs"   element={<BlogsPage />} />
        <Route path="/contact" element={<ContactPage />} />
        <Route path="/terms"   element={<TermsPage />} />
        <Route path="/privacy" element={<PrivacyPage />} />

        {/* Auth (redirect if already logged in) */}
        <Route path="/login"    element={<AuthRedirect><LoginPage /></AuthRedirect>} />
        <Route path="/register" element={<AuthRedirect><RegisterPage /></AuthRedirect>} />
        <Route path="/verify-email" element={<VerifyEmailPage />} />

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

        {/* Fallback */}
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </Suspense>
  );
}

// ── App ───────────────────────────────────────────────────────────────────────
function App() {
  return (
    <AppErrorBoundary>
      <BrowserRouter>
        <ThemeProvider>
          <AuthProvider>
            <SecurityProvider>
              <HighlightsProvider>
                <SecurityWrapper>
                  <OnboardingWrapper>
                    {/* Global offline indicator — always rendered */}
                    <OfflineBanner />
                    <AppRoutes />
                    <Toaster position="top-right" />
                  </OnboardingWrapper>
                </SecurityWrapper>
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

  if (resolving) {
    return <LoadingScreen message="Securing your session..." />;
  }

  if (isLocked) {
    return <SecurityLockScreen />;
  }

  return children;
}

function OnboardingWrapper({ children }) {
  const { user, loading } = useAuth();
  const location = useLocation();
  const [showModal, setShowModal] = useState(false);

  useEffect(() => {
    if (user?.uid) {
      const key = `showWelcomeModal_${user.uid}`;
      const needsToSee = window.localStorage.getItem(key);
      if (needsToSee === 'true') {
        setShowModal(true);
      }
    }
  }, [user]);

  const handleClose = () => {
    if (user?.uid) {
      window.localStorage.removeItem(`showWelcomeModal_${user.uid}`);
    }
    setShowModal(false);
  };

  const publicRoutes = ['/', '/about', '/careers', '/blogs', '/contact', '/login', '/register', '/terms', '/privacy', '/verify-email'];
  const isPublicRoute = publicRoutes.includes(location.pathname);
  const isAppRoute = location.pathname === '/feed' || location.pathname.startsWith('/post/') || location.pathname.startsWith('/user/') || location.pathname.startsWith('/news') || location.pathname.startsWith('/jobs');
  const showNavbar = (user || isAppRoute) && !loading && !isPublicRoute;

  return (
    <>
      <div className={showNavbar ? "md:pl-[100px] transition-all duration-300 min-h-screen w-full flex flex-col" : "min-h-screen w-full flex flex-col"}>
        {children}
      </div>
      <WelcomeOnboardingModal open={showModal} onClose={handleClose} />
      {showNavbar && <FloatingNavbar />}
    </>
  );
}

export default App;
