import { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { UserX, CheckCircle2, ArrowLeft } from 'lucide-react';
import SettingsInfoPageShell from '@/components/SettingsInfoPageShell';
import { useAuth } from '@/contexts/AuthContext';
import { DiscussLoadingDots } from '@/components/loading';

export default function DeleteAccountPage() {
  const navigate = useNavigate();
  const { user, deleteAccount, reauthenticateUser } = useAuth();

  // Logged-in state
  const [inAppConfirmation, setInAppConfirmation] = useState('');
  const [inAppStatus, setInAppStatus] = useState('idle'); // idle | deleting | error
  const [inAppError, setInAppError] = useState('');
  const [inAppNeedsReauth, setInAppNeedsReauth] = useState(false);
  const [reauthPassword, setReauthPassword] = useState('');
  const [reauthStatus, setReauthStatus] = useState('idle');

  // Public (logged-out) flow state
  // Steps: 'request' | 'verify' | 'confirm' | 'success'
  const [step, setStep] = useState('request');
  const [email, setEmail] = useState('');
  const [code, setCode] = useState('');
  const [deletionToken, setDeletionToken] = useState('');
  const [deleteConfirmation, setDeleteConfirmation] = useState('');
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [infoMessage, setInfoMessage] = useState('');
  const [resendCooldown, setResendCooldown] = useState(0);

  const isGoogleUser = user?.auth_provider?.includes('google') ||
    (Array.isArray(user?.providerData) && user.providerData.some((p) => p?.providerId === 'google.com'));

  useEffect(() => {
    window.scrollTo(0, 0);
    document.title = 'Delete Account | Discuss';
  }, []);

  useEffect(() => {
    if (resendCooldown <= 0) return;
    const timer = setInterval(() => {
      setResendCooldown((prev) => (prev > 0 ? prev - 1 : 0));
    }, 1000);
    return () => clearInterval(timer);
  }, [resendCooldown]);

  // ── Logged-in flow handlers ────────────────────────────────────────────────
  const handleInAppDelete = async () => {
    if (inAppStatus === 'deleting') return;
    setInAppStatus('deleting');
    setInAppError('');

    const res = await deleteAccount();
    if (res.requiresRecentLogin) {
      setInAppStatus('idle');
      setInAppNeedsReauth(true);
      return;
    }

    if (res.success) {
      setInAppStatus('idle');
      setStep('success');
      return;
    }

    setInAppStatus('error');
    setInAppError(res.error || 'Your account could not be deleted. Please try again.');
  };

  const handleInAppReauth = async (e) => {
    if (e) e.preventDefault();
    if (reauthStatus === 'verifying') return;
    setReauthStatus('verifying');
    setInAppError('');

    const res = await reauthenticateUser({
      password: isGoogleUser ? undefined : reauthPassword,
    });

    setReauthStatus('idle');

    if (!res.success) {
      setInAppError(res.error || 'Verification failed. Please check and try again.');
      return;
    }

    setInAppNeedsReauth(false);
    handleInAppDelete();
  };

  // ── Public (logged-out) flow handlers ──────────────────────────────────────
  const handleRequestVerification = async (e) => {
    if (e) e.preventDefault();
    if (loading) return;

    const cleanEmail = email.trim().toLowerCase();
    if (!cleanEmail || !cleanEmail.includes('@')) {
      setErrorMessage('Please enter a valid email address.');
      return;
    }

    setLoading(true);
    setErrorMessage('');
    setInfoMessage('');

    try {
      const res = await fetch('/api/account-deletion', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'request-verification',
          email: cleanEmail,
        }),
      });

      const data = await res.json().catch(() => ({}));
      if (!res.ok && !data.ok) {
        setErrorMessage(data.error || 'Unable to send verification code. Please try again later.');
        return;
      }

      setInfoMessage(data.message || 'If a Discuss account exists for this email, a verification code has been sent.');
      setResendCooldown(60);
      setStep('verify');
    } catch (err) {
      setErrorMessage('Network error. Please check your connection and try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyCode = async (e) => {
    if (e) e.preventDefault();
    if (loading) return;

    const cleanCode = code.trim();
    if (!cleanCode || cleanCode.length !== 6) {
      setErrorMessage('Please enter the 6-digit verification code.');
      return;
    }

    setLoading(true);
    setErrorMessage('');

    try {
      const res = await fetch('/api/account-deletion', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'verify',
          email: email.trim().toLowerCase(),
          code: cleanCode,
        }),
      });

      const data = await res.json().catch(() => ({}));
      if (!res.ok || !data.ok) {
        setErrorMessage(data.error || 'Verification failed. Please check the code and try again.');
        return;
      }

      setDeletionToken(data.deletionToken);
      setStep('confirm');
    } catch (err) {
      setErrorMessage('Network error. Please check your connection and try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleFinalPublicDelete = async () => {
    if (loading || !deletionToken) return;

    if (deleteConfirmation !== 'DELETE') {
      setErrorMessage('Please type DELETE to confirm.');
      return;
    }

    setLoading(true);
    setErrorMessage('');

    try {
      const res = await fetch('/api/account-deletion', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'delete',
          deletionToken,
        }),
      });

      const data = await res.json().catch(() => ({}));
      if (!res.ok || !data.ok) {
        setErrorMessage(data.error || 'Account deletion encountered an issue. Please try again or contact support@discussit.in.');
        return;
      }

      setStep('success');
    } catch (err) {
      setErrorMessage('Network error. Please check your connection and try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <SettingsInfoPageShell
      title="Delete Account"
      description="Permanent removal of your Discuss account, profile, posts, personal chat indexes, and owned content."
      icon={UserX}
    >
      {/* ── SUCCESS STATE (Both in-app and public) ── */}
      {step === 'success' ? (
        <section className="py-10 text-center">
          <div className="mx-auto mb-4 grid h-14 w-14 place-items-center rounded-2xl bg-neutral-100 text-neutral-900 dark:bg-neutral-800 dark:text-white">
            <CheckCircle2 className="h-7 w-7 stroke-[2px]" />
          </div>
          <h2 className="text-xl font-black tracking-[-0.02em] text-neutral-950 dark:text-white sm:text-2xl">
            Account permanently deleted
          </h2>
          <p className="mx-auto mt-3 max-w-md text-sm leading-6 text-neutral-600 dark:text-neutral-400">
            Your Discuss account, profile, authored posts, personal chat indexes, and sessions have been permanently removed from our database.
          </p>
          <div className="mt-8 flex justify-center">
            <button
              onClick={() => {
                window.location.href = '/';
              }}
              className="inline-flex min-h-11 items-center justify-center rounded-xl bg-neutral-950 px-6 text-sm font-bold text-white transition hover:bg-neutral-800 dark:bg-white dark:text-neutral-950 dark:hover:bg-neutral-200"
            >
              Return to Discuss home
            </button>
          </div>
        </section>
      ) : user ? (
        /* ── AUTHENTICATED USER FLOW ── */
        <section className="py-6">
          <div className="rounded-2xl bg-neutral-50 p-5 dark:bg-[#111111]">
            <span className="text-[11px] font-bold uppercase tracking-[0.12em] text-neutral-500">
              Authenticated Account
            </span>
            <div className="mt-2 text-base font-bold text-neutral-900 dark:text-white">
              @{user.username || user.displayName || 'member'} ({user.email})
            </div>
            <p className="mt-3 text-sm leading-6 text-neutral-600 dark:text-neutral-400">
              You are currently signed in. Deleting your account will permanently remove your profile, posts, personal chat index, stories, pulses, group memberships, and sessions. Existing comments remain as historical activity without an active profile.
            </p>
          </div>

          {!inAppNeedsReauth ? (
            <div className="mt-6 space-y-4">
              <div>
                <label htmlFor="in-app-confirm-input" className="block text-[11px] font-bold uppercase tracking-[0.12em] text-neutral-500">
                  Type DELETE to confirm
                </label>
                <input
                  id="in-app-confirm-input"
                  type="text"
                  autoComplete="off"
                  spellCheck="false"
                  value={inAppConfirmation}
                  onChange={(e) => {
                    setInAppConfirmation(e.target.value.toUpperCase().slice(0, 6));
                    setInAppError('');
                  }}
                  placeholder="Type DELETE"
                  className="mt-2 h-12 w-full rounded-xl border border-neutral-200 bg-white px-4 text-sm font-bold tracking-[0.12em] text-neutral-950 outline-none transition focus:border-neutral-950 focus:ring-4 focus:ring-neutral-950/10 dark:border-neutral-700 dark:bg-black dark:text-white dark:focus:border-white"
                />
              </div>

              {inAppError && (
                <div role="alert" className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-semibold text-red-700 dark:border-red-950 dark:bg-red-950/30 dark:text-red-300">
                  {inAppError}
                </div>
              )}

              <div className="pt-2">
                <button
                  type="button"
                  disabled={inAppConfirmation !== 'DELETE' || inAppStatus === 'deleting'}
                  onClick={handleInAppDelete}
                  aria-busy={inAppStatus === 'deleting'}
                  className="inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-xl bg-neutral-950 px-5 text-sm font-bold text-white transition hover:bg-neutral-800 disabled:cursor-not-allowed disabled:opacity-40 dark:bg-white dark:text-neutral-950 dark:hover:bg-neutral-200"
                >
                  {inAppStatus === 'deleting' ? (
                    <DiscussLoadingDots size="inline" color="currentColor" title="Deleting account…" />
                  ) : (
                    'Delete my account'
                  )}
                </button>
              </div>
            </div>
          ) : (
            <form onSubmit={handleInAppReauth} className="mt-6 space-y-4">
              <div className="rounded-xl border border-neutral-200 bg-white p-4 dark:border-neutral-800 dark:bg-black">
                <h3 className="text-sm font-bold text-neutral-950 dark:text-white">Verify it’s you</h3>
                <p className="mt-1 text-xs leading-5 text-neutral-600 dark:text-neutral-400">
                  {isGoogleUser
                    ? 'For your security, please verify your Google account before deleting your Discuss account.'
                    : 'For your security, please enter your password to confirm it’s you before deleting your account.'}
                </p>

                {!isGoogleUser && (
                  <div className="mt-4">
                    <label htmlFor="inapp-password" className="block text-[11px] font-bold uppercase tracking-[0.12em] text-neutral-500">
                      Password
                    </label>
                    <input
                      id="inapp-password"
                      type="password"
                      autoComplete="current-password"
                      value={reauthPassword}
                      onChange={(e) => {
                        setReauthPassword(e.target.value);
                        setInAppError('');
                      }}
                      placeholder="Enter your password"
                      className="mt-2 h-11 w-full rounded-xl border border-neutral-200 bg-neutral-50 px-3 text-sm font-medium text-neutral-950 outline-none transition focus:border-neutral-950 dark:border-neutral-700 dark:bg-neutral-900 dark:text-white"
                    />
                  </div>
                )}
              </div>

              {inAppError && (
                <div role="alert" className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-semibold text-red-700 dark:border-red-950 dark:bg-red-950/30 dark:text-red-300">
                  {inAppError}
                </div>
              )}

              <div className="grid grid-cols-2 gap-3">
                <button
                  type="button"
                  disabled={reauthStatus === 'verifying'}
                  onClick={() => {
                    setInAppNeedsReauth(false);
                    setInAppError('');
                  }}
                  className="min-h-11 rounded-xl border border-neutral-200 px-4 text-sm font-bold text-neutral-700 hover:bg-neutral-50 dark:border-neutral-700 dark:text-neutral-300 dark:hover:bg-neutral-900"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={reauthStatus === 'verifying' || (!isGoogleUser && !reauthPassword)}
                  aria-busy={reauthStatus === 'verifying'}
                  className="min-h-11 rounded-xl bg-neutral-950 px-4 text-sm font-bold text-white disabled:cursor-not-allowed disabled:opacity-50 dark:bg-white dark:text-neutral-950 flex items-center justify-center gap-2"
                >
                  {reauthStatus === 'verifying' ? (
                    <DiscussLoadingDots size="inline" color="currentColor" title="Verifying…" />
                  ) : isGoogleUser ? (
                    'Verify with Google'
                  ) : (
                    'Verify and continue'
                  )}
                </button>
              </div>
            </form>
          )}
        </section>
      ) : (
        /* ── PUBLIC / LOGGED-OUT FLOW ── */
        <section className="py-6">
          {/* STEP 1: REQUEST VERIFICATION */}
          {step === 'request' && (
            <form onSubmit={handleRequestVerification} className="space-y-4" noValidate>
              <div>
                <h2 className="text-base font-extrabold text-neutral-950 dark:text-white">
                  Step 1: Enter your account email
                </h2>
                <p className="mt-1 text-sm leading-6 text-neutral-600 dark:text-neutral-400">
                  Enter the email address registered with your Discuss account. We will send a one-time verification code to verify ownership before account deletion.
                </p>
              </div>

              <div>
                <label htmlFor="public-deletion-email" className="block text-[11px] font-bold uppercase tracking-[0.12em] text-neutral-500">
                  Account email
                </label>
                <input
                  id="public-deletion-email"
                  type="email"
                  autoComplete="email"
                  required
                  value={email}
                  onChange={(e) => {
                    setEmail(e.target.value);
                    setErrorMessage('');
                  }}
                  placeholder="name@example.com"
                  disabled={loading}
                  className="mt-2 h-12 w-full rounded-xl border border-neutral-200 bg-white px-4 text-sm font-medium text-neutral-900 outline-none transition placeholder:text-neutral-400 focus:border-neutral-950 focus:ring-4 focus:ring-neutral-950/10 dark:border-neutral-700 dark:bg-black dark:text-white dark:focus:border-white"
                />
              </div>

              {errorMessage && (
                <div role="alert" className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-semibold text-red-700 dark:border-red-950 dark:bg-red-950/30 dark:text-red-300">
                  {errorMessage}
                </div>
              )}

              <button
                type="submit"
                disabled={loading || !email.trim()}
                aria-busy={loading}
                className="inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-xl bg-neutral-950 px-5 text-sm font-bold text-white transition hover:bg-neutral-800 disabled:cursor-not-allowed disabled:opacity-40 dark:bg-white dark:text-neutral-950 dark:hover:bg-neutral-200"
              >
                {loading ? (
                  <DiscussLoadingDots size="inline" color="currentColor" title="Sending code…" />
                ) : (
                  'Continue'
                )}
              </button>
            </form>
          )}

          {/* STEP 2: ENTER OTP */}
          {step === 'verify' && (
            <form onSubmit={handleVerifyCode} className="space-y-4" noValidate>
              <div>
                <h2 className="text-base font-extrabold text-neutral-950 dark:text-white">
                  Step 2: Enter verification code
                </h2>
                <p className="mt-1 text-sm leading-6 text-neutral-600 dark:text-neutral-400">
                  {infoMessage || `A 6-digit code was sent to ${email} if an account exists for this address.`}
                </p>
              </div>

              <div>
                <label htmlFor="public-deletion-code" className="block text-[11px] font-bold uppercase tracking-[0.12em] text-neutral-500">
                  6-digit verification code
                </label>
                <input
                  id="public-deletion-code"
                  type="text"
                  inputMode="numeric"
                  pattern="[0-9]*"
                  autoComplete="one-time-code"
                  maxLength={6}
                  required
                  value={code}
                  onChange={(e) => {
                    setCode(e.target.value.replace(/\D/g, '').slice(0, 6));
                    setErrorMessage('');
                  }}
                  placeholder="000000"
                  disabled={loading}
                  className="mt-2 h-12 w-full rounded-xl border border-neutral-200 bg-white px-4 text-center font-mono text-xl font-bold tracking-[0.3em] text-neutral-950 outline-none transition focus:border-neutral-950 focus:ring-4 focus:ring-neutral-950/10 dark:border-neutral-700 dark:bg-black dark:text-white dark:focus:border-white"
                />
              </div>

              {errorMessage && (
                <div role="alert" className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-semibold text-red-700 dark:border-red-950 dark:bg-red-950/30 dark:text-red-300">
                  {errorMessage}
                </div>
              )}

              <div className="grid grid-cols-2 gap-3">
                <button
                  type="button"
                  disabled={loading}
                  onClick={() => {
                    setStep('request');
                    setCode('');
                    setErrorMessage('');
                  }}
                  className="min-h-11 rounded-xl border border-neutral-200 px-4 text-sm font-bold text-neutral-700 hover:bg-neutral-50 dark:border-neutral-700 dark:text-neutral-300 dark:hover:bg-neutral-900"
                >
                  Back
                </button>
                <button
                  type="submit"
                  disabled={loading || code.trim().length !== 6}
                  aria-busy={loading}
                  className="min-h-11 rounded-xl bg-neutral-950 px-4 text-sm font-bold text-white disabled:cursor-not-allowed disabled:opacity-40 dark:bg-white dark:text-neutral-950 flex items-center justify-center gap-2"
                >
                  {loading ? (
                    <DiscussLoadingDots size="inline" color="currentColor" title="Verifying code…" />
                  ) : (
                    'Verify code'
                  )}
                </button>
              </div>

              <div className="pt-2 text-center">
                <button
                  type="button"
                  disabled={loading || resendCooldown > 0}
                  onClick={handleRequestVerification}
                  className="text-xs font-semibold text-neutral-500 hover:text-neutral-950 disabled:cursor-not-allowed disabled:opacity-40 dark:text-neutral-400 dark:hover:text-white"
                >
                  {resendCooldown > 0 ? `Resend code in ${resendCooldown}s` : 'Resend verification code'}
                </button>
              </div>
            </form>
          )}

          {/* STEP 3: DISCLOSURE & CONFIRM DELETION */}
          {step === 'confirm' && (
            <div className="space-y-5">
              <div>
                <h2 className="text-base font-extrabold text-neutral-950 dark:text-white">
                  Step 3: Confirm permanent deletion
                </h2>
                <p className="mt-1 text-sm leading-6 text-neutral-600 dark:text-neutral-400">
                  Ownership of <span className="font-semibold text-neutral-900 dark:text-white">{email}</span> has been verified. Please review the deletion policy below before proceeding.
                </p>
              </div>

              <div className="rounded-2xl bg-neutral-50 p-5 dark:bg-[#111111]">
                <h3 className="text-xs font-bold uppercase tracking-[0.1em] text-neutral-500">
                  Data removal disclosure
                </h3>
                <ul className="mt-3 space-y-2 text-xs leading-5 text-neutral-700 dark:text-neutral-300">
                  <li className="flex items-start gap-2">
                    <span className="font-bold text-neutral-950 dark:text-white">•</span>
                    <span><strong>Permanently deleted:</strong> User profile, username, email index, authored posts, personal chat index, stories, pulses, and DevRadar markers.</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="font-bold text-neutral-950 dark:text-white">•</span>
                    <span><strong>Groups:</strong> Your membership is removed. If you were the sole administrator, administration passes to the longest-standing active member.</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="font-bold text-neutral-950 dark:text-white">•</span>
                    <span><strong>Retained / Anonymized:</strong> Existing comments and replies remain as historical activity without an active profile to preserve conversation integrity.</span>
                  </li>
                </ul>
              </div>

              <div>
                <label htmlFor="public-deletion-confirm-text" className="block text-[11px] font-bold uppercase tracking-[0.12em] text-neutral-500">
                  Type DELETE below to confirm
                </label>
                <input
                  id="public-deletion-confirm-text"
                  type="text"
                  autoComplete="off"
                  spellCheck="false"
                  value={deleteConfirmation}
                  onChange={(e) => {
                    setDeleteConfirmation(e.target.value.toUpperCase().slice(0, 6));
                    setErrorMessage('');
                  }}
                  placeholder="Type DELETE"
                  disabled={loading}
                  className="mt-2 h-12 w-full rounded-xl border border-neutral-200 bg-white px-4 text-sm font-bold tracking-[0.12em] text-neutral-950 outline-none transition focus:border-neutral-950 focus:ring-4 focus:ring-neutral-950/10 dark:border-neutral-700 dark:bg-black dark:text-white dark:focus:border-white"
                />
              </div>

              {errorMessage && (
                <div role="alert" className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-semibold text-red-700 dark:border-red-950 dark:bg-red-950/30 dark:text-red-300">
                  {errorMessage}
                </div>
              )}

              <div className="grid grid-cols-2 gap-3 pt-2">
                <button
                  type="button"
                  disabled={loading}
                  onClick={() => {
                    setStep('verify');
                    setDeleteConfirmation('');
                    setErrorMessage('');
                  }}
                  className="min-h-11 rounded-xl border border-neutral-200 px-4 text-sm font-bold text-neutral-700 hover:bg-neutral-50 dark:border-neutral-700 dark:text-neutral-300 dark:hover:bg-neutral-900"
                >
                  Back
                </button>
                <button
                  type="button"
                  disabled={loading || deleteConfirmation !== 'DELETE'}
                  onClick={handleFinalPublicDelete}
                  aria-busy={loading}
                  className="min-h-11 rounded-xl bg-neutral-950 px-4 text-sm font-bold text-white disabled:cursor-not-allowed disabled:opacity-40 dark:bg-white dark:text-neutral-950 flex items-center justify-center gap-2"
                >
                  {loading ? (
                    <DiscussLoadingDots size="inline" color="currentColor" title="Deleting account…" />
                  ) : (
                    'Delete my account'
                  )}
                </button>
              </div>
            </div>
          )}
        </section>
      )}
    </SettingsInfoPageShell>
  );
}
