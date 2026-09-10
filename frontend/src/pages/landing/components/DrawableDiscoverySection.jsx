import React from 'react';
import {
  DrawableUnderline,
  DrawableNote,
  DrawableTag,
  DrawableFrame,
  DrawableConnector,
} from './DrawablePrimitives';

/**
 * DrawableDiscoverySection
 * Combines TalentGraph and DevRadar into an expressive hand-drawn developer discovery section.
 * - TalentGraph: profile skill pairing and collaborator discovery with hand-drawn diagram.
 * - DevRadar: opt-in location discovery concept with hand-drawn radar rings and nodes.
 * - ZERO mention of AI models or provider names.
 * - ZERO fake statistics.
 */
export default function DrawableDiscoverySection() {
  return (
    <section className="py-16 sm:py-24 border-t border-neutral-200/80 bg-white relative overflow-hidden">
      <div className="mx-auto max-w-6xl px-4 sm:px-6">
        {/* Section Header */}
        <div className="max-w-2xl mb-12">
          <p className="font-mono text-xs uppercase tracking-widest text-[#0095F6] font-bold select-none">
            // developer discovery
          </p>
          <h2 className="mt-2 text-3xl sm:text-4xl font-black text-neutral-950 tracking-tight">
            Find developers who{' '}
            <span className="block mt-1 sm:inline sm:mt-0">
              <DrawableUnderline color="blue">complement what you build.</DrawableUnderline>
            </span>
          </h2>
          <p className="mt-3 text-base text-neutral-600 leading-relaxed">
            Match with peers through profile skills on TalentGraph, or discover who is building nearby through DevRadar.
          </p>
        </div>

        {/* Discovery Grid */}
        <div className="grid gap-8 lg:grid-cols-2">
          {/* Card 1: TalentGraph Skill Matching */}
          <div className="flex flex-col">
            <div className="flex items-center justify-between mb-3 px-1">
              <span className="font-mono text-xs font-bold text-[#EF4444] uppercase tracking-wide">
                01 // TALENTGRAPH
              </span>
              <DrawableNote rotate={-2} color="red" className="text-sm">
                * skill matching
              </DrawableNote>
            </div>

            <DrawableFrame
              variant="red-double-marker"
              className="flex-1 p-6 sm:p-7 bg-white flex flex-col justify-between"
              ariaLabel="TalentGraph Skill Pairing"
            >
              <div>
                <div className="flex items-center justify-between pb-3 border-b border-neutral-200">
                  <h3 className="text-xl font-bold text-neutral-900 tracking-tight">TalentGraph</h3>
                  <DrawableTag color="red">skills pairing</DrawableTag>
                </div>

                <p className="mt-3 text-xs sm:text-sm text-neutral-600 leading-relaxed">
                  Add technical skills to your profile. TalentGraph matches you with peers building with complementary technologies so you can collaborate or chat directly.
                </p>

                {/* Hand-Drawn Visual Skill Pairing Diagram */}
                <div className="mt-6 p-4 bg-neutral-50/80 border border-neutral-200 rounded-xs">
                  <div className="grid grid-cols-[1fr_auto_1fr] items-center gap-2 sm:gap-4">
                    {/* Left Node: YOU */}
                    <div className="bg-white p-3 border border-neutral-300 rounded-xs text-center relative">
                      <span className="font-mono text-[10px] uppercase font-bold text-neutral-400 block">YOU</span>
                      <span className="font-mono text-xs font-bold text-neutral-900 block mt-0.5">Frontend</span>
                      <div className="mt-2 flex flex-wrap justify-center gap-1 font-mono text-[10px] text-neutral-600">
                        <span className="bg-neutral-100 px-1.5 py-0.5 rounded-xs">React</span>
                        <span className="bg-neutral-100 px-1.5 py-0.5 rounded-xs">TypeScript</span>
                      </div>
                    </div>

                    {/* Middle: Hand-drawn dashed connector */}
                    <DrawableConnector
                      direction="horizontal"
                      color="red"
                      label="pairs with"
                      dashed
                    />

                    {/* Right Node: PEER */}
                    <div className="bg-white p-3 border border-[#EF4444]/40 rounded-xs text-center relative">
                      <span className="font-mono text-[10px] uppercase font-bold text-[#EF4444] block">MATCHED PEER</span>
                      <span className="font-mono text-xs font-bold text-neutral-900 block mt-0.5">@arjun_dev</span>
                      <div className="mt-2 flex flex-wrap justify-center gap-1 font-mono text-[10px] text-neutral-600">
                        <span className="bg-neutral-100 px-1.5 py-0.5 rounded-xs">Python</span>
                        <span className="bg-neutral-100 px-1.5 py-0.5 rounded-xs">FastAPI</span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              <div className="mt-6 pt-3 border-t border-neutral-100 flex items-center justify-between text-xs font-mono text-neutral-400">
                <span>Based on profile skills</span>
                <span className="text-neutral-600 font-semibold">Direct 1-on-1 chat</span>
              </div>
            </DrawableFrame>
          </div>

          {/* Card 2: DevRadar Proximity Scanner */}
          <div className="flex flex-col">
            <div className="flex items-center justify-between mb-3 px-1">
              <span className="font-mono text-xs font-bold text-[#0095F6] uppercase tracking-wide">
                02 // DEVRADAR
              </span>
              <DrawableNote rotate={2} color="blue" className="text-sm">
                * local discovery
              </DrawableNote>
            </div>

            <DrawableFrame
              variant="blue-tech"
              className="flex-1 p-6 sm:p-7 bg-white flex flex-col justify-between"
              ariaLabel="DevRadar Proximity Scanner"
            >
              <div>
                <div className="flex items-center justify-between pb-3 border-b border-neutral-200">
                  <h3 className="text-xl font-bold text-neutral-900 tracking-tight">DevRadar</h3>
                  <DrawableTag color="blue">opt-in proximity</DrawableTag>
                </div>

                <p className="mt-3 text-xs sm:text-sm text-neutral-600 leading-relaxed">
                  Discover developers through DevRadar. Opt in to find engineers building in your city, form local study circles, or discuss architectures in person.
                </p>

                {/* Hand-drawn Minimal Radar Graphic */}
                <div className="mt-6 p-4 bg-neutral-50/80 border border-neutral-200 rounded-xs relative flex items-center justify-center h-44 overflow-hidden">
                  {/* Hand-drawn Concentric Rings with organic variation */}
                  <svg viewBox="0 0 200 160" fill="none" className="w-full h-full max-w-[200px] pointer-events-none overflow-visible">
                    {/* Outer imperfect ring */}
                    <path
                      d="M 100,10 C 145,10 178,42 176,82 C 174,124 142,154 99,152 C 54,150 22,120 23,80 C 24,40 56,10 100,10 Z"
                      stroke="#0095F6"
                      strokeWidth="1.4"
                      strokeDasharray="5 3"
                      strokeOpacity="0.3"
                      vectorEffect="non-scaling-stroke"
                    />
                    {/* Mid imperfect ring */}
                    <path
                      d="M 100,35 C 128,34 148,56 147,81 C 146,107 126,126 99,125 C 72,124 52,104 53,80 C 54,54 74,36 100,35 Z"
                      stroke="#1F2937"
                      strokeWidth="1.2"
                      strokeOpacity="0.25"
                      vectorEffect="non-scaling-stroke"
                    />
                    {/* Inner imperfect ring */}
                    <path
                      d="M 100,58 C 114,57 123,68 122,81 C 121,94 112,103 99,102 C 86,101 76,92 77,80 C 78,67 87,58 100,58 Z"
                      stroke="#EF4444"
                      strokeWidth="1.4"
                      strokeDasharray="3 2"
                      strokeOpacity="0.45"
                      vectorEffect="non-scaling-stroke"
                    />
                    {/* Center point */}
                    <circle cx="100" cy="80" r="4" fill="#0095F6" />
                    {/* Sweep hand-drawn indicator */}
                    <line
                      x1="100"
                      y1="80"
                      x2="158"
                      y2="36"
                      stroke="#0095F6"
                      strokeWidth="1.6"
                      strokeLinecap="round"
                      strokeOpacity="0.75"
                    />
                  </svg>

                  {/* Marker Nodes with hand-drawn style */}
                  <div className="absolute top-8 right-10 bg-white px-2 py-0.5 border border-neutral-300 rounded-xs font-mono text-[10px] text-neutral-800">
                    <span className="h-1.5 w-1.5 rounded-full bg-[#0095F6] inline-block mr-1" />
                    @rahul_ts
                  </div>

                  <div className="absolute bottom-6 left-8 bg-white px-2 py-0.5 border border-neutral-300 rounded-xs font-mono text-[10px] text-neutral-800">
                    <span className="h-1.5 w-1.5 rounded-full bg-[#EF4444] inline-block mr-1" />
                    @neha_dev
                  </div>

                  {/* Center Label */}
                  <span className="absolute bottom-2 right-4 font-mono text-[9px] text-neutral-400">
                    [proximity scanner]
                  </span>
                </div>
              </div>

              <div className="mt-6 pt-3 border-t border-neutral-100 flex items-center justify-between text-xs font-mono text-neutral-400">
                <span>Strictly opt-in</span>
                <span className="text-neutral-600 font-semibold">Privacy-first</span>
              </div>
            </DrawableFrame>
          </div>
        </div>
      </div>
    </section>
  );
}
