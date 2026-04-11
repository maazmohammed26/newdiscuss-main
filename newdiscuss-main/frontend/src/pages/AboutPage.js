import React, { useEffect } from 'react';
import { Link } from 'react-router-dom';
import Header from '@/components/Header';
import Footer from '@/components/Footer';
import { ArrowLeft } from 'lucide-react';

export default function AboutPage() {
  useEffect(() => {
    document.title = "About | Discuss Platforms";
    const metaDesc = document.querySelector('meta[name="description"]');
    if (metaDesc) {
      metaDesc.setAttribute('content', 'Learn more about Discuss, the 100% free developer discussion platform built for zero noise and engaging tech conversations.');
    }
  }, []);

  return (
    <div className="min-h-screen flex flex-col bg-neutral-50 dark:bg-neutral-900 discuss:bg-[#121212]">
      <Header />
      
      <main className="flex-1 max-w-3xl mx-auto px-6 py-10 md:py-16 w-full">
        <Link to="/" className="inline-flex items-center gap-2 text-sm font-medium text-neutral-500 hover:text-neutral-900 dark:text-neutral-400 dark:hover:text-neutral-50 discuss:text-[#9CA3AF] discuss:hover:text-[#F5F5F5] transition-colors mb-8">
          <ArrowLeft className="w-4 h-4" />
          Back to Discuss
        </Link>
        <h1 className="text-3xl md:text-5xl font-bold font-heading text-neutral-900 dark:text-neutral-50 discuss:text-[#F5F5F5] mb-6">
          About Discuss
        </h1>
        
        <div className="prose prose-neutral dark:prose-invert max-w-none text-neutral-700 dark:text-neutral-300 discuss:text-[#A3A3A3] leading-relaxed space-y-8">
          
          <section>
            <h2 className="text-xl md:text-2xl font-bold text-neutral-900 dark:text-neutral-50 discuss:text-[#F5F5F5] mb-3">
              Platform Purpose
            </h2>
            <p>
              Discuss is an uncompromising developer discussion platform. It was crafted with a single explicit purpose: to serve as a high-signal, zero-noise ecosystem where developers, engineers, and learners can share ideas, ask deep questions, and connect over technical growth without the distractions of algorithmic feeds or ads.
            </p>
          </section>

          <section>
            <h2 className="text-xl md:text-2xl font-bold text-neutral-900 dark:text-neutral-50 discuss:text-[#F5F5F5] mb-3">
              Core Features
            </h2>
            <ul className="list-disc pl-5 space-y-2">
              <li><strong>Real-time Chat & Groups:</strong> Lightning fast messaging caches syncing peer-to-peer or within large community hubs.</li>
              <li><strong>Technical Feed:</strong> Native support for sharing GitHub repository links wrapped in structured context.</li>
              <li><strong>Rich Discussions:</strong> Granular comment threads designed to keep engineering solutions organized.</li>
              <li><strong>Privacy First:</strong> Built-in 24-hour auto-disappearing chat modes for sensitive team chats.</li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl md:text-2xl font-bold text-neutral-900 dark:text-neutral-50 discuss:text-[#F5F5F5] mb-3">
              Vision & Promise
            </h2>
            <p>
              The vision is simple: The internet needs fewer distractions and more substantial builder-oriented communities. Discuss is proudly <strong>100% free, free from ads, and free from algorithmic scams</strong>. There are no tracking scripts mining your time, only the discussions you actively choose to engage with.
            </p>
          </section>

          <section className="bg-white dark:bg-neutral-800 discuss:bg-[#1a1a1a] p-6 rounded-[16px] border border-neutral-200 dark:border-neutral-700 discuss:border-[#333333] mt-12">
            <h2 className="text-xl font-bold text-neutral-900 dark:text-neutral-50 discuss:text-[#F5F5F5] mb-3">
              The Story Behind the Code
            </h2>
            <p className="mb-0">
              Discuss is a student-built ecosystem designed, architected, and managed entirely by <a href="https://www.linkedin.com/in/mohammed-maaz-a-0aa730217/" target="_blank" rel="noopener noreferrer" className="text-blue-600 dark:text-blue-400 discuss:text-[#EF4444] font-medium hover:underline">Mohammad Maaz</a>, a solo developer and AI engineer passionate about performant web architectures. What started as an academic undertaking has evolved into a production-grade infrastructure aiming to set a gold standard for clean, responsive application design.
            </p>
          </section>

        </div>
      </main>

      <Footer />
    </div>
  );
}
