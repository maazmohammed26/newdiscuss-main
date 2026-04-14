import { lazy, Suspense } from 'react';
import { BrowserRouter, Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { AuthProvider, useAuth } from '@/contexts/AuthContext';
import { ThemeProvider } from '@/contexts/ThemeContext';
import { HighlightsProvider } from '@/contexts/HighlightsContext';
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
const FeedPage              = lazy(() => import('@/pages/FeedPage'));
const ProfilePage           = lazy(() => import('@/pages/ProfilePage'));
const PostDetailPage        = lazy(() => import('@/pages/PostDetailPage'));
const UserPostsPage         = lazy(() => import('@/pages/UserPostsPage'));
const ChatPage              = lazy(() => import('@/pages/ChatPage'));
const ChatConversationPage  = lazy(() => import('@/pages/ChatConversationPage'));
const GroupConversationPage = lazy(() => import('@/pages/GroupConversationPage'));
const GroupInfoPage         = lazy(() => import('@/pages/GroupInfoPage'));
const JoinRequestsPage      = lazy(() => import('@/pages/JoinRequestsPage'));

// Public static pages
const AboutPage   = lazy(() => import('@/pages/AboutPage'));
const CareersPage = lazy(() => import('@/pages/CareersPage'));
const BlogsPage   = lazy(() => import('@/pages/BlogsPage'));
const ContactPage = lazy(() => import('@/pages/ContactPage'));

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
  return (
    <Suspense fallback={<PageRouteSkeleton />}>
      <Routes>
        {/* Public */}
        <Route path="/" element={<LandingPage />} />
        <Route path="/about"   element={<AboutPage />} />
        <Route path="/careers" element={<CareersPage />} />
        <Route path="/blogs"   element={<BlogsPage />} />
        <Route path="/contact" element={<ContactPage />} />

        {/* Auth (redirect if already logged in) */}
        <Route path="/login"    element={<AuthRedirect><LoginPage /></AuthRedirect>} />
        <Route path="/register" element={<AuthRedirect><RegisterPage /></AuthRedirect>} />

        {/* Protected */}
        <Route path="/feed"                    element={<ProtectedRoute><FeedPage /></ProtectedRoute>} />
        <Route path="/post/:postId"            element={<ProtectedRoute><PostDetailPage /></ProtectedRoute>} />
        <Route path="/user/:userId"            element={<ProtectedRoute><UserPostsPage /></ProtectedRoute>} />
        <Route path="/chat"                    element={<ProtectedRoute><ChatPage /></ProtectedRoute>} />
        <Route path="/chat/:otherUserId"       element={<ProtectedRoute><ChatConversationPage /></ProtectedRoute>} />
        <Route path="/group/:groupId"          element={<ProtectedRoute><GroupConversationPage /></ProtectedRoute>} />
        <Route path="/group/:groupId/info"     element={<ProtectedRoute><GroupInfoPage /></ProtectedRoute>} />
        <Route path="/join-requests"           element={<ProtectedRoute><JoinRequestsPage /></ProtectedRoute>} />
        <Route path="/profile"                 element={<ProtectedRoute><ProfilePage /></ProtectedRoute>} />

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
            <HighlightsProvider>
              {/* Global offline indicator — always rendered */}
              <OfflineBanner />
              <AppRoutes />
              <Toaster position="top-right" />
            </HighlightsProvider>
          </AuthProvider>
        </ThemeProvider>
      </BrowserRouter>
    </AppErrorBoundary>
  );
}

export default App;
