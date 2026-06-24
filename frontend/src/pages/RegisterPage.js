import { useState, useEffect, useRef } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { checkUsernameAvailable, checkEmailAvailable, getAdminSettings } from '@/lib/db';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import TermsModal from '@/components/TermsModal';
import LoadingScreen from '@/components/LoadingScreen';
import AdminMessageBanner from '@/components/AdminMessageBanner';
import DiscussLogo from '@/components/DiscussLogo';
import { Eye, EyeOff, Loader2, CheckCircle2, XCircle, AlertCircle, Shield, RefreshCw } from 'lucide-react';

function GoogleIcon() {
  return <svg className="w-5 h-5" viewBox="0 0 24 24"><path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 01-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z" fill="#4285F4"/><path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/><path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/><path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/></svg>;
}

export default function RegisterPage() {
  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPw, setShowPw] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);
  const [usernameStatus, setUsernameStatus] = useState(null);
  const [emailStatus, setEmailStatus] = useState(null);
  const [termsAccepted, setTermsAccepted] = useState(false);
  const [showTerms, setShowTerms] = useState(false);
  const [signupEnabled, setSignupEnabled] = useState(true);
  const [settingsLoading, setSettingsLoading] = useState(true);
  const [pageLoading, setPageLoading] = useState(true);
  
  const usernameTimeout = useRef(null);
  const emailTimeout = useRef(null);
  const { register, loginWithGoogle } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    const timer = setTimeout(() => setPageLoading(false), 1500);
    return () => clearTimeout(timer);
  }, []);

  useEffect(() => {
    getAdminSettings().then(settings => {
      setSignupEnabled(settings.signup_enabled !== false);
      setSettingsLoading(false);
    }).catch(() => setSettingsLoading(false));
  }, []);

  // No captcha generated

  useEffect(() => {
    if (usernameTimeout.current) clearTimeout(usernameTimeout.current);
    if (!username.trim()) { setUsernameStatus(null); return; }
    if (username.trim().length < 2) { setUsernameStatus({ type: 'invalid', msg: 'At least 2 characters' }); return; }
    if (!/^[a-zA-Z0-9_]+$/.test(username.trim())) { setUsernameStatus({ type: 'invalid', msg: 'Letters, numbers, underscores only' }); return; }
    
    setUsernameStatus({ type: 'checking', msg: 'Checking...' });
    usernameTimeout.current = setTimeout(async () => {
      try {
        const available = await checkUsernameAvailable(username.trim());
        setUsernameStatus(available 
          ? { type: 'available', msg: 'Username is available' } 
          : { type: 'taken', msg: 'Username is already taken' }
        );
      } catch { setUsernameStatus(null); }
    }, 500);
  }, [username]);

  useEffect(() => {
    if (emailTimeout.current) clearTimeout(emailTimeout.current);
    if (!email.trim()) { setEmailStatus(null); return; }
    if (!/^[^@]+@[^@]+\.[^@]+$/.test(email.trim())) { setEmailStatus({ type: 'invalid', msg: 'Invalid email format' }); return; }
    
    setEmailStatus({ type: 'checking', msg: 'Checking...' });
    emailTimeout.current = setTimeout(async () => {
      try {
        const available = await checkEmailAvailable(email.trim());
        setEmailStatus(available 
          ? { type: 'available', msg: 'Email is available' } 
          : { type: 'taken', msg: 'Email is already registered' }
        );
      } catch { setEmailStatus(null); }
    }, 500);
  }, [email]);

  const passwordConditions = [
    { id: 'length', label: 'At least 8 characters', regex: /^.{8,}$/ },
    { id: 'uppercase', label: 'One uppercase letter (A-Z)', regex: /[A-Z]/ },
    { id: 'lowercase', label: 'One lowercase letter (a-z)', regex: /[a-z]/ },
    { id: 'number', label: 'One number (0-9)', regex: /[0-9]/ },
    { id: 'special', label: 'One special character (@$!%*?&)', regex: /[@$!%*?&#^()_+=\[\]{};':"\\|,.<>\/?~`-]/ },
  ];

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('Standard registration is disabled due to security reasons. Please use Google Authentication to sign up.');
    return;
  };

  const handleGoogle = async () => {
    if (!signupEnabled) return;
    if (!termsAccepted) {
      setError('Please accept the Terms and Conditions before continuing.');
      return;
    }
    setError('');
    setGoogleLoading(true);
    const r = await loginWithGoogle();
    setGoogleLoading(false);
    if (r.success) navigate(location.state?.from || '/feed', { replace: true });
    else if (r.error) setError(r.error);
  };

  const handleTermsAccept = () => {
    setTermsAccepted(true);
    setShowTerms(false);
  };

  const statusIcon = (status) => {
    if (!status) return null;
    if (status.type === 'checking') return <Loader2 className="w-3.5 h-3.5 animate-spin text-[#94A3B8]" />;
    if (status.type === 'available') return <CheckCircle2 className="w-3.5 h-3.5 text-[#10B981]" />;
    if (status.type === 'taken') return <XCircle className="w-3.5 h-3.5 text-[#EF4444]" />;
    if (status.type === 'invalid') return <AlertCircle className="w-3.5 h-3.5 text-[#F59E0B]" />;
    return null;
  };

  const statusColor = (status) => {
    if (!status) return '';
    if (status.type === 'available') return 'border-[#10B981]';
    if (status.type === 'taken') return 'border-[#EF4444]';
    if (status.type === 'invalid') return 'border-[#F59E0B]';
    return '';
  };

  const statusTextColor = (status) => {
    if (!status) return 'text-gray-500';
    if (status.type === 'available') return 'text-[#10B981]';
    if (status.type === 'taken') return 'text-[#EF4444]';
    if (status.type === 'invalid') return 'text-[#F59E0B]';
    return 'text-gray-500';
  };

  if (pageLoading || settingsLoading) {
    return <LoadingScreen message="Loading registration..." />;
  }

  return (
    <div className="min-h-screen bg-black text-[#E1E0CC] flex flex-col relative overflow-hidden">
      <div className="bg-noise absolute inset-0 opacity-[0.08] pointer-events-none" />
      <AdminMessageBanner />

      <div className="flex-1 flex items-center justify-center px-4 py-12 relative z-10">
        <div className="w-full max-w-sm">
          <div className="text-center mb-8">
            <Link to="/" data-testid="register-logo">
              <DiscussLogo size="lg" />
            </Link>
          </div>

          <div className="relative bg-[#101010] rounded-2xl shadow-2xl p-6 md:p-8 border border-white/5 pt-1.5 overflow-hidden">
            <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-[#DC2626] to-[#2563EB]" />

            {!signupEnabled ? (
              <div data-testid="signup-disabled-message" className="text-center py-8">
                <div className="w-16 h-16 bg-[#F59E0B]/10 rounded-full flex items-center justify-center mx-auto mb-4 border border-[#F59E0B]/20">
                  <AlertCircle className="w-8 h-8 text-[#F59E0B]" />
                </div>
                <h3 className="text-white font-bold text-lg mb-2">Sign Up Disabled</h3>
                <p className="text-gray-400 text-[14px] font-medium">Admin has disabled the sign-up process. Thank you.</p>
                <Link to="/login" className="inline-block mt-4 text-[#2563EB] hover:text-[#DC2626] hover:underline font-bold text-[14px]">
                  Go to Login
                </Link>
              </div>
            ) : (
              <>
                {error && (
                  <div data-testid="register-error" className="bg-[#EF4444]/10 border border-[#EF4444]/25 rounded-xl p-3 text-[#EF4444] text-[13px] mb-4 flex items-start gap-2">
                    <XCircle className="w-4 h-4 shrink-0 mt-0.5" /><span>{error}</span>
                  </div>
                )}

                {/* Security Announcement Banner */}
                <div className="bg-[#EF4444]/10 border border-[#EF4444]/30 rounded-xl p-4 text-[#E1E0CC] text-[13px] mb-5 space-y-2">
                  <div className="flex items-center gap-2 text-[#EF4444] font-bold">
                    <Shield className="w-4 h-4 shrink-0" />
                    <span>Security Announcement</span>
                  </div>
                  <p className="text-gray-400 font-medium leading-relaxed">
                    Standard registration (Username, Email, Password) is temporarily disabled due to security reasons. Please use <strong>Google Authentication</strong> below to sign up.
                  </p>
                  <p className="text-gray-500 text-[11px] italic font-semibold">
                    Soon adding more security features. Thank you! <br/>— Discuss Team
                  </p>
                </div>

                <form onSubmit={handleSubmit} className="space-y-4">
                  {/* Username */}
                  <div>
                    <div className="flex items-center justify-between">
                      <label className="text-gray-500 text-[11px] font-bold uppercase tracking-[0.1em] opacity-50">Username</label>
                      {statusIcon(usernameStatus)}
                    </div>
                    <Input disabled data-testid="register-username-input" id="username" name="username" autoComplete="username" value={username} onChange={(e) => setUsername(e.target.value)}
                      placeholder="Disabled due to security reasons"
                      className="mt-1 bg-[#181818]/50 border-white/5 text-gray-500 placeholder:text-gray-600 rounded-xl h-11 cursor-not-allowed" />
                  </div>

                  {/* Email */}
                  <div>
                    <div className="flex items-center justify-between">
                      <label className="text-gray-500 text-[11px] font-bold uppercase tracking-[0.1em] opacity-50">Email</label>
                      {statusIcon(emailStatus)}
                    </div>
                    <Input disabled data-testid="register-email-input" type="email" id="email" name="email" autoComplete="email" value={email} onChange={(e) => setEmail(e.target.value)}
                      placeholder="Disabled due to security reasons"
                      className="mt-1 bg-[#181818]/50 border-white/5 text-gray-500 placeholder:text-gray-600 rounded-xl h-11 cursor-not-allowed" />
                  </div>

                  {/* Password */}
                  <div>
                    <label className="text-gray-500 text-[11px] font-bold uppercase tracking-[0.1em] opacity-50">Password</label>
                    <div className="relative mt-1">
                      <Input disabled data-testid="register-password-input" type="password" id="password" name="password" autoComplete="new-password" value={password}
                        onChange={(e) => setPassword(e.target.value)} placeholder="Disabled due to security reasons"
                        className="bg-[#181818]/50 border-white/5 text-gray-500 placeholder:text-gray-600 rounded-xl h-11 cursor-not-allowed pr-10" />
                    </div>
                  </div>

                  {/* Terms and Conditions */}
                  <div className="flex items-start gap-3 pt-2">
                    <input
                      type="checkbox"
                      id="terms"
                      checked={termsAccepted}
                      onChange={(e) => {
                        setTermsAccepted(e.target.checked);
                        setError('');
                      }}
                      className="w-4 h-4 mt-0.5 accent-[#2563EB] cursor-pointer rounded bg-[#181818] border-white/10"
                      data-testid="register-terms-checkbox"
                    />
                    <label htmlFor="terms" className="text-gray-400 text-xs font-bold cursor-pointer select-none">
                      I agree to the{' '}
                      <button
                        type="button"
                        onClick={() => setShowTerms(true)}
                        className="text-[#2563EB] hover:text-[#DC2626] hover:underline font-bold transition-colors"
                        data-testid="register-terms-link"
                      >
                        Terms and Conditions
                      </button>
                    </label>
                  </div>

                  <Button disabled type="submit" data-testid="register-submit-btn"
                    className="w-full bg-[#181818] border border-white/5 text-gray-500 font-bold rounded-xl py-3 h-12 text-[15px] cursor-not-allowed opacity-40 mt-1">
                    Create Account (Disabled)
                  </Button>
                </form>

                <div className="relative my-6">
                  <div className="absolute inset-0 flex items-center"><div className="w-full border-t border-white/5" /></div>
                  <div className="relative flex justify-center text-[10px]"><span className="bg-[#101010] px-3 text-gray-500 uppercase tracking-widest font-bold">Or continue with</span></div>
                </div>

                <Button type="button" data-testid="register-google-btn" onClick={handleGoogle} disabled={googleLoading}
                  className="w-full bg-[#181818] border border-white/5 text-[#E1E0CC] hover:bg-[#202020] rounded-xl py-2.5 h-11 font-bold flex items-center justify-center gap-2.5 mb-5">
                  {googleLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <><GoogleIcon /> Continue with Google</>}
                </Button>

                <p className="text-center text-gray-500 text-[13px] mt-6 font-medium">
                  Already have an account?{' '}
                  <Link to="/login" data-testid="register-to-login-link" className="text-[#2563EB] hover:text-[#DC2626] hover:underline font-bold transition-colors">
                    Login
                  </Link>
                </p>
              </>
            )}
          </div>

          <div className="text-center mt-6 flex items-center justify-center gap-1.5">
            <Shield className="w-3.5 h-3.5 text-gray-500" />
            <span className="text-gray-500 text-[10px] font-bold uppercase tracking-wider">Secure Authentication</span>
          </div>
        </div>
      </div>

      {/* Footer */}
      <footer className="py-6 text-center border-t border-white/5 relative z-10 bg-black">
        <p className="text-gray-500 text-xs font-semibold">
          Developed by{' '}
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
        onAccept={handleTermsAccept}
        showAcceptButton={!termsAccepted}
      />
    </div>
  );
}
