import { useState, useEffect, useRef } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { checkUsernameAvailable } from '@/lib/db';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import TermsModal from '@/components/TermsModal';
import AdminMessageBanner from '@/components/AdminMessageBanner';
import DiscussLogo from '@/components/DiscussLogo';
import { Eye, EyeOff, Loader2, CheckCircle2, AlertCircle, Shield } from 'lucide-react';

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
  
  const usernameTimeout = useRef(null);
  const emailTimeout = useRef(null);
  const { register, loginWithGoogle, checkEmailRegistration } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

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
        const result = await checkEmailRegistration(email.trim());
        if (result.exists) {
          setEmailStatus({
            type: 'taken',
            msg: result.provider === 'google'
              ? 'This email is already registered with Google'
              : 'This email is already registered with email and password',
          });
          return;
        }
        setEmailStatus({ type: 'available', msg: 'Email format looks good' });
      } catch {
        setEmailStatus({ type: 'available', msg: 'Email will be verified when you continue' });
      }
    }, 450);
  }, [checkEmailRegistration, email]);

  const passwordConditions = [
    { id: 'length', label: 'At least 8 characters', regex: /^.{8,}$/ },
    { id: 'uppercase', label: 'One uppercase letter (A-Z)', regex: /[A-Z]/ },
    { id: 'lowercase', label: 'One lowercase letter (a-z)', regex: /[a-z]/ },
    { id: 'number', label: 'One number (0-9)', regex: /[0-9]/ },
    { id: 'special', label: 'One special character (@$!%*?&)', regex: /[@$!%*?&#^()_+=\[\]{};':"\\|,.<>\/?~`-]/ },
  ];

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    
    if (!username.trim()) return setError('Username is required');
    if (usernameStatus?.type === 'taken') return setError('Username is already taken');
    if (!email.trim()) return setError('Email is required');
    if (emailStatus?.type === 'taken') return setError(`${emailStatus.msg}. Please sign in instead.`);
    
    const isPasswordValid = passwordConditions.every(cond => cond.regex.test(password));
    if (!isPasswordValid) return setError('Password must meet all complexity requirements');
    if (!termsAccepted) return setError('Please accept the Terms and Conditions');
    
    setLoading(true);
    const r = await register(username.trim(), email.trim(), password);
    setLoading(false);
    
    if (r.success && r.needsVerification) {
      navigate('/login', { 
        state: { 
          verificationMessage: "Account created successfully! We have sent a verification link to your email. Please check your inbox or spam folder (it may take 2 to 3 minutes to arrive)." 
        } 
      });
    } else if (r.success) {
      navigate(location.state?.from || '/feed', { replace: true });
    } else {
      setError(r.error);
    }
  };

  const handleGoogle = async () => {
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
    if (status.type === 'taken') return null;
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

  return (
    <div className="min-h-screen bg-[#FAFAFA] text-neutral-950 flex flex-col relative overflow-hidden">
      <div className="pointer-events-none absolute -left-32 top-24 h-72 w-72 rounded-full bg-red-500/[.07] blur-3xl" />
      <div className="pointer-events-none absolute -right-32 top-1/3 h-80 w-80 rounded-full bg-blue-500/[.08] blur-3xl" />
      <AdminMessageBanner />

      <div className="flex-1 flex items-center justify-center px-4 py-8 sm:py-12 relative z-10">
        <div className="w-full max-w-md">
          <div className="text-center mb-6">
            <Link to="/" data-testid="register-logo">
              <DiscussLogo size="lg" tagged />
            </Link>
          </div>

          <div className="mb-6 text-center">
            <h1 className="text-3xl font-black tracking-[-0.035em] text-neutral-950">Create your account</h1>
            <p className="mt-2 text-sm text-neutral-500">Build your developer identity and join useful conversations.</p>
          </div>

          <div className="relative overflow-hidden rounded-[26px] border border-neutral-200 bg-white p-6 pt-7 shadow-[0_24px_70px_rgba(15,23,42,.10)] sm:p-8">
            <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-[#DC2626] to-[#2563EB]" />

              <>
                {error && (
                  <div data-testid="register-error" role="alert" className="mb-4 rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-[13px] font-semibold leading-5 text-red-700 shadow-sm">
                    <span>{error}</span>
                  </div>
                )}

                <form onSubmit={handleSubmit} className="space-y-4">
                  {/* Username */}
                  <div>
                    <div className="flex items-center justify-between">
                      <label className="text-neutral-500 text-[11px] font-bold uppercase tracking-[0.1em]">Username</label>
                      {statusIcon(usernameStatus)}
                    </div>
                    <Input data-testid="register-username-input" id="username" name="username" autoComplete="username" value={username} onChange={(e) => setUsername(e.target.value)}
                      placeholder="Choose a username"
                      className={`mt-1 h-11 rounded-xl border-neutral-200 bg-[#FAFAFA] text-neutral-950 placeholder:text-neutral-400 focus:border-[#0095F6] focus:ring-2 focus:ring-[#0095F6]/10 ${statusColor(usernameStatus)}`} />
                    {usernameStatus?.msg && (
                      <p className={`text-[11px] mt-1 flex items-center gap-1 font-bold ${statusTextColor(usernameStatus)}`}>
                        {usernameStatus.msg}
                      </p>
                    )}
                  </div>

                  {/* Email */}
                  <div>
                    <div className="flex items-center justify-between">
                      <label className="text-neutral-500 text-[11px] font-bold uppercase tracking-[0.1em]">Email</label>
                      {statusIcon(emailStatus)}
                    </div>
                    <Input data-testid="register-email-input" type="email" id="email" name="email" autoComplete="email" value={email} onChange={(e) => setEmail(e.target.value)}
                      placeholder="name@example.com"
                      className={`mt-1 h-11 rounded-xl border-neutral-200 bg-[#FAFAFA] text-neutral-950 placeholder:text-neutral-400 focus:border-[#0095F6] focus:ring-2 focus:ring-[#0095F6]/10 ${statusColor(emailStatus)}`} />
                    {emailStatus?.msg && (
                      <p className={`text-[11px] mt-1 flex items-center gap-1 font-bold ${statusTextColor(emailStatus)}`}>
                        {emailStatus.msg}
                      </p>
                    )}
                  </div>

                  {/* Password */}
                  <div>
                    <label className="text-neutral-500 text-[11px] font-bold uppercase tracking-[0.1em]">Password</label>
                    <div className="relative mt-1">
                      <Input data-testid="register-password-input" type={showPw ? 'text' : 'password'} id="password" name="password" autoComplete="new-password" value={password}
                        onChange={(e) => setPassword(e.target.value)} placeholder="Enter password (8+ characters)"
                        className="h-11 rounded-xl border-neutral-200 bg-[#FAFAFA] pr-10 text-neutral-950 placeholder:text-neutral-400 focus:border-[#0095F6] focus:ring-2 focus:ring-[#0095F6]/10" />
                      <button type="button" onClick={() => setShowPw(!showPw)} className="absolute right-3 top-1/2 -translate-y-1/2 text-neutral-400 hover:text-neutral-950 transition-colors">
                        {showPw ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                      </button>
                    </div>

                    {/* Password Conditions Checklist */}
                    {password && (
                      <div className="mt-2.5 p-3 bg-[#FAFAFA] border border-neutral-200 rounded-xl space-y-1.5 animate-fade-in">
                        <p className="text-neutral-500 text-[10px] font-bold uppercase tracking-wider mb-1">Password Requirements</p>
                        {passwordConditions.map((cond) => {
                          const isMet = cond.regex.test(password);
                          return (
                            <div key={cond.id} className="flex items-center gap-2 text-xs font-semibold">
                              {isMet ? (
                                <CheckCircle2 className="w-3.5 h-3.5 text-[#10B981] shrink-0" />
                              ) : (
                                <div className="w-3.5 h-3.5 rounded-full border-2 border-neutral-300 shrink-0" />
                              )}
                              <span className={isMet ? 'text-[#10B981]' : 'text-neutral-500'}>{cond.label}</span>
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>

                  {/* Terms and Conditions */}
                  <div className={`flex items-start gap-3 rounded-2xl border p-4 transition-colors ${termsAccepted ? 'border-[#0095F6]/35 bg-blue-50' : 'border-neutral-200 bg-[#FAFAFA]'}`}>
                    <input
                      type="checkbox"
                      id="terms"
                      checked={termsAccepted}
                      onChange={(e) => {
                        setTermsAccepted(e.target.checked);
                        setError('');
                      }}
                      className="mt-0.5 h-5 w-5 shrink-0 cursor-pointer rounded-md accent-[#0095F6]"
                      data-testid="register-terms-checkbox"
                    />
                    <label htmlFor="terms" className="cursor-pointer select-none text-xs leading-5 text-neutral-600">
                      <span className="block font-bold text-neutral-950">Agreement and privacy</span>
                      <span>I have reviewed and agree to the </span>
                      <button
                        type="button"
                        onClick={() => setShowTerms(true)}
                        className="font-bold text-[#0095F6] transition-colors hover:text-blue-300 hover:underline"
                        data-testid="register-terms-link"
                      >
                        Terms and Conditions
                      </button>
                      <span>. Discuss uses this confirmation only to create and protect your account.</span>
                    </label>
                  </div>

                  <Button type="submit" data-testid="register-submit-btn"
                    disabled={loading || usernameStatus?.type === 'taken' || emailStatus?.type === 'taken' || !termsAccepted || !passwordConditions.every(cond => cond.regex.test(password))}
                    className="mt-1 h-12 w-full rounded-xl border-0 bg-[#0095F6] py-3 text-[15px] font-bold text-white shadow-[0_10px_30px_rgba(0,149,246,.2)] transition-all hover:bg-[#1877F2] disabled:cursor-not-allowed disabled:opacity-40">
                    {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Create Account'}
                  </Button>
                </form>

                <div className="relative my-6">
                  <div className="absolute inset-0 flex items-center"><div className="w-full border-t border-neutral-200" /></div>
                  <div className="relative flex justify-center text-[10px]"><span className="bg-white px-3 text-neutral-400 uppercase tracking-widest font-bold">Or continue with</span></div>
                </div>

                <Button type="button" data-testid="register-google-btn" onClick={handleGoogle} disabled={googleLoading}
                  className="mb-5 flex h-11 w-full items-center justify-center gap-2.5 rounded-xl border border-neutral-200 bg-white py-2.5 font-bold text-neutral-900 shadow-sm hover:bg-neutral-50">
                  {googleLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <><GoogleIcon /> Continue with Google</>}
                </Button>

                <p className="text-center text-neutral-500 text-[13px] mt-6 font-medium">
                  Already have an account?{' '}
                  <Link to="/login" data-testid="register-to-login-link" className="text-[#0095F6] hover:text-[#DC2626] hover:underline font-bold transition-colors">
                    Login
                  </Link>
                </p>
              </>
          </div>

          <div className="text-center mt-6 flex items-center justify-center gap-1.5">
            <Shield className="w-3.5 h-3.5 text-neutral-400" />
            <span className="text-neutral-400 text-[10px] font-bold uppercase tracking-wider">Secure authentication</span>
          </div>
        </div>
      </div>

      {/* Footer */}
      <footer className="py-6 text-center border-t border-neutral-200 relative z-10 bg-white">
        <p className="text-neutral-500 text-xs font-semibold">
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
