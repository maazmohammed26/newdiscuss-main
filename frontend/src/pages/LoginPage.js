import { useState } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import TermsModal from '@/components/TermsModal';
import AdminMessageBanner from '@/components/AdminMessageBanner';
import DiscussLogo from '@/components/DiscussLogo';
import { Eye, EyeOff, Loader2, XCircle, Shield, AlertCircle, CheckCircle2 } from 'lucide-react';

function GoogleIcon() {
  return (
    <svg className="w-5 h-5" viewBox="0 0 24 24">
      <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 01-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z" fill="#4285F4"/>
      <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
      <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/>
      <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
    </svg>
  );
}

export default function LoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPw, setShowPw] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);
  const [showTerms, setShowTerms] = useState(false);
  const [showForgotDisabled, setShowForgotDisabled] = useState(false);
  const { login, loginWithGoogle } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    if (!email.trim()) return setError('Email is required');
    if (!password) return setError('Password is required');
    setLoading(true);
    const r = await login(email, password);
    setLoading(false);
    if (r.success) navigate(location.state?.from || '/feed', { replace: true });
    else setError(r.error);
  };

  const handleGoogle = async () => {
    setError('');
    setGoogleLoading(true);
    const r = await loginWithGoogle();
    setGoogleLoading(false);
    if (r.success) navigate(location.state?.from || '/feed', { replace: true });
    else if (r.error) setError(r.error);
  };

  const handleForgotPassword = () => {
    setShowForgotDisabled(true);
  };

  return (
    <div className="min-h-screen bg-[#FAFAFA] text-neutral-950 flex flex-col relative overflow-hidden">
      <div className="pointer-events-none absolute -left-32 top-24 h-72 w-72 rounded-full bg-red-500/[.07] blur-3xl" />
      <div className="pointer-events-none absolute -right-32 top-1/3 h-80 w-80 rounded-full bg-blue-500/[.08] blur-3xl" />
      <AdminMessageBanner />
      
      <div className="flex-1 flex items-center justify-center px-4 relative z-10 py-8 sm:py-12">
        <div className="w-full max-w-md">
          {/* Logo */}
          <div className="text-center mb-6">
            <Link to="/" data-testid="login-logo">
              <DiscussLogo size="lg" tagged />
            </Link>
          </div>

          <div className="mb-6 text-center">
            <h1 className="text-3xl font-black tracking-[-0.035em] text-neutral-950">Welcome back</h1>
            <p className="mt-2 text-sm text-neutral-500">Continue to your discussions, groups, and developer network.</p>
          </div>

          {/* Card */}
          <div className="relative overflow-hidden rounded-[26px] border border-neutral-200 bg-white p-6 pt-7 shadow-[0_24px_70px_rgba(15,23,42,.10)] sm:p-8">
            <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-[#DC2626] to-[#2563EB]" />

            {error && (
              <div data-testid="login-error" role="alert" className="mb-4 rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-[13px] font-semibold leading-5 text-red-700 shadow-sm">
                <span>{error}</span>
              </div>
            )}

            {location.state?.verificationMessage && (
              <div data-testid="verification-success-message" className="bg-[#10B981]/10 border border-[#10B981]/25 rounded-xl p-3 text-[#10B981] text-[13px] mb-4 flex items-start gap-2 font-medium shadow-[0_0_15px_rgba(16,185,129,0.15)]">
                <CheckCircle2 className="w-4.5 h-4.5 shrink-0 mt-0.5 text-[#10B981]" />
                <span>{location.state.verificationMessage}</span>
              </div>
            )}

            {showForgotDisabled && (
              <div data-testid="forgot-disabled-message" className="bg-[#F59E0B]/10 border border-[#F59E0B]/25 rounded-xl p-3 text-[#FCD34D] text-[13px] mb-4 flex items-start gap-2 font-medium">
                <AlertCircle className="w-4 h-4 shrink-0 mt-0.5 text-[#F59E0B]" />
                <span>Admin has disabled this feature. Thank you.</span>
                <button onClick={() => setShowForgotDisabled(false)} className="ml-auto text-[#FCD34D] hover:opacity-80">
                  <XCircle className="w-4 h-4" />
                </button>
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="text-neutral-500 text-[11px] font-bold uppercase tracking-[0.1em]">Email Address</label>
                <Input data-testid="login-email-input" type="email" id="email" name="email" autoComplete="username" value={email}
                  onChange={(e) => { setEmail(e.target.value); setError(''); }}
                  placeholder="name@example.com"
                  className="mt-1.5 h-11 rounded-xl border-neutral-200 bg-[#FAFAFA] text-neutral-950 placeholder:text-neutral-400 focus:border-[#0095F6] focus:ring-2 focus:ring-[#0095F6]/10" />
              </div>
              <div>
                <div className="flex justify-between items-center">
                  <label className="text-neutral-500 text-[11px] font-bold uppercase tracking-[0.1em]">Password</label>
                  <button 
                    type="button"
                    onClick={handleForgotPassword}
                    className="text-[#0095F6] hover:text-[#DC2626] text-[12px] font-bold hover:underline"
                    data-testid="login-forgot-password"
                  >
                    Forgot?
                  </button>
                </div>
                <div className="relative mt-1.5">
                  <Input data-testid="login-password-input" type={showPw ? 'text' : 'password'} id="password" name="password" autoComplete="current-password" value={password}
                    onChange={(e) => { setPassword(e.target.value); setError(''); }}
                    placeholder="Enter password"
                    className="h-11 rounded-xl border-neutral-200 bg-[#FAFAFA] pr-10 text-neutral-950 placeholder:text-neutral-400 focus:border-[#0095F6] focus:ring-2 focus:ring-[#0095F6]/10" />
                  <button type="button" onClick={() => setShowPw(!showPw)} className="absolute right-3 top-1/2 -translate-y-1/2 text-neutral-400 hover:text-neutral-900 transition-colors">
                    {showPw ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>



              <Button type="submit" data-testid="login-submit-btn" disabled={loading}
                className="h-12 w-full rounded-xl border-0 bg-[#0095F6] py-3 text-[15px] font-bold text-white shadow-[0_10px_30px_rgba(0,149,246,.2)] transition-all hover:bg-[#1877F2]">
                {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <span>Sign in</span>}
              </Button>
            </form>

            <div className="relative my-6">
              <div className="absolute inset-0 flex items-center"><div className="w-full border-t border-neutral-200" /></div>
              <div className="relative flex justify-center text-[10px]"><span className="bg-white px-3 text-neutral-400 uppercase tracking-widest font-bold">Or continue with</span></div>
            </div>

            <Button type="button" data-testid="login-google-btn" onClick={handleGoogle} disabled={googleLoading}
              className="flex h-11 w-full items-center justify-center gap-2.5 rounded-xl border border-neutral-200 bg-white py-2.5 font-bold text-neutral-900 shadow-sm hover:bg-neutral-50">
              {googleLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <><GoogleIcon /> <span>Continue with Google</span></>}
            </Button>

            <p className="text-center text-neutral-500 text-[13px] mt-6 font-medium">
              <span>New to discuss? </span><Link to="/register" data-testid="login-to-register-link" className="text-[#0095F6] hover:text-[#DC2626] hover:underline font-bold transition-colors">Create account</Link>
            </p>
          </div>

          {/* Footer links */}
          <div className="text-center mt-6 flex items-center justify-center gap-1.5">
            <Shield className="w-3.5 h-3.5 text-neutral-400" />
            <span className="text-neutral-400 text-[10px] font-bold uppercase tracking-wider">Secure authentication</span>
          </div>
          <div className="text-center mt-2 flex items-center justify-center">
            <button 
              onClick={() => setShowTerms(true)}
              className="text-neutral-500 text-xs hover:text-neutral-950 hover:underline transition-colors font-medium"
              data-testid="login-terms-link"
            >
              Terms and Conditions
            </button>
          </div>
        </div>
      </div>

      {/* Footer */}
      <footer className="py-6 text-center border-t border-neutral-200 relative z-10 bg-white">
        <p className="text-neutral-500 text-xs font-semibold">
          <span>Developed by </span>
          <Link
            to="/about"
            className="shining-red-blue-text font-black hover:underline"
          >
            &lt;mma/&gt;
          </Link>
        </p>
      </footer>
      <style>{`
        @keyframes shine-red-blue {
          0% { background-position: -200% center; }
          100% { background-position: 200% center; }
        }
        .shining-red-blue-text {
          background: linear-gradient(120deg, #DC2626 25%, #93C5FD 50%, #2563EB 75%);
          background-size: 200% auto;
          -webkit-background-clip: text;
          -webkit-text-fill-color: transparent;
          animation: shine-red-blue 3.5s linear infinite;
          text-shadow: 0 0 8px rgba(220, 38, 38, 0.25);
          font-weight: 800;
          display: inline-block;
        }
      `}</style>

      <TermsModal 
        open={showTerms} 
        onClose={() => setShowTerms(false)} 
        showAcceptButton={false}
      />
    </div>
  );
}
