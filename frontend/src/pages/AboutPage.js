import React, { useEffect } from 'react';
import { Link } from 'react-router-dom';
import Header from '@/components/Header';
import Footer from '@/components/Footer';
import { ArrowLeft, Check } from 'lucide-react';

export default function AboutPage() {
  useEffect(() => {
    document.title = "About | Discuss Platforms";
    const metaDesc = document.querySelector('meta[name="description"]');
    if (metaDesc) {
      metaDesc.setAttribute('content', 'Learn more about Discuss, the 100% free developer discussion platform built for zero noise and engaging tech conversations.');
    }
    
    // Smooth scroll to target hash
    if (window.location.hash) {
      const id = window.location.hash.substring(1);
      setTimeout(() => {
        const element = document.getElementById(id);
        if (element) {
          element.scrollIntoView({ behavior: 'smooth', block: 'center' });
        }
      }, 300);
    }
  }, []);

  return (
    <div className="min-h-screen flex flex-col bg-black text-[#E1E0CC]">
      <Header />
      
      <main className="flex-1 max-w-4xl mx-auto px-6 py-12 md:py-20 w-full relative z-10">
        <div className="bg-noise absolute inset-0 opacity-[0.08] pointer-events-none" />

        <Link to="/" className="inline-flex items-center gap-2 text-sm font-semibold transition-colors mb-10 group" style={{ color: 'rgba(225, 224, 204, 0.7)' }}>
          <ArrowLeft className="w-4 h-4 group-hover:-translate-x-1 transition-transform" />
          <span>Back to Discuss</span>
        </Link>

        {/* Section Header with red and blue accent */}
        <div className="relative mb-12">
          <div className="absolute -left-4 top-1/2 -translate-y-1/2 w-1.5 h-12 bg-gradient-to-b from-[#DC2626] to-[#2563EB] rounded-full hidden md:block" />
          <span className="text-[10px] sm:text-xs font-bold tracking-[0.25em] uppercase text-[#3182CE] mb-2 block">
            Our Mission & Purpose
          </span>
          <h1 className="text-4xl md:text-6xl font-black tracking-tight mb-4 text-[#DEDBC8] leading-none">
            About Discuss
          </h1>
          <div className="w-20 h-1 bg-gradient-to-r from-[#DC2626] to-[#2563EB] rounded-full" />
        </div>

        <div className="space-y-12 leading-relaxed">
          
          <section className="bg-[#101010] p-6 sm:p-10 rounded-2xl border border-white/5 shadow-2xl relative pt-1.5">
            <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-[#DC2626] to-[#2563EB]" />
            <h2 className="text-xl sm:text-2xl font-bold mb-4 text-white flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-[#DC2626]" />
              Platform Purpose
            </h2>
            <p className="text-sm sm:text-base text-gray-300 leading-relaxed font-medium">
              Discuss is an uncompromising developer discussion platform. It was crafted with a single explicit purpose: to serve as a high-signal, zero-noise ecosystem where developers, engineers, and learners can share ideas, ask deep questions, and connect over technical growth without the distractions of algorithmic feeds, cookies, or intrusive advertising.
            </p>
          </section>

          <section className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="bg-[#101010] p-6 sm:p-8 rounded-2xl border border-white/5 shadow-xl">
              <h2 className="text-xl font-bold mb-4 text-white flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-[#2563EB]" />
                Core Ecosystem Features
              </h2>
              <ul className="space-y-3.5">
                {[
                  { title: "Real-time Chat & Groups", desc: "Lightning fast messaging caches syncing peer-to-peer or within hubs." },
                  { title: "Technical Feed", desc: "Native support for sharing GitHub repository links wrapped in structured context." },
                  { title: "Rich Discussions", desc: "Granular comment threads designed to keep engineering solutions organized." },
                  { title: "Privacy First", desc: "Built-in 24-hour auto-disappearing chat modes for sensitive team chats." }
                ].map((f, i) => (
                  <li key={i} className="flex items-start gap-2.5 text-xs sm:text-sm">
                    <Check className="w-4 h-4 mt-1 flex-shrink-0" style={{ color: i % 2 === 0 ? '#DC2626' : '#2563EB' }} />
                    <div>
                      <strong className="text-white block font-semibold">{f.title}</strong>
                      <span className="text-gray-400 text-xs">{f.desc}</span>
                    </div>
                  </li>
                ))}
              </ul>
            </div>

            <div className="bg-[#101010] p-6 sm:p-8 rounded-2xl border border-white/5 shadow-xl flex flex-col justify-between">
              <div>
                <h2 className="text-xl font-bold mb-4 text-white flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-[#DC2626]" />
                  Vision & Promise
                </h2>
                <p className="text-sm text-gray-300 mb-4 leading-relaxed font-medium">
                  The vision is simple: The internet needs fewer distractions and more substantial builder-oriented communities. Discuss is proudly <strong className="text-[#DEDBC8] font-bold">100% free, free from ads, and free from algorithmic manipulation</strong>.
                </p>
                <p className="text-xs text-gray-400 leading-relaxed">
                  There are no tracking scripts mining your time, only the genuine discussions you actively choose to participate in.
                </p>
              </div>
              <div className="mt-6 pt-4 border-t border-white/5 text-[11px] font-bold text-gray-500 uppercase tracking-wider">
                Built by Builders, for Builders
              </div>
            </div>
          </section>

          <section className="bg-gradient-to-br from-[#101010] to-[#151515] p-6 sm:p-10 rounded-2xl border border-white/5 mt-12 relative overflow-hidden shadow-2xl">
            <div className="absolute right-0 top-0 w-24 h-24 bg-gradient-to-br from-[#DC2626]/10 to-[#2563EB]/10 rounded-full blur-2xl" />
            <h2 className="text-xl sm:text-2xl font-bold text-white mb-4 flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-[#2563EB]" />
              The Story Behind the Code
            </h2>
            <p className="text-sm sm:text-base text-gray-300 leading-relaxed font-medium mb-4">
              Discuss is a student-built ecosystem designed, architected, and managed entirely by{' '}
              <a 
                href="https://www.maazportfolio.site/" 
                target="_blank" 
                rel="noopener noreferrer" 
                className="shining-red-blue-text font-black hover:underline transition-all"
              >
                Mohammed Maaz A (&lt;mma/&gt;)
              </a>
              , a solo developer and AI engineer passionate about performant web architectures. What started as an academic undertaking has evolved into a production-grade infrastructure aiming to set a gold standard for clean, responsive application design.
            </p>
            <p id="digitalclink" className="text-sm sm:text-base text-gray-300 leading-relaxed font-medium mb-0">
              We are proud to have collaborated with{' '}
              <a 
                href="https://roohifida.com" 
                target="_blank" 
                rel="noopener noreferrer" 
                className="shining-purple-text font-black hover:underline"
              >
                DigitalClink
              </a>{' '}
              company, which is managed by{' '}
              <a 
                href="https://roohifida.com" 
                target="_blank" 
                rel="noopener noreferrer" 
                className="font-extrabold hover:underline text-[#3182CE]"
              >
                Roohi Fida A
              </a>
              . Feel free to explore the company and portfolio at{' '}
              <a 
                href="https://roohifida.com" 
                target="_blank" 
                rel="noopener noreferrer" 
                className="font-bold underline text-neutral-400 hover:text-white"
              >
                roohifida.com
              </a>.
            </p>
          </section>

        </div>
      </main>

      <style>{`
        @keyframes shine-purple {
          0% { background-position: -200% center; }
          100% { background-position: 200% center; }
        }
        @keyframes shine-red-blue {
          0% { background-position: -200% center; }
          100% { background-position: 200% center; }
        }
        .shining-purple-text {
          background: linear-gradient(120deg, #6B21A8 25%, #C084FC 50%, #6B21A8 75%);
          background-size: 200% auto;
          -webkit-background-clip: text;
          -webkit-text-fill-color: transparent;
          animation: shine-purple 3.5s linear infinite;
          text-shadow: 0 0 8px rgba(107, 33, 168, 0.35);
          font-weight: 800;
          display: inline-block;
        }
        .shining-red-blue-text {
          background: linear-gradient(120deg, #DC2626 25%, #93C5FD 50%, #2563EB 75%);
          background-size: 200% auto;
          -webkit-background-clip: text;
          -webkit-text-fill-color: transparent;
          animation: shine-red-blue 3.5s linear infinite;
          text-shadow: 0 0 8px rgba(220, 38, 38, 0.25);
          font-weight: 800;
          display: inline-block;
        }
      `}</style>
      <Footer />
    </div>
  );
}
