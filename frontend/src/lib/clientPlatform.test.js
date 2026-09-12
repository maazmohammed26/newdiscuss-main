import {
  getClientPlatform,
  checkDiscussInstalled,
  GOOGLE_PLAY_URL,
  ANDROID_PACKAGE_NAME,
  ANDROID_STORE_PROMPT_SESSION_KEY,
} from './clientPlatform';

describe('clientPlatform utility', () => {
  const originalNavigator = window.navigator;

  afterEach(() => {
    Object.defineProperty(window, 'navigator', {
      value: originalNavigator,
      configurable: true,
      writable: true,
    });
  });

  it('exports valid Google Play URL and package name', () => {
    expect(GOOGLE_PLAY_URL).toBe(
      'https://play.google.com/store/apps/details?id=co.median.android.lpowadz'
    );
    expect(ANDROID_PACKAGE_NAME).toBe('co.median.android.lpowadz');
    expect(ANDROID_STORE_PROMPT_SESSION_KEY).toBe('discuss_android_store_prompt_seen');
  });

  describe('getClientPlatform', () => {
    it('detects Android via userAgentData.platform', () => {
      Object.defineProperty(window, 'navigator', {
        value: {
          userAgentData: { platform: 'Android' },
          userAgent: 'Mozilla/5.0 (Linux; Android 14)',
        },
        configurable: true,
        writable: true,
      });

      expect(getClientPlatform()).toBe('android');
    });

    it('detects Android via userAgent fallback', () => {
      Object.defineProperty(window, 'navigator', {
        value: {
          userAgent: 'Mozilla/5.0 (Linux; U; Android 13; en-us; SM-G998B) AppleWebKit/537.36',
        },
        configurable: true,
        writable: true,
      });

      expect(getClientPlatform()).toBe('android');
    });

    it('detects iOS via userAgentData.platform', () => {
      Object.defineProperty(window, 'navigator', {
        value: {
          userAgentData: { platform: 'iOS' },
          userAgent: 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X)',
        },
        configurable: true,
        writable: true,
      });

      expect(getClientPlatform()).toBe('ios');
    });

    it('detects iOS via iPhone/iPad userAgent', () => {
      Object.defineProperty(window, 'navigator', {
        value: {
          userAgent: 'Mozilla/5.0 (iPhone; CPU iPhone OS 16_5 like Mac OS X) AppleWebKit/605.1.15',
        },
        configurable: true,
        writable: true,
      });

      expect(getClientPlatform()).toBe('ios');
    });

    it('detects iPadOS with MacIntel and multi-touch points', () => {
      Object.defineProperty(window, 'navigator', {
        value: {
          userAgent: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7)',
          platform: 'MacIntel',
          maxTouchPoints: 5,
        },
        configurable: true,
        writable: true,
      });

      expect(getClientPlatform()).toBe('ios');
    });

    it('detects desktop for Windows / macOS / Linux', () => {
      Object.defineProperty(window, 'navigator', {
        value: {
          userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
          platform: 'Win32',
        },
        configurable: true,
        writable: true,
      });

      expect(getClientPlatform()).toBe('desktop');
    });
  });

  describe('checkDiscussInstalled', () => {
    it('returns false if getInstalledRelatedApps is not a function', async () => {
      Object.defineProperty(window, 'navigator', {
        value: {},
        configurable: true,
        writable: true,
      });

      const installed = await checkDiscussInstalled();
      expect(installed).toBe(false);
    });

    it('returns false when getInstalledRelatedApps returns empty array', async () => {
      Object.defineProperty(window, 'navigator', {
        value: {
          getInstalledRelatedApps: jest.fn().mockResolvedValue([]),
        },
        configurable: true,
        writable: true,
      });

      const installed = await checkDiscussInstalled();
      expect(installed).toBe(false);
    });

    it('returns true when getInstalledRelatedApps matches package name', async () => {
      Object.defineProperty(window, 'navigator', {
        value: {
          getInstalledRelatedApps: jest.fn().mockResolvedValue([
            { id: 'co.median.android.lpowadz', platform: 'play' },
          ]),
        },
        configurable: true,
        writable: true,
      });

      const installed = await checkDiscussInstalled();
      expect(installed).toBe(true);
    });

    it('handles getInstalledRelatedApps errors gracefully', async () => {
      Object.defineProperty(window, 'navigator', {
        value: {
          getInstalledRelatedApps: jest.fn().mockRejectedValue(new Error('DOMException')),
        },
        configurable: true,
        writable: true,
      });

      const installed = await checkDiscussInstalled();
      expect(installed).toBe(false);
    });
  });
});
