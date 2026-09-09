import React, { act } from 'react';
import { createRoot } from 'react-dom/client';
import { renderToStaticMarkup } from 'react-dom/server';
import DiscussSplash from './DiscussSplash';

globalThis.IS_REACT_ACT_ENVIRONMENT = true;

describe('DiscussSplash', () => {
  const originalMedian = window.median;
  const originalGonative = window.gonative;
  const originalCapacitor = window.Capacitor;
  const originalMatchMedia = window.matchMedia;
  const originalUserAgent = window.navigator.userAgent;
  let container = null;
  let root = null;

  beforeEach(() => {
    delete window.median;
    delete window.gonative;
    delete window.Capacitor;
    window.matchMedia = jest.fn().mockReturnValue({ matches: false });
    container = document.createElement('div');
    document.body.appendChild(container);
    root = createRoot(container);
  });

  afterEach(() => {
    if (root) {
      act(() => {
        root.unmount();
      });
    }
    if (container && container.parentNode) {
      container.parentNode.removeChild(container);
    }
    container = null;
    root = null;

    if (originalMedian === undefined) delete window.median;
    else window.median = originalMedian;
    if (originalGonative === undefined) delete window.gonative;
    else window.gonative = originalGonative;
    if (originalCapacitor === undefined) delete window.Capacitor;
    else window.Capacitor = originalCapacitor;
    window.matchMedia = originalMatchMedia;
    Object.defineProperty(window.navigator, 'userAgent', { configurable: true, value: originalUserAgent });
    jest.useRealTimers();
  });

  it('does NOT render splash in Median Android app (static markup)', () => {
    Object.defineProperty(window.navigator, 'userAgent', {
      configurable: true,
      value: 'Mozilla/5.0 (Linux; Android 14; Pixel 8) AppleWebKit/537.36 median',
    });

    const html = renderToStaticMarkup(<DiscussSplash />);
    expect(html).toBe('');
  });

  it('does NOT render splash in Median Android app (DOM mount)', () => {
    Object.defineProperty(window.navigator, 'userAgent', {
      configurable: true,
      value: 'Mozilla/5.0 (Linux; Android 14; Pixel 8) AppleWebKit/537.36 median',
    });

    const onFinish = jest.fn();
    act(() => {
      root.render(<DiscussSplash onFinish={onFinish} />);
    });

    expect(container.innerHTML).toBe('');
    expect(container.querySelector('.splash-root')).toBeNull();
    expect(onFinish).toHaveBeenCalledTimes(1);
  });

  it('does NOT render splash when window.median bridge exists', () => {
    window.median = { screen: { splash: { hide: jest.fn() } } };
    Object.defineProperty(window.navigator, 'userAgent', {
      configurable: true,
      value: 'Mozilla/5.0 (Linux; Android 14)',
    });

    act(() => {
      root.render(<DiscussSplash />);
    });

    expect(container.innerHTML).toBe('');
    expect(window.median.screen.splash.hide).toHaveBeenCalled();
  });

  it('renders splash in normal browser', () => {
    Object.defineProperty(window.navigator, 'userAgent', {
      configurable: true,
      value: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/120.0.0.0 Safari/537.36',
    });

    const html = renderToStaticMarkup(<DiscussSplash />);
    expect(html).toContain('splash-root');
    expect(html).toContain('splash-wordmark-container');

    act(() => {
      root.render(<DiscussSplash />);
    });
    expect(container.querySelector('.splash-root')).not.toBeNull();
    expect(container.querySelector('.splash-wordmark-container')).not.toBeNull();
  });

  it('renders splash in installed PWA', () => {
    Object.defineProperty(window.navigator, 'userAgent', {
      configurable: true,
      value: 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 Mobile/15E148',
    });
    window.matchMedia = jest.fn().mockReturnValue({ matches: true });

    act(() => {
      root.render(<DiscussSplash />);
    });
    expect(container.querySelector('.splash-root')).not.toBeNull();
  });

  it('renders splash on desktop and transitions with timer', () => {
    jest.useFakeTimers();
    Object.defineProperty(window.navigator, 'userAgent', {
      configurable: true,
      value: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36',
    });

    const onFinish = jest.fn();
    act(() => {
      root.render(<DiscussSplash onFinish={onFinish} />);
    });

    expect(container.querySelector('.splash-root')).not.toBeNull();

    act(() => {
      jest.runAllTimers();
    });

    expect(onFinish).toHaveBeenCalledTimes(1);
    expect(container.querySelector('.splash-root')).toBeNull();
  });
});
