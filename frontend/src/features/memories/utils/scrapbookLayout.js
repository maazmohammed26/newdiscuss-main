/**
 * scrapbookLayout.js
 * Algorithmic scrapbook page generator and layout engine.
 *
 * Rules:
 * - 2 to 7 memories per page (1 if only 1 exists).
 * - Beyond 7 memories, paginate into multiple pages.
 * - Dynamic composition based on item count:
 *   1: Centerpiece feature
 *   2: Balanced asymmetrical pair
 *   3: Editorial triangle
 *   4: Balanced 2x2 organic grid
 *   5: Dynamic collage with anchor
 *   6: 3x2 editorial layout
 *   7: High-density comfortable composition
 * - Never shrink memories into tiny unreadable thumbnails to squeeze on 1 page.
 * - Deterministic rotations and positioning prevent layout shift.
 */

import { getStableRotation } from './stampTheme';

export const MAX_MEMORIES_PER_PAGE = 7;

/**
 * Splits an array of memories into scrapbook pages of 1–7 items.
 * @param {Array} memories
 * @param {number} [maxPerPage=7]
 * @returns {Array<Array>} Array of page chunks
 */
export function paginateMemories(memories = [], maxPerPage = MAX_MEMORIES_PER_PAGE) {
  if (!Array.isArray(memories) || memories.length === 0) return [];
  const pages = [];
  for (let i = 0; i < memories.length; i += maxPerPage) {
    pages.push(memories.slice(i, i + maxPerPage));
  }
  return pages;
}

/**
 * Computes layout properties for each memory on a single scrapbook page.
 * @param {Array} pageMemories (1 to 7 items)
 * @returns {Array<{ memory: Object, slotClass: string, rotation: number, tapeVariant: string }>}
 */
export function getPageLayout(pageMemories = []) {
  const count = pageMemories.length;
  if (count === 0) return [];

  const tapeVariants = ['top-center', 'top-left', 'top-right', 'none'];

  return pageMemories.map((mem, index) => {
    const rotation = getStableRotation(mem.id || String(index));
    const tapeVariant = tapeVariants[(index + (mem.id?.length || 0)) % tapeVariants.length];

    let slotClass = '';
    let containerClass = '';

    switch (count) {
      case 1:
        // Single featured centerpiece
        slotClass = 'col-span-12 flex justify-center py-6';
        containerClass = 'w-full max-w-[320px] sm:max-w-[380px]';
        break;

      case 2:
        // Balanced pair with vertical offset
        slotClass = index === 0 
          ? 'col-span-6 flex justify-end pr-2 pt-2' 
          : 'col-span-6 flex justify-start pl-2 pt-8';
        containerClass = 'w-full max-w-[220px] sm:max-w-[260px]';
        break;

      case 3:
        // Asymmetric editorial triangle: 1 larger hero, 2 companion stamps
        if (index === 0) {
          slotClass = 'col-span-12 sm:col-span-7 flex justify-center sm:justify-start pb-3';
          containerClass = 'w-full max-w-[260px] sm:max-w-[300px]';
        } else if (index === 1) {
          slotClass = 'col-span-6 sm:col-span-5 flex justify-end pt-2';
          containerClass = 'w-full max-w-[190px] sm:max-w-[220px]';
        } else {
          slotClass = 'col-span-6 sm:col-span-5 sm:col-start-8 flex justify-center pt-2';
          containerClass = 'w-full max-w-[190px] sm:max-w-[220px]';
        }
        break;

      case 4:
        // Balanced 2x2 organic grid with slight staggering
        slotClass = 'col-span-6 flex justify-center p-2';
        containerClass = 'w-full max-w-[190px] sm:max-w-[220px]';
        break;

      case 5:
        // 5-stamp collage: 2 top, 3 bottom
        if (index < 2) {
          slotClass = 'col-span-6 flex justify-center p-2';
          containerClass = 'w-full max-w-[190px] sm:max-w-[230px]';
        } else {
          slotClass = 'col-span-4 flex justify-center p-1.5';
          containerClass = 'w-full max-w-[150px] sm:max-w-[180px]';
        }
        break;

      case 6:
        // 3x2 grid composition
        slotClass = 'col-span-6 sm:col-span-4 flex justify-center p-2';
        containerClass = 'w-full max-w-[170px] sm:max-w-[200px]';
        break;

      case 7:
      default:
        // 7 memories: dense but elegant (3 top, 4 bottom)
        if (index < 3) {
          slotClass = 'col-span-4 flex justify-center p-1.5';
          containerClass = 'w-full max-w-[160px] sm:max-w-[190px]';
        } else {
          slotClass = 'col-span-3 flex justify-center p-1';
          containerClass = 'w-full max-w-[140px] sm:max-w-[160px]';
        }
        break;
    }

    return {
      memory: mem,
      slotClass,
      containerClass,
      rotation,
      tapeVariant,
    };
  });
}
