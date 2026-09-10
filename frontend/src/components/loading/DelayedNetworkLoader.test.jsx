import React, { act } from 'react';
import { createRoot } from 'react-dom/client';
import DelayedNetworkLoader from './DelayedNetworkLoader';

describe('DelayedNetworkLoader', () => {
  let container;
  let root;

  beforeEach(() => {
    jest.useFakeTimers();
    globalThis.IS_REACT_ACT_ENVIRONMENT = true;
    container = document.createElement('div');
    document.body.appendChild(container);
    root = createRoot(container);
  });

  afterEach(async () => {
    await act(async () => {
      root.unmount();
      jest.runOnlyPendingTimers();
    });
    jest.useRealTimers();
    container.remove();
  });

  test('does not render when inactive', async () => {
    await act(async () => {
      root.render(<DelayedNetworkLoader active={false} delay={500} />);
    });
    expect(container.querySelector('[data-testid="delayed-network-loader"]')).toBeNull();
  });

  test('does not render immediately when active with delay (fast interaction)', async () => {
    await act(async () => {
      root.render(<DelayedNetworkLoader active={true} delay={500} />);
    });
    // t=0
    expect(container.querySelector('[data-testid="delayed-network-loader"]')).toBeNull();

    // t=250ms (fast response threshold)
    await act(async () => {
      jest.advanceTimersByTime(250);
    });
    expect(container.querySelector('[data-testid="delayed-network-loader"]')).toBeNull();
  });

  test('renders after delay threshold passes (slow interaction)', async () => {
    await act(async () => {
      root.render(<DelayedNetworkLoader active={true} delay={500} />);
    });

    await act(async () => {
      jest.advanceTimersByTime(500);
    });

    const loader = container.querySelector('[data-testid="delayed-network-loader"]');
    expect(loader).not.toBeNull();
    expect(loader.getAttribute('role')).toBe('status');
    expect(loader.getAttribute('aria-live')).toBe('polite');
  });

  test('does not flash when request resolves quickly before delay', async () => {
    await act(async () => {
      root.render(<DelayedNetworkLoader active={true} delay={500} />);
    });

    await act(async () => {
      jest.advanceTimersByTime(200);
    });

    // Request finished before 500ms
    await act(async () => {
      root.render(<DelayedNetworkLoader active={false} delay={500} />);
    });

    await act(async () => {
      jest.advanceTimersByTime(400);
    });

    expect(container.querySelector('[data-testid="delayed-network-loader"]')).toBeNull();
  });

  test('enforces minVisible duration once visible to prevent 1-frame flash', async () => {
    await act(async () => {
      root.render(<DelayedNetworkLoader active={true} delay={500} minVisible={300} />);
    });

    // Cross delay threshold -> becomes visible
    await act(async () => {
      jest.advanceTimersByTime(500);
    });
    expect(container.querySelector('[data-testid="delayed-network-loader"]')).not.toBeNull();

    // 50ms later, request completes
    await act(async () => {
      jest.advanceTimersByTime(50);
    });
    await act(async () => {
      root.render(<DelayedNetworkLoader active={false} delay={500} minVisible={300} />);
    });

    // Still visible because 50ms < 300ms minVisible
    expect(container.querySelector('[data-testid="delayed-network-loader"]')).not.toBeNull();

    // Advance 200ms (total elapsed: 250ms < 300ms) -> still visible
    await act(async () => {
      jest.advanceTimersByTime(200);
    });
    expect(container.querySelector('[data-testid="delayed-network-loader"]')).not.toBeNull();

    // Advance 60ms (total elapsed: 310ms > 300ms) -> unmounts cleanly!
    await act(async () => {
      jest.advanceTimersByTime(60);
    });
    expect(container.querySelector('[data-testid="delayed-network-loader"]')).toBeNull();
  });
});
