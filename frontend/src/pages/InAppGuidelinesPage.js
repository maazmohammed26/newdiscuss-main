import { useEffect } from 'react';
import SettingsInfoPageShell from '@/components/SettingsInfoPageShell';
import { 
  ShieldCheck, 
  HeartHandshake, 
  MessageSquareCode, 
  LockKeyhole, 
  AlertOctagon, 
  Flag, 
  CheckCircle2
} from 'lucide-react';

const guidelineSections = [
  {
    icon: HeartHandshake,
    title: '1. Build with Respect',
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
    summary: 'Help maintain platform quality through in-app reporting tools.',
    rules: [
      'Use the in-app "Report" action on any post, comment, or profile that violates safety rules.',
      'Avoid engaging or escalating in flame wars; our moderation team reviews all flags.',
      'Violations may lead to warning notices, temporary cooldowns, or permanent account revocation.',
    ],
  },
];

export default function InAppGuidelinesPage() {
  useEffect(() => {
    window.scrollTo(0, 0);
    document.title = 'Community Guidelines | Discuss';
  }, []);

  return (
    <SettingsInfoPageShell
      title="Community Guidelines"
      description="Discuss is designed to be the cleanest, most focused home for developers to collaborate, share architecture, ask real questions, and build lasting professional connections. These guidelines outline expectations for all participants."
      icon={ShieldCheck}
    >
      {guidelineSections.map((section) => {
        const Icon = section.icon;
        return (
          <section
            key={section.title}
            className="flex items-start gap-4 border-b border-neutral-200 py-6 last:border-b-0 dark:border-[#262626]"
          >
            <div className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-neutral-100 dark:bg-neutral-800 text-neutral-800 dark:text-neutral-200">
              <Icon className="h-5 w-5" />
            </div>
            <div className="flex-1 min-w-0">
              <h2 className="text-sm font-bold text-neutral-950 dark:text-white">
                {section.title}
              </h2>
              <p className="mt-1 text-xs text-neutral-500 dark:text-neutral-400">
                {section.summary}
              </p>
              <ul className="mt-3 space-y-2">
                {section.rules.map((rule, idx) => (
                  <li key={idx} className="flex items-start gap-2 text-xs text-neutral-700 dark:text-neutral-300 leading-relaxed">
                    <CheckCircle2 className="h-3.5 w-3.5 shrink-0 mt-0.5 text-neutral-400" />
                    <span>{rule}</span>
                  </li>
                ))}
              </ul>
            </div>
          </section>
        );
      })}
    </SettingsInfoPageShell>
  );
}
