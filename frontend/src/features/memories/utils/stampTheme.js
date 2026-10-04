/**
 * stampTheme.js
 * Design system tokens, styles, and dimensions for the Postage Stamp identity.
 *
 * The postage stamp is the core visual identity throughout Memories:
 * - Perforated serrated edges
 * - Inner crisp photo framing
 * - Subtle tactile paper shadow
 * - Stamp margins and perforations scaled by variant
 */

export const STAMP_VARIANTS = {
  CALENDAR: 'calendar',     // Small month cell thumbnail (40-60px)
  SCRAPBOOK: 'scrapbook',   // Medium album presentation (130-220px)
  GALLERY: 'gallery',       // Day gallery stamp (160-240px)
  SHARED: 'shared',         // Shared feed card stamp (200-320px)
  PUBLIC: 'public',         // Public feed card stamp (280-420px)
  VIEWER: 'viewer',         // High-res full viewport stamp (viewport constrained)
  PREVIEW: 'preview',       // Upload & framing crop preview (220-300px)
};

/**
 * Returns deterministic rotation in degrees [-2.2, 2.2] based on memory ID string.
 * Ensures consistent rendering across re-renders without layout shifts.
 * @param {string} id
 * @returns {number} rotation in degrees
 */
export function getStableRotation(id = '') {
  if (!id) return 0;
  let hash = 0;
  for (let i = 0; i < id.length; i++) {
    hash = (hash << 5) - hash + id.charCodeAt(i);
    hash |= 0;
  }
  // Map hash to range between -2.2 and 2.2 degrees
  const normalized = (Math.abs(hash) % 44) / 10 - 2.2;
  return Math.round(normalized * 10) / 10;
}

/**
 * Generates an SVG data URL for crisp postage stamp perforations.
 * This works across all modern mobile WebKit and Chromium browsers.
 */
export const STAMP_PERFORATION_CSS = `
  .stamp-perforations {
    background-color: #faf7f2;
    padding: 10px;
    position: relative;
    box-shadow: 0 4px 14px rgba(0, 0, 0, 0.08), 0 1px 3px rgba(0, 0, 0, 0.05);
    background-image: 
      radial-gradient(circle at 0px 50%, transparent 4px, #faf7f2 5px),
      radial-gradient(circle at 100% 50%, transparent 4px, #faf7f2 5px),
      radial-gradient(circle at 50% 0px, transparent 4px, #faf7f2 5px),
      radial-gradient(circle at 50% 100%, transparent 4px, #faf7f2 5px);
    background-size: 100% 16px, 100% 16px, 16px 100%, 16px 100%;
    background-repeat: repeat-y, repeat-y, repeat-x, repeat-x;
  }

  .dark .stamp-perforations {
    background-color: #1e1e1e;
    box-shadow: 0 4px 16px rgba(0, 0, 0, 0.35);
    background-image: 
      radial-gradient(circle at 0px 50%, transparent 4px, #1e1e1e 5px),
      radial-gradient(circle at 100% 50%, transparent 4px, #1e1e1e 5px),
      radial-gradient(circle at 50% 0px, transparent 4px, #1e1e1e 5px),
      radial-gradient(circle at 50% 100%, transparent 4px, #1e1e1e 5px);
  }
`;
