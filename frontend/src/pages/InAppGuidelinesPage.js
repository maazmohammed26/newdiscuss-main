import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import Header from '@/components/Header';
import { 
  ArrowLeft, 
  ShieldCheck, 
  HeartHandshake, 
  MessageSquareCode, 
  LockKeyhole, 
  AlertOctagon, 
  Flag, 
  Sparkles,
  CheckCircle2
} from 'lucide-react';

const guidelineSections = [
  {
    icon: HeartHandshake,
    title: '1. Build with Respect',
    accent: 'text-blue-500 bg-blue-500/10 dark:bg-blue-500/15',
    summary: 'Focus on ideas, architecture, and code — never attack individuals.',
    rules: [
      'Treat fellow developers, contributors, and learners with dignity and empathy.',
      'No harassment, personal attacks, hate speech, bullying, or intimidation.',
      'No impersonation of other developers, founders, or team members.',
      'Constructive critique of technical implementations is welcome; toxicity is not.',
    ],
  },
  {
    icon: MessageSquareCode,
    title: '2. Keep Discussions Useful & High Signal',
    accent: 'text-emerald-500 bg-emerald-500/10 dark:bg-emerald-500/15',
    summary: 'Share real engineering insights, project updates, and helpful answers.',
    rules: [
      'Provide context, code snippets, reproducible examples, and clear problem statements.',
      'Tag discussions appropriately with accurate technology topics and categories.',
      'Refrain from clickbait, misleading technical claims, or low-effort generic spam.',
      'Contribute authentic thoughts rather than unedited, unverified AI bulk responses.',
    ],
  },
  {
    icon: LockKeyhole,
    title: '3. Protect Credentials, Secrets & Privacy',
    accent: 'text-amber-500 bg-amber-500/10 dark:bg-amber-500/15',
    summary: 'Guard secrets and respect privacy both in public posts and private chats.',
    rules: [
      'Never paste private API keys, database credentials, authentication tokens, or .env secrets.',
      'Do not disclose private personal data (doxxing), phone numbers, or private correspondence without consent.',
      'Respect copyright, proprietary code, and non-disclosure agreements.',
    ],
  },
  {
    icon: AlertOctagon,
    title: '4. Spam, Scams & Unsolicited Promotion',
    accent: 'text-rose-500 bg-rose-500/10 dark:bg-rose-500/15',
    summary: 'Discuss is a developer ecosystem, not an advertising dumping ground.',
    rules: [
      'No repetitive affiliate links, phishing, crypto pumping, or unsolicited commercial messaging.',
      'Project showcases should share real GitHub repositories, technical architecture, and progress.',
      'Do not spam other members in direct chats or create automated bot flooding accounts.',
    ],
  },
  {
    icon: Flag,
    title: '5. Reporting & Transparent Moderation',
    accent: 'text-purple-500 bg-purple-500/10 dark:bg-purple-500/15',
    summary: 'Help maintain platform quality through in-app reporting tools.',
    rules: [
      'Use the in-app "Report" action on any post, comment, or profile that violates safety rules.',
      'Avoid engaging or escalating in flame wars; our moderation team reviews all flags.',
      'Violations may lead to warning notices, temporary cooldowns, or permanent account revocation.',
    ],
  },
];

export default function InAppGuidelinesPage() {
  const navigate = useNavigate();

  useEffect(() => {
    window.scrollTo(0, 0);
    document.title = 'Community Guidelines | Discuss';
  }, []);

  const handleBack = () => {
    // Prefer browser/app navigation history to return to previous Discuss screen
    const canGoBack =
      (typeof window !== 'undefined' && window.history.state && typeof window.history.state.idx === 'number' && window.history.state.idx > 0) ||
      (typeof window !== 'undefined' && window.history.length > 1);

    if (canGoBack) {
      navigate(-1);
    } else {
      navigate('/feed', { replace: true });
    }
  };

  return (
    <div className="min-h-screen bg-neutral-50 text-neutral-950 dark:bg-black dark:text-white transition-colors">
      <Header />

      <main className="mx-auto w-full max-w-3xl px-4 py-6 sm:py-10">
        {/* Back navigation button */}
        <button
          onClick={handleBack}
          className="mb-6 inline-flex items-center gap-2 rounded-full px-3.5 py-1.5 text-xs font-semibold text-neutral-600 dark:text-neutral-400 hover:bg-neutral-200/60 dark:hover:bg-neutral-800 transition-colors"
        >
          <ArrowLeft className="h-4 w-4" />
          <span>Back</span>
        </button>

        {/* Hero Header */}
        <div className="rounded-3xl border border-neutral-200/80 bg-white p-6 shadow-xs dark:border-neutral-800/80 dark:bg-neutral-950 sm:p-8">
          <div className="flex items-center gap-3">
            <div className="grid h-12 w-12 shrink-0 place-items-center rounded-2xl bg-[#0095F6]/10 text-[#0095F6]">
              <ShieldCheck className="h-6 w-6" />
            </div>
            <div>
              <span className="text-[11px] font-extrabold uppercase tracking-widest text-[#0095F6]">
                Community Standards
              </span>
              <h1 className="text-2xl font-black tracking-tight sm:text-3xl">
                Discuss Community Guidelines
              </h1>
            </div>
          </div>
          <p className="mt-4 text-sm leading-relaxed text-neutral-600 dark:text-neutral-300">
            Discuss is designed to be the cleanest, most focused home for developers to collaborate, share architecture, ask real questions, and build lasting professional connections. These guidelines outline expectations for all participants.
          </p>
        </div>

        {/* Guidelines Sections */}
        <div className="mt-6 space-y-4">
          {guidelineSections.map((section) => {
            const Icon = section.icon;
            return (
              <section
                key={section.title}
                className="rounded-3xl border border-neutral-200/80 bg-white p-6 shadow-xs dark:border-neutral-800/80 dark:bg-neutral-950 sm:p-7"
              >
                <div className="flex items-start gap-4">
                  <div className={`grid h-11 w-11 shrink-0 place-items-center rounded-2xl ${section.accent}`}>
                    <Icon className="h-5 w-5" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <h2 className="text-base font-bold text-neutral-950 dark:text-white">
                      {section.title}
                    </h2>
                    <p className="mt-1 text-xs font-medium text-neutral-500 dark:text-neutral-400">
                      {section.summary}
                    </p>
                    <ul className="mt-4 space-y-2.5">
                      {section.rules.map((rule, idx) => (
                        <li key={idx} className="flex items-start gap-2.5 text-xs text-neutral-700 dark:text-neutral-300 leading-relaxed">
                          <CheckCircle2 className="h-3.5 w-3.5 shrink-0 mt-0.5 text-neutral-400 dark:text-neutral-500" />
                          <span>{rule}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>
              </section>
            );
          })}
        </div>

        {/* Enforcement callout */}
        <section className="mt-6 flex items-start gap-4 rounded-3xl bg-neutral-900 p-6 text-white dark:bg-neutral-900/90 dark:border dark:border-neutral-800">
          <Sparkles className="mt-0.5 h-5 w-5 shrink-0 text-[#0095F6]" />
          <div>
            <h2 className="text-sm font-bold">Safe & Respectful Participation</h2>
            <p className="mt-1.5 text-xs leading-relaxed text-neutral-300">
              By participating on Discuss, you agree to uphold these standards. If you encounter content or behavior that compromises safety or platform integrity, use the report button or contact our team via support.
            </p>
          </div>
        </section>
      </main>
    </div>
  );
}
