import { useEffect } from 'react';
import { FileText, UserRound, MessageSquare, ShieldCheck, Server, UserX } from 'lucide-react';
import SettingsInfoPageShell from '@/components/SettingsInfoPageShell';

const sections = [
  {
    title: 'Your account',
    icon: UserRound,
    content: 'Keep your registration details accurate and protect access to your account. You are responsible for activity performed through your account unless you promptly report unauthorized access.',
  },
  {
    title: 'Respectful participation',
    icon: MessageSquare,
    content: 'Discuss is built for useful technical exchange. Harassment, impersonation, spam, malicious links, illegal content, automated scraping, and attempts to disrupt the service are not permitted.',
  },
  {
    title: 'Content you share',
    icon: FileText,
    content: 'You retain responsibility for posts, messages, media, projects, and links you publish. Only share content you have the right to use, and respect the privacy and intellectual property of others.',
  },
  {
    title: 'Safety and enforcement',
    icon: ShieldCheck,
    content: 'We may limit or remove content and accounts that violate these terms, community guidelines, applicable law, or the safety of other members. Serious abuse may be reported to the appropriate authorities.',
  },
  {
    title: 'Service availability',
    icon: Server,
    content: 'We work to keep Discuss reliable, but features may change or be temporarily unavailable for maintenance, security, network, or platform reasons. Continued use after an announced update means you accept the revised terms.',
  },
  {
    title: 'Leaving Discuss',
    icon: UserX,
    content: 'You may stop using Discuss or request account deletion from your profile. Some limited records may be retained when required for security, fraud prevention, dispute resolution, or legal compliance.',
  },
];

export default function TermsPage() {
  useEffect(() => {
    window.scrollTo(0, 0);
    document.title = 'Terms and Conditions | Discuss';
  }, []);

  return (
    <SettingsInfoPageShell
      title="Terms and Conditions"
      description="The standards that keep Discuss safe, useful, and fair for everyone. Last updated August 2026."
      icon={FileText}
    >
      {sections.map(({ title, icon: SectionIcon, content }) => (
        <section key={title} className="flex gap-4 border-b border-neutral-200 py-6 last:border-b-0 dark:border-neutral-800">
          <SectionIcon className="mt-0.5 h-5 w-5 shrink-0 stroke-[1.7px] text-neutral-700 dark:text-neutral-300" />
          <div>
            <h2 className="text-[15px] font-extrabold">{title}</h2>
            <p className="mt-2 text-sm leading-6 text-neutral-600 dark:text-neutral-400">{content}</p>
          </div>
        </section>
      ))}
    </SettingsInfoPageShell>
  );
}
