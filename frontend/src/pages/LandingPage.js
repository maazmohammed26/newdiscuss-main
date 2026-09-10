import React, { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import LoadingScreen from '@/components/LoadingScreen';

import DrawableHeader from './landing/components/DrawableHeader';
import DrawableHero from './landing/components/DrawableHero';
import DrawableStorySection from './landing/components/DrawableStorySection';
import DrawableDiscoverySection from './landing/components/DrawableDiscoverySection';
import DrawableMobileAccess from './landing/components/DrawableMobileAccess';
import DrawableFinalCta from './landing/components/DrawableFinalCta';
import DrawableFooter from './landing/components/DrawableFooter';

import './LandingPage.css';

/**
 * Discuss Public Landing Page (Production)
 * Hand-Drawn / Drawable UI Treatment:
 * - Pure White (#FFFFFF) canvas across entire page (no textures, no grids)
 * - Official Discuss branding & logo preserved exactly
 * - Hand-drawn / drawable UI surfaces: buttons, frames, inputs, tags, connectors, underlines
 * - Play Store sketch icon shortcut to Android early access
 * - Real Discuss interaction model (likes, replies, comments, save, share)
 * - Redirects authenticated users to /feed
 */
export default function LandingPage() {
  const { user, loading } = useAuth();
  const navigate = useNavigate();

  // Redirect authenticated users to the feed
  useEffect(() => {
    if (!loading && user) navigate('/feed', { replace: true });
  }, [user, loading, navigate]);

  // Set Page Title and SEO metadata
  useEffect(() => {
    document.title = 'Discuss — Where developers think out loud';
    const description =
      'Discuss is a focused space for developers to ask technical questions, share projects with code, match with peers, and join engineering discussions without noise or ads.';

    const setMeta = (selector, attributes) => {
      let element = document.head.querySelector(selector);
      if (!element) {
        element = document.createElement('meta');
        document.head.appendChild(element);
      }
      Object.entries(attributes).forEach(([key, value]) => element.setAttribute(key, value));
    };

    setMeta('meta[name="description"]', { name: 'description', content: description });
    setMeta('meta[name="keywords"]', {
      name: 'keywords',
      content: 'developer community, programming discussions, open source projects, developer chat, tech groups, find developers, Discuss app',
    });
    setMeta('meta[property="og:title"]', {
      property: 'og:title',
      content: 'Discuss — Where developers think out loud',
    });
    setMeta('meta[property="og:description"]', { property: 'og:description', content: description });
    setMeta('meta[property="og:type"]', { property: 'og:type', content: 'website' });
    setMeta('meta[name="twitter:card"]', { name: 'twitter:card', content: 'summary_large_image' });
  }, []);

  // Enforce pure white background for the landing page
  useEffect(() => {
    const root = document.documentElement;
    const body = document.body;
    root.classList.remove('dark', 'discuss', 'discuss-light', 'discuss-black', 'discuss-retro');
    root.style.backgroundColor = '#FFFFFF';
    root.style.setProperty('--splash-bg', 'oklch(0.995 0.002 95)');
    root.style.setProperty('--splash-script', 'oklch(0.18 0.01 265)');
    if (body) {
      body.classList.remove('dark', 'discuss', 'discuss-light', 'discuss-black', 'discuss-retro');
      body.style.backgroundColor = '#FFFFFF';
    }
  }, []);

  // Signed-in users see loading screen while redirecting to /feed
  if (user) return <LoadingScreen message="Opening Discuss…" compact />;

  return (
    <div className="drawable-landing bg-white selection:bg-[#0095F6]/15 selection:text-[#0095F6]">
      {/* 1. Header with official Discuss logo and drawable navigation */}
      <DrawableHeader />

      {/* Main Flow: 5 Streamlined Content Sections */}
      <main id="main-content" className="bg-white">
        {/* 2. Hero Section: "Where developers think out loud." + drawable discussion preview & Play Store shortcut */}
        <DrawableHero />

        {/* 3. Combined Discussions + Projects (ASK → SHARE → BUILD) */}
        <DrawableStorySection />

        {/* 4. Combined Developer Discovery (TalentGraph skill pairing + DevRadar proximity) */}
        <DrawableDiscoverySection />

        {/* 5. Mobile Access (Android Early Access with drawable input + iOS PWA guidance) */}
        <DrawableMobileAccess />

        {/* 6. Final High-Impact CTA: "talk less? nah. we discuss." */}
        <DrawableFinalCta />
      </main>

      {/* 7. Footer with official logo, all existing routes, and ONYIIX attribution */}
      <DrawableFooter />
    </div>
  );
}
