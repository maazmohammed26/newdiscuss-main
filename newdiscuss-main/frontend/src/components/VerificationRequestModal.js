import { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Mail, CheckCircle, ExternalLink } from 'lucide-react';

export default function VerificationRequestModal({ open, onClose, user }) {
  const [emailSent, setEmailSent] = useState(false);

  const emailSubject = encodeURIComponent('Discuss Verification Request');
  const emailBody = encodeURIComponent(
    `Hello Discuss Team,

I would like to request verification for my Discuss account.

Account Details:
- Username: ${user?.username || ''}
- Email: ${user?.email || ''}
- User ID: ${user?.id || ''}

I agree to follow all Discuss terms and conditions and represent that the information provided is accurate.

Thank you for considering my request.

Best regards,
${user?.username || ''}`
  );

  const mailtoLink = `mailto:support@discussit.in?subject=${emailSubject}&body=${emailBody}`;

  const handleSendEmail = () => {
    window.location.href = mailtoLink;
    setEmailSent(true);
  };

  const handleClose = () => {
    setEmailSent(false);
    onClose();
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <CheckCircle className="w-5 h-5 text-[#E63946]" />
            Request Verification
          </DialogTitle>
          <DialogDescription>
            Get the verified badge on your Discuss profile
          </DialogDescription>
        </DialogHeader>
        
        <div className="space-y-4 py-4">
          {!emailSent ? (
            <>
              <div className="bg-[#FEF3C7] dark:bg-[#78350F]/20 discuss:bg-[#7C2D12]/20 border border-[#FCD34D] discuss:border-[#7C2D12] p-4 rounded-lg">
                <h4 className="font-semibold text-sm mb-2 text-[#92400E] dark:text-[#FDE68A] discuss:text-[#FED7AA]">
                  Verification Requirements
                </h4>
                <ul className="text-xs text-[#92400E] dark:text-[#FDE68A] discuss:text-[#FED7AA] space-y-1 list-disc list-inside">
                  <li>Active Discuss account in good standing</li>
                  <li>Comply with all Discuss terms and conditions</li>
                  <li>Authentic identity representation</li>
                  <li>Regular platform engagement</li>
                </ul>
              </div>

              <div className="space-y-3">
                <div className="flex items-start gap-2 text-sm">
                  <Mail className="w-4 h-4 mt-0.5 text-[#1D7AFF]" />
                  <div>
                    <p className="font-medium mb-1">How to request:</p>
                    <p className="text-[#6B7280] dark:text-[#94A3B8] discuss:text-[#9CA3AF] text-xs">
                      Click the button below to open your email client with a pre-filled verification request. 
                      Send the email from your registered email address: <strong>{user?.email}</strong>
                    </p>
                  </div>
                </div>

                <div className="bg-[#EEF3FB] dark:bg-[#1E293B] discuss:bg-[#262626] p-3 rounded-lg">
                  <p className="text-xs text-[#6B7280] dark:text-[#94A3B8] discuss:text-[#9CA3AF]">
                    <strong>Important:</strong> Please send the email from <strong>{user?.email}</strong> to verify your account ownership.
                  </p>
                </div>
              </div>

              <Button
                onClick={handleSendEmail}
                className="w-full bg-[#1D7AFF] hover:bg-[#1560CC] discuss:bg-[#EF4444] discuss:hover:bg-[#DC2626] text-white"
                data-primary="true"
              >
                <Mail className="w-4 h-4 mr-2" />
                Open Email to Send Request
              </Button>
            </>
          ) : (
            <div className="text-center py-6">
              <div className="w-16 h-16 bg-[#10B981]/10 rounded-full flex items-center justify-center mx-auto mb-4">
                <CheckCircle className="w-8 h-8 text-[#10B981]" />
              </div>
              <h3 className="font-semibold text-lg mb-2">Email Client Opened</h3>
              <p className="text-sm text-[#6B7280] dark:text-[#94A3B8] discuss:text-[#9CA3AF] mb-4">
                Please send the pre-filled email from your registered email address to complete your verification request.
              </p>
              <p className="text-xs text-[#6B7280] dark:text-[#94A3B8] discuss:text-[#9CA3AF]">
                Our team will review your request and update your verification status within 2-3 business days.
              </p>
            </div>
          )}
        </div>

        <div className="flex justify-end gap-2">
          <Button
            onClick={handleClose}
            variant="outline"
            className="border-[#E2E6ED] dark:border-[#334155] discuss:border-[#333333]"
          >
            Close
          </Button>
          {!emailSent && (
            <Button
              onClick={handleSendEmail}
              variant="link"
              className="text-[#1D7AFF] discuss:text-[#EF4444]"
            >
              <ExternalLink className="w-4 h-4 mr-1" />
              Send Email
            </Button>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
