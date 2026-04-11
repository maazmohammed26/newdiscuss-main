import { useState, useEffect } from 'react';
import { subscribeToAdminMessage } from '@/lib/db';
import { X } from 'lucide-react';

export default function AdminMessageBanner() {
  const [message, setMessage] = useState(null);
  const [dismissed, setDismissed] = useState(false);

  useEffect(() => {
    const unsubscribe = subscribeToAdminMessage((msg) => {
      setMessage(msg);
      setDismissed(false);
    });
    return unsubscribe;
  }, []);

  if (!message || message.trim() === '' || dismissed) {
    return null;
  }

  return (
    <div 
      data-testid="admin-message-banner"
      className="bg-[#EFF6FF] dark:bg-[#1E293B] border-b border-[#3B82F6]/20 dark:border-[#334155]"
    >
      <div className="max-w-5xl mx-auto px-4 py-3 flex items-center gap-3">
        <div className="flex items-center shrink-0">
          <span className="text-[#3B82F6] text-2xl font-bold">&lt;</span>
          <span className="text-[#EF4444] text-2xl font-bold">&gt;</span>
        </div>
        <p className="flex-1 text-[13px] md:text-[14px]">
          <span className="text-[#0F172A] dark:text-[#F1F5F9] font-medium">Message from </span>
          <span className="text-[#3B82F6] font-bold">&lt;Discuss Admin&gt;</span>
          <span className="text-[#0F172A] dark:text-[#F1F5F9] font-medium"> : </span>
          <span className="text-[#3B82F6]">{message}</span>
        </p>
        <button
          onClick={() => setDismissed(true)}
          className="p-1.5 rounded-lg hover:bg-[#3B82F6]/10 text-[#64748B] dark:text-[#94A3B8] hover:text-[#3B82F6] transition-colors shrink-0"
          aria-label="Dismiss message"
        >
          <X className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
}
