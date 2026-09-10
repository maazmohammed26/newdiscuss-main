import React from 'react';
import { Link } from 'react-router-dom';
import DiscussLogo from '@/components/DiscussLogo';
import { DrawableButton, DrawableDivider } from './DrawablePrimitives';

/**
 * DrawableHeader
 * Official Discuss logo, pure white canvas, and crisp navigation with hand-drawn interactive strokes.
 */
export default function DrawableHeader() {
  return (
    <header className="sticky top-0 z-50 bg-white/95 backdrop-blur-xs">
      <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-4 sm:px-6">
        {/* Official Current Discuss Logo */}
        <Link
          to="/"
          className="inline-flex items-center select-none transition-opacity hover:opacity-90"
          aria-label="Discuss Home"
        >
          <DiscussLogo size="md" tagged />
        </Link>

        {/* Navigation Actions */}
        <nav className="flex items-center gap-2 sm:gap-4" aria-label="Main Navigation">
          <Link
            to="/feed"
            className="drawable-nav-link text-sm font-semibold text-neutral-600 hover:text-neutral-950 px-3 py-1.5 transition-colors hidden sm:inline-block"
          >
            Explore
          </Link>
          <Link
            to="/login"
            className="drawable-nav-link text-sm font-semibold text-neutral-600 hover:text-neutral-950 px-3 py-1.5 transition-colors"
          >
            Log in
          </Link>
          <DrawableButton to="/register" variant="red-outline" size="sm">
            <span>Join Discuss</span>
          </DrawableButton>
        </nav>
      </div>

      {/* Very thin hand-drawn bottom divider */}
      <DrawableDivider color="neutral" className="opacity-40" />
    </header>
  );
}
