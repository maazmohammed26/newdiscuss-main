import { resolveBanner, BANNER_PRESETS, DEFAULT_BANNER_PRESET, getBannerPreset } from './bannerPresets';

describe('bannerPresets - Backward Compatibility & Resolution Priority', () => {
  test('has exactly 20 curated gradient presets', () => {
    expect(BANNER_PRESETS).toHaveLength(20);
    expect(BANNER_PRESETS[0].id).toBe('gradient-01');
    expect(BANNER_PRESETS[19].id).toBe('gradient-20');
  });

  test('priority 1: explicit selected bannerThemeId wins over legacy banner image', () => {
    const result = resolveBanner({
      bannerThemeId: 'gradient-07',
      bannerUrl: 'https://example.com/old-banner.jpg',
      banner_url: 'https://example.com/another-banner.jpg',
    });
    expect(result.type).toBe('gradient');
    expect(result.preset.id).toBe('gradient-07');
    expect(result.className).toContain('bg-gradient-to-r');
  });

  test('priority 2: existing legacy banner image/data is preserved if no bannerThemeId is selected', () => {
    const resultWithBannerUrl = resolveBanner({
      bannerThemeId: null,
      bannerUrl: 'https://example.com/legacy-banner.jpg',
    });
    expect(resultWithBannerUrl.type).toBe('image');
    expect(resultWithBannerUrl.url).toBe('https://example.com/legacy-banner.jpg');

    const resultWithBanner_url = resolveBanner({
      bannerThemeId: undefined,
      banner_url: 'https://example.com/legacy-banner-alt.png',
    });
    expect(resultWithBanner_url.type).toBe('image');
    expect(resultWithBanner_url.url).toBe('https://example.com/legacy-banner-alt.png');
  });

  test('priority 3: default gradient fallback only if no banner exists', () => {
    const resultEmpty = resolveBanner({});
    expect(resultEmpty.type).toBe('gradient');
    expect(resultEmpty.preset.id).toBe(DEFAULT_BANNER_PRESET.id);

    const resultNulls = resolveBanner({
      bannerThemeId: null,
      bannerUrl: '',
      banner_url: null,
    });
    expect(resultNulls.type).toBe('gradient');
    expect(resultNulls.preset.id).toBe(DEFAULT_BANNER_PRESET.id);
  });
});
