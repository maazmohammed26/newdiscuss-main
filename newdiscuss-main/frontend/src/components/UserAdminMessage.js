import { X } from 'lucide-react';
import { useState } from 'react';

export default function UserAdminMessage({ message }) {
  const [dismissed, setDismissed] = useState(false);

  if (!message || message.trim() === '' || dismissed) {
    return null;
  }

  return (
    <div 
      data-testid="user-admin-message"
      className="bg-[#EFF6FF] dark:bg-[#1E293B] discuss:bg-[#1a1a1a] border border-[#3B82F6]/20 dark:border-[#334155] discuss:border-[#333333] rounded-xl p-4 mb-4"
    >
      <div className="flex items-center gap-3">
        <div className="flex items-center shrink-0">
          <span className="text-[#3B82F6] text-2xl font-bold">&lt;</span>
          <span className="text-[#EF4444] text-2xl font-bold">&gt;</span>
        </div>
        <p className="flex-1 text-[13px] md:text-[14px]">
          <span className="text-[#0F172A] dark:text-[#F1F5F9] discuss:text-[#F5F5F5] font-medium">Admin message: </span>
          <span className="text-[#3B82F6] discuss:text-[#60A5FA]">{message}</span>
        </p>
        <button
          onClick={() => setDismissed(true)}
          className="p-1.5 rounded-lg hover:bg-[#3B82F6]/10 text-[#64748B] dark:text-[#94A3B8] discuss:text-[#9CA3AF] hover:text-[#3B82F6] transition-colors shrink-0"
          aria-label="Dismiss message"
        >
          <X className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
}
