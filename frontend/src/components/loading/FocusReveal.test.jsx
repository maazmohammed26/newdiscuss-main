import React, { act } from 'react';
import { createRoot } from 'react-dom/client';
import FocusReveal from './FocusReveal';

describe('FocusReveal', () => {
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

  test('renders children correctly', async () => {
    await act(async () => {
      root.render(
        <FocusReveal ready={true}>
          <span data-testid="child-content">Ready Content</span>
        </FocusReveal>
      );
    });

    const child = container.querySelector('[data-testid="child-content"]');
    expect(child).not.toBeNull();
    expect(child.textContent).toBe('Ready Content');
  });

  test('triggers focus animation and settles with complete GPU cleanup', async () => {
    await act(async () => {
      root.render(
        <FocusReveal ready={true} variant="hero">
          <div>Hero Content</div>
        </FocusReveal>
      );
    });

    const revealEl = container.querySelector('[data-testid="focus-reveal"]');
    expect(revealEl.getAttribute('data-focus-state')).toBe('animating');

    // Advance beyond duration
    await act(async () => {
      jest.advanceTimersByTime(350);
    });

    expect(revealEl.getAttribute('data-focus-state')).toBe('settled');
    // Verifies full GPU cleanup
    expect(revealEl.style.filter).toBe('none');
    expect(revealEl.style.transform).toBe('none');
    expect(revealEl.style.willChange).toBe('auto');
  });

  test('does not re-trigger animation on silent revalidation when triggerKey is unchanged', async () => {
    await act(async () => {
      root.render(
        <FocusReveal ready={true} triggerKey="post-1">
          <div>Content 1</div>
        </FocusReveal>
      );
    });

    await act(async () => {
      jest.advanceTimersByTime(350);
    });

    const revealEl = container.querySelector('[data-testid="focus-reveal"]');
    expect(revealEl.getAttribute('data-focus-state')).toBe('settled');

    // Rerender with same triggerKey (silent background cache revalidation)
    await act(async () => {
      root.render(
        <FocusReveal ready={true} triggerKey="post-1">
          <div>Content 1 - background updated</div>
        </FocusReveal>
      );
    });

    // Remains settled, zero jarring blur flash!
    expect(revealEl.getAttribute('data-focus-state')).toBe('settled');
  });

  test('re-triggers focus animation when triggerKey materially changes', async () => {
    await act(async () => {
      root.render(
        <FocusReveal ready={true} triggerKey="result-1">
          <div>Result 1</div>
        </FocusReveal>
      );
    });

    await act(async () => {
      jest.advanceTimersByTime(350);
    });

    const revealEl = container.querySelector('[data-testid="focus-reveal"]');
    expect(revealEl.getAttribute('data-focus-state')).toBe('settled');

    // Material change
    await act(async () => {
      root.render(
        <FocusReveal ready={true} triggerKey="result-2">
          <div>Result 2</div>
        </FocusReveal>
      );
    });

    expect(revealEl.getAttribute('data-focus-state')).toBe('animating');
  });
});
