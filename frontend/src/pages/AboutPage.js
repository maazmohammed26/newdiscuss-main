import React, { useState, useEffect } from 'react';
import { CheckCircle2, MessageCircle, ShieldCheck, Users } from 'lucide-react';
import PublicPageShell from '@/components/PublicPageShell';
import maazPortrait from '@/assets/maaz-portrait.png';

const pillars = [
  {
    icon: MessageCircle,
    title: 'Useful conversation',
    text: 'Discussions are designed around context, thoughtful replies, and technical progress.',
  },
  {
    icon: Users,
    title: 'Real developer connection',
    text: 'Profiles, groups, chat, TalentGraph, and DevRadar help the right people find each other.',
  },
  {
    icon: ShieldCheck,
    title: 'Private by design',
    text: 'Discuss is ad-free and gives members clear control over visibility, alerts, and account security.',
  },
];

export default function AboutPage() {
  const [isColorActive, setIsColorActive] = useState(false);

  useEffect(() => {
    if (typeof window !== 'undefined' && typeof window.scrollTo === 'function') {
      try {
        window.scrollTo(0, 0);
      } catch (e) {}
    }
    document.title = 'About Mohammed Maaz A & Discuss | The Person Behind Discuss';

    const description =
      'Meet Mohammed Maaz A, the founder and creator of Discuss. An independent, ad-free developer network designed and built in Bengaluru for technical exchange, code sharing, and genuine peer connections.';

    const setMeta = (selector, attributes) => {
      let element = document.head.querySelector(selector);
      if (!element) {
        element = document.createElement('meta');
        document.head.appendChild(element);
      }
      Object.entries(attributes).forEach(([key, value]) => element.setAttribute(key, value));
    };

    setMeta('meta[name="description"]', { name: 'description', content: description });
    setMeta('meta[name="author"]', { name: 'author', content: 'Mohammed Maaz A' });
    setMeta('meta[name="creator"]', { name: 'creator', content: 'Mohammed Maaz A' });
    setMeta('meta[name="keywords"]', {
      name: 'keywords',
      content:
        'Mohammed Maaz A, Maaz Mohammed, founder of Discuss, Discuss founder, who created Discuss, developer community Bengaluru, software engineer',
    });
    setMeta('meta[property="og:title"]', {
      property: 'og:title',
      content: 'About Mohammed Maaz A & Discuss',
    });
    setMeta('meta[property="og:description"]', { property: 'og:description', content: description });
    setMeta('meta[property="og:type"]', { property: 'og:type', content: 'profile' });
    setMeta('meta[property="og:image"]', { property: 'og:image', content: '/assets/maaz-portrait.png' });
    setMeta('meta[name="twitter:card"]', { name: 'twitter:card', content: 'summary_large_image' });
    setMeta('meta[name="twitter:creator"]', { name: 'twitter:creator', content: 'Mohammed Maaz A' });

    // Inject JSON-LD Schema for Google & AI search agents
    const schemaId = 'about-maaz-jsonld';
    let scriptTag = document.getElementById(schemaId);
    if (!scriptTag) {
      scriptTag = document.createElement('script');
      scriptTag.id = schemaId;
      scriptTag.type = 'application/ld+json';
      document.head.appendChild(scriptTag);
    }
    const schemaData = {
      '@context': 'https://schema.org',
      '@graph': [
        {
          '@type': 'Person',
          '@id': 'https://www.maazprofile.tech/#person',
          'name': 'Mohammed Maaz A',
          'alternateName': ['Maaz', 'Mohammed Maaz'],
          'jobTitle': 'Founder & Software Engineer',
          'description':
            'Founder and creator of Discuss, an independent developer discussion and networking platform built in Bengaluru.',
          'url': 'https://www.maazprofile.tech/',
          'sameAs': [
            'https://www.linkedin.com/in/mohammed-maaz-a-0aa730217/'
          ],
          'image': 'https://newdiscuss-main.vercel.app/assets/maaz-portrait.png'
        },
        {
          '@type': 'Organization',
          '@id': 'https://newdiscuss-main.vercel.app/#organization',
          'name': 'Discuss',
          'url': 'https://newdiscuss-main.vercel.app/',
          'founder': {
            '@id': 'https://www.maazprofile.tech/#person'
          },
          'description': 'A developer network built for signal, not noise.'
        }
      ]
    };
    scriptTag.text = JSON.stringify(schemaData);

    return () => {
      const existingScript = document.getElementById(schemaId);
      if (existingScript) existingScript.remove();
    };
  }, []);

  return (
    <PublicPageShell
      eyebrow="About Discuss"
      title="A developer network built for signal, not noise."
      description="Discuss brings technical publishing, discovery, groups, and private conversation into one focused experience—without ads or engagement tricks."
    >
      {/* ── Product Pillars ──────────────────────────────────────────────── */}
      <div className="grid overflow-hidden rounded-3xl border border-neutral-200 bg-neutral-200 md:grid-cols-3">
        {pillars.map(({ icon: Icon, title, text }) => (
          <article key={title} className="bg-white p-6 sm:p-8">
            <div className="mb-5 grid h-11 w-11 place-items-center rounded-2xl bg-blue-50 text-[#0095F6]">
              <Icon className="h-5 w-5" />
            </div>
            <h2 className="text-lg font-bold text-neutral-900">{title}</h2>
            <p className="mt-2 text-sm leading-6 text-neutral-600">{text}</p>
          </article>
        ))}
      </div>

      {/* ── Personal Section: Mohammed Maaz A ────────────────────────────── */}
      <section className="mt-14 sm:mt-20">
        <div className="grid items-center gap-10 md:grid-cols-[auto_1fr] md:gap-12 lg:gap-16">
          {/* Left: Prominent Portrait */}
          <div className="flex justify-center md:justify-start">
            <div
              role="button"
              tabIndex={0}
              aria-label="Portrait of Mohammed Maaz A — click or tap to toggle color"
              onClick={() => setIsColorActive((prev) => !prev)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                  e.preventDefault();
                  setIsColorActive((prev) => !prev);
                }
              }}
              className="group relative cursor-pointer select-none rounded-[28px] overflow-hidden bg-neutral-100 border border-neutral-200/80 p-2 shadow-xs transition-all focus:outline-none focus-visible:ring-2 focus-visible:ring-[#0095F6] focus-visible:ring-offset-2"
            >
              <div className="relative aspect-square w-64 sm:w-72 md:w-80 overflow-hidden rounded-[22px] bg-white">
                <img
                  src={maazPortrait}
                  alt="Mohammed Maaz A — Creator of Discuss"
                  className={`h-full w-full object-cover object-center transition-all duration-500 ease-out will-change-transform ${
                    isColorActive
                      ? 'grayscale-0 scale-[1.015]'
                      : 'grayscale contrast-[1.02] group-hover:grayscale-0 group-hover:scale-[1.015]'
                  }`}
                  loading="eager"
                />
              </div>
              <span className="sr-only">Toggle photo color</span>
            </div>
          </div>

          {/* Right: Personal Introduction */}
          <div className="max-w-xl text-center md:text-left">
            <p className="text-xs font-bold uppercase tracking-[.18em] text-[#0095F6]">
              The person behind Discuss
            </p>
            <h2 className="mt-2.5 text-3xl font-black tracking-tight text-neutral-950 sm:text-4xl lg:text-5xl">
              Hey, I’m Maaz.
            </h2>
            <p className="mt-4 text-base leading-relaxed text-neutral-600 sm:text-lg">
              I’m the person building Discuss. I wanted a place where developers could share ideas, ask questions, show what they’re building, and actually connect with people who understand the work.
            </p>

            {/* Elegant Text Links */}
            <div className="mt-6 flex flex-wrap items-center justify-center gap-6 md:justify-start">
              <a
                href="https://www.maazprofile.tech/"
                target="_blank"
                rel="noopener noreferrer"
                className="group inline-flex items-center gap-1.5 text-sm font-semibold text-neutral-900 transition-colors hover:text-[#0095F6]"
              >
                <span className="underline decoration-neutral-300 underline-offset-4 transition-colors group-hover:decoration-[#0095F6]">
                  Portfolio
                </span>
                <span className="font-mono text-xs transition-transform group-hover:translate-x-0.5 group-hover:-translate-y-0.5">
                  ↗
                </span>
              </a>

              <a
                href="https://www.linkedin.com/in/mohammed-maaz-a-0aa730217/"
                target="_blank"
                rel="noopener noreferrer"
                className="group inline-flex items-center gap-1.5 text-sm font-semibold text-neutral-900 transition-colors hover:text-[#0095F6]"
              >
                <span className="underline decoration-neutral-300 underline-offset-4 transition-colors group-hover:decoration-[#0095F6]">
                  LinkedIn
                </span>
                <span className="font-mono text-xs transition-transform group-hover:translate-x-0.5 group-hover:-translate-y-0.5">
                  ↗
                </span>
              </a>
            </div>
          </div>
        </div>

        {/* ── Personal Closing Note ────────────────────────────────────────── */}
        <div className="mt-12 sm:mt-16 pt-10 border-t border-neutral-200/80 text-center md:text-left">
          <p className="text-xs font-bold uppercase tracking-[.18em] text-neutral-400">
            A note from me
          </p>
          <blockquote className="mt-3 text-lg sm:text-xl font-medium leading-relaxed text-neutral-800 max-w-2xl">
            “Discuss is still growing, but the idea is simple: make it easier for developers to think out loud, learn from each other, and build meaningful connections.”
          </blockquote>
          <p className="mt-3 text-sm font-semibold text-neutral-500">
            — Maaz
          </p>
        </div>
      </section>

      {/* ── Independent Product Section ─────────────────────────────────── */}
      <section className="mt-12 sm:mt-16 grid gap-8 rounded-3xl bg-neutral-950 p-7 text-white sm:p-10 md:grid-cols-[1fr_.8fr]">
        <div>
          <p className="text-xs font-bold uppercase tracking-[.16em] text-blue-300">Independent product</p>
          <h2 className="mt-3 text-2xl font-bold tracking-tight sm:text-3xl">Designed and built in Bengaluru.</h2>
          <p className="mt-4 text-sm leading-7 text-neutral-400">
            Discuss is an independently built platform created by Mohammed Maaz A to prove that a focused social product can feel calm, fast, and genuinely useful.
          </p>
        </div>
        <ul className="space-y-3 self-center text-sm text-neutral-300">
          {['Free to join', 'No targeted advertising', 'Built for developers and technical communities'].map((item) => (
            <li key={item} className="flex items-center gap-3">
              <CheckCircle2 className="h-4 w-4 text-[#0095F6]" />
              {item}
            </li>
          ))}
        </ul>
      </section>
    </PublicPageShell>
  );
}
