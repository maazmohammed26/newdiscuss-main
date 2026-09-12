import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { DiscussLoadingDots } from '@/components/loading';

export default function AccountDeletionFlow({ isModal = false, onCancel }) {
  const navigate = useNavigate();
  const { user, deleteAccount, reauthenticateUser } = useAuth();

  const [deleteStep, setDeleteStep] = useState('confirm-text'); // 'confirm-text' | 'final-warning' | 'reauth'
  const [deleteConfirmation, setDeleteConfirmation] = useState('');
  const [deleteStatus, setDeleteStatus] = useState('idle'); // 'idle' | 'deleting' | 'error'
  const [deleteError, setDeleteError] = useState('');
  const [reauthPassword, setReauthPassword] = useState('');
  const [reauthStatus, setReauthStatus] = useState('idle'); // 'idle' | 'verifying'

  const isGoogleUser = user?.auth_provider?.includes('google') ||
    (Array.isArray(user?.providerData) && user.providerData.some((p) => p?.providerId === 'google.com'));

  const handleCancel = () => {
    if (deleteStatus === 'deleting' || reauthStatus === 'verifying') return;
    if (typeof onCancel === 'function') {
      onCancel();
    } else {
      setDeleteStep('confirm-text');
      setDeleteConfirmation('');
      setDeleteError('');
    }
  };

  const permanentlyDeleteAccount = async () => {
    if (deleteStatus === 'deleting') return;
    setDeleteStatus('deleting');
    setDeleteError('');

    const result = await deleteAccount();
    if (result.requiresRecentLogin) {
      setDeleteStatus('idle');
      setDeleteStep('reauth');
      return;
    }

    if (result.success) {
      navigate('/', { replace: true });
      return;
    }

    setDeleteStatus('error');
    setDeleteError(result.error || 'Your account could not be deleted. Please try again.');
  };

  const handleReauthenticate = async (e) => {
    if (e) e.preventDefault();
    if (reauthStatus === 'verifying') return;
    setReauthStatus('verifying');
    setDeleteError('');

    const res = await reauthenticateUser({
      password: isGoogleUser ? undefined : reauthPassword,
    });

    setReauthStatus('idle');

    if (!res.success) {
      setDeleteError(res.error || 'Verification failed. Please check and try again.');
      return;
    }

    // Automatically return to deletion confirmation and re-run deletion
    setDeleteStep('final-warning');
    permanentlyDeleteAccount();
  };

  const content = (
    <div className={isModal ? 'w-full max-w-md overflow-hidden rounded-[26px] bg-white p-6 shadow-2xl dark:bg-[#0A0A0A] sm:p-7' : 'w-full rounded-2xl bg-neutral-50 p-6 dark:bg-[#111111]'}>
      <h2 id="delete-account-title" className="text-xl font-black tracking-[-0.025em] text-neutral-950 dark:text-white">
        {deleteStep === 'reauth' ? 'Verify it’s you' : 'Delete your Discuss account'}
      </h2>

      {deleteStep === 'confirm-text' && (
        <div className="mt-3 space-y-4">
          <p className="text-sm leading-6 text-neutral-600 dark:text-neutral-400">
            Deleting your account permanently removes your Discuss account and associated data according to our deletion policy. This action cannot be undone.
          </p>
          <div>
            <label htmlFor="delete-account-confirmation" className="block text-[11px] font-bold uppercase tracking-[0.12em] text-neutral-500">
              Type DELETE below to confirm
            </label>
            <input
              id="delete-account-confirmation"
              value={deleteConfirmation}
              onChange={(event) => {
                setDeleteConfirmation(event.target.value.toUpperCase().slice(0, 6));
                setDeleteError('');
              }}
              autoComplete="off"
              spellCheck="false"
              placeholder="Type DELETE"
              className="mt-2 h-12 w-full rounded-xl border border-neutral-200 bg-white px-4 text-sm font-bold tracking-[0.12em] text-neutral-950 outline-none transition focus:border-neutral-950 focus:ring-4 focus:ring-neutral-950/10 dark:border-neutral-700 dark:bg-black dark:text-white dark:focus:border-white"
            />
          </div>
          <div className="mt-6 flex items-center gap-3">
            {onCancel && (
              <button
                type="button"
                onClick={handleCancel}
                className="min-h-11 flex-1 rounded-xl border border-neutral-200 px-4 text-sm font-bold text-neutral-700 hover:bg-neutral-100 dark:border-neutral-700 dark:text-neutral-300 dark:hover:bg-neutral-900"
              >
                Cancel
              </button>
            )}
            <button
              type="button"
              disabled={deleteConfirmation !== 'DELETE'}
              onClick={() => setDeleteStep('final-warning')}
              className="min-h-11 flex-1 rounded-xl bg-neutral-950 px-4 text-sm font-bold text-white disabled:cursor-not-allowed disabled:opacity-35 dark:bg-white dark:text-neutral-950"
            >
              Continue
            </button>
          </div>
        </div>
      )}

      {deleteStep === 'final-warning' && (
        <div className="mt-3 space-y-4">
          <p className="text-sm leading-6 text-neutral-600 dark:text-neutral-400">
            Your profile, posts, personal chat index, groups, stories, pulses, and account details will be permanently removed. Existing comments and likes remain as historical activity without an active profile.
          </p>
          {deleteError && (
            <div role="alert" className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-semibold leading-5 text-red-700 dark:border-red-950 dark:bg-red-950/30 dark:text-red-300">
              {deleteError}
            </div>
          )}
          <div className="mt-6 flex items-center gap-3">
            <button
              type="button"
              disabled={deleteStatus === 'deleting'}
              onClick={() => setDeleteStep('confirm-text')}
              className="min-h-11 flex-1 rounded-xl border border-neutral-200 px-4 text-sm font-bold text-neutral-700 hover:bg-neutral-100 disabled:opacity-50 dark:border-neutral-700 dark:text-neutral-300 dark:hover:bg-neutral-900"
            >
              Back
            </button>
            <button
              type="button"
              disabled={deleteStatus === 'deleting'}
              onClick={permanentlyDeleteAccount}
              aria-busy={deleteStatus === 'deleting'}
              className="min-h-11 flex-1 rounded-xl bg-neutral-950 px-4 text-sm font-bold text-white disabled:cursor-wait disabled:opacity-60 dark:bg-white dark:text-neutral-950 flex items-center justify-center gap-2"
            >
              {deleteStatus === 'deleting' ? (
                <DiscussLoadingDots size="inline" color="currentColor" title="Deleting account…" />
              ) : (
                'Delete my account'
              )}
            </button>
          </div>
        </div>
      )}

      {deleteStep === 'reauth' && (
        <form onSubmit={handleReauthenticate} className="mt-3 space-y-4">
          <p className="text-sm leading-6 text-neutral-600 dark:text-neutral-400">
            {isGoogleUser
              ? 'For your security, please verify your Google account before deleting your Discuss account.'
              : 'For your security, please enter your password to confirm it’s you before deleting your account.'}
          </p>

          {!isGoogleUser && (
            <div>
              <label htmlFor="flow-reauth-password" className="block text-[11px] font-bold uppercase tracking-[0.12em] text-neutral-500">
                Password
              </label>
              <input
                id="flow-reauth-password"
                type="password"
                autoComplete="current-password"
                value={reauthPassword}
                onChange={(e) => {
                  setReauthPassword(e.target.value);
                  setDeleteError('');
                }}
                placeholder="Enter your password"
                className="mt-2 h-12 w-full rounded-xl border border-neutral-200 bg-white px-4 text-sm font-medium text-neutral-950 outline-none transition focus:border-neutral-950 focus:ring-4 focus:ring-neutral-950/10 dark:border-neutral-700 dark:bg-black dark:text-white dark:focus:border-white"
              />
            </div>
          )}

          {deleteError && (
            <div role="alert" className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-semibold leading-5 text-red-700 dark:border-red-950 dark:bg-red-950/30 dark:text-red-300">
              {deleteError}
            </div>
          )}

          <div className="mt-6 flex items-center gap-3">
            <button
              type="button"
              disabled={reauthStatus === 'verifying'}
              onClick={() => {
                setDeleteStep('final-warning');
                setDeleteError('');
              }}
              className="min-h-11 flex-1 rounded-xl border border-neutral-200 px-4 text-sm font-bold text-neutral-700 hover:bg-neutral-100 dark:border-neutral-700 dark:text-neutral-300 dark:hover:bg-neutral-900"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={reauthStatus === 'verifying' || (!isGoogleUser && !reauthPassword)}
              aria-busy={reauthStatus === 'verifying'}
              className="min-h-11 flex-1 rounded-xl bg-neutral-950 px-4 text-sm font-bold text-white disabled:cursor-not-allowed disabled:opacity-50 dark:bg-white dark:text-neutral-950 flex items-center justify-center gap-2"
            >
              {reauthStatus === 'verifying' ? (
                <DiscussLoadingDots size="inline" color="currentColor" title="Verifying…" />
              ) : isGoogleUser ? (
                'Verify it’s you'
              ) : (
                'Verify and continue'
              )}
            </button>
          </div>
        </form>
      )}
    </div>
  );

  if (isModal) {
    return (
      <div
        className="fixed inset-0 z-[10000] flex items-end justify-center bg-black/55 p-3 backdrop-blur-sm sm:items-center"
        role="dialog"
        aria-modal="true"
        aria-labelledby="delete-account-title"
      >
        {content}
      </div>
    );
  }

  return content;
}
