import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import Header from '@/components/Header';
import Footer from '@/components/Footer';
import { ArrowLeft, ChevronDown, ChevronUp } from 'lucide-react';

export default function BlogsPage() {
  const [expandedBlog, setExpandedBlog] = useState(null);

  useEffect(() => {
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
        <div className="space-y-4 mt-6 text-neutral-700 dark:text-neutral-300 discuss:text-[#A3A3A3]">
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
        <div className="space-y-4 mt-6 text-neutral-700 dark:text-neutral-300 discuss:text-[#A3A3A3]">
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
        <div className="space-y-4 mt-6 text-neutral-700 dark:text-neutral-300 discuss:text-[#A3A3A3]">
          <p>The app store ecosystems introduce significant overhead: 30% revenue cuts, arbitrary review cycles, and multi-megabyte forced downloads. Progressive Web Apps (PWAs) nullify all of this.</p>
          <p>By mapping a strict manifest.json configuration, our platform automatically generates an installable application icon directly on the user's mobile desktop. We bypassed raw APK generation natively.</p>
          <p>Our service workers actively cache the core HTML/JS bundles locally. Even if you lose total internet connection, Discuss remains navigable in offline environments—bringing native performance capabilities purely via URL parameters.</p>
        </div>
      )
    }
  ];

  return (
    <div className="min-h-screen flex flex-col bg-neutral-50 dark:bg-neutral-900 discuss:bg-[#121212]">
      <Header />
      
      <main className="flex-1 max-w-4xl mx-auto px-6 py-10 md:py-16 w-full">
        <Link to="/" className="inline-flex items-center gap-2 text-sm font-medium text-neutral-500 hover:text-neutral-900 dark:text-neutral-400 dark:hover:text-neutral-50 discuss:text-[#9CA3AF] discuss:hover:text-[#F5F5F5] transition-colors mb-8">
          <ArrowLeft className="w-4 h-4" />
          Back to Discuss
        </Link>
        <div className="mb-12">
          <h1 className="text-3xl md:text-5xl font-bold font-heading text-neutral-900 dark:text-neutral-50 discuss:text-[#F5F5F5] mb-4">
            Engineering Blog
          </h1>
          <p className="text-neutral-600 dark:text-neutral-400 discuss:text-[#9CA3AF] text-lg max-w-2xl">
            Technical write-ups, architecture reviews, and design philosophies powering the Discuss environment.
          </p>
        </div>

        <div className="flex flex-col gap-8">
          {blogs.map((blog, index) => (
            <article 
              key={index} 
              className="bg-white dark:bg-neutral-800 discuss:bg-[#1a1a1a] border border-neutral-200 dark:border-neutral-700 discuss:border-[#333333] rounded-[16px] p-8 shadow-sm hover:shadow-md transition-shadow cursor-pointer"
            >
              <div className="flex items-center gap-3 mb-4 text-xs font-semibold uppercase tracking-wider text-neutral-500 dark:text-neutral-400 discuss:text-[#9CA3AF] flex-wrap">
                <span className="text-[#2563EB] discuss:text-[#EF4444]">{blog.category}</span>
                <span className="hidden sm:inline">&bull;</span>
                <span>{blog.date}</span>
                <span className="hidden sm:inline">&bull;</span>
                <span className="text-neutral-700 dark:text-neutral-300">By {blog.author}</span>
                <span className="hidden sm:inline">&bull;</span>
                <span>{blog.readTime}</span>
              </div>
              
              <h2 className="text-2xl font-bold text-neutral-900 dark:text-neutral-50 discuss:text-[#F5F5F5] mb-3 leading-tight">
                {blog.title}
              </h2>
              
              <p className="text-neutral-600 dark:text-neutral-300 discuss:text-[#A3A3A3] leading-relaxed">
                {blog.summary}
              </p>

              {expandedBlog === index && (
                <div className="pt-4 border-t border-neutral-100 dark:border-neutral-700/50 discuss:border-[#333333] mt-6">
                  {blog.fullContent}
                </div>
              )}
              
              <button 
                onClick={() => setExpandedBlog(expandedBlog === index ? null : index)}
                className="mt-6 flex items-center text-sm font-semibold text-[#2563EB] hover:text-[#1D4ED8] discuss:text-[#EF4444] discuss:hover:text-[#DC2626] transition-colors group"
              >
                {expandedBlog === index ? 'Collapse Article' : 'Read Full Article'}
                {expandedBlog === index 
                  ? <ChevronUp className="w-4 h-4 ml-1" />
                  : <ChevronDown className="w-4 h-4 ml-1" />
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
