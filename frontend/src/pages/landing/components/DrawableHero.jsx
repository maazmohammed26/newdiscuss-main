import React from 'react';
import {
  DrawableDoubleUnderline,
  DrawableUnderline,
  DrawableArrow,
  DrawableButton,
  DrawableNote,
  DrawableTag,
  DrawableFrame,
  DrawablePlayStoreIcon,
} from './DrawablePrimitives';

/**
 * DrawableHero
 * - Pure white background (#FFFFFF) with zero textures/grids
 * - Headline: "Where developers think out loud." with red hand-drawn double-underline
 * - Blue technical accents & handwritten annotations
 * - Primary CTA: Join Discuss (Red marker button)
 * - Secondary CTA: Explore Discussions (Blue outline button)
 * - Play Store sketch icon shortcut to Android early access
 * - Real discussion mockup with actual Discuss interaction language (likes, replies)
 * - Zero fake resolution badges
 */
export default function DrawableHero() {
  const scrollToAndroid = () => {
    const target = document.getElementById('mobile-access');
    if (target) {
      target.scrollIntoView({ behavior: 'smooth' });
      const emailInput = document.getElementById('android-access-email');
      if (emailInput) setTimeout(() => emailInput.focus(), 600);
    }
  };

  return (
    <section className="relative pt-12 pb-16 sm:pt-16 sm:pb-20 overflow-hidden bg-white">
      <div className="relative mx-auto max-w-6xl px-4 sm:px-6">
        {/* Top brand badge with blue sketch annotation */}
        <div className="flex items-center gap-2.5 mb-6">
          <span className="font-mono text-xs font-bold uppercase tracking-wider text-[#0095F6] bg-[#0095F6]/10 px-2 py-0.5 border border-[#0095F6]/25 rounded-xs">
            discuss 2.0
          </span>
          <DrawableNote rotate={-1} color="blue" className="text-base sm:text-lg">
            * where developers think out loud
          </DrawableNote>
        </div>

        <div className="grid gap-10 lg:grid-cols-[1.1fr_.9fr] items-center">
          {/* Left Column: Core Headline, Copy & CTAs */}
          <div className="max-w-2xl">
            <h1 className="text-4xl sm:text-5xl lg:text-6xl font-black tracking-tight text-neutral-950 leading-[1.08]">
              Where developers{' '}
              <span className="block mt-1">
                <DrawableDoubleUnderline color="red">
                  think out loud.
                </DrawableDoubleUnderline>
              </span>
            </h1>

            <p className="mt-5 text-base sm:text-lg text-neutral-700 leading-relaxed max-w-xl">
              Ask technical questions, share what you're building, meet developers, and keep the conversation going.
            </p>

            {/* CTAs with Red Primary + Blue Secondary + Play Store Sketch Icon */}
            <div className="mt-8 flex flex-wrap items-center gap-3.5 sm:gap-4">
              <DrawableButton to="/register" variant="red-marker" size="lg">
                <span>Join Discuss</span>
                <span className="font-mono text-sm ml-1 select-none">→</span>
              </DrawableButton>

              <DrawableButton to="/feed" variant="blue-outline" size="lg">
                <span>Explore Discussions</span>
              </DrawableButton>

              {/* Hand-Drawn Play Store Sketch Icon Shortcut */}
              <div className="inline-flex items-center" data-testid="hero-playstore-icon">
                <DrawablePlayStoreIcon
                  onClick={scrollToAndroid}
                  size={48}
                />
              </div>

              {/* Blue secondary annotation arrow */}
              <div className="hidden lg:flex items-center ml-1">
                <DrawableArrow
                  direction="curved-accent"
                  color="blue"
                  label="Free to join · No ads"
                  labelPlacement="top"
                />
              </div>
            </div>

            {/* Real feature tags */}
            <div className="mt-8 flex flex-wrap items-center gap-2.5 pt-4 border-t border-neutral-200/80">
              <span className="font-mono text-xs text-neutral-400 select-none">// features:</span>
              <DrawableTag color="blue">#discussions</DrawableTag>
              <DrawableTag color="charcoal">#projects</DrawableTag>
              <DrawableTag color="red">#talentgraph</DrawableTag>
              <DrawableTag color="charcoal">#devradar</DrawableTag>
            </div>
          </div>

          {/* Right Column: Hand-Drawn Realistic Discussion Thread Surface */}
          <div className="relative mx-auto w-full max-w-md lg:max-w-none">
            {/* Top-right corner sketch note */}
            <div className="absolute -top-6 -right-2 sm:-right-4 z-20">
              <DrawableNote
                rotate={3}
                color="red"
                className="text-base sm:text-lg bg-white px-2 py-0.5 border border-[#EF4444]/30"
              >
                ← real developers. real debugging.
              </DrawableNote>
            </div>

            <DrawableFrame
              variant="charcoal-rough"
              className="p-5 sm:p-6 bg-white"
              ariaLabel="Featured Discussion Thread"
            >
              {/* Discussion Header */}
              <div className="flex items-center justify-between pb-3 border-b border-neutral-200">
                <div className="flex items-center gap-2">
                  <DrawableTag color="red">#react</DrawableTag>
                  <DrawableTag color="blue">#firebase</DrawableTag>
                </div>
                <span className="font-mono text-xs text-neutral-400">posted 18m ago</span>
              </div>

              {/* Discussion Content */}
              <div className="mt-4">
                <div className="flex items-start gap-2.5">
                  <span className="font-mono text-base font-bold text-neutral-400 select-none">Q:</span>
                  <div>
                    <h2 className="text-base sm:text-lg font-bold text-neutral-900 leading-snug">
                      Why does this Firestore snapshot listener fire twice on component mount?
                    </h2>
                    <p className="mt-1.5 text-xs sm:text-sm text-neutral-600">
                      I'm attaching <code className="text-neutral-800 bg-neutral-100 px-1 py-0.5 rounded-xs font-mono text-xs">onSnapshot</code> inside <code className="text-neutral-800 bg-neutral-100 px-1 py-0.5 rounded-xs font-mono text-xs">useEffect</code>, but in development I see two immediate triggers before any document write.
                    </p>
                  </div>
                </div>

                {/* Hand-drawn separator */}
                <div className="my-4 border-t border-dashed border-neutral-200 relative">
                  <span className="absolute -top-3 right-4 bg-white px-2 text-xs font-mono text-neutral-400">
                    ── reply ──
                  </span>
                </div>

                {/* Real Reply Mockup with Discuss interaction language */}
                <div className="pl-3.5 border-l-2 border-[#0095F6] bg-neutral-50/70 p-3 rounded-xs">
                  <div className="flex items-center justify-between">
                    <span className="font-mono text-xs font-bold text-neutral-900">
                      @alex_dev <span className="text-neutral-400 font-normal">· frontend engineer</span>
                    </span>
                    <span className="font-mono text-xs text-[#0095F6] font-semibold flex items-center gap-1">
                      <span className="text-[#EF4444]">♥</span> 12 likes
                    </span>
                  </div>
                  <p className="mt-1.5 text-xs sm:text-sm text-neutral-800">
                    In dev mode, <DrawableUnderline color="blue">StrictMode</DrawableUnderline> mounts and unmounts components to verify cleanup. Ensure you return the unsubscribe callback:
                  </p>
                  <pre className="mt-2 text-[11px] font-mono bg-white p-2 border border-neutral-200 text-neutral-900 rounded-xs overflow-x-auto">
                    <code>return () =&gt; unsubscribe();</code>
                  </pre>
                </div>
              </div>

              {/* Card Footer with real Discuss metrics */}
              <div className="mt-4 pt-3 border-t border-neutral-100 flex items-center justify-between text-xs text-neutral-500">
                <span className="font-mono text-neutral-500">3 replies · 18 likes</span>
                <DrawableNote rotate={-2} color="neutral" className="text-sm text-neutral-700">
                  developers helping developers
                </DrawableNote>
              </div>
            </DrawableFrame>

            {/* Bottom arrow pointing to feed */}
            <div className="mt-3 flex justify-end pr-6">
              <DrawableArrow
                direction="down-left"
                color="blue"
                label="read discussions on feed"
                labelPlacement="bottom"
              />
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
