// 20 Carefully Designed Premium Gradient Presets for Discuss Profile Banners
// Fit Discuss identity, work with both light/dark UI, avoid childish/oversaturated effects.

export const BANNER_PRESETS = [
  { id: 'gradient-01', name: 'Discuss Blue', className: 'from-[#0095F6] via-[#1877F2] to-[#4338CA]' },
  { id: 'gradient-02', name: 'Obsidian Slate', className: 'from-[#0F172A] via-[#1E293B] to-[#334155]' },
  { id: 'gradient-03', name: 'Midnight Indigo', className: 'from-[#1E1B4B] via-[#312E81] to-[#4338CA]' },
  { id: 'gradient-04', name: 'Graphite Steel', className: 'from-[#18181B] via-[#27272A] to-[#3F3F46]' },
  { id: 'gradient-05', name: 'Cosmic Violet', className: 'from-[#2E1065] via-[#4C1D95] to-[#6D28D9]' },
  { id: 'gradient-06', name: 'Deep Ocean', className: 'from-[#082F49] via-[#0369A1] to-[#0284C7]' },
  { id: 'gradient-07', name: 'Dusk Horizon', className: 'from-[#1E1B4B] via-[#4C1D95] to-[#0369A1]' },
  { id: 'gradient-08', name: 'Cyber Cyan', className: 'from-[#064E3B] via-[#047857] to-[#0284C7]' },
  { id: 'gradient-09', name: 'Twilight Aura', className: 'from-[#3B0764] via-[#581C87] to-[#1E3A8A]' },
  { id: 'gradient-10', name: 'Onyx Carbon', className: 'from-[#09090B] via-[#18181B] to-[#27272A]' },
  { id: 'gradient-11', name: 'Nordic Frost', className: 'from-[#1E293B] via-[#0EA5E9] to-[#38BDF8]' },
  { id: 'gradient-12', name: 'Royal Emerald', className: 'from-[#064E3B] via-[#065F46] to-[#047857]' },
  { id: 'gradient-13', name: 'Amber Eclipse', className: 'from-[#451A03] via-[#78350F] to-[#B45309]' },
  { id: 'gradient-14', name: 'Crimson Velvet', className: 'from-[#4C0519] via-[#881337] to-[#9F1239]' },
  { id: 'gradient-15', name: 'Titanium Haze', className: 'from-[#1F2937] via-[#374151] to-[#4B5563]' },
  { id: 'gradient-16', name: 'Nebula Glow', className: 'from-[#312E81] via-[#6D28D9] to-[#9333EA]' },
  { id: 'gradient-17', name: 'Electric Indigo', className: 'from-[#2563EB] via-[#4F46E5] to-[#7C3AED]' },
  { id: 'gradient-18', name: 'Slate Minimal', className: 'from-[#111827] via-[#1F2937] to-[#374151]' },
  { id: 'gradient-19', name: 'Teal Depths', className: 'from-[#134E4A] via-[#0F766E] to-[#0D9488]' },
  { id: 'gradient-20', name: 'Midnight Bronze', className: 'from-[#1C1917] via-[#292524] to-[#44403C]' },
];

export const DEFAULT_BANNER_PRESET = BANNER_PRESETS[0];

/**
 * Get preset definition by ID
 * @param {string} id - Preset ID like "gradient-07"
 * @returns {Object} Preset object
 */
export const getBannerPreset = (id) => {
  if (!id) return DEFAULT_BANNER_PRESET;
  const found = BANNER_PRESETS.find((p) => p.id === id);
  return found || DEFAULT_BANNER_PRESET;
};

/**
 * Get full gradient class string for a given preset ID
 * @param {string} id - Preset ID
 * @returns {string} Tailwind bg-gradient class string
 */
export const getBannerGradientClass = (id) => {
  const preset = getBannerPreset(id);
  return `bg-gradient-to-r ${preset.className}`;
};

/**
 * Resolves banner presentation respecting priority:
 * 1. Explicitly selected bannerThemeId
 * 2. Existing legacy banner image/data (bannerUrl / banner_url)
 * 3. Default gradient fallback only if no banner exists
 */
export const resolveBanner = ({ bannerThemeId, bannerUrl, banner_url } = {}) => {
  if (bannerThemeId) {
    const preset = getBannerPreset(bannerThemeId);
    return { type: 'gradient', className: `bg-gradient-to-r ${preset.className}`, preset };
  }
  const legacyImage = bannerUrl || banner_url;
  if (legacyImage && typeof legacyImage === 'string' && legacyImage.trim()) {
    return { type: 'image', url: legacyImage.trim() };
  }
  const defaultPreset = DEFAULT_BANNER_PRESET;
  return { type: 'gradient', className: `bg-gradient-to-r ${defaultPreset.className}`, preset: defaultPreset };
};
