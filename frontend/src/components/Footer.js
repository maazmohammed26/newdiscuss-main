import React from 'react';
import { Link } from 'react-router-dom';
import DiscussLogo from '@/components/DiscussLogo';
import ThemeToggle from '@/components/ThemeToggle';

export default function Footer() {
  const footerLinks = [
    { name: 'About', path: '/about' },
    { name: 'Careers', path: '/careers' },
    { name: 'Blogs', path: '/blogs' },
    { name: 'Contact', path: '/contact' },
  ];

  return (
    <footer className="py-8 px-6 border-t border-white/10 bg-black text-[#DEDBC8]">
      <div className="max-w-5xl mx-auto flex flex-col lg:flex-row items-center justify-between gap-6">
        
        {/* Left Side: Branding */}
        <div className="flex items-center gap-4">
          <DiscussLogo size="md" />
        </div>

        {/* Middle: Links */}
        <div className="flex flex-wrap justify-center gap-6 text-sm font-medium">
          {footerLinks.map((link) => (
            <Link
              key={link.name}
              to={link.path}
              className="transition-colors text-neutral-400 hover:text-white"
              style={{ color: 'rgba(225,224,204,0.6)' }}
              onMouseEnter={e => (e.currentTarget.style.color = '#E1E0CC')}
              onMouseLeave={e => (e.currentTarget.style.color = 'rgba(225,224,204,0.6)')}
            >
              {link.name}
            </Link>
          ))}
        </div>

        {/* Right Side: Copyright */}
        <div className="text-xs text-neutral-500 text-center lg:text-right" style={{ color: 'rgba(225,224,204,0.4)' }}>
          &copy; {new Date().getFullYear()} Discuss. Built for developers.<br />
          <span className="opacity-70 mt-1 inline-block">All rights reserved.</span>
        </div>

      </div>
    </footer>
  );
}
