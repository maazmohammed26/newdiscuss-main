import { useState, useEffect, useRef } from 'react';
import { useNavigate, useSearchParams, Link } from 'react-router-dom';
import { applyActionCode, checkActionCode, auth } from '@/lib/firebase';
import { getUserByEmail, updateUser } from '@/lib/db';
import { Button } from '@/components/ui/button';
import DiscussLogo from '@/components/DiscussLogo';
import LoadingScreen from '@/components/LoadingScreen';
import { CheckCircle2, XCircle, Loader2, ArrowRight, Mail } from 'lucide-react';
import { sendWelcomeEmailDirectly } from '@/lib/emailService';

export default function VerifyEmailPage() {
  const [searchParams] = useSearchParams();
  const [status, setStatus] = useState('verifying'); // 'verifying', 'success', 'error'
  const [errorMessage, setErrorMessage] = useState('');
  const [countdown, setCountdown] = useState(5);
  const [emailAddress, setEmailAddress] = useState('');
  
  const navigate = useNavigate();
  const verifiedRef = useRef(false);

  const mode = searchParams.get('mode');
  const oobCode = searchParams.get('oobCode');

  useEffect(() => {
    // Prevent double execution in React 18 Strict Mode
    if (verifiedRef.current) return;

    if (mode !== 'verifyEmail' || !oobCode) {
      setStatus('error');
      setErrorMessage('Invalid action code or link. Please verify you clicked the correct link from your email.');
      return;
    }

    const verifyEmail = async () => {
      verifiedRef.current = true;
      try {
        // 1. Check details of the action code to retrieve the email address
        const info = await checkActionCode(auth, oobCode);
        const email = info.data.email;
        setEmailAddress(email);

        // 2. Apply the verification code in Firebase Auth
        await applyActionCode(auth, oobCode);

        // 3. Sync the verified status in our Realtime Database
        if (email) {
          const dbUser = await getUserByEmail(email);
          if (dbUser && dbUser.id) {
            await updateUser(dbUser.id, { emailVerified: true });
            // Send the welcome onboarding email ONLY after email verification is completed!
            await sendWelcomeEmailDirectly(email, dbUser.username);
          }
        }

        setStatus('success');
      } catch (err) {
        console.error('[VerifyEmail] Error verifying email:', err);
        setStatus('error');
        setErrorMessage(err.message || 'The verification link has expired or already been used. Please request a new link.');
      }
    };

    verifyEmail();
  }, [mode, oobCode]);

  // Countdown timer for automatic redirect
  useEffect(() => {
    if (status !== 'success') return;

    if (countdown <= 0) {
      navigate('/login', { 
        replace: true,
        state: { verificationMessage: 'Your email has been verified! You can now log in below.' } 
      });
      return;
    }

    const timer = setTimeout(() => {
      setCountdown(prev => prev - 1);
    }, 1000);

    return () => clearTimeout(timer);
  }, [status, countdown, navigate]);

  if (status === 'verifying') {
    return <LoadingScreen message="Verifying your email address..." />;
  }

  return (
    <div className="min-h-screen bg-black text-[#E1E0CC] flex flex-col relative overflow-hidden">
      <div className="bg-noise absolute inset-0 opacity-[0.08] pointer-events-none" />
      
      <div className="flex-1 flex items-center justify-center px-4 relative z-10 py-12">
        <div className="w-full max-w-md">
          {/* Logo */}
          <div className="text-center mb-8">
            <Link to="/">
              <DiscussLogo size="lg" />
            </Link>
          </div>

          {/* Card */}
          <div className="relative bg-[#101010] rounded-2xl shadow-2xl p-8 border border-white/5 pt-1.5 overflow-hidden text-center">
            <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-[#DC2626] to-[#2563EB]" />

            {status === 'success' ? (
              <div className="space-y-6 py-6">
                <div className="w-20 h-20 bg-[#10B981]/10 rounded-full flex items-center justify-center mx-auto border border-[#10B981]/25 animate-pulse shadow-[0_0_30px_rgba(16,185,129,0.15)]">
                  <CheckCircle2 className="w-10 h-10 text-[#10B981]" />
                </div>
                
                <div>
                  <h2 className="text-white font-extrabold text-2xl tracking-tight mb-2">Email Verified!</h2>
                  <p className="text-gray-400 text-sm font-semibold max-w-xs mx-auto leading-relaxed">
                    Success! Your email address <span className="text-white font-bold">{emailAddress}</span> has been verified.
                  </p>
                </div>

                <div className="bg-[#181818] border border-white/5 rounded-2xl p-4 max-w-sm mx-auto">
                  <p className="text-gray-500 text-xs font-bold uppercase tracking-wider mb-1">Auto Redirection</p>
                  <p className="text-white text-sm font-bold">
                    Redirecting to login in <span className="text-[#2563EB] text-base font-black px-1 animate-bounce inline-block">{countdown}</span> seconds...
                  </p>
                </div>

                <div className="pt-2">
                  <Button 
                    onClick={() => navigate('/login', { state: { verificationMessage: 'Your email has been verified! You can now log in below.' } })}
                    className="w-full bg-[#181818] hover:bg-[#202020] border border-white/5 text-white font-bold rounded-xl py-3 h-12 text-[15px] hover:border-[#DC2626]/40 hover:shadow-[0_4px_16px_rgba(220,38,38,0.1)] transition-all flex items-center justify-center gap-2"
                  >
                    <span>Go back and login now</span>
                    <ArrowRight className="w-4 h-4" />
                  </Button>
                </div>
              </div>
            ) : (
              <div className="space-y-6 py-6">
                <div className="w-20 h-20 bg-[#EF4444]/10 rounded-full flex items-center justify-center mx-auto border border-[#EF4444]/25 shadow-[0_0_30px_rgba(239,68,68,0.1)]">
                  <XCircle className="w-10 h-10 text-[#EF4444]" />
                </div>

                <div>
                  <h2 className="text-white font-extrabold text-2xl tracking-tight mb-2">Verification Failed</h2>
                  <p className="text-gray-400 text-sm font-semibold max-w-xs mx-auto leading-relaxed">
                    {errorMessage}
                  </p>
                </div>

                <div className="flex flex-col gap-3 pt-4">
                  <Button 
                    onClick={() => navigate('/login')}
                    className="w-full bg-[#181818] hover:bg-[#202020] border border-white/5 text-white font-bold rounded-xl py-3 h-12 text-[15px] hover:border-[#2563EB]/40 hover:shadow-[0_4px_16px_rgba(37,99,235,0.1)] transition-all"
                  >
                    Go to Login Page
                  </Button>
                  
                  <Link 
                    to="/register" 
                    className="text-[#2563EB] hover:text-[#DC2626] hover:underline font-bold text-xs transition-colors"
                  >
                    Create a new account
                  </Link>
                </div>
              </div>
            )}
          </div>

          {/* Footer links */}
          <div className="text-center mt-6 flex items-center justify-center gap-1.5">
            <Mail className="w-3.5 h-3.5 text-gray-500" />
            <span className="text-gray-500 text-[10px] font-bold uppercase tracking-wider">Email Verification Center</span>
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
    </div>
  );
}
