import React, { useMemo } from 'react';
import { ChevronLeft, ChevronRight, Plus } from 'lucide-react';
import MemoryStamp from './MemoryStamp';
import { STAMP_VARIANTS } from '../utils/stampTheme';
import { getCalendarGrid, getTodayDateStr } from '../utils/dateUtils';

const WEEKDAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
const MONTH_NAMES = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December'
];

/**
 * MemoriesCalendar — Private month calendar view for Discuss Memories.
 *
 * Renders:
 * - User-local month/year navigation
 * - Day states (has memory, today, selected, historical)
 * - Single representative stamp thumbnail + subtle count "+4" if multiple
 * - Clean mobile touch targets
 */
export default function MemoriesCalendar({
  year,
  monthIndex, // 0-indexed (0 = Jan, 11 = Dec)
  memories = [],
  selectedDate,
  onSelectDate,
  onNavigatePrev,
  onNavigateNext,
  onAddMemory,
  loading = false,
}) {
  const todayStr = useMemo(() => getTodayDateStr(), []);

  // Map memories by date string: { "2026-10-04": [mem1, mem2, ...] }
  const memoriesByDate = useMemo(() => {
    const map = {};
    for (const mem of memories) {
      if (!mem.memoryDate) continue;
      if (!map[mem.memoryDate]) map[mem.memoryDate] = [];
      map[mem.memoryDate].push(mem);
    }
    return map;
  }, [memories]);

  // Generate calendar grid (including previous/next month days to fill rows)
  const calendarGrid = useMemo(() => {
    return getCalendarGrid(year, monthIndex);
  }, [year, monthIndex]);

  return (
    <div className="w-full select-none">
      {/* Calendar Header Navigation */}
      <div className="flex items-center justify-between px-3 py-2.5 mb-2">
        <div className="flex items-center gap-1.5">
          <h2 className="text-base sm:text-lg font-bold text-neutral-900 dark:text-white tracking-tight">
            {MONTH_NAMES[monthIndex]} {year}
          </h2>
          {loading && (
            <div className="w-2 h-2 rounded-full bg-[#0095F6] animate-ping ml-1" />
          )}
        </div>

        <div className="flex items-center gap-1">
          <button
            type="button"
            onClick={onNavigatePrev}
            aria-label="Previous month"
            className="p-1.5 rounded-lg text-neutral-600 dark:text-neutral-300 hover:bg-neutral-100 dark:hover:bg-neutral-800 transition-colors cursor-pointer"
          >
            <ChevronLeft className="w-5 h-5 stroke-[2]" />
          </button>

          <button
            type="button"
            onClick={onNavigateNext}
            aria-label="Next month"
            className="p-1.5 rounded-lg text-neutral-600 dark:text-neutral-300 hover:bg-neutral-100 dark:hover:bg-neutral-800 transition-colors cursor-pointer"
          >
            <ChevronRight className="w-5 h-5 stroke-[2]" />
          </button>
        </div>
      </div>

      {/* Weekday Labels */}
      <div className="grid grid-cols-7 mb-1 text-center">
        {WEEKDAYS.map((wd) => (
          <div
            key={wd}
            className="text-[11px] font-semibold text-neutral-400 dark:text-neutral-500 py-1 uppercase tracking-wider"
          >
            {wd}
          </div>
        ))}
      </div>

      {/* Calendar Days Grid */}
      <div className="grid grid-cols-7 gap-1 sm:gap-1.5">
        {calendarGrid.map(({ dateStr, dayNumber, isCurrentMonth }, idx) => {
          const dayMemories = memoriesByDate[dateStr] || [];
          const hasMemories = dayMemories.length > 0;
          const isSelected = selectedDate === dateStr;
          const isToday = dateStr === todayStr;
          const latestMemory = hasMemories ? dayMemories[dayMemories.length - 1] : null;
          const extraCount = dayMemories.length > 1 ? dayMemories.length - 1 : 0;

          return (
            <div
              key={`${dateStr}-${idx}`}
              onClick={() => onSelectDate?.(dateStr)}
              role="button"
              tabIndex={0}
              onKeyDown={(e) => (e.key === 'Enter' || e.key === ' ') && onSelectDate?.(dateStr)}
              className={`min-h-[64px] sm:min-h-[82px] p-1 rounded-xl flex flex-col items-center justify-between transition-all relative cursor-pointer border ${
                isSelected
                  ? 'border-[#0095F6] bg-blue-50/40 dark:bg-blue-950/20 shadow-xs'
                  : 'border-transparent hover:bg-neutral-50 dark:hover:bg-neutral-900/60'
              } ${!isCurrentMonth ? 'opacity-35' : 'opacity-100'}`}
              aria-label={`${dateStr}, ${dayMemories.length} memories`}
            >
              {/* Day Number Header */}
              <div className="w-full flex items-center justify-between px-0.5">
                <span
                  className={`text-[12px] font-semibold w-5 h-5 flex items-center justify-center rounded-full leading-none ${
                    isToday
                      ? 'bg-[#0095F6] text-white font-bold'
                      : isCurrentMonth
                      ? 'text-neutral-800 dark:text-neutral-200'
                      : 'text-neutral-400 dark:text-neutral-600'
                  }`}
                >
                  {dayNumber}
                </span>

                {/* Extra memory counter badge (e.g. +4) */}
                {extraCount > 0 && (
                  <span className="text-[10px] font-bold text-neutral-600 dark:text-neutral-300 bg-neutral-200/80 dark:bg-neutral-800 px-1 py-0.2 rounded-full">
                    +{extraCount}
                  </span>
                )}
              </div>

              {/* Day Cell Body: Postage Stamp Thumbnail or Empty State */}
              <div className="w-full flex-1 flex items-center justify-center my-0.5">
                {hasMemories && latestMemory ? (
                  <MemoryStamp
                    memory={latestMemory}
                    variant={STAMP_VARIANTS.CALENDAR}
                    alt={`Memory from ${dateStr}`}
                  />
                ) : (
                  isSelected && (
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        onAddMemory?.(dateStr);
                      }}
                      title="Add memory to this date"
                      className="w-7 h-7 rounded-full bg-neutral-100 dark:bg-neutral-800 hover:bg-[#0095F6]/10 text-neutral-400 hover:text-[#0095F6] flex items-center justify-center transition-colors"
                    >
                      <Plus className="w-3.5 h-3.5" />
                    </button>
                  )
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
