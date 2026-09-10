import { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { ShieldCheck, AlertTriangle, AlertOctagon, AlertCircle, RefreshCw } from 'lucide-react';
import { evaluatePostSafety } from '@/lib/safetyService';
import { generateContentHash } from '@/lib/scoringLogic';
import { DelayedNetworkLoader, FocusReveal } from './loading';

const CATEGORY_LABELS = {
  harassment: 'Harassment / Personal Attack',
  hate_speech: 'Hate or Targeted Abuse',
  threats: 'Threatening Language',
  scams: 'Deception / Scam Pattern',
  sexual: 'Inappropriate Content',
  self_harm: 'Self-harm Concern',
  personal_information: 'Sensitive Information',
  spam: 'Spam Pattern',
};

/**
 * Normalizes title, content, and code identically to server-side canonical hashing in api/ai.js
 */
export function getPostCanonicalPayload(titleOrPost = '', content = '', code = '') {
  if (typeof titleOrPost === 'object' && titleOrPost !== null) {
    const text = `${titleOrPost.title || ''} ${titleOrPost.content || ''}`.trim();
    const cleanCode = String(titleOrPost.code || '');
    return {
      text,
      code: cleanCode,
      canonicalContent: `${text} ${cleanCode}`,
    };
  }
  const text = `${titleOrPost || ''} ${content || ''}`.trim();
  const cleanCode = String(code || '');
  return {
    text,
    code: cleanCode,
    canonicalContent: `${text} ${cleanCode}`,
  };
}

/**
 * PostSafetyModal
 * 
 * Production-hardened Discuss Content Review modal:
 * 1. Strict State Machine: phases are 'idle' | 'requesting' | 'resolved' | 'error'.
 * 2. Zero-Flicker Architecture: immune to parent re-renders and Firebase Realtime Database
 *    post updates triggered by backend score persistence.
 * 3. Exact Canonical Content Hashing: matches server-side content normalization in api/ai.js.
 * 4. Atomic Result Commit: builds normalized UI model first, then performs exactly one state commit.
 * 5. Triple Mismatch Protection: verifies (a) active request ID, (b) active post ID, and (c) canonical content hash.
 * 6. Never Passes Through Fake SAFE: SAFE is never rendered during idle/loading/error states.
 * 7. One Reveal Per Analysis Run: revealKey tracks `${requestId}_${contentHash}` so ordinary rerenders
 *    do not re-animate, while deliberate retries get exactly one fresh reveal.
 * 8. Stable Modal Shell: dialog surface, header, and footer remain permanently mounted without subtree remounting.
 */
export default function PostSafetyModal({ open, onClose, post }) {
  const [analysisState, setAnalysisState] = useState({
    phase: 'idle', // 'idle' | 'requesting' | 'resolved' | 'error'
    result: null,
    error: null,
  });

  const activeRequestIdRef = useRef(null);
  const activePostIdRef = useRef(null);
  const activeContentHashRef = useRef(null);
  const inFlightRef = useRef(false);
  const postRef = useRef(post);

  // Keep postRef updated without triggering re-renders or effect re-runs
  postRef.current = post;

  const postId = post?.id || null;
  const postTitle = post?.title || '';
  const postContent = post?.content || '';
  const postCodeVal = post?.code || '';

  const { text: postText, code: postCode, canonicalContent } = useMemo(
    () => getPostCanonicalPayload(postTitle, postContent, postCodeVal),
    [postTitle, postContent, postCodeVal]
  );
  const canonicalHash = useMemo(
    () => generateContentHash(canonicalContent),
    [canonicalContent]
  );

  const executeAnalysis = useCallback(async (isRetry = false) => {
    if (!postId && !postText && !postCode) return;

    // Deduplication: prevent concurrent duplicate requests for the same canonical content
    if (inFlightRef.current && !isRetry) {
      return;
    }

    const currentRequestId = `review_${postId || 'draft'}_${canonicalHash}_${Date.now()}`;
    activeRequestIdRef.current = currentRequestId;
    activePostIdRef.current = postId;
    activeContentHashRef.current = canonicalHash;
    inFlightRef.current = true;

    // Transition to requesting: loading skeleton active, result cleared to prevent intermediate leaks
    setAnalysisState({
      phase: 'requesting',
      result: null,
      error: null,
    });

    try {
      const response = await evaluatePostSafety(postText, postCode, {
        existingSafetyInfo: isRetry ? null : postRef.current?.aiSafetyInfo,
        postId,
        forceRefresh: isRetry,
      });

      // TRIPLE VALIDATION: Discard stale or mismatched response silently
      // 1. Request ID must match active in-flight request
      if (activeRequestIdRef.current !== currentRequestId) {
        return;
      }
      // 2. Post ID must still match active target post
      if (activePostIdRef.current !== postId) {
        return;
      }
      // 3. Canonical content hash must match the active content being reviewed
      if (response?.contentHash && response.contentHash !== canonicalHash) {
        return;
      }

      // Handle service unavailability or error (NEVER fake SAFE)
      if (!response || response.unavailable) {
        setAnalysisState({
          phase: 'error',
          result: null,
          error: response?.message || 'Safety analysis temporarily unavailable',
        });
        return;
      }

      // Atomic Result Normalization (Hide internal backend provider / model details)
      const finalStatus = ['safe', 'review', 'high_risk'].includes(response.status) ? response.status : 'safe';
      const normalizedResult = {
        status: finalStatus,
        summary: response.summary || (
          finalStatus === 'safe'
            ? 'Content appears consistent with Discuss community guidelines.'
            : finalStatus === 'review'
            ? 'Some language may need attention before or after publishing.'
            : 'This content contains language that may violate Discuss community guidelines.'
        ),
        categories: Array.isArray(response.categories) ? response.categories.slice(0, 5) : [],
        analysisVersion: response.analysisVersion || '2.0',
        contentHash: canonicalHash,
        requestId: currentRequestId,
      };

      // Single atomic commit
      setAnalysisState({
        phase: 'resolved',
        result: normalizedResult,
        error: null,
      });
    } catch (err) {
      if (activeRequestIdRef.current === currentRequestId) {
        setAnalysisState({
          phase: 'error',
          result: null,
          error: err.message || 'Analysis temporarily unavailable',
        });
      }
    } finally {
      if (activeRequestIdRef.current === currentRequestId) {
        inFlightRef.current = false;
      }
    }
  }, [postId, postText, postCode, canonicalHash]);

  // Effect runs ONLY when open state, target post ID, or canonical content changes
  // Mutable post object updates (such as realtime Firebase updates to aiSafetyInfo) DO NOT retrigger this effect!
  useEffect(() => {
    if (!open) {
      activeRequestIdRef.current = null;
      activePostIdRef.current = null;
      activeContentHashRef.current = null;
      inFlightRef.current = false;
      setAnalysisState({ phase: 'idle', result: null, error: null });
      return;
    }

    executeAnalysis(false);

    return () => {
      activeRequestIdRef.current = null;
      inFlightRef.current = false;
    };
  }, [open, postId, canonicalHash, executeAnalysis]);

  const { phase, result, error } = analysisState;
  const status = result?.status || null;

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent
        className="bg-white dark:bg-[#121212] border border-[#DBDBDB] dark:border-[#262626] rounded-2xl max-w-md p-6 select-none shadow-xl"
        onClick={(e) => e.stopPropagation()}
        data-testid="post-safety-modal"
      >
        <DialogHeader className="border-b border-neutral-100 dark:border-neutral-800 pb-3">
          <DialogTitle className="flex items-center gap-2 text-neutral-900 dark:text-white text-base font-bold">
            <ShieldCheck className="w-5 h-5 text-neutral-700 dark:text-neutral-300" />
            <span>Discuss Content Review</span>
          </DialogTitle>
        </DialogHeader>

        {/* Stable Result Slot with layout-preserving min-height */}
        <div className="pt-3 min-h-[140px] flex flex-col justify-center text-left" data-testid="content-review-slot">
          {phase === 'requesting' || phase === 'idle' ? (
            <div className="py-4 space-y-3" data-testid="content-review-loading">
              <DelayedNetworkLoader active={true} delay={450} size="sm" mode="center" />
              <div className="space-y-2 animate-pulse">
                <div className="h-4 w-3/4 rounded bg-neutral-200 dark:bg-neutral-800" />
                <div className="h-3 w-full rounded bg-neutral-200/70 dark:bg-neutral-800/70" />
                <div className="h-3 w-5/6 rounded bg-neutral-200/60 dark:bg-neutral-800/60" />
              </div>
            </div>
          ) : phase === 'error' ? (
            <div className="space-y-2 text-xs py-2" data-testid="content-review-error">
              <div className="flex items-center gap-1.5 font-bold text-neutral-700 dark:text-neutral-300">
                <AlertCircle className="w-4 h-4 text-neutral-400" />
                <span>Safety analysis temporarily unavailable</span>
              </div>
              <p className="text-neutral-500 leading-relaxed">
                {error || 'Could not retrieve a content review at this moment. You can retry.'}
              </p>
              <button
                type="button"
                onClick={() => executeAnalysis(true)}
                className="inline-flex items-center gap-1.5 px-3 py-1 mt-1 rounded-lg text-xs font-semibold bg-neutral-100 dark:bg-neutral-800 text-neutral-800 dark:text-neutral-200 hover:bg-neutral-200 dark:hover:bg-neutral-700 transition-colors"
                data-testid="content-review-retry-button"
              >
                <RefreshCw className="w-3.5 h-3.5" />
                <span>Retry</span>
              </button>
            </div>
          ) : phase === 'resolved' && result ? (
            <FocusReveal
              ready={true}
              revealKey={`${result.requestId}_${result.contentHash}`}
              variant="standard"
              className="w-full"
            >
              {status === 'high_risk' ? (
                <div className="space-y-3 text-xs" data-testid="content-review-high-risk">
                  <div className="flex items-center gap-2">
                    <span className="font-extrabold text-xs tracking-wider uppercase text-rose-600 dark:text-rose-400 flex items-center gap-1.5">
                      <AlertOctagon className="w-4 h-4" />
                      HIGH RISK
                    </span>
                  </div>
                  <p className="text-neutral-800 dark:text-neutral-200 leading-relaxed font-medium">
                    {result.summary}
                  </p>
                  {result.categories?.length > 0 && (
                    <div className="pt-2 border-t border-neutral-100 dark:border-neutral-800 space-y-1.5">
                      <div className="font-bold text-neutral-500 text-[11px] uppercase tracking-wider">Concerns Detected</div>
                      <div className="flex flex-wrap gap-1.5">
                        {result.categories.map((cat) => (
                          <span
                            key={cat}
                            className="px-2 py-0.5 rounded text-[11px] font-semibold border border-rose-500/30 text-rose-600 dark:text-rose-400"
                          >
                            {CATEGORY_LABELS[cat] || cat}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              ) : status === 'review' ? (
                <div className="space-y-3 text-xs" data-testid="content-review-review-recommended">
                  <div className="flex items-center gap-2">
                    <span className="font-extrabold text-xs tracking-wider uppercase text-amber-600 dark:text-amber-400 flex items-center gap-1.5">
                      <AlertTriangle className="w-4 h-4" />
                      REVIEW RECOMMENDED
                    </span>
                  </div>
                  <p className="text-neutral-800 dark:text-neutral-200 leading-relaxed font-medium">
                    {result.summary}
                  </p>
                  {result.categories?.length > 0 && (
                    <div className="pt-2 border-t border-neutral-100 dark:border-neutral-800 space-y-1.5">
                      <div className="font-bold text-neutral-500 text-[11px] uppercase tracking-wider">Possible Concerns</div>
                      <div className="flex flex-wrap gap-1.5">
                        {result.categories.map((cat) => (
                          <span
                            key={cat}
                            className="px-2 py-0.5 rounded text-[11px] font-semibold border border-amber-500/30 text-amber-600 dark:text-amber-400"
                          >
                            {CATEGORY_LABELS[cat] || cat}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              ) : status === 'safe' ? (
                <div className="space-y-3 text-xs" data-testid="content-review-safe">
                  <div className="flex items-center gap-2">
                    <span className="font-extrabold text-xs tracking-wider uppercase text-emerald-600 dark:text-emerald-400 flex items-center gap-1.5">
                      <ShieldCheck className="w-4 h-4" />
                      SAFE
                    </span>
                  </div>
                  <p className="text-neutral-800 dark:text-neutral-200 leading-relaxed">
                    {result.summary}
                  </p>
                  <div className="pt-2 border-t border-neutral-100 dark:border-neutral-800 text-[11px] text-neutral-500">
                    <span className="font-bold text-neutral-600 dark:text-neutral-400">Analysis: </span>
                    No significant concerns detected.
                  </div>
                </div>
              ) : null}
            </FocusReveal>
          ) : null}
        </div>

        <div className="pt-3 border-t border-neutral-100 dark:border-neutral-800 flex justify-end">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-1.5 rounded-lg border border-neutral-300 dark:border-neutral-700 hover:bg-neutral-100 dark:hover:bg-neutral-900 text-neutral-800 dark:text-neutral-200 text-xs font-semibold transition-colors"
          >
            Close
          </button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
