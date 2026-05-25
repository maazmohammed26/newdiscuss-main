import React, { useEffect } from 'react';
import { Link } from 'react-router-dom';
import Header from '@/components/Header';
import Footer from '@/components/Footer';
import { Mail, Linkedin, Instagram, MapPin, ArrowLeft } from 'lucide-react';

export default function ContactPage() {
  useEffect(() => {
    document.title = "Contact | Discuss Platforms";
    const metaDesc = document.querySelector('meta[name="description"]');
    if (metaDesc) {
      metaDesc.setAttribute('content', 'Get in touch with the Discuss team for support, queries, and collaborations.');
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
          Contact Us
        </h1>
        <p className="text-neutral-600 dark:text-neutral-400 discuss:text-[#9CA3AF] mb-12 text-lg">
          Have a question or looking to collaborate? Reach out to us through our official channels.
        </p>

        <div className="bg-white dark:bg-neutral-800 discuss:bg-[#1a1a1a] border border-neutral-200 dark:border-neutral-700 discuss:border-[#333333] rounded-[16px] p-8 shadow-sm">
          <div className="flex flex-col gap-8">
            
            <a href="mailto:support@discussit.in" className="flex items-center gap-4 group">
              <div className="w-12 h-12 bg-blue-50 dark:bg-blue-900/20 discuss:bg-[#EF4444]/10 rounded-[12px] flex items-center justify-center group-hover:scale-105 transition-transform">
                <Mail className="w-6 h-6 text-blue-600 dark:text-blue-400 discuss:text-[#EF4444]" />
              </div>
              <div className="flex-1">
                <h3 className="text-sm font-semibold text-neutral-500 dark:text-neutral-400 discuss:text-[#9CA3AF]">Support Email</h3>
                <p className="text-base font-medium text-neutral-900 dark:text-neutral-50 discuss:text-[#F5F5F5]">support@discussit.in</p>
              </div>
            </a>

            <a href="https://in.linkedin.com/company/discussitin" target="_blank" rel="noopener noreferrer" className="flex items-center gap-4 group">
              <div className="w-12 h-12 bg-[#0077B5]/10 dark:bg-[#0077B5]/20 discuss:bg-[#0077B5]/20 rounded-[12px] flex items-center justify-center group-hover:scale-105 transition-transform">
                <Linkedin className="w-6 h-6 text-[#0077B5]" />
              </div>
              <div className="flex-1">
                <h3 className="text-sm font-semibold text-neutral-500 dark:text-neutral-400 discuss:text-[#9CA3AF]">LinkedIn (Official)</h3>
                <p className="text-base font-medium text-neutral-900 dark:text-neutral-50 discuss:text-[#F5F5F5]">Discuss</p>
              </div>
            </a>

            <a href="https://www.instagram.com/discussit.in" target="_blank" rel="noopener noreferrer" className="flex items-center gap-4 group">
              <div className="w-12 h-12 bg-pink-50 dark:bg-pink-900/20 discuss:bg-pink-900/20 rounded-[12px] flex items-center justify-center group-hover:scale-105 transition-transform" style={{ backgroundColor: 'rgba(236,72,153,0.12)' }}>
                <Instagram className="w-6 h-6" style={{ color: '#E1306C' }} />
              </div>
              <div className="flex-1">
                <h3 className="text-sm font-semibold text-neutral-500 dark:text-neutral-400 discuss:text-[#9CA3AF]">Instagram (Official)</h3>
                <p className="text-base font-medium text-neutral-900 dark:text-neutral-50 discuss:text-[#F5F5F5]">@discussit.in</p>
              </div>
            </a>

            <div className="flex items-start gap-4">
              <div className="w-12 h-12 bg-neutral-100 dark:bg-neutral-700 discuss:bg-[#262626] rounded-[12px] flex items-center justify-center shrink-0">
                <MapPin className="w-6 h-6 text-neutral-600 dark:text-neutral-400 discuss:text-[#9CA3AF]" />
              </div>
              <div className="flex-1 pt-1">
                <h3 className="text-sm font-semibold text-neutral-500 dark:text-neutral-400 discuss:text-[#9CA3AF] mb-1">Registered Address</h3>
                <p className="text-base text-neutral-900 dark:text-neutral-50 discuss:text-[#F5F5F5] leading-relaxed">
                  Discuss<br />
                  S A Ashiana<br />
                  Bangalore, Karnataka, India
                </p>
              </div>
            </div>

          </div>
        </div>
      </main>

      <Footer />
    </div>
  );
}
