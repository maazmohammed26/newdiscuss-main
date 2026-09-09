import {
  getMedianBridge,
  getPlatform,
  isNativeApp,
  isMedianApp,
  hideNativeSplash,
  PLATFORM,
} from './platformAdapter';

describe('platformAdapter', () => {
  const originalMedian = window.median;
  const originalGonative = window.gonative;
  const originalCapacitor = window.Capacitor;
  const originalMatchMedia = window.matchMedia;
  const originalUserAgent = window.navigator.userAgent;

  afterEach(() => {
    if (originalMedian === undefined) delete window.median;
    else window.median = originalMedian;
    if (originalGonative === undefined) delete window.gonative;
    else window.gonative = originalGonative;
    if (originalCapacitor === undefined) delete window.Capacitor;
    else window.Capacitor = originalCapacitor;
    window.matchMedia = originalMatchMedia;
    Object.defineProperty(window.navigator, 'userAgent', { configurable: true, value: originalUserAgent });
  });

  it('separates normal web and installed PWA contexts', () => {
    delete window.median;
    delete window.gonative;
    delete window.Capacitor;
    Object.defineProperty(window.navigator, 'userAgent', { configurable: true, value: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) Chrome/120.0.0.0' });
    window.matchMedia = jest.fn().mockReturnValue({ matches: false });
    expect(isMedianApp()).toBe(false);
    expect(isNativeApp()).toBe(false);
    expect(getPlatform()).toBe(PLATFORM.WEB);

    window.matchMedia = jest.fn().mockReturnValue({ matches: true });
    expect(isMedianApp()).toBe(false);
    expect(isNativeApp()).toBe(false);
    expect(getPlatform()).toBe(PLATFORM.PWA);
  });

  it('detects Median Android via official userAgent pattern', () => {
    delete window.median;
    delete window.gonative;
    Object.defineProperty(window.navigator, 'userAgent', {
      configurable: true,
      value: 'Mozilla/5.0 (Linux; Android 14; Pixel 8 Build/UD1A.230803.041; wv) AppleWebKit/537.36 (KHTML, like Gecko) Version/4.0 Chrome/120.0.6099.144 Mobile Safari/537.36 median',
    });
    expect(isMedianApp()).toBe(true);
    expect(isNativeApp()).toBe(true);
    expect(getPlatform()).toBe(PLATFORM.MEDIAN_ANDROID);
  });

  it('detects Median iOS via official userAgent pattern', () => {
    delete window.median;
    delete window.gonative;
    Object.defineProperty(window.navigator, 'userAgent', {
      configurable: true,
      value: 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 Mobile/15E148 median',
    });
    expect(isMedianApp()).toBe(true);
    expect(isNativeApp()).toBe(true);
    expect(getPlatform()).toBe(PLATFORM.MEDIAN_IOS);
  });

  it('detects and exposes the Median Android bridge', () => {
    window.median = { onesignal: {} };
    Object.defineProperty(window.navigator, 'userAgent', { configurable: true, value: 'Median Android' });
    expect(isMedianApp()).toBe(true);
    expect(isNativeApp()).toBe(true);
    expect(getPlatform()).toBe(PLATFORM.MEDIAN_ANDROID);
    expect(getMedianBridge()).toBe(window.median);
  });

  it('invokes bridge.screen.splash.hide when available in hideNativeSplash', () => {
    const hideMock = jest.fn();
    window.median = { screen: { splash: { hide: hideMock } } };
    Object.defineProperty(window.navigator, 'userAgent', { configurable: true, value: 'median' });
    const result = hideNativeSplash();
    expect(result).toBe(true);
    expect(hideMock).toHaveBeenCalledTimes(1);
  });

  it('does not throw in hideNativeSplash on standard web browser', () => {
    delete window.median;
    delete window.gonative;
    Object.defineProperty(window.navigator, 'userAgent', { configurable: true, value: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7)' });
    expect(() => hideNativeSplash()).not.toThrow();
    expect(hideNativeSplash()).toBe(false);
  });
});
