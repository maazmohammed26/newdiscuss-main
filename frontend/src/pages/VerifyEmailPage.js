import { useEffect, useRef, useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { applyActionCode, checkActionCode, auth } from '@/lib/firebase';
import { deletePendingOTP, getPendingOTP, getUserByEmail, savePendingOTP, updateUser } from '@/lib/db';
import { sendVerificationOTPDirectly, sendWelcomeEmailDirectly } from '@/lib/emailService';
import { Button } from '@/components/ui/button';
import DiscussLogo from '@/components/DiscussLogo';
import LoadingScreen from '@/components/LoadingScreen';
import { ArrowRight, CheckCircle2, KeyRound, Loader2, Mail, MailPlus, RefreshCw, ShieldCheck, XCircle } from 'lucide-react';

const INITIAL_LINK_WAIT_SECONDS = 120;
const OTP_COOLDOWN_SECONDS = 300;

export default function VerifyEmailPage() {
  const [searchParams] = useSearchParams();
  const [status, setStatus] = useState('otp-entry');
  const [errorMessage, setErrorMessage] = useState('');
  const [successMessage, setSuccessMessage] = useState('');
  const [otpValues, setOtpValues] = useState(Array(6).fill(''));
  const [verifyingOtp, setVerifyingOtp] = useState(false);
  const [otpSent, setOtpSent] = useState(false);
  const [resendCountdown, setResendCountdown] = useState(INITIAL_LINK_WAIT_SECONDS);
  const [canSendOtp, setCanSendOtp] = useState(false);
  const [sendingOtp, setSendingOtp] = useState(false);
  const [emailAddress, setEmailAddress] = useState('');
  const [username, setUsername] = useState('');
  const [verifyUid, setVerifyUid] = useState('');

  const navigate = useNavigate();
  const verifiedRef = useRef(false);
  const inputRefs = useRef([]);
  const mode = searchParams.get('mode');
  const oobCode = searchParams.get('oobCode');

  const cooldownKey = (uid) => `verifyOtpCooldownUntil_${uid}`;

  useEffect(() => {
    document.title = 'Verify your email | Discuss';
    const storedUid = window.localStorage.getItem('verifyUid') || '';
    const storedEmail = window.localStorage.getItem('verifyEmail') || '';
    const storedUsername = window.localStorage.getItem('verifyUsername') || '';
    setVerifyUid(storedUid);
    setEmailAddress(storedEmail);
    setUsername(storedUsername);

    if (storedUid) {
      const cooldownUntil = Number(window.localStorage.getItem(cooldownKey(storedUid)) || 0);
      if (cooldownUntil > Date.now()) {
        setOtpSent(true);
        setCanSendOtp(false);
        setResendCountdown(Math.ceil((cooldownUntil - Date.now()) / 1000));
      }
    }

    if (mode === 'verifyEmail' && oobCode) handleLinkVerification(oobCode);
  }, [mode, oobCode]);

  useEffect(() => {
    if (status !== 'otp-entry' || resendCountdown <= 0) {
      if (resendCountdown <= 0) setCanSendOtp(true);
      return undefined;
    }
    const timer = window.setInterval(() => {
      setResendCountdown((current) => {
        if (current <= 1) {
          setCanSendOtp(true);
          return 0;
        }
        return current - 1;
      });
    }, 1000);
    return () => window.clearInterval(timer);
  }, [status, resendCountdown]);

  const handleLinkVerification = async (code) => {
    if (verifiedRef.current) return;
    verifiedRef.current = true;
    setStatus('verifying-link');
    try {
      const info = await checkActionCode(auth, code);
      const email = info.data.email;
      if (email) setEmailAddress(email);
      await applyActionCode(auth, code);
      if (email) {
        const dbUser = await getUserByEmail(email);
        if (dbUser?.id) {
          await updateUser(dbUser.id, { emailVerified: true });
          await sendWelcomeEmailDirectly(email, dbUser.username);
        }
      }
      setStatus('success');
      setSuccessMessage('Your email address is verified.');
    } catch (error) {
      console.error('[VerifyEmail] Action link error:', error);
      setStatus('error');
      setErrorMessage(error.message || 'This verification link has expired or has already been used.');
    }
  };

  const handleOtpChange = (index, value) => {
    if (!/^\d*$/.test(value)) return;
    const next = [...otpValues];
    next[index] = value.slice(-1);
    setOtpValues(next);
    if (value && index < 5) inputRefs.current[index + 1]?.focus();
  };

  const handleKeyDown = (index, event) => {
    if (event.key === 'Backspace' && !otpValues[index] && index > 0) inputRefs.current[index - 1]?.focus();
  };

  const handlePaste = (event) => {
    const value = event.clipboardData.getData('text').trim();
    if (!/^\d{6}$/.test(value)) return;
    event.preventDefault();
    setOtpValues(value.split(''));
    inputRefs.current[5]?.focus();
  };

  const handleTriggerOtp = async () => {
    if (!canSendOtp || sendingOtp || !emailAddress || !verifyUid) return;
    setSendingOtp(true);
    setErrorMessage('');
    setSuccessMessage('');
    try {
      const nextOtp = Math.floor(100000 + Math.random() * 900000).toString();
      await savePendingOTP(verifyUid, emailAddress, username || 'Discuss Member', nextOtp);
      const sent = await sendVerificationOTPDirectly(emailAddress, username || 'Discuss Member', nextOtp);
      if (!sent) throw new Error('We could not send the verification code. Please try again.');

      const cooldownUntil = Date.now() + OTP_COOLDOWN_SECONDS * 1000;
      window.localStorage.setItem(cooldownKey(verifyUid), String(cooldownUntil));
      setOtpSent(true);
      setCanSendOtp(false);
      setResendCountdown(OTP_COOLDOWN_SECONDS);
      setOtpValues(Array(6).fill(''));
      setSuccessMessage('A six-digit code was sent to your email. It is valid for five minutes.');
      window.setTimeout(() => inputRefs.current[0]?.focus(), 100);
    } catch (error) {
      console.error('[VerifyEmail] OTP dispatch failed:', error);
      setErrorMessage(error.message || 'Verification code could not be sent.');
    } finally {
      setSendingOtp(false);
    }
  };

  const handleOtpSubmit = async (event) => {
    event?.preventDefault();
    const enteredOtp = otpValues.join('');
    if (enteredOtp.length !== 6) return setErrorMessage('Enter all six digits from your email.');
    if (!verifyUid) return setErrorMessage('No active verification session was found. Please register or sign in again.');

    setVerifyingOtp(true);
    setErrorMessage('');
    try {
      const otpData = await getPendingOTP(verifyUid);
      if (!otpData) throw new Error('This code is invalid or expired. Request a new code.');
      if (Date.now() > otpData.expiresAt) {
        await deletePendingOTP(verifyUid);
        throw new Error('This code expired after five minutes. Request a new code.');
      }
      if (otpData.otp !== enteredOtp) throw new Error('That code does not match the one sent to your email.');

      await updateUser(verifyUid, { emailVerified: true });
      await sendWelcomeEmailDirectly(otpData.email, otpData.username);
      await deletePendingOTP(verifyUid);
      ['verifyUid', 'verifyEmail', 'verifyUsername', cooldownKey(verifyUid)].forEach((key) => window.localStorage.removeItem(key));
      setStatus('success');
      setSuccessMessage('Your email address is verified.');
    } catch (error) {
      console.error('[VerifyEmail] OTP validation failed:', error);
      setErrorMessage(error.message || 'Verification failed.');
    } finally {
      setVerifyingOtp(false);
    }
  };

  const formatTime = (seconds) => `${String(Math.floor(seconds / 60)).padStart(2, '0')}:${String(seconds % 60).padStart(2, '0')}`;

  if (status === 'verifying-link') return <LoadingScreen message="Verifying your email…" compact />;

  return (
    <div className="relative flex min-h-screen flex-col overflow-hidden bg-[#FAFAFA] text-neutral-950">
      <div className="pointer-events-none absolute -left-28 top-20 h-72 w-72 rounded-full bg-red-500/[.07] blur-3xl" />
      <div className="pointer-events-none absolute -right-32 top-1/3 h-80 w-80 rounded-full bg-blue-500/[.08] blur-3xl" />

      <main className="relative z-10 flex flex-1 items-center justify-center px-4 py-10 sm:py-14">
        <div className="w-full max-w-md">
          <div className="mb-7 text-center"><Link to="/"><DiscussLogo size="lg" tagged /></Link></div>
          <section className="relative overflow-hidden rounded-[28px] border border-neutral-200 bg-white p-6 text-center shadow-[0_24px_70px_rgba(15,23,42,.10)] sm:p-8">
            <div className="absolute inset-x-0 top-0 h-1 bg-gradient-to-r from-[#ED4956] via-[#8B5CF6] to-[#0095F6]" />

            {errorMessage && <div className="mb-5 flex items-start gap-2 rounded-xl border border-red-200 bg-red-50 p-3 text-left text-[13px] font-medium text-red-700"><XCircle className="mt-0.5 h-4 w-4 shrink-0" /><span>{errorMessage}</span></div>}
            {successMessage && status !== 'success' && <div className="mb-5 flex items-start gap-2 rounded-xl border border-emerald-200 bg-emerald-50 p-3 text-left text-[13px] font-medium text-emerald-700"><CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0" /><span>{successMessage}</span></div>}

            {status === 'success' ? (
              <div className="py-7">
                <div className="mx-auto grid h-16 w-16 place-items-center rounded-full bg-emerald-50 text-emerald-600 ring-8 ring-emerald-50/60"><CheckCircle2 className="h-8 w-8" /></div>
                <p className="mt-7 text-[11px] font-extrabold uppercase tracking-[.18em] text-emerald-600">Verification complete</p>
                <h1 className="mt-2 text-3xl font-black tracking-[-.04em]">Your email is verified.</h1>
                <p className="mx-auto mt-3 max-w-sm text-sm leading-6 text-neutral-600">Return to Discuss and sign in with your email address and password.</p>
                <Button onClick={() => navigate('/login', { replace: true, state: { verificationMessage: 'Your email has been verified. You can now sign in.' } })} className="mt-7 h-12 w-full rounded-xl bg-[#0095F6] text-sm font-bold text-white hover:bg-[#1877F2]">Continue to sign in <ArrowRight className="ml-2 h-4 w-4" /></Button>
              </div>
            ) : status === 'error' ? (
              <div className="py-7">
                <div className="mx-auto grid h-16 w-16 place-items-center rounded-full bg-red-50 text-red-600"><XCircle className="h-8 w-8" /></div>
                <h1 className="mt-6 text-2xl font-black tracking-tight">Verification could not be completed.</h1>
                <p className="mt-3 text-sm leading-6 text-neutral-600">The link may be expired or already used. You can return to the backup verification screen.</p>
                <Button onClick={() => { setStatus('otp-entry'); setErrorMessage(''); }} className="mt-7 h-11 w-full rounded-xl bg-neutral-950 text-sm font-bold text-white hover:bg-neutral-800">Use backup verification</Button>
                <Link to="/register" className="mt-4 inline-block text-xs font-bold text-[#0095F6] hover:underline">Create a new account</Link>
              </div>
            ) : (
              <div className="py-3">
                <div className="mx-auto grid h-14 w-14 place-items-center rounded-2xl bg-blue-50 text-[#0095F6]"><Mail className="h-6 w-6" /></div>
                <p className="mt-6 text-[11px] font-extrabold uppercase tracking-[.18em] text-[#0095F6]">Account activation</p>
                <h1 className="mt-2 text-3xl font-black tracking-[-.04em]">Verify your email.</h1>
                <p className="mx-auto mt-3 max-w-sm text-sm leading-6 text-neutral-600">Use the verification link sent by Firebase{emailAddress ? <> to <strong className="break-all text-neutral-900">{emailAddress}</strong></> : ''}. If it does not arrive, request a backup code below.</p>

                {otpSent && (
                  <form onSubmit={handleOtpSubmit} className="mt-7 rounded-2xl border border-neutral-200 bg-[#FAFAFA] p-4 sm:p-5">
                    <div className="mb-4 flex items-center justify-center gap-2 text-xs font-bold text-neutral-700"><KeyRound className="h-4 w-4 text-[#0095F6]" /> Enter your six-digit code</div>
                    <div className="grid grid-cols-6 gap-1.5 sm:gap-2" onPaste={handlePaste}>
                      {otpValues.map((digit, index) => <input key={index} ref={(node) => { inputRefs.current[index] = node; }} inputMode="numeric" autoComplete={index === 0 ? 'one-time-code' : 'off'} maxLength="1" value={digit} onChange={(event) => handleOtpChange(index, event.target.value)} onKeyDown={(event) => handleKeyDown(index, event)} aria-label={`Verification digit ${index + 1}`} className="h-12 min-w-0 rounded-xl border border-neutral-200 bg-white text-center text-lg font-bold text-neutral-950 outline-none transition focus:border-[#0095F6] focus:ring-2 focus:ring-[#0095F6]/10" />)}
                    </div>
                    <Button type="submit" disabled={verifyingOtp || otpValues.some((digit) => !digit)} className="mt-4 h-11 w-full rounded-xl bg-neutral-950 text-sm font-bold text-white hover:bg-neutral-800 disabled:opacity-40">{verifyingOtp ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Confirm and activate'}</Button>
                  </form>
                )}

                {!otpSent && <div className="mt-7 rounded-2xl border border-neutral-200 bg-[#FAFAFA] p-4 text-left"><p className="text-xs font-bold text-neutral-900">Link first, backup code second</p><p className="mt-1.5 text-xs leading-5 text-neutral-500">Allow two minutes for the standard link. A backup code is valid for five minutes, and another code can only be requested after the cooldown.</p></div>}

                <Button type="button" onClick={handleTriggerOtp} disabled={!canSendOtp || sendingOtp || !emailAddress || !verifyUid} className="mt-4 h-11 w-full rounded-xl border border-neutral-200 bg-white text-sm font-bold text-neutral-800 shadow-sm hover:bg-neutral-50 disabled:opacity-50">
                  {sendingOtp ? <Loader2 className="h-4 w-4 animate-spin" /> : !canSendOtp ? <><RefreshCw className="mr-2 h-4 w-4" /> {otpSent ? 'Request another code' : 'Backup code available'} in {formatTime(resendCountdown)}</> : <><MailPlus className="mr-2 h-4 w-4 text-[#0095F6]" /> {otpSent ? 'Request another code' : 'Send backup code'}</>}
                </Button>

                <div className="mt-5 flex items-start gap-3 rounded-2xl bg-neutral-950 p-4 text-left text-white">
                  <ShieldCheck className="mt-0.5 h-5 w-5 shrink-0 text-blue-300" />
                  <div><p className="text-xs font-bold">Keep your code private</p><p className="mt-1 text-[11px] leading-5 text-neutral-400">Discuss support will never ask for your password or verification code. Ignore requests you did not initiate.</p></div>
                </div>
              </div>
            )}
          </section>
          <p className="mt-6 text-center text-xs text-neutral-500">Need help? <a href="mailto:support@discussit.in" className="font-bold text-neutral-900 hover:underline">support@discussit.in</a></p>
        </div>
      </main>
    </div>
  );
}
