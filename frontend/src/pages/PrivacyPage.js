import { useEffect } from 'react';
import { Shield, UserRound, SlidersHorizontal, LockKeyhole, Bell, Trash2 } from 'lucide-react';
import SettingsInfoPageShell from '@/components/SettingsInfoPageShell';

const sections = [
  {
    title: 'Information you provide',
    icon: UserRound,
    content: 'Discuss collects your email address and authentication details for account management, identity verification, and security, along with profile information, posts, messages, media, and preferences you choose to provide so the service can operate as expected.',
  },
  {
    title: 'How information is used',
    icon: SlidersHorizontal,
    content: 'Your information is used to authenticate your account, deliver discussions and messaging, maintain your profile, prevent abuse, provide support, and improve reliability. Discuss does not sell personal information or display targeted advertising.',
  },
  {
    title: 'Storage and protection',
    icon: LockKeyhole,
    content: 'We use access controls and platform security features to protect stored information. No online service can guarantee absolute security, so keep your password and device access private and report suspicious activity promptly.',
  },
  {
    title: 'Notifications and integrations',
    icon: Bell,
    content: 'Push, Telegram, Discord, and similar integrations are optional. When enabled, the minimum information required to deliver your selected notifications is processed by the relevant provider according to its own privacy terms.',
  },
  {
    title: 'Your controls',
    icon: Shield,
    content: 'Profile settings let you manage visibility, notification previews, location sharing, social links, and security preferences. You can contact support to ask questions about your information or account.',
  },
  {
    title: 'Deletion and retention',
    icon: Trash2,
    content: 'You can permanently delete your account directly in the app (Settings & Privacy → Community & Legal → Support & Help → Delete account permanently) or via the web at https://discussit.in/delete-account. Upon deletion, your profile, username, email index, authored posts, personal chat index, stories, pulses, and authentication credentials are permanently removed from our databases. To maintain conversation integrity, existing comments and replies are preserved as historical activity without an active profile or identity. No secondary retention period applies once deletion is processed.',
  },
];

export default function PrivacyPage() {
  useEffect(() => {
    window.scrollTo(0, 0);
    document.title = 'Privacy Policy | Discuss';
  }, []);

  return (
    <SettingsInfoPageShell
      title="Privacy Policy"
      description="A clear overview of what Discuss stores, why it is needed, and the controls available to you. Last updated August 2026."
      icon={Shield}
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
