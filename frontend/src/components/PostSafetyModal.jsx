import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { ShieldCheck, AlertTriangle, AlertOctagon, AlertCircle, Loader2 } from 'lucide-react';
import { evaluatePostSafety } from '@/lib/safetyService';

export default function PostSafetyModal({ open, onClose, post }) {
  const [loading, setLoading] = useState(false);
  const [safetyInfo, setSafetyInfo] = useState(null);
  const [error, setError] = useState(false);

  useEffect(() => {
    if (!open || !post) return;

    let isMounted = true;
    const loadSafety = async () => {
      setLoading(true);
      setError(false);
      try {
        const text = `${post.title || ''} ${post.content || ''}`.trim();
        const code = post.code || '';
        const result = await evaluatePostSafety(text, code, {
          existingSafetyInfo: post.aiSafetyInfo,
          postId: post.id,
        });

        if (isMounted) {
          if (!result || result.unavailable) {
            setError(true);
          } else {
            setSafetyInfo(result);
          }
        }
      } catch (err) {
        if (isMounted) setError(true);
      } finally {
        if (isMounted) setLoading(false);
      }
    };

    loadSafety();
    return () => {
      isMounted = false;
    };
  }, [open, post]);

  const categoryLabels = {
    harassment: 'Harassment / Personal Attack',
    hate_speech: 'Hate or Targeted Abuse',
    threats: 'Threatening Language',
    scams: 'Deception / Scam Pattern',
    sexual: 'Inappropriate Content',
    self_harm: 'Self-harm Concern',
    personal_information: 'Sensitive Information',
    spam: 'Spam Pattern',
  };

  const status = safetyInfo?.status || 'safe';

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent
        className="bg-white dark:bg-[#121212] border border-[#DBDBDB] dark:border-[#262626] rounded-2xl max-w-md p-6 select-none shadow-xl"
        onClick={(e) => e.stopPropagation()}
      >
        <DialogHeader className="border-b border-neutral-100 dark:border-neutral-800 pb-3">
          <DialogTitle className="flex items-center gap-2 text-neutral-900 dark:text-white text-base font-bold">
            <ShieldCheck className="w-5 h-5 text-neutral-700 dark:text-neutral-300" />
            <span>Discuss Content Review</span>
          </DialogTitle>
        </DialogHeader>

        <div className="pt-3 space-y-4 text-left">
          {loading ? (
            <div className="py-8 flex flex-col items-center justify-center gap-3 text-neutral-500">
              <Loader2 className="w-5 h-5 animate-spin text-neutral-600 dark:text-neutral-400" />
              <span className="text-xs font-medium">Reviewing post content…</span>
            </div>
          ) : error ? (
            <div className="space-y-1.5 text-xs">
              <div className="flex items-center gap-1.5 font-bold text-neutral-700 dark:text-neutral-300">
                <AlertCircle className="w-4 h-4 text-neutral-400" />
                <span>Safety analysis temporarily unavailable</span>
              </div>
              <p className="text-neutral-500 leading-relaxed">
                Could not retrieve a content review at this moment. You can retry later.
              </p>
            </div>
          ) : status === 'high_risk' ? (
            <div className="space-y-3 text-xs">
              <div className="flex items-center gap-2">
                <span className="font-extrabold text-xs tracking-wider uppercase text-rose-600 dark:text-rose-400 flex items-center gap-1.5">
                  <AlertOctagon className="w-4 h-4" />
                  HIGH RISK
                </span>
              </div>
              <p className="text-neutral-800 dark:text-neutral-200 leading-relaxed font-medium">
                {safetyInfo.summary || 'This content contains language that may violate Discuss community guidelines.'}
              </p>
              {safetyInfo.categories?.length > 0 && (
                <div className="pt-2 border-t border-neutral-100 dark:border-neutral-800 space-y-1.5">
                  <div className="font-bold text-neutral-500 text-[11px] uppercase tracking-wider">Concerns Detected</div>
                  <div className="flex flex-wrap gap-1.5">
                    {safetyInfo.categories.map((cat) => (
                      <span
                        key={cat}
                        className="px-2 py-0.5 rounded text-[11px] font-semibold border border-rose-500/30 text-rose-600 dark:text-rose-400"
                      >
                        {categoryLabels[cat] || cat}
                      </span>
                    ))}
                  </div>
                </div>
              )}
            </div>
          ) : status === 'review' ? (
            <div className="space-y-3 text-xs">
              <div className="flex items-center gap-2">
                <span className="font-extrabold text-xs tracking-wider uppercase text-amber-600 dark:text-amber-400 flex items-center gap-1.5">
                  <AlertTriangle className="w-4 h-4" />
                  REVIEW RECOMMENDED
                </span>
              </div>
              <p className="text-neutral-800 dark:text-neutral-200 leading-relaxed font-medium">
                {safetyInfo.summary || 'Some language may need attention before or after publishing.'}
              </p>
              {safetyInfo.categories?.length > 0 && (
                <div className="pt-2 border-t border-neutral-100 dark:border-neutral-800 space-y-1.5">
                  <div className="font-bold text-neutral-500 text-[11px] uppercase tracking-wider">Possible Concerns</div>
                  <div className="flex flex-wrap gap-1.5">
                    {safetyInfo.categories.map((cat) => (
                      <span
                        key={cat}
                        className="px-2 py-0.5 rounded text-[11px] font-semibold border border-amber-500/30 text-amber-600 dark:text-amber-400"
                      >
                        {categoryLabels[cat] || cat}
                      </span>
                    ))}
                  </div>
                </div>
              )}
            </div>
          ) : (
            <div className="space-y-3 text-xs">
              <div className="flex items-center gap-2">
                <span className="font-extrabold text-xs tracking-wider uppercase text-emerald-600 dark:text-emerald-400 flex items-center gap-1.5">
                  <ShieldCheck className="w-4 h-4" />
                  SAFE
                </span>
              </div>
              <p className="text-neutral-800 dark:text-neutral-200 leading-relaxed">
                Content appears consistent with Discuss community guidelines.
              </p>
              <div className="pt-2 border-t border-neutral-100 dark:border-neutral-800 text-[11px] text-neutral-500">
                <span className="font-bold text-neutral-600 dark:text-neutral-400">Analysis: </span>
                No significant concerns detected.
              </div>
            </div>
          )}

          <div className="pt-3 border-t border-neutral-100 dark:border-neutral-800 flex justify-end">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-1.5 rounded-lg border border-neutral-300 dark:border-neutral-700 hover:bg-neutral-100 dark:hover:bg-neutral-900 text-neutral-800 dark:text-neutral-200 text-xs font-semibold transition-colors"
            >
              Close
            </button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
