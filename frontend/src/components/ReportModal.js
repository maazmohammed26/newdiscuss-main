import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Loader2, AlertTriangle, Flag } from 'lucide-react';
import { toast } from 'sonner';
import { submitReport } from '@/lib/reportService';

export default function ReportModal({
  open,
  onClose,
  targetType, // 'discussion' | 'project' | 'pulse' | 'user'
  targetId,
  targetTitleOrName, // title/caption/username
  targetOwnerId,
  currentUser,
  onReportSuccess
}) {
  const [comment, setComment] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async () => {
    if (!currentUser) {
      toast.error('You must be logged in to report.');
      return;
    }

    if (comment.length > 100) {
      toast.error('Comments are limited to 100 characters.');
      return;
    }

    setSubmitting(true);
    try {
      await submitReport({
        reporterId: currentUser.id || currentUser.uid,
        reporterUsername: currentUser.username || 'anonymous',
        reporterEmail: currentUser.email,
        targetType,
        targetId,
        targetOwnerId,
        comment: comment.trim()
      });

      toast.success(`Successfully reported the ${targetType === 'user' ? 'user' : 'post'}.`);
      setComment('');
      if (onReportSuccess) onReportSuccess();
      onClose();
    } catch (err) {
      toast.error('Failed to submit report. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  const getTargetTypeLabel = () => {
    switch (targetType) {
      case 'discussion': return 'Discussion Post';
      case 'project': return 'Project Post';
      case 'pulse': return 'Pulse Video';
      case 'user': return 'User Profile';
      default: return 'Content';
    }
  };

  return (
    <Dialog open={open} onOpenChange={(v) => !v && !submitting && onClose()}>
      <DialogContent className="max-w-md w-[95vw] rounded-2xl bg-white dark:bg-[#1E293B] discuss:bg-[#1a1a1a] border border-neutral-200 dark:border-[#334155] discuss:border-[#333333] p-6 shadow-2xl overflow-hidden">
        <div className="absolute top-0 left-0 right-0 h-[3px] bg-gradient-to-r from-red-600 to-indigo-600" />
        
        <DialogHeader className="space-y-2">
          <DialogTitle className="text-lg font-bold text-neutral-900 dark:text-neutral-50 discuss:text-white flex items-center gap-2">
            <AlertTriangle className="w-5 h-5 text-red-500 shrink-0" />
            <span>Confirm Community Report</span>
          </DialogTitle>
          <DialogDescription className="text-[13px] text-neutral-500 dark:text-neutral-400 discuss:text-neutral-400 leading-relaxed font-medium">
            You are about to report this content for review. Spammed or false reports are strictly prohibited.
          </DialogDescription>
        </DialogHeader>

        <div className="my-4 space-y-4 no-copy">
          <div className="p-3.5 bg-neutral-50 dark:bg-neutral-800/40 discuss:bg-[#262626] rounded-xl border border-neutral-100 dark:border-neutral-800 discuss:border-[#333333]">
            <span className="text-[11px] font-extrabold uppercase tracking-wider text-neutral-400 dark:text-neutral-500 block mb-1">
              Report Target Details
            </span>
            <div className="text-[13px] text-neutral-700 dark:text-neutral-200 discuss:text-[#E5E7EB] font-bold leading-snug">
              <span className="text-[#2563EB] discuss:text-[#EF4444] font-medium mr-1.5">[{getTargetTypeLabel()}]</span>
              {targetTitleOrName || 'Unnamed Content'}
            </div>
            <div className="text-[10px] text-neutral-400 dark:text-neutral-500 mt-1 font-mono">
              ID: {targetId}
            </div>
          </div>

          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <label className="text-[11px] font-bold uppercase tracking-wider text-neutral-500 dark:text-neutral-400">
                Comment (Optional)
              </label>
              <span className={`text-[11px] font-bold ${comment.length > 100 ? 'text-red-500' : 'text-neutral-400'}`}>
                {comment.length}/100
              </span>
            </div>
            <Textarea
              value={comment}
              onChange={(e) => setComment(e.target.value.slice(0, 100))}
              placeholder="Why are you reporting this? Add additional context (up to 100 characters)..."
              disabled={submitting}
              className="bg-neutral-50 dark:bg-[#0F172A] border-neutral-200 dark:border-[#334155] focus:border-[#3B82F6] dark:text-[#F1F5F9] discuss:text-[#E5E7EB] text-[13px] rounded-xl placeholder:text-neutral-400 resize-none h-24"
            />
          </div>
        </div>

        <DialogFooter className="flex flex-col-reverse sm:flex-row gap-2 mt-2">
          <Button
            type="button"
            variant="outline"
            disabled={submitting}
            onClick={onClose}
            className="rounded-xl border-neutral-200 dark:border-neutral-700 dark:text-[#F1F5F9] discuss:bg-[#262626] discuss:border-[#333333] hover:bg-neutral-100 font-bold text-xs"
          >
            Cancel
          </Button>
          <Button
            type="button"
            onClick={handleSubmit}
            disabled={submitting}
            className="bg-red-500 hover:bg-red-600 text-white rounded-xl font-bold text-xs flex items-center gap-1.5 py-2.5 shadow-md active:scale-95 transition-all"
          >
            {submitting ? (
              <>
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
                <span>Sending Alert...</span>
              </>
            ) : (
              <>
                <Flag className="w-3.5 h-3.5" />
                <span>Send Community Report</span>
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
