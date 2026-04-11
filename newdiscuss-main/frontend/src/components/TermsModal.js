import { useState, useRef, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Shield, Database, Lock, Smartphone, CheckCircle } from 'lucide-react';

export default function TermsModal({ open, onClose, onAccept, showAcceptButton = false }) {
  const [canAccept, setCanAccept] = useState(false);
  const scrollRef = useRef(null);

  useEffect(() => {
    if (open) setCanAccept(false);
  }, [open]);

  const handleScroll = () => {
    if (scrollRef.current) {
      const { scrollTop, scrollHeight, clientHeight } = scrollRef.current;
      if (scrollTop + clientHeight >= scrollHeight - 20) setCanAccept(true);
    }
  };

  const handleAccept = () => {
    if (canAccept && onAccept) onAccept();
  };

  return (
    <Dialog open={open} onOpenChange={(v) => { if (!v) onClose(); }}>
      <DialogContent className="sm:max-w-lg bg-white dark:bg-[#1E293B] dark:border-[#334155] max-h-[90vh] flex flex-col p-0 [&>button]:hidden">
        <DialogHeader className="p-6 pb-0 flex-shrink-0">
          <DialogTitle className="font-heading text-xl font-bold text-[#0F172A] dark:text-[#F1F5F9] flex items-center gap-2">
            <Shield className="w-5 h-5 text-[#2563EB]" />
            Terms and Conditions
          </DialogTitle>
        </DialogHeader>

        <div
          ref={scrollRef}
          onScroll={handleScroll}
          className="flex-1 overflow-y-auto px-6 py-4"
          style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}
        >
          <style>{`.terms-scroll::-webkit-scrollbar { display: none; }`}</style>

          <div className="space-y-6 text-[#0F172A] dark:text-[#F1F5F9] text-[14px] leading-relaxed terms-scroll">
            <p className="text-[#6275AF] dark:text-[#94A3B8]">Last updated: January 2026</p>

            <div className="bg-[#F5F5F7] dark:bg-[#0F172A] rounded-xl p-4 border border-[#E2E8F0] dark:border-[#334155]">
              <h3 className="font-bold text-[15px] mb-2 flex items-center gap-2 text-[#0F172A] dark:text-[#F1F5F9]">
                <Lock className="w-4 h-4 text-[#10B981]" />
                Data Encryption & Security
              </h3>
              <p className="text-[13px] text-[#6275AF] dark:text-[#94A3B8]">
                All your data is encrypted using industry-standard encryption protocols. We employ AES-256 encryption for data at rest and TLS 1.3 for data in transit. Your passwords are hashed using bcrypt with salt rounds, ensuring they can never be retrieved or exposed.
              </p>
            </div>

            <div className="bg-[#F5F5F7] dark:bg-[#0F172A] rounded-xl p-4 border border-[#E2E8F0] dark:border-[#334155]">
              <h3 className="font-bold text-[15px] mb-2 flex items-center gap-2 text-[#0F172A] dark:text-[#F1F5F9]">
                <Database className="w-4 h-4 text-[#2563EB]" />
                Firebase Database Usage
              </h3>
              <p className="text-[13px] text-[#6275AF] dark:text-[#94A3B8]">
                We use Google Firebase Realtime Database, a secure, scalable, and reliable cloud database solution. Firebase provides automatic data synchronization, offline support, and is compliant with major security standards including SOC 1, SOC 2, and ISO 27001.
              </p>
            </div>

            <div className="bg-[#F5F5F7] dark:bg-[#0F172A] rounded-xl p-4 border border-[#E2E8F0] dark:border-[#334155]">
              <h3 className="font-bold text-[15px] mb-2 flex items-center gap-2 text-[#0F172A] dark:text-[#F1F5F9]">
                <Shield className="w-4 h-4 text-[#2563EB]" />
                Full Security Assurance
              </h3>
              <ul className="text-[13px] text-[#6275AF] dark:text-[#94A3B8] space-y-1.5 list-disc list-inside">
                <li>Secure authentication via Firebase Auth</li>
                <li>Real-time security rules enforcement</li>
                <li>Protection against XSS, CSRF, and injection attacks</li>
                <li>Regular security audits and updates</li>
                <li>GDPR and CCPA compliant data handling</li>
                <li>No third-party data sharing without consent</li>
              </ul>
            </div>

            <div className="bg-[#F5F5F7] dark:bg-[#0F172A] rounded-xl p-4 border border-[#E2E8F0] dark:border-[#334155]">
              <h3 className="font-bold text-[15px] mb-2 flex items-center gap-2 text-[#0F172A] dark:text-[#F1F5F9]">
                <Smartphone className="w-4 h-4 text-[#6275AF]" />
                Progressive Web App (PWA) Enabled
              </h3>
              <p className="text-[13px] text-[#6275AF] dark:text-[#94A3B8]">
                Our platform is PWA-enabled, allowing you to install it on your device for a native app-like experience. Features include offline access, push notifications, and seamless updates without app store downloads.
              </p>
            </div>

            <div>
              <h3 className="font-bold text-[15px] mb-2 text-[#0F172A] dark:text-[#F1F5F9]">User Responsibilities</h3>
              <p className="text-[13px] text-[#6275AF] dark:text-[#94A3B8]">By using this platform, you agree to:</p>
              <ul className="text-[13px] text-[#6275AF] dark:text-[#94A3B8] space-y-1 list-disc list-inside mt-2">
                <li>Provide accurate and truthful information</li>
                <li>Keep your login credentials secure</li>
                <li>Not engage in harassment, spam, or malicious activities</li>
                <li>Respect intellectual property rights</li>
                <li>Report any security vulnerabilities responsibly</li>
              </ul>
            </div>

            <div>
              <h3 className="font-bold text-[15px] mb-2 text-[#0F172A] dark:text-[#F1F5F9]">Content Guidelines</h3>
              <p className="text-[13px] text-[#6275AF] dark:text-[#94A3B8]">
                Users are responsible for the content they post. We reserve the right to remove content that violates our community guidelines, including but not limited to hate speech, illegal content, or spam.
              </p>
            </div>

            <div>
              <h3 className="font-bold text-[15px] mb-2 text-[#0F172A] dark:text-[#F1F5F9]">Account Termination</h3>
              <p className="text-[13px] text-[#6275AF] dark:text-[#94A3B8]">
                We reserve the right to suspend or terminate accounts that violate these terms. Users may also delete their accounts at any time through their profile settings.
              </p>
            </div>

            <div>
              <h3 className="font-bold text-[15px] mb-2 text-[#0F172A] dark:text-[#F1F5F9]">Contact & Support</h3>
              <p className="text-[13px] text-[#6275AF] dark:text-[#94A3B8]">
                For any questions or concerns regarding these terms, please contact our support team. We are committed to addressing your queries promptly and transparently.
              </p>
            </div>

            <div className="bg-[#10B981]/10 dark:bg-[#10B981]/15 rounded-xl p-4 border border-[#10B981]/20">
              <p className="text-[13px] text-[#10B981] font-medium flex items-center gap-2">
                <CheckCircle className="w-4 h-4" />
                By accepting these terms, you acknowledge that you have read, understood, and agree to be bound by all the conditions stated above.
              </p>
            </div>
          </div>
        </div>

        <div className="p-6 pt-4 border-t border-[#E2E8F0] dark:border-[#334155] flex-shrink-0">
          {showAcceptButton ? (
            <Button
              onClick={handleAccept}
              disabled={!canAccept}
              data-testid="terms-accept-btn"
              className={`w-full rounded-full py-3 h-12 font-semibold transition-all ${
                canAccept
                  ? 'bg-[#2563EB] hover:bg-[#1D4ED8] text-white shadow-lg shadow-[#2563EB]/20'
                  : 'bg-[#E2E8F0] dark:bg-[#334155] text-[#94A3B8] dark:text-[#64748B] cursor-not-allowed'
              }`}
            >
              {canAccept ? 'I Accept the Terms and Conditions' : 'Please scroll to the bottom to accept'}
            </Button>
          ) : (
            <Button
              onClick={onClose}
              data-testid="terms-close-btn"
              className="w-full bg-[#F5F5F7] dark:bg-[#334155] hover:bg-[#E2E8F0] dark:hover:bg-[#475569] text-[#0F172A] dark:text-[#F1F5F9] rounded-full py-3 h-12 font-semibold"
            >
              Close
            </Button>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
