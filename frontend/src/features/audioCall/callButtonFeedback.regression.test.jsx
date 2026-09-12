import React, { act, useState, useRef, useCallback } from 'react';
import { createRoot } from 'react-dom/client';
import { Phone } from 'lucide-react';
import { DiscussLoadingDots } from '@/components/loading';

globalThis.IS_REACT_ACT_ENVIRONMENT = true;

const mockToast = jest.fn();
mockToast.error = jest.fn();
mockToast.success = jest.fn();

jest.mock('sonner', () => ({
  toast: Object.assign((...args) => mockToast(...args), {
    error: (...args) => mockToast.error(...args),
    success: (...args) => mockToast.success(...args),
  }),
}));

describe('Audio Call Button Feedback & Interaction State Regression Tests', () => {
  let container = null;
  let root = null;

  beforeEach(() => {
    jest.clearAllMocks();
    jest.useFakeTimers();
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
    jest.useRealTimers();
  });

  function CallButtonHarness({ startCallFn, isCalling = false, unavailableReason = '' }) {
    const [isConnectingCall, setIsConnectingCall] = useState(false);
    const callConnectingRef = useRef(false);
    const isConnecting = isConnectingCall;

    const handleStartAudioCall = useCallback(async () => {
      if (callConnectingRef.current || isConnectingCall) return;
      if (unavailableReason) {
        mockToast(unavailableReason);
        return;
      }
      if (isCalling) {
        mockToast('Return to your current audio call before starting another.');
        return;
      }

      callConnectingRef.current = true;
      setIsConnectingCall(true);

      const watchdogTimer = setTimeout(() => {
        if (callConnectingRef.current) {
          callConnectingRef.current = false;
          setIsConnectingCall(false);
        }
      }, 20000);

      try {
        await startCallFn();
      } catch (err) {
        mockToast.error(err?.message || 'Call failed');
      } finally {
        clearTimeout(watchdogTimer);
        callConnectingRef.current = false;
        setIsConnectingCall(false);
      }
    }, [isCalling, isConnectingCall, startCallFn, unavailableReason]);

    return (
      <button
        type="button"
        data-testid="audio-call-button"
        onClick={handleStartAudioCall}
        disabled={isConnecting || isCalling || Boolean(unavailableReason)}
        aria-label={isConnecting ? 'Connecting audio call' : 'Start audio call'}
        aria-busy={isConnecting}
        className={`relative flex items-center justify-center rounded-full transition-all duration-150 active:scale-[0.96] ${
          isConnecting
            ? 'h-10 px-3.5 gap-2 bg-neutral-100 dark:bg-[#1A1A1A] text-neutral-800 dark:text-neutral-200 cursor-not-allowed border border-neutral-200/80 dark:border-neutral-800 shadow-xs'
            : unavailableReason || isCalling
            ? 'h-10 w-10 text-neutral-300 dark:text-neutral-700 cursor-not-allowed'
            : 'h-10 w-10 text-neutral-700 hover:bg-neutral-100 dark:text-neutral-200 dark:hover:bg-[#1A1A1A] cursor-pointer'
        }`}
      >
        <Phone className={`shrink-0 ${isConnecting ? 'h-4 w-4 animate-pulse text-[#0095F6]' : 'h-5 w-5'}`} />
        {isConnecting && (
          <span className="flex items-center gap-1.5 whitespace-nowrap text-xs font-semibold tracking-tight">
            <span data-testid="connecting-text">Connecting…</span>
            <DiscussLoadingDots size="inline" className="opacity-80" />
          </span>
        )}
      </button>
    );
  }

  it('enters connecting state immediately upon tap with inline DiscussLoadingDots and accessible labels', async () => {
    let resolveCall = null;
    const mockStartCall = jest.fn(
      () => new Promise((resolve) => { resolveCall = resolve; })
    );

    await act(async () => {
      root.render(<CallButtonHarness startCallFn={mockStartCall} />);
    });

    const button = container.querySelector('[data-testid="audio-call-button"]');
    expect(button).toBeTruthy();
    expect(button.getAttribute('aria-label')).toBe('Start audio call');
    expect(button.getAttribute('aria-busy')).toBe('false');
    expect(button.disabled).toBe(false);
    expect(container.querySelector('[data-testid="connecting-text"]')).toBeNull();

    // Tap button
    act(() => {
      button.click();
    });

    // Immediately in connecting state
    expect(button.getAttribute('aria-label')).toBe('Connecting audio call');
    expect(button.getAttribute('aria-busy')).toBe('true');
    expect(button.disabled).toBe(true);
    expect(container.querySelector('[data-testid="connecting-text"]')?.textContent).toBe('Connecting…');
    expect(container.querySelector('.discuss-loading-dots-inline')).toBeTruthy();
    expect(mockStartCall).toHaveBeenCalledTimes(1);

    // Settle call setup
    await act(async () => {
      resolveCall();
    });

    // Returned from connecting
    expect(button.getAttribute('aria-label')).toBe('Start audio call');
    expect(button.getAttribute('aria-busy')).toBe('false');
    expect(button.disabled).toBe(false);
  });

  it('blocks duplicate call attempts if tapped repeatedly while connecting', async () => {
    let resolveCall = null;
    const mockStartCall = jest.fn(
      () => new Promise((resolve) => { resolveCall = resolve; })
    );

    await act(async () => {
      root.render(<CallButtonHarness startCallFn={mockStartCall} />);
    });

    const button = container.querySelector('[data-testid="audio-call-button"]');

    // First tap
    act(() => {
      button.click();
    });
    expect(mockStartCall).toHaveBeenCalledTimes(1);

    // Rapid second and third taps
    act(() => {
      button.click();
      button.click();
    });

    // Still only 1 call attempt created
    expect(mockStartCall).toHaveBeenCalledTimes(1);

    await act(async () => {
      resolveCall();
    });
  });

  it('exits connecting state and restores call button when mic permission is denied or an error occurs', async () => {
    const mockStartCall = jest.fn().mockRejectedValue(new Error('Microphone permission denied'));

    await act(async () => {
      root.render(<CallButtonHarness startCallFn={mockStartCall} />);
    });

    const button = container.querySelector('[data-testid="audio-call-button"]');

    await act(async () => {
      button.click();
    });

    expect(mockToast.error).toHaveBeenCalledWith('Microphone permission denied');
    expect(button.getAttribute('aria-label')).toBe('Start audio call');
    expect(button.getAttribute('aria-busy')).toBe('false');
    expect(button.disabled).toBe(false);
    expect(container.querySelector('[data-testid="connecting-text"]')).toBeNull();
  });

  it('terminates connecting state if call initiation times out via watchdog', async () => {
    const mockStartCall = jest.fn(() => new Promise(() => {})); // Never settles

    await act(async () => {
      root.render(<CallButtonHarness startCallFn={mockStartCall} />);
    });

    const button = container.querySelector('[data-testid="audio-call-button"]');

    act(() => {
      button.click();
    });

    expect(button.getAttribute('aria-busy')).toBe('true');

    // Fast-forward 20 seconds
    act(() => {
      jest.advanceTimersByTime(20001);
    });

    expect(button.getAttribute('aria-busy')).toBe('false');
    expect(button.disabled).toBe(false);
  });
});
