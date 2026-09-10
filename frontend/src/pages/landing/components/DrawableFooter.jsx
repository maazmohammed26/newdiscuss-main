import React from 'react';
import { Link } from 'react-router-dom';
import DiscussLogo from '@/components/DiscussLogo';
import { DrawableDivider } from './DrawablePrimitives';

/**
 * DrawableFooter
 * Preserves the exact routes and behavior of Footer.js:
 * - Product: Explore (/feed), Messages (/chat), DevRadar (/devradar)
 * - Company: About (/about), Blogs (/blogs), Careers (/careers), Contact (/contact)
 * - Legal: Guidelines (/guidelines), Terms (/terms), Privacy (/privacy), Support (/support)
 * - Parent company attribution (ONYIIX) for public landing page
 * - Official Discuss logo component
 * - Hand-drawn sketch divider & clean pure white background
 */
export default function DrawableFooter() {
  const currentYear = new Date().getFullYear();

  const productLinks = [
    { label: 'Explore', path: '/feed' },
    { label: 'Messages', path: '/chat' },
    { label: 'DevRadar', path: '/devradar' },
  ];

  const companyLinks = [
    { label: 'About', path: '/about' },
    { label: 'Blogs', path: '/blogs' },
    { label: 'Careers', path: '/careers' },
    { label: 'Contact', path: '/contact' },
  ];

  const legalLinks = [
    { label: 'Guidelines', path: '/guidelines' },
    { label: 'Terms', path: '/terms' },
    { label: 'Privacy', path: '/privacy' },
    { label: 'Support', path: '/support' },
  ];

  return (
    <footer className="pt-12 pb-16 px-4 sm:px-6 bg-white border-t border-neutral-200/80">
      <div className="mx-auto max-w-6xl">
        {/* Top brand info & link columns */}
        <div className="grid gap-8 md:grid-cols-[1.4fr_1fr_1fr_1fr] pb-12">
          {/* Official Brand Logo */}
          <div>
            <Link
              to="/"
              className="inline-flex items-center select-none"
              aria-label="Discuss Home"
            >
              <DiscussLogo size="md" tagged />
            </Link>
            <p className="mt-3 text-sm text-neutral-600 max-w-sm leading-relaxed">
              A focused, ad-free network where developers exchange ideas, share work, and build useful connections.
            </p>
            <div className="mt-4">
              <span className="font-mono text-xs text-neutral-400">
                Designed in Bengaluru for developers everywhere.
              </span>
            </div>
          </div>

          {/* Product Links */}
          <div>
            <span className="font-mono text-xs uppercase tracking-wider text-[#0095F6] font-bold block mb-3">
              // Product
            </span>
            <ul className="space-y-2 text-sm">
              {productLinks.map((link) => (
                <li key={link.label}>
                  <Link
                    to={link.path}
                    className="text-neutral-600 hover:text-[#0095F6] transition-colors"
                  >
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Company Links */}
          <div>
            <span className="font-mono text-xs uppercase tracking-wider text-neutral-400 font-bold block mb-3">
              // Company
            </span>
            <ul className="space-y-2 text-sm">
              {companyLinks.map((link) => (
                <li key={link.label}>
                  <Link
                    to={link.path}
                    className="text-neutral-600 hover:text-[#0095F6] transition-colors"
                  >
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Legal Links */}
          <div>
            <span className="font-mono text-xs uppercase tracking-wider text-[#EF4444] font-bold block mb-3">
              // Legal
            </span>
            <ul className="space-y-2 text-sm">
              {legalLinks.map((link) => (
                <li key={link.label}>
                  <Link
                    to={link.path}
                    className="text-neutral-600 hover:text-[#EF4444] transition-colors"
                  >
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        </div>

        {/* Hand-drawn blue divider */}
        <DrawableDivider color="blue" className="mb-6" />

        {/* Bottom Bar with Parent Company Attribution */}
        <div className="flex flex-col sm:flex-row items-center justify-between gap-4 text-xs font-mono text-neutral-500">
          <div className="flex flex-wrap items-center gap-2">
            <span>© {currentYear} Discuss. All rights reserved.</span>
            <span>·</span>
            <span className="inline-flex items-center gap-1.5 text-neutral-400">
              <span>A product of</span>
              <img
                src="/onyiix-logo.png"
                srcSet="/onyiix-logo@2x.png 2x"
                alt="ONYIIX"
                className="h-[11px] w-auto object-contain opacity-70"
                loading="lazy"
              />
            </span>
          </div>

          <div className="flex items-center gap-4">
            <Link to="/about" className="text-neutral-500 hover:text-neutral-900 transition-colors">
              About
            </Link>
            <Link to="/terms" className="text-neutral-500 hover:text-neutral-900 transition-colors">
              Terms
            </Link>
            <Link to="/privacy" className="text-neutral-500 hover:text-neutral-900 transition-colors">
              Privacy
            </Link>
          </div>
        </div>
      </div>
    </footer>
  );
}
