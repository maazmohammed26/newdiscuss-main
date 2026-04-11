import DiscussLogo from '@/components/DiscussLogo';
import { Loader2 } from 'lucide-react';

export default function LoadingScreen({ message = 'Loading...' }) {
  return (
    <div className="fixed inset-0 bg-[#F5F5F7] dark:bg-[#0F172A] z-50 flex flex-col items-center justify-center">
      {/* Animated Logo Text */}
      <div className="relative animate-pulse">
        <DiscussLogo size="xl" />
      </div>
      
      {/* Loading indicator */}
      <div className="flex items-center gap-2 mt-6 text-[#64748B] dark:text-[#94A3B8]">
        <Loader2 className="w-4 h-4 animate-spin" />
        <span className="text-[13px]">{message}</span>
      </div>
      
      {/* Loading dots animation */}
      <div className="flex gap-1.5 mt-6">
        <div className="w-2 h-2 bg-[#2563EB] rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
        <div className="w-2 h-2 bg-[#3B82F6] rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
        <div className="w-2 h-2 bg-[#2563EB] rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
      </div>
    </div>
  );
}
