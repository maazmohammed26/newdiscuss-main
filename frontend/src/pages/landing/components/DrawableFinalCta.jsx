import React from 'react';
import {
  DrawableDoubleUnderline,
  DrawableButton,
  DrawableNote,
} from './DrawablePrimitives';

/**
 * DrawableFinalCta
 * High-impact editorial finale:
 * "talk less? nah. we discuss."
 * Single primary Join Discuss CTA + secondary Explore Discussions link.
 * Pure white background.
 */
export default function DrawableFinalCta() {
  return (
    <section className="py-20 sm:py-32 relative overflow-hidden text-center bg-white border-t border-neutral-200/80">
      <div className="mx-auto max-w-4xl px-4 sm:px-6">
        {/* Handwritten note callout */}
        <div className="mb-4">
          <DrawableNote rotate={-3} color="blue" className="text-xl sm:text-2xl">
            ready to build with better peers?
          </DrawableNote>
        </div>

        {/* Editorial statement */}
        <h2 className="text-4xl sm:text-6xl font-black text-neutral-950 tracking-tight leading-[1.1]">
          talk less? <br />
          <span className="drawable-handwritten text-4xl sm:text-6xl text-neutral-400 font-normal">
            nah.
          </span>{' '}
          <span className="block mt-2">
            we{' '}
            <DrawableDoubleUnderline color="red">
              discuss.
            </DrawableDoubleUnderline>
          </span>
        </h2>

        <p className="mt-6 text-base sm:text-lg text-neutral-600 max-w-xl mx-auto leading-relaxed">
          Create your account in under a minute. No ads, no noise, no algorithmic feed. Just code and real conversations.
        </p>

        {/* Action CTAs */}
        <div className="mt-9 flex flex-col sm:flex-row items-center justify-center gap-4">
          <DrawableButton to="/register" variant="red-marker" size="lg">
            <span>Join Discuss</span>
            <span className="font-mono text-sm ml-1 select-none">→</span>
          </DrawableButton>

          <DrawableButton to="/feed" variant="blue-outline" size="lg">
            <span>Explore Discussions</span>
          </DrawableButton>
        </div>

        <div className="mt-8">
          <span className="font-mono text-xs text-neutral-400">
            Free to join · No ads · Built for developers
          </span>
        </div>
      </div>
    </section>
  );
}
