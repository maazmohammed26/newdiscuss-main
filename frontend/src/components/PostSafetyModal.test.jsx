import React, { act } from 'react';
import { createRoot } from 'react-dom/client';
import PostSafetyModal, { getPostCanonicalPayload } from './PostSafetyModal';
import * as safetyService from '@/lib/safetyService';
import { generateContentHash } from '@/lib/scoringLogic';

jest.mock('@/lib/safetyService');

describe('PostSafetyModal Hardening & Zero-Flicker Verification', () => {
  let container;
  let root;

  beforeEach(() => {
    jest.useFakeTimers();
    globalThis.IS_REACT_ACT_ENVIRONMENT = true;
    container = document.createElement('div');
    document.body.appendChild(container);
    root = createRoot(container);
    jest.clearAllMocks();
  });

  afterEach(async () => {
    await act(async () => {
      root.unmount();
      jest.runOnlyPendingTimers();
    });
    jest.useRealTimers();
    container.remove();
    // Clean up any dialog portals
    document.querySelectorAll('[data-radix-portal]').forEach((el) => el.remove());
  });

  const mockPostA = {
    id: 'post_101',
    title: 'Clean Architecture in React',
    content: 'State machines eliminate race conditions and flicker.',
    code: 'const x = 1;',
  };

  test('canonical payload generation matches server-side format', () => {
    const payload = getPostCanonicalPayload(mockPostA);
    expect(payload.text).toBe('Clean Architecture in React State machines eliminate race conditions and flicker.');
    expect(payload.code).toBe('const x = 1;');
    expect(payload.canonicalContent).toBe(
      'Clean Architecture in React State machines eliminate race conditions and flicker. const x = 1;'
    );
  });

  test('one analysis request produces one atomic resolved SAFE state', async () => {
    let resolveAnalysis;
    const pendingPromise = new Promise((res) => {
      resolveAnalysis = res;
    });
    safetyService.evaluatePostSafety.mockReturnValueOnce(pendingPromise);

    await act(async () => {
      root.render(<PostSafetyModal open={true} onClose={() => {}} post={mockPostA} />);
    });

    // Radix Dialog renders into document.body portal
    // While in-flight: loading slot is visible, SAFE is NEVER shown
    expect(document.body.querySelector('[data-testid="content-review-loading"]')).not.toBeNull();
    expect(document.body.querySelector('[data-testid="content-review-safe"]')).toBeNull();

    // Resolve promise
    const contentHash = generateContentHash(getPostCanonicalPayload(mockPostA).canonicalContent);
    await act(async () => {
      resolveAnalysis({
        status: 'safe',
        summary: 'Content appears consistent with Discuss community guidelines.',
        categories: [],
        contentHash,
        analysisVersion: '2.0',
      });
      jest.runAllTicks();
    });

    // Advance timers for FocusReveal duration
    await act(async () => {
      jest.advanceTimersByTime(300);
    });

    // Resolved atomically
    expect(safetyService.evaluatePostSafety).toHaveBeenCalledTimes(1);
    expect(document.body.querySelector('[data-testid="content-review-loading"]')).toBeNull();
    expect(document.body.querySelector('[data-testid="content-review-safe"]')).not.toBeNull();
    expect(document.body.textContent).toContain('SAFE');
    expect(document.body.textContent).toContain('No significant concerns detected.');
  });

  test('REGRESSION: parent rerender with new post object reference (same content, new aiSafetyInfo) NEVER causes flicker or re-analysis', async () => {
    const contentHash = generateContentHash(getPostCanonicalPayload(mockPostA).canonicalContent);
    safetyService.evaluatePostSafety.mockResolvedValueOnce({
      status: 'safe',
      summary: 'Content appears consistent with Discuss community guidelines.',
      categories: [],
      contentHash,
      analysisVersion: '2.0',
    });

    // 1. Initial mount and resolution
    await act(async () => {
      root.render(<PostSafetyModal open={true} onClose={() => {}} post={mockPostA} />);
    });

    await act(async () => {
      jest.runAllTicks();
      jest.advanceTimersByTime(300);
    });

    expect(safetyService.evaluatePostSafety).toHaveBeenCalledTimes(1);
    expect(document.body.querySelector('[data-testid="content-review-safe"]')).not.toBeNull();

    const focusRevealElBefore = document.body.querySelector('[data-testid="focus-reveal"]');
    expect(focusRevealElBefore.getAttribute('data-focus-state')).toBe('settled');

    // 2. Simulate Firebase Realtime update: new post object instance with aiSafetyInfo, new vote count, etc.
    const mockPostB_FirebaseUpdated = {
      ...mockPostA,
      aiSafetyInfo: { status: 'safe', contentHash },
      upvote_count: 5,
      _firebaseRev: 2,
    };

    await act(async () => {
      root.render(<PostSafetyModal open={true} onClose={() => {}} post={mockPostB_FirebaseUpdated} />);
    });

    // 3. VERIFY: Zero additional calls, zero loading flicker, zero restart of focus animation!
    expect(safetyService.evaluatePostSafety).toHaveBeenCalledTimes(1); // STILL 1!
    expect(document.body.querySelector('[data-testid="content-review-loading"]')).toBeNull(); // NEVER toggled to loading!
    expect(document.body.querySelector('[data-testid="content-review-safe"]')).not.toBeNull(); // SAFE remained visible!

    const focusRevealElAfter = document.body.querySelector('[data-testid="focus-reveal"]');
    expect(focusRevealElAfter.getAttribute('data-focus-state')).toBe('settled'); // Still settled, no re-animation!
  });

  test('stale response protection: content change from A to B discards old response A', async () => {
    let resolveA;
    const promiseA = new Promise((res) => {
      resolveA = res;
    });

    const mockPostB = {
      id: 'post_101',
      title: 'Edited Title',
      content: 'Modified content that changes the canonical hash.',
      code: '',
    };
    const contentHashB = generateContentHash(getPostCanonicalPayload(mockPostB).canonicalContent);

    safetyService.evaluatePostSafety
      .mockReturnValueOnce(promiseA) // First request for Post A
      .mockResolvedValueOnce({
        status: 'review',
        summary: 'Review recommended for modified content.',
        categories: ['harassment'],
        contentHash: contentHashB,
        analysisVersion: '2.0',
      }); // Second request for Post B

    // 1. Mount with post A
    await act(async () => {
      root.render(<PostSafetyModal open={true} onClose={() => {}} post={mockPostA} />);
    });

    expect(safetyService.evaluatePostSafety).toHaveBeenCalledTimes(1);

    // 2. Post content changes to Post B while request A is still in-flight
    await act(async () => {
      root.render(<PostSafetyModal open={true} onClose={() => {}} post={mockPostB} />);
    });

    expect(safetyService.evaluatePostSafety).toHaveBeenCalledTimes(2);

    // 3. Resolve old response A
    await act(async () => {
      resolveA({
        status: 'safe',
        summary: 'Old Safe Result',
        contentHash: 'stale_hash_a',
      });
      jest.runAllTicks();
    });

    // Old response A MUST NOT be rendered
    expect(document.body.textContent).not.toContain('Old Safe Result');

    // 4. Resolve response B
    await act(async () => {
      jest.advanceTimersByTime(300);
    });

    // Post B result renders
    expect(document.body.querySelector('[data-testid="content-review-review-recommended"]')).not.toBeNull();
    expect(document.body.textContent).toContain('REVIEW RECOMMENDED');
  });

  test('error state never displays fake SAFE and allows retry', async () => {
    safetyService.evaluatePostSafety.mockRejectedValueOnce(new Error('Network error 503'));

    await act(async () => {
      root.render(<PostSafetyModal open={true} onClose={() => {}} post={mockPostA} />);
    });

    await act(async () => {
      jest.runAllTicks();
    });

    // Error UI visible, SAFE NEVER shown
    expect(document.body.querySelector('[data-testid="content-review-safe"]')).toBeNull();
    expect(document.body.querySelector('[data-testid="content-review-error"]')).not.toBeNull();
    expect(document.body.textContent).toContain('Safety analysis temporarily unavailable');

    // Retry succeeds with fresh in-flight promise
    let resolveRetry;
    const retryPromise = new Promise((res) => {
      resolveRetry = res;
    });
    safetyService.evaluatePostSafety.mockReturnValueOnce(retryPromise);

    const retryBtn = document.body.querySelector('[data-testid="content-review-retry-button"]');
    expect(retryBtn).not.toBeNull();

    await act(async () => {
      retryBtn.click();
    });

    // Loading appears during retry
    expect(document.body.querySelector('[data-testid="content-review-loading"]')).not.toBeNull();

    const contentHash = generateContentHash(getPostCanonicalPayload(mockPostA).canonicalContent);
    await act(async () => {
      resolveRetry({
        status: 'safe',
        summary: 'Content appears consistent with Discuss community guidelines.',
        categories: [],
        contentHash,
        analysisVersion: '2.0',
      });
      jest.runAllTicks();
      jest.advanceTimersByTime(300);
    });

    // Now resolves into SAFE with fresh one-shot reveal
    expect(safetyService.evaluatePostSafety).toHaveBeenCalledTimes(2);
    expect(document.body.querySelector('[data-testid="content-review-safe"]')).not.toBeNull();
  });

  test('mismatched contentHash from server is discarded silently', async () => {
    safetyService.evaluatePostSafety.mockResolvedValueOnce({
      status: 'safe',
      summary: 'Mismatched result',
      contentHash: 'completely_different_hash',
    });

    await act(async () => {
      root.render(<PostSafetyModal open={true} onClose={() => {}} post={mockPostA} />);
    });

    await act(async () => {
      jest.runAllTicks();
    });

    // Discarded, never rendered
    expect(document.body.querySelector('[data-testid="content-review-safe"]')).toBeNull();
  });
});
