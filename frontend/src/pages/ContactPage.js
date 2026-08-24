import { useEffect } from 'react';
import { Instagram, Linkedin, Mail, MapPin } from 'lucide-react';
import PublicPageShell from '@/components/PublicPageShell';

const channels = [
  { icon: Mail, label: 'Support email', value: 'support@discussit.in', href: 'mailto:support@discussit.in' },
  { icon: Linkedin, label: 'LinkedIn', value: 'Discuss', href: 'https://in.linkedin.com/company/discussitin' },
  { icon: Instagram, label: 'Instagram', value: '@discussit.in', href: 'https://www.instagram.com/discussit.in' },
];

export default function ContactPage() {
  useEffect(() => {
    window.scrollTo(0, 0);
    document.title = 'Contact | Discuss';
  }, []);

  return (
    <PublicPageShell eyebrow="Contact" title="Talk to the Discuss team." description="Use an official channel for product feedback, account help, safety reports, or collaboration enquiries." compact>
      <div className="grid gap-4 md:grid-cols-2">
        <div className="overflow-hidden rounded-3xl border border-neutral-200 bg-white">
          {channels.map(({ icon: Icon, label, value, href }) => (
            <a key={label} href={href} target={href.startsWith('http') ? '_blank' : undefined} rel={href.startsWith('http') ? 'noopener noreferrer' : undefined} className="flex items-center gap-4 border-b border-neutral-200 p-5 last:border-b-0 hover:bg-neutral-50">
              <div className="grid h-11 w-11 shrink-0 place-items-center rounded-2xl bg-blue-50 text-[#0095F6]"><Icon className="h-5 w-5" /></div>
              <div className="min-w-0"><p className="text-[11px] font-bold uppercase tracking-[.14em] text-neutral-400">{label}</p><p className="mt-1 truncate text-sm font-bold text-neutral-900">{value}</p></div>
            </a>
          ))}
        </div>
        <section className="rounded-3xl bg-neutral-950 p-7 text-white">
          <div className="grid h-11 w-11 place-items-center rounded-2xl bg-white/10"><MapPin className="h-5 w-5 text-blue-300" /></div>
          <p className="mt-6 text-[11px] font-bold uppercase tracking-[.14em] text-neutral-500">Registered location</p>
          <h2 className="mt-2 text-xl font-bold">Bengaluru, Karnataka</h2>
          <p className="mt-3 text-sm leading-6 text-neutral-400">Discuss operates from Bengaluru, India, and serves developers wherever they build.</p>
        </section>
      </div>
    </PublicPageShell>
  );
}
