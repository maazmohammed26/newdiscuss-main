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
    <div className="min-h-screen flex flex-col bg-black text-[#E1E0CC]">
      <Header />
      
      <main className="flex-1 flex flex-col px-6 py-12 md:py-20 w-full max-w-5xl mx-auto relative z-10">
        <div className="bg-noise absolute inset-0 opacity-[0.08] pointer-events-none" />

        <Link to="/" className="inline-flex items-center gap-2 text-sm font-semibold transition-colors mb-8 group" style={{ color: 'rgba(225, 224, 204, 0.7)' }}>
          <ArrowLeft className="w-4 h-4 group-hover:-translate-x-1 transition-transform" />
          <span>Back to Discuss</span>
        </Link>

        <div className="flex-1 flex items-center justify-center py-10">
          <div className="relative bg-[#101010] border border-white/5 rounded-2xl p-8 sm:p-12 max-w-lg w-full text-center shadow-2xl pt-1.5 overflow-hidden">
            <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-[#DC2626] to-[#2563EB]" />

            <div className="w-16 h-16 bg-[#DC2626]/10 rounded-full flex items-center justify-center mx-auto mb-6 border border-[#DC2626]/20">
              <Briefcase className="w-8 h-8 text-[#DC2626]" />
            </div>
            
            <h1 className="text-2xl sm:text-3xl font-black tracking-tight text-white mb-4">
              No Current Openings
            </h1>
            
            <p className="text-gray-400 mb-8 leading-relaxed text-sm sm:text-base font-medium">
              Discuss is currently built and strictly managed by a solo developer. There are no active recruitment drives at this time.
            </p>
            
            <div className="bg-[#181818] rounded-xl p-4 border border-white/5 shadow-inner">
              <p className="text-gray-500 text-xs sm:text-sm font-medium italic">
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
