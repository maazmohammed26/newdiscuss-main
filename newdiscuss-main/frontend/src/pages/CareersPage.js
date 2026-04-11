import React, { useEffect } from 'react';
import { Link } from 'react-router-dom';
import Header from '@/components/Header';
import Footer from '@/components/Footer';
import { Briefcase, ArrowLeft } from 'lucide-react';

export default function CareersPage() {
  useEffect(() => {
    document.title = "Careers | Discuss Platforms";
    const metaDesc = document.querySelector('meta[name="description"]');
    if (metaDesc) {
      metaDesc.setAttribute('content', 'Career opportunities at Discuss. Built by developers, for developers.');
    }
  }, []);

  return (
    <div className="min-h-screen flex flex-col bg-neutral-50 dark:bg-neutral-900 discuss:bg-[#121212]">
      <Header />
      
      <main className="flex-1 flex flex-col px-6 py-10 md:py-16 w-full max-w-5xl mx-auto">
        <Link to="/" className="inline-flex items-center gap-2 text-sm font-medium text-neutral-500 hover:text-neutral-900 dark:text-neutral-400 dark:hover:text-neutral-50 discuss:text-[#9CA3AF] discuss:hover:text-[#F5F5F5] transition-colors mb-auto">
          <ArrowLeft className="w-4 h-4" />
          Back to Discuss
        </Link>

        <div className="flex-1 flex items-center justify-center py-10">
          <div className="bg-white dark:bg-neutral-800 discuss:bg-[#1a1a1a] border border-neutral-200 dark:border-neutral-700 discuss:border-[#333333] rounded-[16px] p-10 max-w-lg w-full text-center shadow-sm">
          <div className="w-16 h-16 bg-blue-50 dark:bg-blue-900/20 discuss:bg-[#EF4444]/10 rounded-full flex items-center justify-center mx-auto mb-6">
            <Briefcase className="w-8 h-8 text-blue-600 dark:text-blue-400 discuss:text-[#EF4444]" />
          </div>
          
          <h1 className="text-2xl font-bold font-heading text-neutral-900 dark:text-neutral-50 discuss:text-[#F5F5F5] mb-4">
            No Current Openings
          </h1>
          
          <p className="text-neutral-600 dark:text-neutral-400 discuss:text-[#9CA3AF] mb-6 leading-relaxed text-sm md:text-base">
            Discuss is currently built and strictly managed by a solo developer. There are no active recruitment drives at this time.
          </p>
          
          <div className="bg-neutral-50 dark:bg-neutral-900/50 discuss:bg-[#121212] rounded-[12px] p-4 border border-neutral-100 dark:border-neutral-700/50 discuss:border-[#262626]">
            <p className="text-neutral-500 dark:text-neutral-500 discuss:text-[#737373] text-sm italic">
              Future opportunities and expansion roles will be updated directly on this page.
            </p>
          </div>
          </div>
        </div>
      </main>

      <Footer />
    </div>
  );
}
