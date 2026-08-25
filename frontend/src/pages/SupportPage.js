import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Mail, LifeBuoy, Clock3, ShieldCheck, Loader2 } from 'lucide-react';
import SettingsInfoPageShell from '@/components/SettingsInfoPageShell';
import { useAuth } from '@/contexts/AuthContext';

const SUPPORT_MESSAGE_LIMIT = 1200;

export default function SupportPage() {
  const { user } = useAuth();
  const [requestType, setRequestType] = useState('bug');
  const [supportMessage, setSupportMessage] = useState('');
  const [status, setStatus] = useState('idle');
  const [statusMessage, setStatusMessage] = useState('');
  const [caseNumber, setCaseNumber] = useState('');

  useEffect(() => {
    window.scrollTo(0, 0);
    document.title = 'Support | Discuss';
  }, []);

  const submitSupportCase = async (event) => {
    event.preventDefault();
    if (status === 'sending') return;

    const message = supportMessage.trim();
    if (message.length < 12) {
      setStatus('error');
      setStatusMessage('Add at least 12 characters so we can understand the request.');
      return;
    }

    setStatus('sending');
    setStatusMessage('');
    setCaseNumber('');

    try {
      const response = await fetch('/api/support-case', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type: requestType,
          message,
          userId: user?.id || user?.uid,
          username: user?.username || user?.displayName || user?.email?.split('@')[0],
          email: user?.email || '',
          website: '',
        }),
      });
      const result = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(result.error || 'Could not send your support request.');

      setSupportMessage('');
      setRequestType('bug');
      setCaseNumber(result.caseNumber || 'Created');
      setStatus('success');
      setStatusMessage('Your request was sent directly to Discuss Support.');
    } catch (error) {
      setStatus('error');
      setStatusMessage(error.message || 'Could not send your support request. Please try again.');
    }
  };

  return (
    <SettingsInfoPageShell
      title="Support"
      description="Help with your Discuss account, security, sign-in, groups, chats, posts, and app experience."
      icon={LifeBuoy}
    >
      <section className="border-b border-neutral-200 py-6 dark:border-neutral-800">
        <div className="flex items-start justify-between gap-4">
          <div>
            <h2 className="text-[15px] font-extrabold">In-app support</h2>
            <p className="mt-2 text-sm leading-6 text-neutral-600 dark:text-neutral-400">Send a bug, feature request, or suggestion directly to Discuss Support. Your username and user ID are attached automatically.</p>
          </div>
          <span className="shrink-0 rounded-full bg-neutral-100 px-3 py-1 text-[10px] font-bold uppercase tracking-wider text-neutral-500 dark:bg-neutral-900 dark:text-neutral-400">Private</span>
        </div>

        {user ? (
          <form onSubmit={submitSupportCase} className="mt-5 rounded-2xl bg-neutral-50 p-4 dark:bg-[#111111]" noValidate>
            <label htmlFor="support-request-type" className="text-[11px] font-bold uppercase tracking-[0.12em] text-neutral-500">Request type</label>
            <select
              id="support-request-type"
              value={requestType}
              onChange={(event) => setRequestType(event.target.value)}
              disabled={status === 'sending'}
              className="mt-2 h-11 w-full rounded-xl border border-neutral-200 bg-white px-3 text-sm font-semibold text-neutral-900 outline-none transition focus:border-[#0095F6] focus:ring-4 focus:ring-[#0095F6]/10 dark:border-[#262626] dark:bg-black dark:text-white"
            >
              <option value="bug">Bug report</option>
              <option value="feature">Feature request</option>
              <option value="suggestion">Suggestion</option>
              <option value="account">Account help</option>
              <option value="other">Other</option>
            </select>

            <div className="mt-4 flex items-center justify-between gap-3">
              <label htmlFor="support-message" className="text-[11px] font-bold uppercase tracking-[0.12em] text-neutral-500">Message</label>
              <span className="text-[10px] font-semibold tabular-nums text-neutral-400">{supportMessage.length}/{SUPPORT_MESSAGE_LIMIT}</span>
            </div>
            <textarea
              id="support-message"
              value={supportMessage}
              onChange={(event) => {
                setSupportMessage(event.target.value.slice(0, SUPPORT_MESSAGE_LIMIT));
                if (status === 'error') setStatus('idle');
              }}
              disabled={status === 'sending'}
              rows={6}
              maxLength={SUPPORT_MESSAGE_LIMIT}
              placeholder="Describe what happened, what you expected, and where you noticed it."
              className="mt-2 w-full resize-none rounded-2xl border border-neutral-200 bg-white px-4 py-3 text-sm leading-6 text-neutral-900 outline-none transition placeholder:text-neutral-400 focus:border-[#0095F6] focus:ring-4 focus:ring-[#0095F6]/10 dark:border-[#262626] dark:bg-black dark:text-white"
            />
            <input name="website" tabIndex="-1" autoComplete="off" className="absolute -left-[9999px]" aria-hidden="true" />

            <button
              type="submit"
              disabled={status === 'sending' || supportMessage.trim().length < 12}
              className="mt-3 inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-xl bg-neutral-950 px-5 text-sm font-bold text-white transition hover:bg-neutral-800 disabled:cursor-not-allowed disabled:opacity-50 dark:bg-white dark:text-neutral-950 dark:hover:bg-neutral-200"
            >
              {status === 'sending' && <Loader2 className="h-4 w-4 animate-spin" />}
              {status === 'sending' ? 'Sending' : 'Send to support'}
            </button>

            <div aria-live="polite" className={`mt-3 min-h-5 text-xs font-semibold ${status === 'error' ? 'text-red-600' : status === 'success' ? 'text-emerald-600' : 'text-neutral-500'}`}>
              {caseNumber && <span className="mr-2 font-mono">Case {caseNumber}</span>}
              {statusMessage || 'The message is sent to the admin Telegram bot and is not stored in the Discuss database.'}
            </div>
          </form>
        ) : (
          <div className="mt-5 rounded-2xl bg-neutral-50 p-5 dark:bg-[#111111]">
            <p className="text-sm leading-6 text-neutral-600 dark:text-neutral-400">Sign in to send an in-app request with your Discuss user details.</p>
            <Link to="/login" className="mt-4 inline-flex min-h-11 items-center justify-center rounded-xl bg-neutral-950 px-5 text-sm font-bold text-white dark:bg-white dark:text-neutral-950">Sign in</Link>
          </div>
        )}
      </section>

      <section className="flex gap-4 border-b border-neutral-200 py-6 dark:border-neutral-800">
        <Mail className="mt-0.5 h-5 w-5 shrink-0 stroke-[1.7px] text-neutral-700 dark:text-neutral-300" />
        <div className="min-w-0 flex-1">
          <h2 className="text-[15px] font-extrabold">Email Discuss Support</h2>
          <p className="mt-2 text-sm leading-6 text-neutral-600 dark:text-neutral-400">Describe the issue, the page where it happened, and the device you are using. Never include your password, PIN, verification code, or API keys.</p>
          <p className="mt-3 rounded-xl bg-neutral-50 px-4 py-3 text-sm leading-6 text-neutral-600 dark:bg-[#111111] dark:text-neutral-400">If you want to attach an image or screenshot, please share it through our support email.</p>
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
