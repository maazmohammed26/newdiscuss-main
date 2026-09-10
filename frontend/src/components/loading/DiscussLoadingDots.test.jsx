import React, { act } from 'react';
import { createRoot } from 'react-dom/client';
import DiscussLoadingDots from './DiscussLoadingDots';

describe('DiscussLoadingDots', () => {
  let container;
  let root;

  beforeEach(() => {
    globalThis.IS_REACT_ACT_ENVIRONMENT = true;
    container = document.createElement('div');
    document.body.appendChild(container);
    root = createRoot(container);
  });

  afterEach(() => {
    act(() => {
      root.unmount();
    });
    container.remove();
    container = null;
  });

  test('renders 3 dots with correct aria-label', () => {
    act(() => {
      root.render(<DiscussLoadingDots size="md" title="Custom loading..." />);
    });

    const dotsContainer = container.querySelector('[role="status"]');
    expect(dotsContainer).not.toBeNull();
    expect(dotsContainer.getAttribute('aria-label')).toBe('Custom loading...');

    const dots = container.querySelectorAll('.discuss-loading-dot');
    expect(dots.length).toBe(3);
  });

  test('applies small size class and dimensions', () => {
    act(() => {
      root.render(<DiscussLoadingDots size="sm" />);
    });

    const dotsContainer = container.querySelector('.discuss-loading-dots-sm');
    expect(dotsContainer).not.toBeNull();
  });

  test('applies inline size variant', () => {
    act(() => {
      root.render(<DiscussLoadingDots size="inline" />);
    });

    const dotsContainer = container.querySelector('.discuss-loading-dots-inline');
    expect(dotsContainer).not.toBeNull();
  });
});
