import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import Header from '@/components/Header';
import Footer from '@/components/Footer';
import { ArrowLeft, ChevronDown, ChevronUp } from 'lucide-react';

export default function BlogsPage() {
  const [expandedBlog, setExpandedBlog] = useState(null);

  useEffect(() => {
    window.scrollTo(0, 0);
    document.title = "Engineering Blog | Discuss Platforms";
    const metaDesc = document.querySelector('meta[name="description"]');
    if (metaDesc) {
      metaDesc.setAttribute('content', 'Read the engineering blogs behind Discuss. Learn about our PWA architectures, real-time message syncing, and developer-first design.');
    }
  }, []);

  const blogs = [
    {
      title: "Building the Platform: A Developer-Focused Ecosystem",
      date: "April 02, 2024",
      category: "Architecture",
      author: "Mohammed Maaz",
      readTime: "5 min read",
      summary: "Explore the foundational architecture of Discuss. Discover how we built a tightly-knit, highly scalable platform specifically tailored to eliminate noise, enforce quality engineering discussions, and bypass the traditional ad-driven social media cycle.",
      fullContent: (
        <div className="space-y-4 mt-6 text-gray-300 leading-relaxed text-sm md:text-base border-t border-white/5 pt-6 font-medium">
          <p>When starting the development of Discuss, the core mission was simple: rid the internet of algorithmic bloat and bring back focused developer networks.</p>
          <p>We built our stack entirely on React and Firebase, abstracting the heavy lifting of server infrastructure into a serverless configuration. By structuring document refs securely across a NoSQL cloud architecture, we immediately nullified standard web spam endpoints, pushing all platform moderation directly into the real-time observer chains.</p>
          <p>The design philosophy centers around high-signal, dark-mode native accessibility—meaning no invasive sidebar ads, no tricky auto-play trackers, and no injected suggested feeds.</p>
        </div>
      )
    },
    {
      title: "Architecting Real-Time Chat & Group Infrastructure",
      date: "March 18, 2024",
      category: "Backend",
      author: "Mohammed Maaz",
      readTime: "8 min read",
      summary: "A deep dive into our websocket and database snapshot infrastructure. We break down the challenges of maintaining ordered, flicker-free messaging environments for personal DMs and large-scale group networks concurrently.",
      fullContent: (
        <div className="space-y-4 mt-6 text-gray-300 leading-relaxed text-sm md:text-base border-t border-white/5 pt-6 font-medium">
          <p>Handling real-time synchronization between thousands of active group users is notoriously complex. To achieve zero-flicker UI updates, we instituted a two-layer cache sequence.</p>
          <p>First, IndexedDB handles the immediate localized storage. As soon as a user clicks a chat, the viewport pulls solely from the local disk drive, guaranteeing a 0ms TTL visual shift.</p>
          <p>Second, a background service worker mounts a snapshot listener over the message cluster, pulling only the delta of new messages mapped sequentially by a timestamp-indexed tuple array. This prevents full array re-renders and guarantees sub-second broadcast distribution network-wide!</p>
        </div>
      )
    },
    {
      title: "The Power of PWA: Why We Didn't Build an APK",
      date: "February 27, 2024",
      category: "Frontend",
      author: "Mohammed Maaz",
      readTime: "6 min read",
      summary: "Native applications carry heavy download friction. Learn how Discuss leverages secure Service Workers, intelligent IndexedDB caching routines, and Web Manifests to deliver an app-like mobile experience directly through the browser without touching the App Store.",
      fullContent: (
        <div className="space-y-4 mt-6 text-gray-300 leading-relaxed text-sm md:text-base border-t border-white/5 pt-6 font-medium">
          <p>The app store ecosystems introduce significant overhead: 30% revenue cuts, arbitrary review cycles, and multi-megabyte forced downloads. Progressive Web Apps (PWAs) nullify all of this.</p>
          <p>By mapping a strict manifest.json configuration, our platform automatically generates an installable application icon directly on the user's mobile desktop. We bypassed raw APK generation natively.</p>
          <p>Our service workers actively cache the core HTML/JS bundles locally. Even if you lose total internet connection, Discuss remains navigable in offline environments—bringing native performance capabilities purely via URL parameters.</p>
        </div>
      )
    }
  ];

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
            Engineering Logs
          </span>
          <h1 className="text-4xl md:text-6xl font-black tracking-tight mb-4 text-[#DEDBC8] leading-none">
            Engineering Blog
          </h1>
          <p className="text-gray-400 text-sm sm:text-base font-medium max-w-2xl">
            Technical write-ups, architecture reviews, and design philosophies powering the Discuss PWA ecosystem.
          </p>
          <div className="w-24 h-1 bg-gradient-to-r from-[#DC2626] to-[#2563EB] rounded-full mt-6" />
        </div>

        <div className="flex flex-col gap-8">
          {blogs.map((blog, index) => (
            <article 
              key={index} 
              className="relative bg-[#101010] hover:bg-[#151515] border border-white/5 hover:border-[#DC2626]/20 rounded-2xl p-6 sm:p-8 shadow-2xl transition-all duration-300 group cursor-pointer pt-1.5"
              onClick={() => setExpandedBlog(expandedBlog === index ? null : index)}
            >
              {/* Top border decoration */}
              <div className="absolute top-0 left-0 right-0 h-0.5 bg-gradient-to-r from-[#DC2626]/40 to-[#2563EB]/40 group-hover:from-[#DC2626] group-hover:to-[#2563EB] transition-colors" />

              <div className="flex items-center gap-3 mb-4 text-xs font-bold uppercase tracking-wider text-gray-500 flex-wrap">
                <span className="text-[#DC2626]">{blog.category}</span>
                <span className="text-gray-600">&bull;</span>
                <span>{blog.date}</span>
                <span className="text-gray-600">&bull;</span>
                <span className="text-gray-300">By {blog.author}</span>
                <span className="text-gray-600">&bull;</span>
                <span>{blog.readTime}</span>
              </div>
              
              <h2 className="text-xl sm:text-2xl font-bold text-white mb-3 leading-tight group-hover:text-[#DEDBC8] transition-colors">
                {blog.title}
              </h2>
              
              <p className="text-gray-400 leading-relaxed text-xs sm:text-sm font-medium">
                {blog.summary}
              </p>

              {expandedBlog === index && (
                <div onClick={(e) => e.stopPropagation()}>
                  {blog.fullContent}
                </div>
              )}
              
              <button 
                onClick={(e) => {
                  e.stopPropagation();
                  setExpandedBlog(expandedBlog === index ? null : index);
                }}
                className="mt-6 flex items-center text-xs sm:text-sm font-bold text-[#2563EB] hover:text-[#DC2626] transition-colors group/btn"
              >
                <span>{expandedBlog === index ? 'Collapse Article' : 'Read Full Article'}</span>
                {expandedBlog === index 
                  ? <ChevronUp className="w-4 h-4 ml-1" />
                  : <ChevronDown className="w-4 h-4 ml-1 group-hover/btn:translate-y-0.5 transition-transform" />
                }
              </button>
            </article>
          ))}
        </div>
      </main>

      <Footer />
    </div>
  );
}
