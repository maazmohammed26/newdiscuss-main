import { useEffect } from 'react';
import { Mail, LifeBuoy, Clock3, ShieldCheck } from 'lucide-react';
import SettingsInfoPageShell from '@/components/SettingsInfoPageShell';

export default function SupportPage() {
  useEffect(() => {
    window.scrollTo(0, 0);
    document.title = 'Support | Discuss';
  }, []);

  return (
    <SettingsInfoPageShell
      title="Support"
      description="Help with your Discuss account, security, sign-in, groups, chats, posts, and app experience."
      icon={LifeBuoy}
    >
      <section className="flex gap-4 border-b border-neutral-200 py-6 dark:border-neutral-800">
        <Mail className="mt-0.5 h-5 w-5 shrink-0 stroke-[1.7px] text-neutral-700 dark:text-neutral-300" />
        <div className="min-w-0 flex-1">
          <h2 className="text-[15px] font-extrabold">Email Discuss Support</h2>
          <p className="mt-2 text-sm leading-6 text-neutral-600 dark:text-neutral-400">Describe the issue, the page where it happened, and the device you are using. Never include your password, PIN, verification code, or API keys.</p>
          <a
            href="mailto:support@discussit.in?subject=Discuss%20Support%20Request"
            className="mt-4 inline-flex min-h-11 items-center justify-center rounded-xl bg-neutral-950 px-5 text-sm font-bold text-white transition-colors hover:bg-neutral-800 dark:bg-white dark:text-neutral-950 dark:hover:bg-neutral-200"
          >
            support@discussit.in
          </a>
        </div>
      </section>

      <section className="flex gap-4 border-b border-neutral-200 py-6 dark:border-neutral-800">
        <Clock3 className="mt-0.5 h-5 w-5 shrink-0 stroke-[1.7px] text-neutral-700 dark:text-neutral-300" />
        <div>
          <h2 className="text-[15px] font-extrabold">What to expect</h2>
          <p className="mt-2 text-sm leading-6 text-neutral-600 dark:text-neutral-400">Requests are reviewed through the official support inbox. Include enough detail for the team to understand and reproduce your issue.</p>
        </div>
      </section>

      <section className="flex gap-4 py-6">
        <ShieldCheck className="mt-0.5 h-5 w-5 shrink-0 stroke-[1.7px] text-neutral-700 dark:text-neutral-300" />
        <div>
          <h2 className="text-[15px] font-extrabold">Account safety</h2>
          <p className="mt-2 text-sm leading-6 text-neutral-600 dark:text-neutral-400">Discuss Support will never ask for your password or one-time verification code. Only trust messages sent from the official discussit.in support address.</p>
        </div>
      </section>
    </SettingsInfoPageShell>
  );
}
