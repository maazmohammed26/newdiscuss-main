import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { AlertTriangle, ExternalLink, Shield } from 'lucide-react';

export default function ExternalLinkModal({ open, onClose, url, isHttp = false }) {
  const handleProceed = () => {
    window.open(url, '_blank', 'noopener,noreferrer');
    onClose();
  };

  return (
    <Dialog open={open} onOpenChange={(v) => { if (!v) onClose(); }}>
      <DialogContent className="sm:max-w-md bg-white dark:bg-[#1E293B] dark:border-[#334155]">
        <DialogHeader>
          <DialogTitle className="font-heading text-lg font-bold text-[#0F172A] dark:text-[#F1F5F9] flex items-center gap-2">
            <AlertTriangle className={`w-5 h-5 ${isHttp ? 'text-[#EF4444]' : 'text-[#BC4800]'}`} />
            External Link Warning
          </DialogTitle>
        </DialogHeader>

        <div className="mt-2">
          {isHttp && (
            <div className="bg-[#EF4444]/10 dark:bg-[#EF4444]/15 border border-[#EF4444]/20 rounded-xl p-3 mb-4">
              <div className="flex items-start gap-2">
                <Shield className="w-4 h-4 text-[#EF4444] shrink-0 mt-0.5" />
                <div>
                  <p className="text-[#EF4444] text-[13px] font-semibold">Security Warning!</p>
                  <p className="text-[#EF4444]/80 dark:text-[#EF4444]/70 text-[12px] mt-0.5">
                    This link uses HTTP (not HTTPS) and is NOT secure. Your data may be visible to others.
                  </p>
                </div>
              </div>
            </div>
          )}

          <div className="bg-[#F5F5F7] dark:bg-[#0F172A] rounded-xl p-4 border border-[#E2E8F0] dark:border-[#334155]">
            <p className="text-[#6275AF] dark:text-[#94A3B8] text-[13px] mb-3">You are about to open an external link:</p>
            <div className="bg-white dark:bg-[#1E293B] rounded-lg p-3 border border-[#E2E8F0] dark:border-[#334155] break-all">
              <p className="text-[#0F172A] dark:text-[#F1F5F9] text-[13px] font-mono flex items-start gap-2">
                <ExternalLink className="w-4 h-4 shrink-0 mt-0.5 text-[#2563EB]" />
                {url}
              </p>
            </div>
          </div>

          <div className="bg-[#BC4800]/10 dark:bg-[#BC4800]/15 rounded-xl p-3 mt-4 border border-[#BC4800]/20">
            <p className="text-[#BC4800] dark:text-[#E8994A] text-[12px]">
              <strong>Disclaimer:</strong> Discuss is not responsible for external content. 
              Please proceed with caution and verify the link before entering any personal information.
            </p>
          </div>
        </div>

        <div className="flex gap-3 mt-4">
          <Button
            onClick={onClose}
            variant="outline"
            data-testid="external-link-cancel"
            className="flex-1 border-[#E2E8F0] dark:border-[#334155] text-[#6275AF] dark:text-[#94A3B8] hover:bg-[#F5F5F7] dark:hover:bg-[#334155] rounded-full"
          >
            Cancel
          </Button>
          <Button
            onClick={handleProceed}
            data-testid="external-link-proceed"
            className={`flex-1 ${isHttp ? 'bg-[#EF4444] hover:bg-[#DC2626]' : 'bg-[#2563EB] hover:bg-[#1D4ED8]'} text-white rounded-full`}
          >
            {isHttp ? 'Proceed Anyway' : 'Open Link'}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
