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
    <footer className="py-8 px-6 border-t border-neutral-200 dark:border-neutral-700 discuss:border-[#333333] bg-white dark:bg-[#1E1E1E] discuss:bg-[#121212]">
      <div className="max-w-5xl mx-auto flex flex-col lg:flex-row items-center justify-between gap-6">
        
        {/* Left Side: Branding */}
        <div className="flex items-center gap-4">
          <DiscussLogo size="md" />
          <div className="h-6 w-px bg-neutral-300 dark:bg-neutral-600 discuss:bg-[#333333] hidden sm:block"></div>
          <ThemeToggle />
        </div>

        {/* Middle: Links */}
        <div className="flex flex-wrap justify-center gap-6 text-sm font-medium">
          {footerLinks.map((link) => (
            <Link
              key={link.name}
              to={link.path}
              className="text-neutral-600 hover:text-neutral-900 dark:text-neutral-400 dark:hover:text-neutral-50 discuss:text-[#9CA3AF] discuss:hover:text-[#F5F5F5] transition-colors"
            >
              {link.name}
            </Link>
          ))}
        </div>

        {/* Right Side: Copyright */}
        <div className="text-xs text-neutral-500 dark:text-neutral-400 discuss:text-[#9CA3AF] text-center lg:text-right">
          &copy; {new Date().getFullYear()} Discuss. Built for developers.<br />
          <span className="opacity-70 mt-1 inline-block">All rights reserved.</span>
        </div>

      </div>
    </footer>
  );
}
