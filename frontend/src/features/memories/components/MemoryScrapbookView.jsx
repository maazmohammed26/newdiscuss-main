import React, { useState, useMemo } from 'react';
import { ChevronLeft, ChevronRight, BookOpen } from 'lucide-react';
import MemoryStamp from './MemoryStamp';
import { STAMP_VARIANTS } from '../utils/stampTheme';
import { paginateMemories, getPageLayout } from '../utils/scrapbookLayout';

/**
 * MemoryScrapbookView — Tactile physical paper album layout.
 *
 * Rules:
 * - 2 to 7 memories per page (chunked across pages)
 * - Organic balanced placements with subtle rotations
 * - Interactive stamps that open full viewer
 * - Tactile page-turn interaction with prefers-reduced-motion fallback
 * - State retention across memory viewing
 */
export default function MemoryScrapbookView({
  memories = [],
  currentPage = 0,
  onPageChange,
  onSelectMemory,
}) {
  const [animating, setAnimating] = useState(false);

  // Split memories into pages of up to 7 items
  const pages = useMemo(() => {
    return paginateMemories(memories, 7);
  }, [memories]);

  const activePageIndex = Math.max(0, Math.min(currentPage, pages.length - 1));
  const currentMemories = useMemo(() => {
    return pages[activePageIndex] || [];
  }, [pages, activePageIndex]);

  // Generate responsive layout coordinates for current page items
  const layoutItems = useMemo(() => {
    return getPageLayout(currentMemories);
  }, [currentMemories]);

  if (memories.length === 0) {
    return (
      <div className="w-full py-16 px-4 flex flex-col items-center justify-center text-center">
        <BookOpen className="w-8 h-8 text-neutral-400 mb-2 opacity-60" />
        <h3 className="text-sm font-bold text-neutral-800 dark:text-neutral-200">
          Scrapbook is empty
        </h3>
        <p className="text-xs text-neutral-400 max-w-[220px] mt-1">
          Capture small moments to see them pasted into this paper scrapbook.
        </p>
      </div>
    );
  }

  const handlePrevPage = () => {
    if (activePageIndex > 0) {
      setAnimating(true);
      onPageChange?.(activePageIndex - 1);
      setTimeout(() => setAnimating(false), 350);
    }
  };

  const handleNextPage = () => {
    if (activePageIndex < pages.length - 1) {
      setAnimating(true);
      onPageChange?.(activePageIndex + 1);
      setTimeout(() => setAnimating(false), 350);
    }
  };

  return (
    <div className="w-full flex flex-col items-center select-none pb-4">
      {/* Scrapbook Album Sheet Container */}
      <div
        className={`w-full max-w-2xl min-h-[460px] sm:min-h-[540px] scrapbook-surface rounded-2xl sm:rounded-3xl border border-neutral-300/80 dark:border-neutral-800 shadow-lg p-3 sm:p-6 relative flex flex-col justify-between overflow-hidden ${
          animating ? 'animate-page-flip' : ''
        }`}
      >
        {/* Subtle vintage book crease center seam on wide screens */}
        <div
          className="absolute inset-y-0 left-1/2 -translate-x-1/2 w-8 bg-gradient-to-r from-transparent via-neutral-900/4 dark:via-white/4 to-transparent pointer-events-none hidden sm:block"
          aria-hidden="true"
        />

        {/* Page Stamps Layout Grid */}
        <div className="w-full grid grid-cols-12 gap-2 sm:gap-3 my-auto items-center">
          {layoutItems.map(({ memory, slotClass, containerClass, rotation, tapeVariant }) => (
            <div key={memory.id} className={`${slotClass} transition-transform`}>
              <div className={containerClass}>
                <MemoryStamp
                  memory={memory}
                  variant={STAMP_VARIANTS.SCRAPBOOK}
                  rotation={rotation}
                  tape={tapeVariant}
                  showCaption
                  onClick={() => onSelectMemory?.(memory)}
                />
              </div>
            </div>
          ))}
        </div>

        {/* Scrapbook Sheet Footer: Page Number & Date Context */}
        <div className="w-full pt-3 mt-auto flex items-center justify-between border-t border-neutral-300/50 dark:border-neutral-800/80 text-[11px] font-mono text-neutral-500 dark:text-neutral-400">
          <span>
            {currentMemories[0]?.memoryDate?.slice(0, 7) || 'Memories'}
          </span>
          <span className="font-semibold">
            Page {activePageIndex + 1} of {pages.length}
          </span>
        </div>
      </div>

      {/* Album Page Navigation Controls */}
      {pages.length > 1 && (
        <div className="flex items-center gap-3 mt-4">
          <button
            type="button"
            onClick={handlePrevPage}
            disabled={activePageIndex === 0}
            className="p-2 rounded-xl bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 text-neutral-700 dark:text-neutral-300 disabled:opacity-30 hover:bg-neutral-50 dark:hover:bg-neutral-800 transition-all cursor-pointer shadow-2xs"
            aria-label="Previous scrapbook page"
          >
            <ChevronLeft className="w-4 h-4 stroke-[2]" />
          </button>

          <span className="text-xs font-semibold text-neutral-600 dark:text-neutral-400 min-w-[70px] text-center">
            {activePageIndex + 1} / {pages.length}
          </span>

          <button
            type="button"
            onClick={handleNextPage}
            disabled={activePageIndex === pages.length - 1}
            className="p-2 rounded-xl bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 text-neutral-700 dark:text-neutral-300 disabled:opacity-30 hover:bg-neutral-50 dark:hover:bg-neutral-800 transition-all cursor-pointer shadow-2xs"
            aria-label="Next scrapbook page"
          >
            <ChevronRight className="w-4 h-4 stroke-[2]" />
          </button>
        </div>
      )}
    </div>
  );
}
