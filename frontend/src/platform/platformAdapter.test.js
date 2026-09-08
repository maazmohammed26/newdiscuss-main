import { getMedianBridge, getPlatform, isNativeApp, PLATFORM } from './platformAdapter';

describe('platformAdapter', () => {
  const originalMedian = window.median;
  const originalMatchMedia = window.matchMedia;
  const originalUserAgent = window.navigator.userAgent;

  afterEach(() => {
    if (originalMedian === undefined) delete window.median;
    else window.median = originalMedian;
    window.matchMedia = originalMatchMedia;
    Object.defineProperty(window.navigator, 'userAgent', { configurable: true, value: originalUserAgent });
  });

  it('separates normal web and installed PWA contexts', () => {
    delete window.median;
    Object.defineProperty(window.navigator, 'userAgent', { configurable: true, value: 'Mozilla/5.0 Chrome' });
    window.matchMedia = jest.fn().mockReturnValue({ matches: false });
    expect(getPlatform()).toBe(PLATFORM.WEB);
    window.matchMedia = jest.fn().mockReturnValue({ matches: true });
    expect(getPlatform()).toBe(PLATFORM.PWA);
  });

  it('detects and exposes the Median Android bridge', () => {
    window.median = { onesignal: {} };
    Object.defineProperty(window.navigator, 'userAgent', { configurable: true, value: 'Median Android' });
    expect(isNativeApp()).toBe(true);
    expect(getPlatform()).toBe(PLATFORM.MEDIAN_ANDROID);
    expect(getMedianBridge()).toBe(window.median);
  });
});
