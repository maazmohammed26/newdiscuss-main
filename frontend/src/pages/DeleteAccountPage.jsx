import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { UserX } from 'lucide-react';
import SettingsInfoPageShell from '@/components/SettingsInfoPageShell';
import { useAuth } from '@/contexts/AuthContext';
import AccountDeletionFlow from '@/components/AccountDeletionFlow';

export default function DeleteAccountPage() {
  const navigate = useNavigate();
  const { user } = useAuth();

  useEffect(() => {
    window.scrollTo(0, 0);
    document.title = 'Delete Account | Discuss';
  }, []);

  return (
    <SettingsInfoPageShell
      title="Delete Account"
      description="Permanent removal of your Discuss account and associated data according to our deletion policy."
      icon={UserX}
    >
      {!user ? (
        /* ── LOGGED-OUT USER VIEW ── */
        <section className="py-6">
          <div className="rounded-2xl bg-neutral-50 p-6 dark:bg-[#111111]">
            <h2 className="text-base font-extrabold text-neutral-950 dark:text-white">
              Delete your Discuss account
            </h2>
            <p className="mt-2 text-sm leading-6 text-neutral-600 dark:text-neutral-400">
              To delete your account, please sign in to verify your identity. After signing in, you can permanently delete your account and associated data from Discuss.
            </p>
            <div className="mt-6">
              <button
                type="button"
                onClick={() => navigate('/login?returnTo=/delete-account', { state: { from: '/delete-account' } })}
                className="inline-flex min-h-11 w-full sm:w-auto items-center justify-center rounded-xl bg-neutral-950 px-6 text-sm font-bold text-white transition hover:bg-neutral-800 dark:bg-white dark:text-neutral-950 dark:hover:bg-neutral-200"
              >
                Log in to continue
              </button>
            </div>
            <p className="mt-6 border-t border-neutral-200 pt-4 text-xs leading-5 text-neutral-500 dark:border-neutral-800 dark:text-neutral-400">
              You can also manage account deletion from:
              <br />
              <span className="font-semibold text-neutral-700 dark:text-neutral-300">
                Settings & Privacy → Community & Legal → Support & Help → Delete account permanently
              </span>
            </p>
          </div>
        </section>
      ) : (
        /* ── AUTHENTICATED USER VIEW ── */
        <section className="py-6">
          <AccountDeletionFlow isModal={false} />
        </section>
      )}
    </SettingsInfoPageShell>
  );
}
