import React, { act } from 'react';
import { createRoot } from 'react-dom/client';
import AndroidPromotionSheet from './AndroidPromotionSheet';
import * as clientPlatform from '@/lib/clientPlatform';

globalThis.IS_REACT_ACT_ENVIRONMENT = true;

let mockAuthState = { user: null };

jest.mock('@/contexts/AuthContext', () => ({
  useAuth: () => mockAuthState,
}));

describe('AndroidPromotionSheet component', () => {
  let container = null;
  let root = null;

  beforeEach(() => {
    jest.clearAllMocks();
    jest.useFakeTimers();
    mockAuthState = { user: null };
    sessionStorage.clear();
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
    jest.useRealTimers();
  });

  it('does NOT render when client platform is desktop', async () => {
    jest.spyOn(clientPlatform, 'getClientPlatform').mockReturnValue('desktop');

    await act(async () => {
      root.render(<AndroidPromotionSheet />);
    });

    act(() => {
      jest.advanceTimersByTime(1000);
    });

    expect(container.textContent).toBe('');
  });

  it('does NOT render when client platform is iOS', async () => {
    jest.spyOn(clientPlatform, 'getClientPlatform').mockReturnValue('ios');

    await act(async () => {
      root.render(<AndroidPromotionSheet />);
    });

    act(() => {
      jest.advanceTimersByTime(1000);
    });

    expect(container.textContent).toBe('');
  });

  it('does NOT render when user is authenticated', async () => {
    jest.spyOn(clientPlatform, 'getClientPlatform').mockReturnValue('android');
    mockAuthState = { user: { uid: 'dev_123' } };

    await act(async () => {
      root.render(<AndroidPromotionSheet />);
    });

    act(() => {
      jest.advanceTimersByTime(1000);
    });

    expect(container.textContent).toBe('');
  });

  it('does NOT render if already seen in current session', async () => {
    jest.spyOn(clientPlatform, 'getClientPlatform').mockReturnValue('android');
    sessionStorage.setItem('discuss_android_store_prompt_seen', 'true');

    await act(async () => {
      root.render(<AndroidPromotionSheet />);
    });

    act(() => {
      jest.advanceTimersByTime(1000);
    });

    expect(container.textContent).toBe('');
  });

  it('renders smoothly on Android for unauthenticated user after stabilization delay', async () => {
    jest.spyOn(clientPlatform, 'getClientPlatform').mockReturnValue('android');
    jest.spyOn(clientPlatform, 'checkDiscussInstalled').mockResolvedValue(false);

    await act(async () => {
      root.render(<AndroidPromotionSheet />);
    });

    // Before timer fires
    expect(container.textContent).toBe('');

    // Fast-forward stabilization timer
    act(() => {
      jest.advanceTimersByTime(800);
    });

    expect(container.textContent).toContain('Discuss for Android');
    expect(container.textContent).toContain('Now available on Google Play.');
    expect(container.textContent).toContain('Get it on Google Play');
    expect(container.textContent).toContain('Not now');

    const link = container.querySelector('a');
    expect(link.getAttribute('href')).toBe(clientPlatform.GOOGLE_PLAY_URL);
    expect(link.getAttribute('target')).toBe('_blank');
    expect(link.getAttribute('rel')).toBe('noopener noreferrer');
  });

  it('dismisses when Not now is clicked and records session flag', async () => {
    jest.spyOn(clientPlatform, 'getClientPlatform').mockReturnValue('android');
    jest.spyOn(clientPlatform, 'checkDiscussInstalled').mockResolvedValue(false);

    await act(async () => {
      root.render(<AndroidPromotionSheet />);
    });

    act(() => {
      jest.advanceTimersByTime(800);
    });

    const notNowBtn = Array.from(container.querySelectorAll('button')).find((b) =>
      b.textContent.includes('Not now')
    );
    expect(notNowBtn).toBeTruthy();

    await act(async () => {
      notNowBtn.click();
    });

    expect(sessionStorage.getItem('discuss_android_store_prompt_seen')).toBe('true');

    // Fast forward closing animation
    act(() => {
      jest.advanceTimersByTime(300);
    });

    expect(container.textContent).toBe('');
  });

  it('dismisses on Escape key press', async () => {
    jest.spyOn(clientPlatform, 'getClientPlatform').mockReturnValue('android');
    jest.spyOn(clientPlatform, 'checkDiscussInstalled').mockResolvedValue(false);

    await act(async () => {
      root.render(<AndroidPromotionSheet />);
    });

    act(() => {
      jest.advanceTimersByTime(800);
    });

    expect(container.textContent).toContain('Discuss for Android');

    await act(async () => {
      window.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape' }));
    });

    expect(sessionStorage.getItem('discuss_android_store_prompt_seen')).toBe('true');

    act(() => {
      jest.advanceTimersByTime(300);
    });

    expect(container.textContent).toBe('');
  });
});
