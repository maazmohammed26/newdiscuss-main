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
            Get In Touch
          </span>
          <h1 className="text-4xl md:text-6xl font-black tracking-tight mb-4 text-[#DEDBC8] leading-none">
            Contact Us
          </h1>
          <p className="text-gray-400 text-sm sm:text-base font-medium max-w-xl">
            Have a question, feedback, or looking to collaborate? Reach out to us through our official channels.
          </p>
          <div className="w-20 h-1 bg-gradient-to-r from-[#DC2626] to-[#2563EB] rounded-full mt-6" />
        </div>

        <div className="relative bg-[#101010] border border-white/5 rounded-2xl p-6 sm:p-10 shadow-2xl overflow-hidden pt-1.5">
          <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-[#DC2626] to-[#2563EB]" />

          <div className="grid grid-cols-1 md:grid-cols-2 gap-8 md:gap-12">
            
            {/* Left: Contact Channels */}
            <div className="space-y-8">
              <a href="mailto:support@discussit.in" className="flex items-center gap-4 group">
                <div className="w-12 h-12 bg-[#DC2626]/10 rounded-xl flex items-center justify-center border border-[#DC2626]/20 group-hover:scale-105 transition-transform duration-300">
                  <Mail className="w-6 h-6 text-[#DC2626]" />
                </div>
                <div className="flex-1">
                  <h3 className="text-xs font-bold uppercase tracking-wider text-gray-500">Support Email</h3>
                  <p className="text-base font-bold text-white group-hover:text-[#DEDBC8] transition-colors">support@discussit.in</p>
                </div>
              </a>

              <a href="https://in.linkedin.com/company/discussitin" target="_blank" rel="noopener noreferrer" className="flex items-center gap-4 group">
                <div className="w-12 h-12 bg-[#0077B5]/10 rounded-xl flex items-center justify-center border border-[#0077B5]/20 group-hover:scale-105 transition-transform duration-300">
                  <Linkedin className="w-6 h-6 text-[#0077B5]" />
                </div>
                <div className="flex-1">
                  <h3 className="text-xs font-bold uppercase tracking-wider text-gray-500">LinkedIn (Official)</h3>
                  <p className="text-base font-bold text-white group-hover:text-[#DEDBC8] transition-colors">Discuss</p>
                </div>
              </a>

              <a href="https://www.instagram.com/discussit.in" target="_blank" rel="noopener noreferrer" className="flex items-center gap-4 group">
                <div className="w-12 h-12 bg-pink-500/10 rounded-xl flex items-center justify-center border border-pink-500/20 group-hover:scale-105 transition-transform duration-300">
                  <Instagram className="w-6 h-6 text-pink-500" />
                </div>
                <div className="flex-1">
                  <h3 className="text-xs font-bold uppercase tracking-wider text-gray-500">Instagram (Official)</h3>
                  <p className="text-base font-bold text-white group-hover:text-[#DEDBC8] transition-colors">@discussit.in</p>
                </div>
              </a>
            </div>

            {/* Right: Address Info */}
            <div className="flex items-start gap-4 p-6 bg-[#181818] rounded-xl border border-white/5 shadow-inner">
              <div className="w-12 h-12 bg-[#2563EB]/10 rounded-xl flex items-center justify-center border border-[#2563EB]/20 shrink-0">
                <MapPin className="w-6 h-6 text-[#2563EB]" />
              </div>
              <div className="flex-1 pt-1">
                <h3 className="text-xs font-bold uppercase tracking-wider text-gray-500 mb-2">Registered Address</h3>
                <p className="text-base font-bold text-white mb-2 leading-none">Discuss</p>
                <p className="text-sm text-gray-400 leading-relaxed font-medium">
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
