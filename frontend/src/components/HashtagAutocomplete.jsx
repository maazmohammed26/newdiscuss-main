import React, { useEffect } from 'react';
import { Hash } from 'lucide-react';

export default function HashtagAutocomplete({
  suggestions = [],
  selectedIndex = 0,
  onSelect,
  className = '',
}) {
  if (!suggestions || suggestions.length === 0) return null;

  return (
    <div
      role="listbox"
      aria-label="Hashtag suggestions"
      className={`absolute z-50 w-64 max-w-[calc(100vw-3rem)] rounded-xl border border-neutral-200 bg-white p-1.5 shadow-xl transition-all dark:border-neutral-800 dark:bg-[#121212] ${className}`}
    >
      <div className="px-2 py-1 text-[10px] font-bold uppercase tracking-wider text-neutral-400 dark:text-neutral-500">
        Suggested tags
      </div>
      <div className="space-y-0.5">
        {suggestions.map((item, index) => {
          const isSelected = index === selectedIndex;
          return (
            <button
              key={item.tag}
              type="button"
              role="option"
              aria-selected={isSelected}
              onMouseDown={(e) => {
                // Prevent textarea from losing focus before click completes
                e.preventDefault();
                onSelect(item.tag);
              }}
              className={`flex w-full items-center justify-between rounded-lg px-2.5 py-1.5 text-left text-xs font-medium transition-colors ${
                isSelected
                  ? 'bg-[#0095F6]/10 text-[#0095F6] dark:bg-[#0095F6]/20 dark:text-[#38BDF8]'
                  : 'text-neutral-700 hover:bg-neutral-100 dark:text-neutral-200 dark:hover:bg-neutral-800/80'
              }`}
            >
              <span className="flex items-center gap-1.5 font-semibold">
                <Hash className="h-3.5 w-3.5 opacity-60" />
                <span>{item.tag}</span>
              </span>
              {item.usageCount > 0 ? (
                <span className="text-[10px] text-neutral-400 dark:text-neutral-500">
                  {item.usageCount} {item.usageCount === 1 ? 'post' : 'posts'}
                </span>
              ) : (
                <span className="text-[10px] text-neutral-400 dark:text-neutral-500">
                  New tag
                </span>
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
}
