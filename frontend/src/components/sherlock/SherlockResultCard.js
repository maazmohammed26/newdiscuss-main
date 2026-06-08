import { ExternalLink, CheckCircle2, XCircle, AlertCircle, Globe } from 'lucide-react';
import * as LucideIcons from 'lucide-react';

export default function SherlockResultCard({ result }) {
  const { platform, category, icon, color, url, status } = result;
  
  // Resolve icon dynamically. If the exact icon string doesn't exist, fallback to Globe.
  const IconComponent = LucideIcons[icon] || Globe;
  
  const isFound = status === 'Found';
  const isError = status === 'Error';

  return (
    <div className={`p-4 rounded-2xl border transition-all duration-300 relative overflow-hidden group ${
      isFound 
        ? 'bg-white dark:bg-[#1a1a1a] discuss:bg-[#1a1a1a] border-green-500/30 hover:border-green-500/60 shadow-sm hover:shadow-green-500/10' 
        : 'bg-white/50 dark:bg-[#121212]/50 discuss:bg-[#0c0c12]/50 border-neutral-200 dark:border-neutral-800 discuss:border-white/5 opacity-80 hover:opacity-100'
    }`}>
      {/* Found Background Glow */}
      {isFound && <div className="absolute top-0 right-0 w-32 h-32 bg-green-500/10 rounded-full blur-3xl pointer-events-none" />}
      
      <div className="flex items-center justify-between relative z-10">
        <div className="flex items-center gap-3">
          <div 
            className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0 transition-transform group-hover:scale-110 shadow-inner"
            style={{ backgroundColor: `${color}15`, color: color }}
          >
            <IconComponent className="w-5 h-5" />
          </div>
          <div>
            <h3 className="font-bold text-[15px] text-neutral-900 dark:text-neutral-100 discuss:text-white leading-none mb-1">
              {platform}
            </h3>
            <span className="text-[11px] font-medium text-neutral-500 dark:text-neutral-400">
              {category}
            </span>
          </div>
        </div>

        <div className="flex flex-col items-end gap-2">
          {isFound ? (
            <div className="flex items-center gap-1.5 text-green-600 dark:text-green-500 bg-green-500/10 px-2 py-1 rounded-md">
              <CheckCircle2 className="w-3.5 h-3.5" />
              <span className="text-[11px] font-bold uppercase tracking-wider">Found</span>
            </div>
          ) : isError ? (
            <div className="flex items-center gap-1.5 text-orange-600 dark:text-orange-500 bg-orange-500/10 px-2 py-1 rounded-md">
              <AlertCircle className="w-3.5 h-3.5" />
              <span className="text-[11px] font-bold uppercase tracking-wider">Error</span>
            </div>
          ) : (
            <div className="flex items-center gap-1.5 text-neutral-500 dark:text-neutral-400 bg-neutral-500/10 px-2 py-1 rounded-md">
              <XCircle className="w-3.5 h-3.5" />
              <span className="text-[11px] font-bold uppercase tracking-wider">Not Found</span>
            </div>
          )}

          {isFound && (
            <a 
              href={url} 
              target="_blank" 
              rel="noopener noreferrer"
              className="text-[11px] font-bold text-blue-600 hover:text-blue-700 discuss:text-red-500 discuss:hover:text-red-400 flex items-center gap-1 group/link"
            >
              Open Profile
              <ExternalLink className="w-3 h-3 group-hover/link:-translate-y-0.5 group-hover/link:translate-x-0.5 transition-transform" />
            </a>
          )}
        </div>
      </div>
    </div>
  );
}
