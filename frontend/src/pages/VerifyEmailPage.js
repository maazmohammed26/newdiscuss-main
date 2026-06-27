import { useState, useEffect, useRef } from 'react';
import { useNavigate, useSearchParams, Link } from 'react-router-dom';
import { applyActionCode, checkActionCode, auth } from '@/lib/firebase';
import { getUserByEmail, updateUser, getPendingOTP, deletePendingOTP, savePendingOTP } from '@/lib/db';
import { Button } from '@/components/ui/button';
import DiscussLogo from '@/components/DiscussLogo';
import LoadingScreen from '@/components/LoadingScreen';
import { CheckCircle2, XCircle, Loader2, ArrowRight, Mail, KeyRound, ShieldAlert, Sparkles, Send, RefreshCw } from 'lucide-react';
import { sendVerificationOTPDirectly, sendWelcomeEmailDirectly } from '@/lib/emailService';

export default function VerifyEmailPage() {
  const [searchParams] = useSearchParams();
  const [status, setStatus] = useState('otp-entry'); // 'verifying-link', 'otp-entry', 'success', 'error'
  const [errorMessage, setErrorMessage] = useState('');
  const [successMessage, setSuccessMessage] = useState('');
  const [countdown, setCountdown] = useState(5);
  
  // OTP input and sending states
  const [otpValues, setOtpValues] = useState(Array(6).fill(''));
  const [verifyingOtp, setVerifyingOtp] = useState(false);
  const [otpSent, setOtpSent] = useState(false);
  
  // Resend/Send OTP countdown states
  const [resendCountdown, setResendCountdown] = useState(120); // 2 minutes countdown
  const [canSendOtp, setCanSendOtp] = useState(false);
  const [sendingOtp, setSendingOtp] = useState(false);
  
  // Stored metadata refs
  const [emailAddress, setEmailAddress] = useState('');
  const [username, setUsername] = useState('');
  const [verifyUid, setVerifyUid] = useState('');
  
  const navigate = useNavigate();
  const verifiedRef = useRef(false);
  const inputRefs = useRef([]);

  const mode = searchParams.get('mode');
  const oobCode = searchParams.get('oobCode');

  // Load metadata from localStorage on mount
  useEffect(() => {
    const storedUid = window.localStorage.getItem('verifyUid') || '';
    const storedEmail = window.localStorage.getItem('verifyEmail') || '';
    const storedUsername = window.localStorage.getItem('verifyUsername') || '';
    
    setVerifyUid(storedUid);
    setEmailAddress(storedEmail);
    setUsername(storedUsername);

    // If there is an oobCode in URL, prioritize standard Firebase verification link flow
    if (mode === 'verifyEmail' && oobCode) {
      handleLinkVerification(oobCode);
    }
  }, [mode, oobCode]);

  // Resend countdown timer for manual Send OTP button
  useEffect(() => {
    if (status !== 'otp-entry' || resendCountdown <= 0) {
      if (resendCountdown <= 0) setCanSendOtp(true);
      return;
    }

    const timer = setInterval(() => {
      setResendCountdown(prev => {
        if (prev <= 1) {
          setCanSendOtp(true);
          clearInterval(timer);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [status, resendCountdown]);

  // Countdown timer for automatic redirect on success
  useEffect(() => {
    if (status !== 'success') return;

    if (countdown <= 0) {
      navigate('/login', { 
        replace: true,
        state: { verificationMessage: 'Your email has been verified successfully! You can now log in below.' } 
      });
      return;
    }

    const timer = setTimeout(() => {
      setCountdown(prev => prev - 1);
    }, 1000);

    return () => clearTimeout(timer);
  }, [status, countdown, navigate]);

  // Handle standard Firebase Action Link verification
  const handleLinkVerification = async (code) => {
    if (verifiedRef.current) return;
    verifiedRef.current = true;
    setStatus('verifying-link');
    
    try {
      // 1. Resolve email address from code
      const info = await checkActionCode(auth, code);
      const email = info.data.email;
      if (email) setEmailAddress(email);

      // 2. Apply action code in Firebase
      await applyActionCode(auth, code);

      // 3. Sync verified status in Database
      if (email) {
        const dbUser = await getUserByEmail(email);
        if (dbUser && dbUser.id) {
          await updateUser(dbUser.id, { emailVerified: true });
          // Send welcome email directly
          await sendWelcomeEmailDirectly(email, dbUser.username);
        }
      }

      setStatus('success');
      setSuccessMessage('Your email address has been verified successfully via verification link!');
    } catch (err) {
      console.error('[VerifyEmail] Action link error:', err);
      setStatus('error');
      setErrorMessage(err.message || 'The verification link has expired or has already been used.');
    }
  };

  // Handle individual OTP input changes and auto-focus next field
  const handleOtpChange = (index, value) => {
    if (isNaN(value)) return; // Allow numbers only
    
    const newValues = [...otpValues];
    newValues[index] = value.substring(value.length - 1); // Keep last char
    setOtpValues(newValues);

    // Auto-focus next field if a number is typed
    if (value && index < 5) {
      inputRefs.current[index + 1]?.focus();
    }
  };

  // Handle backspace navigation in OTP fields
  const handleKeyDown = (index, e) => {
    if (e.key === 'Backspace' && !otpValues[index] && index > 0) {
      const newValues = [...otpValues];
      newValues[index - 1] = ''; // Clear previous field
      setOtpValues(newValues);
      inputRefs.current[index - 1]?.focus();
    }
  };

  // Handle pasting full 6-digit OTP code
  const handlePaste = (e) => {
    e.preventDefault();
    const pastedData = e.clipboardData.getData('text').trim();
    if (!/^\d{6}$/.test(pastedData)) return; // Allow exactly 6 digits only

    const newValues = pastedData.split('');
    setOtpValues(newValues);
    inputRefs.current[5]?.focus();
  };

  // Handle manual OTP trigger when Send OTP button is clicked
  const handleTriggerOtp = async () => {
    if (!canSendOtp || sendingOtp || otpSent || !emailAddress || !verifyUid) return;

    setSendingOtp(true);
    setErrorMessage('');
    setSuccessMessage('');

    try {
      // 1. Generate new 6-digit OTP
      const newOtp = Math.floor(100000 + Math.random() * 900000).toString();
      
      // 2. Save in database (5 minutes validity)
      await savePendingOTP(verifyUid, emailAddress, username || 'Discuss Member', newOtp);

      // 3. Dispatch styled Brevo OTP HTML email
      const success = await sendVerificationOTPDirectly(emailAddress, username || 'Discuss Member', newOtp);
      if (!success) throw new Error('Failed to send verification code. Please try again.');

      // 4. Update state to permanently disable the button and show OTP entry fields
      setOtpSent(true);
      setSuccessMessage('A secure 6-digit verification code has been sent successfully. Please check your email.');
      
      // Focus first input field after brief mount timeout
      setTimeout(() => {
        inputRefs.current[0]?.focus();
      }, 100);
    } catch (err) {
      console.error('[VerifyEmail] Manual OTP dispatch failed:', err);
      setErrorMessage(err.message || 'Failed to dispatch verification code.');
    } finally {
      setSendingOtp(false);
    }
  };

  // Handle OTP Submission and Validation
  const handleOtpSubmit = async (e) => {
    if (e) e.preventDefault();
    const fullOtp = otpValues.join('');
    
    if (fullOtp.length !== 6) {
      setErrorMessage('Please enter all 6 digits of the verification code.');
      return;
    }

    if (!verifyUid) {
      setErrorMessage('No active verification session found. Please register or attempt to log in first.');
      return;
    }

    setVerifyingOtp(true);
    setErrorMessage('');
    
    try {
      // 1. Fetch OTP record from Realtime Database
      const otpData = await getPendingOTP(verifyUid);

      if (!otpData) {
        throw new Error('Verification code is invalid or has expired. Please request a new code.');
      }

      // 2. Enforce 5-minute expiry limit
      if (Date.now() > otpData.expiresAt) {
        await deletePendingOTP(verifyUid); // Cleanup expired code
        throw new Error('This verification code has expired (valid for 5 minutes).');
      }

      // 3. Match entered code against stored OTP
      if (otpData.otp !== fullOtp) {
        throw new Error('Incorrect verification code. Please check the code sent to your email and try again.');
      }

      // 4. Verification Successful! Sync status in Database
      const userEmail = otpData.email;
      const userUsername = otpData.username;

      // Update user status
      await updateUser(verifyUid, { emailVerified: true });
      
      // Send welcome onboarding email
      await sendWelcomeEmailDirectly(userEmail, userUsername);

      // 5. Delete pending OTP from database immediately
      await deletePendingOTP(verifyUid);

      // 6. Cleanup localStorage metadata
      window.localStorage.removeItem('verifyUid');
      window.localStorage.removeItem('verifyEmail');
      window.localStorage.removeItem('verifyUsername');

      setStatus('success');
      setSuccessMessage('Your email address has been verified successfully via security OTP!');
    } catch (err) {
      console.error('[VerifyEmail] OTP validation failed:', err);
      setErrorMessage(err.message || 'OTP verification failed.');
    } finally {
      setVerifyingOtp(false);
    }
  };

  // Format resend countdown timer (MM:SS)
  const formatTime = (seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  if (status === 'verifying-link') {
    return <LoadingScreen message="Verifying your link code with Firebase..." />;
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
          <div className="relative bg-[#101010] rounded-2xl shadow-2xl p-6 md:p-8 border border-white/5 pt-1.5 overflow-hidden text-center">
            <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-[#DC2626] to-[#2563EB]" />

            {/* Error Message */}
            {errorMessage && (
              <div className="bg-[#EF4444]/10 border border-[#EF4444]/25 rounded-xl p-3 text-[#EF4444] text-[13px] mb-4 text-left flex items-start gap-2 font-medium">
                <XCircle className="w-4.5 h-4.5 shrink-0 mt-0.5" />
                <span>{errorMessage}</span>
              </div>
            )}

            {/* Success Message Banner */}
            {successMessage && (
              <div className="bg-[#10B981]/10 border border-[#10B981]/25 rounded-xl p-3 text-[#10B981] text-[13px] mb-4 text-left flex items-start gap-2 font-medium">
                <CheckCircle2 className="w-4.5 h-4.5 shrink-0 mt-0.5 text-[#10B981]" />
                <span>{successMessage}</span>
              </div>
            )}

            {status === 'success' ? (
              <div className="space-y-6 py-6 animate-fade-in">
                <div className="w-20 h-20 bg-[#10B981]/10 rounded-full flex items-center justify-center mx-auto border border-[#10B981]/25 shadow-[0_0_30px_rgba(16,185,129,0.15)]">
                  <CheckCircle2 className="w-10 h-10 text-[#10B981]" />
                </div>
                
                <div>
                  <h2 className="text-white font-extrabold text-2xl tracking-tight mb-2">Email Verified!</h2>
                  <p className="text-gray-400 text-sm font-semibold max-w-xs mx-auto leading-relaxed">
                    Success! Your email address <span className="text-white font-bold">{emailAddress}</span> is now active.
                  </p>
                </div>

                <div className="bg-[#181818] border border-white/5 rounded-2xl p-4 max-w-sm mx-auto">
                  <p className="text-gray-500 text-xs font-bold uppercase tracking-wider mb-1">Redirecting shortly</p>
                  <p className="text-white text-sm font-bold">
                    Redirecting to login in <span className="text-[#2563EB] text-base font-black px-1 animate-bounce inline-block">{countdown}</span> seconds...
                  </p>
                </div>

                <div className="pt-2">
                  <Button 
                    onClick={() => navigate('/login')}
                    className="w-full bg-[#181818] hover:bg-[#202020] border border-white/5 text-white font-bold rounded-xl py-3 h-12 text-[15px] hover:border-[#DC2626]/40 hover:shadow-[0_4px_16px_rgba(220,38,38,0.1)] transition-all flex items-center justify-center gap-2"
                  >
                    <span>Login now</span>
                    <ArrowRight className="w-4 h-4" />
                  </Button>
                </div>
              </div>
            ) : status === 'error' ? (
              <div className="space-y-6 py-6 animate-fade-in">
                <div className="w-20 h-20 bg-[#EF4444]/10 rounded-full flex items-center justify-center mx-auto border border-[#EF4444]/25 shadow-[0_0_30px_rgba(239,68,68,0.1)]">
                  <XCircle className="w-10 h-10 text-[#EF4444]" />
                </div>

                <div>
                  <h2 className="text-white font-extrabold text-2xl tracking-tight mb-2">Verification Failed</h2>
                  <p className="text-gray-400 text-sm font-semibold max-w-xs mx-auto leading-relaxed">
                    We could not complete your account verification. The code might be expired or already used.
                  </p>
                </div>

                <div className="flex flex-col gap-3 pt-4">
                  <Button 
                    onClick={() => { setStatus('otp-entry'); setErrorMessage(''); }}
                    className="w-full bg-[#181818] hover:bg-[#202020] border border-white/5 text-white font-bold rounded-xl py-3 h-12 text-[15px] hover:border-[#2563EB]/40 hover:shadow-[0_4px_16px_rgba(37,99,235,0.1)] transition-all"
                  >
                    Go Back to Verification Screen
                  </Button>
                  
                  <Link 
                    to="/register" 
                    className="text-[#2563EB] hover:text-[#DC2626] hover:underline font-bold text-xs transition-colors"
                  >
                    Create a new account
                  </Link>
                </div>
              </div>
            ) : (
              /* Verification Screen */
              <div className="space-y-6 py-4 animate-fade-in">
                <div className="w-14 h-14 bg-[#2563EB]/10 rounded-2xl flex items-center justify-center mx-auto border border-[#2563EB]/25 mb-2">
                  <Mail className="w-6 h-6 text-[#2563EB]" />
                </div>

                <div>
                  <h2 className="text-white font-extrabold text-2xl tracking-tight mb-2">Activate Your Account</h2>
                  {emailAddress ? (
                    <p className="text-gray-400 text-xs font-semibold leading-relaxed max-w-xs mx-auto">
                      We have sent a verification link natively via Firebase to your email:<br />
                      <span className="text-white font-bold">{emailAddress}</span><br />
                      Click that link in your inbox to verify instantly.
                    </p>
                  ) : (
                    <p className="text-gray-400 text-xs font-semibold max-w-xs mx-auto">
                      Please check your inbox or spam folder for the default Firebase verification link.
                    </p>
                  )}
                </div>

                {/* Dynamic OTP Inputs Reveal - Shown ONLY if OTP has been requested and sent */}
                {otpSent ? (
                  <div className="space-y-5 py-2 border-t border-b border-white/5 animate-fade-in">
                    <div className="flex items-center justify-center gap-1.5 text-xs font-bold text-[#10B981] bg-[#10B981]/5 border border-[#10B981]/15 rounded-xl p-3">
                      <KeyRound className="w-4 h-4" />
                      <span>Enter the 6-digit code sent to your email below:</span>
                    </div>

                    <form onSubmit={handleOtpSubmit} className="space-y-4">
                      <div className="flex justify-center gap-2 md:gap-3" onPaste={handlePaste}>
                        {otpValues.map((digit, index) => (
                          <input
                            key={index}
                            ref={el => inputRefs.current[index] = el}
                            type="text"
                            maxLength="1"
                            value={digit}
                            onChange={e => handleOtpChange(index, e.target.value)}
                            onKeyDown={e => handleKeyDown(index, e)}
                            className="w-11 h-12 md:w-12 md:h-14 bg-[#181818] border border-white/5 text-[#E1E0CC] font-bold text-lg md:text-xl text-center rounded-xl focus:border-[#DC2626] focus:ring-1 focus:ring-[#DC2626]/20 transition-all outline-none"
                          />
                        ))}
                      </div>

                      <Button 
                        type="submit" 
                        disabled={verifyingOtp || otpValues.some(val => !val)}
                        className="w-full bg-[#181818] hover:bg-[#202020] border border-white/5 text-white font-bold rounded-xl py-3 h-12 text-[15px] hover:border-[#DC2626]/40 hover:shadow-[0_4px_16px_rgba(220,38,38,0.1)] transition-all disabled:opacity-40 disabled:cursor-not-allowed"
                      >
                        {verifyingOtp ? <Loader2 className="w-4 h-4 animate-spin mx-auto" /> : 'Confirm Code & Activate'}
                      </Button>
                    </form>
                  </div>
                ) : (
                  /* Initial Info State (before OTP is sent) */
                  <div className="bg-[#141414] border border-white/5 rounded-2xl p-4 text-xs font-semibold text-gray-500 text-left space-y-2 leading-relaxed">
                    <p className="text-white font-bold">Standard Verification:</p>
                    <p>Check your email for the native verification link sent by Firebase. Clicking that link is the easiest way to activate your account.</p>
                    <p className="text-white font-bold pt-1">Backup OTP Verification:</p>
                    <p>If you didn't receive the native link, you can request a secure 6-digit OTP code below after the 2-minute cooldown timer expires.</p>
                  </div>
                )}

                {/* Send OTP Manual Button Section */}
                <div className="pt-2 border-t border-white/5">
                  {otpSent ? (
                    /* Permanently Disabled After Sending - ONLY ONCE SEND IS ALLOWED */
                    <div className="flex items-center justify-center gap-2 text-xs font-bold text-gray-400 bg-[#141414] rounded-xl p-3.5 border border-white/5">
                      <Send className="w-3.5 h-3.5 text-[#10B981]" />
                      <span>OTP Code Sent to Email Successfully (One-time only)</span>
                    </div>
                  ) : (
                    /* Initial Countdown/Send Button */
                    <Button
                      onClick={handleTriggerOtp}
                      disabled={!canSendOtp || sendingOtp}
                      className="w-full bg-[#181818] hover:bg-[#202020] border border-white/5 text-white font-bold rounded-xl py-3 h-12 text-[14px] hover:border-[#2563EB]/40 hover:shadow-[0_4px_16px_rgba(37,99,235,0.1)] transition-all disabled:opacity-40 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                    >
                      {sendingOtp ? (
                        <Loader2 className="w-4 h-4 animate-spin" />
                      ) : !canSendOtp ? (
                        <>
                          <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                          <span>Request backup OTP in {formatTime(resendCountdown)}</span>
                        </>
                      ) : (
                        <>
                          <Sparkles className="w-3.5 h-3.5 text-[#2563EB]" />
                          <span>Send OTP to Email</span>
                        </>
                      )}
                    </Button>
                  )}
                </div>

                {/* Monospace Security Warning */}
                <div className="bg-[#181818] border border-red-950/20 rounded-xl p-4 text-left border-l-2 border-l-[#DC2626]">
                  <div className="flex items-start gap-2.5">
                    <ShieldAlert className="w-5 h-5 text-[#DC2626] shrink-0 mt-0.5" />
                    <div>
                      <p className="text-[#DC2626] text-[10px] font-bold uppercase tracking-wider mb-1">Security Warning</p>
                      <p className="text-gray-500 text-[10px] font-bold leading-normal font-mono">
                        Do not share this verification code with anyone. Discuss support staff will never ask for your verification code. If you did not request this, please ignore this screen.
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Footer links */}
          <div className="text-center mt-6 flex items-center justify-center gap-1.5">
            <Mail className="w-3.5 h-3.5 text-gray-500" />
            <span className="text-gray-500 text-[10px] font-bold uppercase tracking-wider">Discuss Activation Center</span>
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
