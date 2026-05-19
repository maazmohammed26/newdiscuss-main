import { useState, useEffect } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import TermsModal from '@/components/TermsModal';
import LoadingScreen from '@/components/LoadingScreen';
import AdminMessageBanner from '@/components/AdminMessageBanner';
import DiscussLogo from '@/components/DiscussLogo';
import { Eye, EyeOff, Loader2, XCircle, Shield, AlertCircle, RefreshCw, CheckCircle2 } from 'lucide-react';

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
  const [captchaInput, setCaptchaInput] = useState('');
  const [captchaTarget, setCaptchaTarget] = useState('');
  const [loading, setLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);
  const [showTerms, setShowTerms] = useState(false);
  const [showForgotDisabled, setShowForgotDisabled] = useState(false);
  const [pageLoading, setPageLoading] = useState(true);
  const { login, loginWithGoogle } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    const timer = setTimeout(() => setPageLoading(false), 1500);
    return () => clearTimeout(timer);
  }, []);

  const generateCaptcha = () => {
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789';
    let result = '';
    for (let i = 0; i < 6; i++) {
        result += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    setCaptchaTarget(result);
    setCaptchaInput('');
  };

  useEffect(() => {
    generateCaptcha();
  }, []);

  if (pageLoading) {
    return <LoadingScreen message="Loading login..." />;
  }

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    if (!email.trim()) return setError('Email is required');
    if (!password) return setError('Password is required');
    if (captchaInput !== captchaTarget) {
      generateCaptcha();
      return setError('Incorrect CAPTCHA entered');
    }
    setLoading(true);
    const r = await login(email, password);
    setLoading(false);
    if (r.success) navigate(location.state?.from || '/feed', { replace: true });
    else setError(r.error);
  };

  const handleGoogle = async () => {
    if (captchaInput !== captchaTarget) {
      setError('Please enter the correctly verified CAPTCHA also.');
      return;
    }
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
    <div className="min-h-screen bg-black text-[#E1E0CC] flex flex-col relative overflow-hidden">
      <div className="bg-noise absolute inset-0 opacity-[0.08] pointer-events-none" />
      <AdminMessageBanner />
      
      <div className="flex-1 flex items-center justify-center px-4 relative z-10 py-12">
        <div className="w-full max-w-sm">
          {/* Logo */}
          <div className="text-center mb-8">
            <Link to="/" data-testid="login-logo">
              <DiscussLogo size="lg" />
            </Link>
          </div>

          {/* Card */}
          <div className="relative bg-[#101010] rounded-2xl shadow-2xl p-6 md:p-8 border border-white/5 pt-1.5 overflow-hidden">
            <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-[#DC2626] to-[#2563EB]" />

            {error && (
              <div data-testid="login-error" className="bg-[#EF4444]/10 border border-[#EF4444]/25 rounded-xl p-3 text-[#EF4444] text-[13px] mb-4 flex items-start gap-2 font-medium">
                <XCircle className="w-4 h-4 shrink-0 mt-0.5" /><span>{error}</span>
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
                <label className="text-gray-500 text-[11px] font-bold uppercase tracking-[0.1em]">Email Address</label>
                <Input data-testid="login-email-input" type="email" value={email}
                  onChange={(e) => { setEmail(e.target.value); setError(''); }}
                  placeholder="name@example.com"
                  className="mt-1.5 bg-[#181818] border-white/5 text-white placeholder:text-gray-600 focus:border-[#DC2626] rounded-xl h-11" />
              </div>
              <div>
                <div className="flex justify-between items-center">
                  <label className="text-gray-500 text-[11px] font-bold uppercase tracking-[0.1em]">Password</label>
                  <button 
                    type="button"
                    onClick={handleForgotPassword}
                    className="text-[#2563EB] hover:text-[#DC2626] text-[12px] font-bold hover:underline"
                    data-testid="login-forgot-password"
                  >
                    Forgot?
                  </button>
                </div>
                <div className="relative mt-1.5">
                  <Input data-testid="login-password-input" type={showPw ? 'text' : 'password'} value={password}
                    onChange={(e) => { setPassword(e.target.value); setError(''); }}
                    placeholder="Enter password"
                    className="bg-[#181818] border-white/5 text-white placeholder:text-gray-600 focus:border-[#DC2626] rounded-xl h-11 pr-10" />
                  <button type="button" onClick={() => setShowPw(!showPw)} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-white transition-colors">
                    {showPw ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              {/* CAPTCHA */}
              <div>
                <label className="text-gray-500 text-[11px] font-bold uppercase tracking-[0.1em]">Security CAPTCHA</label>
                <div className="flex items-center gap-3 mt-1.5 mb-2">
                  <div className="relative flex-1 max-w-[140px] bg-[#181818] border border-white/5 rounded-xl h-11 flex items-center justify-center overflow-hidden select-none">
                    <span className="font-mono text-lg font-black tracking-[0.3em] text-[#DEDBC8]">{captchaTarget}</span>
                  </div>
                  <button
                    type="button"
                    onClick={generateCaptcha}
                    title="Refresh CAPTCHA"
                    className="p-2 text-gray-500 hover:text-white transition-colors rounded-xl bg-[#181818] border border-white/5"
                  >
                    <RefreshCw className="w-5 h-5" />
                  </button>
                </div>
                <div className="relative">
                  <Input data-testid="login-captcha-input" type="text" value={captchaInput} onChange={(e) => { setCaptchaInput(e.target.value); setError(''); }}
                    placeholder="Enter above characters"
                    className="bg-[#181818] border-white/5 text-white placeholder:text-gray-600 focus:border-[#DC2626] rounded-xl h-11 pr-10" />
                  <div className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none flex items-center">
                    {captchaInput.length > 0 && captchaInput === captchaTarget ? (
                      <CheckCircle2 className="w-5 h-5 text-green-500" />
                    ) : captchaInput.length > 0 ? (
                      <XCircle className="w-5 h-5 text-red-500" />
                    ) : null}
                  </div>
                </div>
                {captchaInput.length > 0 && captchaInput !== captchaTarget && (
                   <span className="text-red-500 text-[11px] mt-1 flex items-center gap-1 font-medium">
                     <XCircle className="w-3 h-3" /><span>CAPTCHA does not match</span>
                   </span>
                )}
              </div>

              <Button type="submit" data-testid="login-submit-btn" disabled={loading}
                className="w-full bg-[#181818] hover:bg-[#202020] border border-white/5 text-white font-bold rounded-xl py-3 h-12 text-[15px] hover:border-[#DC2626]/40 hover:shadow-[0_4px_16px_rgba(220,38,38,0.1)] transition-all">
                {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <span>Login</span>}
              </Button>
            </form>

            <div className="relative my-6">
              <div className="absolute inset-0 flex items-center"><div className="w-full border-t border-white/5" /></div>
              <div className="relative flex justify-center text-[10px]"><span className="bg-[#101010] px-3 text-gray-500 uppercase tracking-widest font-bold">Or continue with</span></div>
            </div>

            <Button type="button" data-testid="login-google-btn" onClick={handleGoogle} disabled={googleLoading}
              className="w-full bg-[#181818] border border-white/5 text-[#E1E0CC] hover:bg-[#202020] rounded-xl py-2.5 h-11 font-bold flex items-center justify-center gap-2.5">
              {googleLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <><GoogleIcon /> <span>Continue with Google</span></>}
            </Button>

            <p className="text-center text-gray-500 text-[13px] mt-6 font-medium">
              <span>New to discuss? </span><Link to="/register" data-testid="login-to-register-link" className="text-[#2563EB] hover:text-[#DC2626] hover:underline font-bold transition-colors">Create account</Link>
            </p>
          </div>

          {/* Footer links */}
          <div className="text-center mt-6 flex items-center justify-center gap-1.5">
            <Shield className="w-3.5 h-3.5 text-gray-500" />
            <span className="text-gray-500 text-[10px] font-bold uppercase tracking-wider">Secure Authentication</span>
          </div>
          <div className="text-center mt-2 flex items-center justify-center">
            <button 
              onClick={() => setShowTerms(true)}
              className="text-gray-500 text-xs hover:text-white hover:underline transition-colors font-medium"
              data-testid="login-terms-link"
            >
              Terms and Conditions
            </button>
          </div>
        </div>
      </div>

      {/* Footer */}
      <footer className="py-6 text-center border-t border-white/5 relative z-10 bg-black">
        <p className="text-gray-500 text-xs font-semibold">
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
