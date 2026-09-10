import React from 'react';
import {
  DrawableUnderline,
  DrawableArrow,
  DrawableNote,
  DrawableTag,
  DrawableFrame,
} from './DrawablePrimitives';

/**
 * DrawableStorySection
 * Combined visual story: ASK → SHARE → BUILD
 * Shows realistic discussion example + realistic project showcase using real Discuss interaction language.
 * No fake external URLs; showcases real Discuss project attributes (stack, repo attachment, demo tag).
 * Pure white background with hand-drawn frames and accents.
 */
export default function DrawableStorySection() {
  return (
    <section className="py-16 sm:py-24 border-t border-neutral-200/80 bg-white relative overflow-hidden">
      <div className="mx-auto max-w-6xl px-4 sm:px-6">
        {/* Section Header */}
        <div className="max-w-2xl mb-12">
          <p className="font-mono text-xs uppercase tracking-widest text-[#EF4444] font-bold select-none">
            // workflow
          </p>
          <h2 className="mt-2 text-3xl sm:text-4xl font-black text-neutral-950 tracking-tight">
            Where ideas turn into code.{' '}
            <span className="block mt-1 sm:inline sm:mt-0">
              <DrawableUnderline color="red">Ask. Share. Build.</DrawableUnderline>
            </span>
          </h2>
          <p className="mt-3 text-base text-neutral-600 leading-relaxed">
            Move seamlessly from technical questions to showcasing what you've built with peers who inspect the code.
          </p>
        </div>

        {/* Combined Visual Flow Grid */}
        <div className="grid gap-8 lg:grid-cols-[1fr_auto_1fr] items-stretch">
          {/* Card 1: ASK (Technical Discussion) */}
          <div className="flex flex-col">
            <div className="flex items-center justify-between mb-3 px-1">
              <span className="font-mono text-xs font-bold text-neutral-500 uppercase tracking-wide">
                01 // ASK & DEBUG
              </span>
              <DrawableNote rotate={-2} color="blue" className="text-sm">
                * technical discussions
              </DrawableNote>
            </div>

            <DrawableFrame
              variant="charcoal-pen"
              className="flex-1 p-5 sm:p-6 bg-white flex flex-col justify-between"
              ariaLabel="Technical Discussion Example"
            >
              <div>
                {/* Thread Metainfo */}
                <div className="flex flex-wrap items-center justify-between gap-2 pb-3 border-b border-neutral-200">
                  <div className="flex items-center gap-1.5">
                    <DrawableTag color="blue">#websockets</DrawableTag>
                    <DrawableTag color="charcoal">#typescript</DrawableTag>
                  </div>
                  <div className="flex items-center gap-2 text-xs font-mono text-neutral-400">
                    <span className="text-[#EF4444] font-semibold flex items-center gap-0.5">
                      <span>♥</span> 34 likes
                    </span>
                    <span>· saved</span>
                  </div>
                </div>

                {/* Question */}
                <div className="mt-4">
                  <h3 className="text-base sm:text-lg font-bold text-neutral-900 leading-snug">
                    Handling out-of-order WebSocket packet delivery during client reconnects
                  </h3>
                  <p className="mt-2 text-xs sm:text-sm text-neutral-600 leading-relaxed">
                    When mobile devices reconnect, queued event batches arrive out of order. How do you reconcile conflicting timestamps without locking UI threads?
                  </p>

                  {/* Code snippet */}
                  <div className="mt-3 p-3 bg-neutral-50 border border-neutral-200 rounded-xs font-mono text-xs text-neutral-800 overflow-x-auto">
                    <div className="text-neutral-400 select-none">// Sequencer snippet:</div>
                    <code>
                      {`function reconcileBatch(events: SyncEvent[]) {\n  return events.sort((a, b) => a.clock - b.clock);\n}`}
                    </code>
                  </div>
                </div>

                {/* Reply */}
                <div className="mt-4 pl-3 border-l-2 border-[#0095F6] bg-neutral-50/70 p-3 rounded-r-xs">
                  <div className="flex items-center justify-between font-mono text-xs">
                    <span className="font-bold text-neutral-900">@marcus_dev</span>
                    <span className="text-neutral-400">14m ago</span>
                  </div>
                  <p className="mt-1 text-xs text-neutral-700">
                    Use logical Lamport clocks on the sender so clients order deterministically before state hydration.
                  </p>
                </div>
              </div>

              <div className="mt-4 pt-3 border-t border-neutral-100 flex items-center justify-between text-xs font-mono text-neutral-400">
                <span>Discussion thread</span>
                <span className="text-neutral-600 font-semibold">6 replies</span>
              </div>
            </DrawableFrame>
          </div>

          {/* Middle Flow Connector (Desktop: horizontal, Mobile: vertical) */}
          <div className="flex flex-col items-center justify-center py-2 select-none" aria-hidden="true">
            <div className="hidden lg:flex flex-col items-center gap-2">
              <span className="font-mono text-xs text-[#0095F6] font-bold">// leads to</span>
              <svg width="48" height="24" viewBox="0 0 48 24" fill="none" className="overflow-visible">
                <path
                  d="M 2,12 C 16,8 30,16 44,12 M 34,5 L 46,12 L 34,19"
                  stroke="#0095F6"
                  strokeWidth="2.2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  vectorEffect="non-scaling-stroke"
                  className="drawable-draw-line"
                />
              </svg>
              <DrawableNote rotate={-3} color="red" className="text-sm mt-1 whitespace-nowrap">
                ship what you discuss
              </DrawableNote>
            </div>

            <div className="flex lg:hidden items-center justify-center gap-2 my-2">
              <svg width="24" height="36" viewBox="0 0 24 36" fill="none">
                <path
                  d="M 12,2 C 8,12 16,24 12,34 M 5,26 L 12,34 L 19,26"
                  stroke="#0095F6"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  vectorEffect="non-scaling-stroke"
                />
              </svg>
              <span className="font-mono text-xs text-[#0095F6] font-bold">// and build</span>
            </div>
          </div>

          {/* Card 2: SHARE & BUILD (Project Showcase) */}
          <div className="flex flex-col">
            <div className="flex items-center justify-between mb-3 px-1">
              <span className="font-mono text-xs font-bold text-[#0095F6] uppercase tracking-wide">
                02 // SHARE & BUILD
              </span>
              <DrawableNote rotate={2} color="red" className="text-sm">
                * project showcase
              </DrawableNote>
            </div>

            <DrawableFrame
              variant="blue-tech"
              className="flex-1 p-5 sm:p-6 bg-white flex flex-col justify-between"
              ariaLabel="Project Showcase Example"
            >
              <div>
                {/* Project Header */}
                <div className="flex flex-wrap items-center justify-between gap-2 pb-3 border-b border-neutral-200">
                  <div className="flex items-center gap-2">
                    <h3 className="text-lg font-black text-neutral-900 tracking-tight">LedgerProof</h3>
                    <span className="font-mono text-[11px] px-2 py-0.5 rounded-xs bg-neutral-100 text-neutral-800 border border-neutral-200">
                      open-source
                    </span>
                  </div>
                  <DrawableTag color="blue">project post</DrawableTag>
                </div>

                {/* Project Description & Specs */}
                <div className="mt-4">
                  <p className="text-xs sm:text-sm text-neutral-700 leading-relaxed">
                    Cryptographic audit trail engine using Merkle DAGs for tamper-evident data pipelines. Built in public with the Discuss community.
                  </p>

                  {/* Real Tech Stack Tags */}
                  <div className="mt-3">
                    <span className="font-mono text-[11px] text-neutral-400 block mb-1.5">// stack</span>
                    <div className="flex flex-wrap gap-1.5 font-mono text-xs text-neutral-700">
                      <span className="bg-neutral-50 px-2 py-0.5 border border-neutral-200 rounded-xs">FastAPI</span>
                      <span className="bg-neutral-50 px-2 py-0.5 border border-neutral-200 rounded-xs">React 19</span>
                      <span className="bg-neutral-50 px-2 py-0.5 border border-neutral-200 rounded-xs">PostgreSQL</span>
                    </div>
                  </div>

                  {/* Real Discuss Project Capabilities (No fake external URLs) */}
                  <div className="mt-4 pt-3 border-t border-neutral-100 grid grid-cols-2 gap-2 font-mono text-xs">
                    <div className="p-2.5 bg-neutral-50 border border-neutral-200 rounded-xs">
                      <span className="text-[#0095F6] block font-bold">Public Repository</span>
                      <span className="text-neutral-500 text-[11px] block mt-0.5">Code inspected by peers</span>
                    </div>
                    <div className="p-2.5 bg-neutral-50 border border-neutral-200 rounded-xs">
                      <span className="text-neutral-800 block font-bold">Interactive Demo</span>
                      <span className="text-neutral-500 text-[11px] block mt-0.5">Community tested</span>
                    </div>
                  </div>
                </div>
              </div>

              <div className="mt-4 pt-3 border-t border-neutral-100 flex items-center justify-between text-xs font-mono text-neutral-400">
                <span className="text-[#EF4444] font-semibold flex items-center gap-1">
                  <span>♥</span> 42 likes
                </span>
                <span className="text-neutral-600 font-semibold">16 comments</span>
              </div>
            </DrawableFrame>
          </div>
        </div>
      </div>
    </section>
  );
}
