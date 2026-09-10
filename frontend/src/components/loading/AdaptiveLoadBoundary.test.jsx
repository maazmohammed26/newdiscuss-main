import React, { act } from 'react';
import { createRoot } from 'react-dom/client';
import AdaptiveLoadBoundary from './AdaptiveLoadBoundary';

describe('AdaptiveLoadBoundary', () => {
  let container;
  let root;

  beforeEach(() => {
    globalThis.IS_REACT_ACT_ENVIRONMENT = true;
    jest.useFakeTimers();
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
    jest.useRealTimers();
  });

  test('renders skeleton when loading with no cached data', () => {
    act(() => {
      root.render(
        <AdaptiveLoadBoundary
          isLoading={true}
          hasData={false}
          skeleton={<div data-testid="test-skeleton">Skeleton</div>}
        >
          <div data-testid="test-content">Content</div>
        </AdaptiveLoadBoundary>
      );
    });

    expect(container.querySelector('[data-testid="test-skeleton"]')).not.toBeNull();
    expect(container.querySelector('[data-testid="test-content"]')).toBeNull();
  });

  test('keeps skeleton and displays delayed loader without stacking on top of shimmer after threshold', () => {
    act(() => {
      root.render(
        <AdaptiveLoadBoundary
          isLoading={true}
          hasData={false}
          loaderDelay={500}
          skeleton={<div data-testid="test-skeleton">Skeleton Shimmer</div>}
        >
          <div data-testid="test-content">Content</div>
        </AdaptiveLoadBoundary>
      );
    });

    // Before delay threshold: no loader dots
    expect(container.querySelector('.discuss-loading-dots')).toBeNull();
    expect(container.querySelector('[data-testid="test-skeleton"]')).not.toBeNull();

    // Fast-forward past loaderDelay (500ms)
    act(() => {
      jest.advanceTimersByTime(550);
    });

    // Skeleton remains stable + loader is visible in calm reserved position
    expect(container.querySelector('[data-testid="test-skeleton"]')).not.toBeNull();
    expect(container.querySelector('.discuss-loading-dots')).not.toBeNull();
  });

  test('renders content immediately when valid cached data exists without showing skeleton', () => {
    act(() => {
      root.render(
        <AdaptiveLoadBoundary
          isLoading={true} // background revalidating
          hasData={true}   // valid cached data present
          skeleton={<div data-testid="test-skeleton">Skeleton</div>}
        >
          <div data-testid="test-content">Cached Content</div>
        </AdaptiveLoadBoundary>
      );
    });

    // Valid cached content is rendered immediately, skeleton is NOT shown
    expect(container.querySelector('[data-testid="test-content"]')).not.toBeNull();
    expect(container.querySelector('[data-testid="test-skeleton"]')).toBeNull();
  });

  test('renders error fallback when request fails with no cached data', () => {
    act(() => {
      root.render(
        <AdaptiveLoadBoundary
          isLoading={false}
          hasData={false}
          error={new Error('Network error')}
          errorFallback={<div data-testid="test-error">Failed to load</div>}
        >
          <div data-testid="test-content">Content</div>
        </AdaptiveLoadBoundary>
      );
    });

    expect(container.querySelector('[data-testid="test-error"]')).not.toBeNull();
    expect(container.querySelector('[data-testid="test-content"]')).toBeNull();
  });

  test('renders empty fallback when loaded with empty data', () => {
    act(() => {
      root.render(
        <AdaptiveLoadBoundary
          isLoading={false}
          hasData={true}
          isEmpty={true}
          emptyFallback={<div data-testid="test-empty">No items found</div>}
        >
          <div data-testid="test-content">Content</div>
        </AdaptiveLoadBoundary>
      );
    });

    expect(container.querySelector('[data-testid="test-empty"]')).not.toBeNull();
  });
});
