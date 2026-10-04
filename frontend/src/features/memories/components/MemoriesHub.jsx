import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useNavigate, useSearchParams } from 'react-router-dom';
import {
  Calendar as CalendarIcon,
  BookOpen,
  Share2,
  Globe,
  Plus,
  ArrowLeft,
  Grid,
  Layers,
  Sparkles,
} from 'lucide-react';
import MemoriesCalendar from './MemoriesCalendar';
import MemoryStamp from './MemoryStamp';
import MemoryScrapbookView from './MemoryScrapbookView';
import SharedMemoriesView from './SharedMemoriesView';
import PublicMemoriesView from './PublicMemoriesView';
import MemoryCaptureModal from './MemoryCaptureModal';
import MemoryFullViewerModal from './MemoryFullViewerModal';
import MemoryShareModal from './MemoryShareModal';
import { getMonthMemories, getDayMemoryCount } from '../data/memoryRepository';
import { getTodayDateStr, formatDisplayDate } from '../utils/dateUtils';
import { STAMP_VARIANTS } from '../utils/stampTheme';

/**
 * MemoriesHub — Main container for Discuss Memories.
 *
 * Information Architecture:
 * - PRIVATE (Default): Calendar / Scrapbook / Day list modes
 * - SHARED: Received & Sent tabs
 * - PUBLIC: Community public stamps
 */
export default function MemoriesHub() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();

  // Primary section ('private' | 'shared' | 'public')
  const activeSection = searchParams.get('tab') || 'private';

  // Private view modes ('calendar' | 'scrapbook')
  const [privateMode, setPrivateMode] = useState('calendar');

  // Calendar Date State (user-local)
  const today = useMemo(() => new Date(), []);
  const [currentYear, setCurrentYear] = useState(() => today.getFullYear());
  const [currentMonthIndex, setCurrentMonthIndex] = useState(() => today.getMonth());
  const [selectedDate, setSelectedDate] = useState(() => getTodayDateStr(today));

  // Data State
  const [monthMemories, setMonthMemories] = useState([]);
  const [loadingMonth, setLoadingMonth] = useState(false);
  const [scrapbookPage, setScrapbookPage] = useState(0);

  // Modals
  const [showCaptureModal, setShowCaptureModal] = useState(false);
  const [captureDateTarget, setCaptureDateTarget] = useState(() => getTodayDateStr(today));
  const [activeViewerMemory, setActiveViewerMemory] = useState(null);
  const [activeShareMemory, setActiveShareMemory] = useState(null);

  const userId = user?.uid || user?.id;
  const currentYearMonth = `${currentYear}-${String(currentMonthIndex + 1).padStart(2, '0')}`;

  // Fetch month memories (local-first with cache-and-revalidate)
  const loadMonthData = useCallback(async (yearMonth, force = false) => {
    if (!userId) return;
    setLoadingMonth(true);
    try {
      const data = await getMonthMemories(userId, yearMonth, force);
      setMonthMemories(data || []);
    } catch (e) {
      console.warn('[MemoriesHub] Month load error:', e);
    } finally {
      setLoadingMonth(false);
    }
  }, [userId]);

  useEffect(() => {
    loadMonthData(currentYearMonth);
  }, [loadMonthData, currentYearMonth]);

  // Navigate months
  const handlePrevMonth = () => {
    if (currentMonthIndex === 0) {
      setCurrentMonthIndex(11);
      setCurrentYear((y) => y - 1);
    } else {
      setCurrentMonthIndex((m) => m - 1);
    }
  };

  const handleNextMonth = () => {
    if (currentMonthIndex === 11) {
      setCurrentMonthIndex(0);
      setCurrentYear((y) => y + 1);
    } else {
      setCurrentMonthIndex((m) => m + 1);
    }
  };

  // Day memories filtered for currently selected date
  const selectedDayMemories = useMemo(() => {
    return monthMemories.filter((m) => m.memoryDate === selectedDate);
  }, [monthMemories, selectedDate]);

  const handleSectionTabChange = (tab) => {
    setSearchParams({ tab });
  };

  const handleOpenAdd = (dateStr) => {
    setCaptureDateTarget(dateStr || selectedDate || getTodayDateStr());
    setShowCaptureModal(true);
  };

  const handleMemoryCreated = (newMemory) => {
    // If belongs to current month, insert and keep sorted
    if (newMemory.memoryDate?.startsWith(currentYearMonth)) {
      setMonthMemories((prev) => {
        const updated = [...prev.filter((m) => m.id !== newMemory.id), newMemory];
        return updated.sort((a, b) => a.memoryDate.localeCompare(b.memoryDate));
      });
    }
    // Auto-select the newly created date
    setSelectedDate(newMemory.memoryDate);
  };

  const handleMemoryDeleted = (deletedId) => {
    setMonthMemories((prev) => prev.filter((m) => m.id !== deletedId));
  };

  const handleVisibilityChanged = (updatedMemory) => {
    setMonthMemories((prev) =>
      prev.map((m) => (m.id === updatedMemory.id ? { ...m, ...updatedMemory } : m))
    );
    if (activeViewerMemory?.id === updatedMemory.id) {
      setActiveViewerMemory((prev) => ({ ...prev, ...updatedMemory }));
    }
  };

  return (
    <div className="min-h-screen w-full bg-white dark:bg-black text-neutral-900 dark:text-neutral-100 flex flex-col pb-[calc(var(--bottom-nav-height,49px)+env(safe-area-inset-bottom,0px)+3rem)]">
      {/* Top App Bar Header */}
      <header className="sticky top-0 z-30 bg-white/95 dark:bg-black/95 backdrop-blur-md border-b border-neutral-200/80 dark:border-neutral-800/80 px-4 py-2.5 flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <button
            type="button"
            onClick={() => navigate(-1)}
            aria-label="Back"
            className="p-1.5 rounded-full text-neutral-600 dark:text-neutral-300 hover:bg-neutral-100 dark:hover:bg-neutral-800 transition-colors"
          >
            <ArrowLeft className="w-5 h-5 stroke-[2]" />
          </button>
          <div>
            <h1 className="text-base sm:text-lg font-bold tracking-tight text-neutral-950 dark:text-white leading-tight">
              Memories
            </h1>
            <p className="text-[11px] text-neutral-400 leading-none">
              Small moments preserved as stamps
            </p>
          </div>
        </div>

        {/* Action: Add Memory */}
        <button
          type="button"
          onClick={() => handleOpenAdd(selectedDate)}
          className="px-3.5 py-1.5 rounded-full bg-[#0095F6] hover:bg-[#1877F2] text-white font-semibold text-xs flex items-center gap-1.5 transition-all shadow-xs cursor-pointer active:scale-95"
        >
          <Plus className="w-3.5 h-3.5 stroke-[2.5]" />
          <span>Add</span>
        </button>
      </header>

      {/* Primary Section Switcher: PRIVATE | SHARED | PUBLIC */}
      <div className="w-full max-w-xl mx-auto px-4 pt-3 pb-1">
        <div className="grid grid-cols-3 p-1 rounded-2xl bg-neutral-100 dark:bg-neutral-900 border border-neutral-200/60 dark:border-neutral-800 text-xs font-semibold select-none">
          <button
            type="button"
            onClick={() => handleSectionTabChange('private')}
            className={`py-2 rounded-xl transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
              activeSection === 'private'
                ? 'bg-white dark:bg-neutral-800 text-neutral-900 dark:text-white shadow-xs'
                : 'text-neutral-500 hover:text-neutral-900 dark:hover:text-white'
            }`}
          >
            <CalendarIcon className="w-3.5 h-3.5" />
            <span>Private</span>
          </button>

          <button
            type="button"
            onClick={() => handleSectionTabChange('shared')}
            className={`py-2 rounded-xl transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
              activeSection === 'shared'
                ? 'bg-white dark:bg-neutral-800 text-neutral-900 dark:text-white shadow-xs'
                : 'text-neutral-500 hover:text-neutral-900 dark:hover:text-white'
            }`}
          >
            <Share2 className="w-3.5 h-3.5" />
            <span>Shared</span>
          </button>

          <button
            type="button"
            onClick={() => handleSectionTabChange('public')}
            className={`py-2 rounded-xl transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
              activeSection === 'public'
                ? 'bg-white dark:bg-neutral-800 text-neutral-900 dark:text-white shadow-xs'
                : 'text-neutral-500 hover:text-neutral-900 dark:hover:text-white'
            }`}
          >
            <Globe className="w-3.5 h-3.5" />
            <span>Public</span>
          </button>
        </div>
      </div>

      {/* Main Section Content */}
      <main className="w-full max-w-2xl mx-auto px-3 sm:px-4 pt-3 flex-1 flex flex-col">
        {/* SECTION 1: PRIVATE */}
        {activeSection === 'private' && (
          <div className="w-full flex flex-col">
            {/* Private Mode Switcher: Calendar vs Scrapbook */}
            <div className="flex items-center justify-between mb-3 px-1">
              <span className="text-xs font-semibold text-neutral-500">
                {monthMemories.length} {monthMemories.length === 1 ? 'stamp' : 'stamps'} this month
              </span>

              <div className="flex items-center gap-1 p-0.5 rounded-xl bg-neutral-100 dark:bg-neutral-900 border border-neutral-200/60 dark:border-neutral-800">
                <button
                  type="button"
                  onClick={() => setPrivateMode('calendar')}
                  className={`p-1.5 rounded-lg transition-colors cursor-pointer ${
                    privateMode === 'calendar'
                      ? 'bg-white dark:bg-neutral-800 text-neutral-900 dark:text-white shadow-2xs'
                      : 'text-neutral-400 hover:text-neutral-700 dark:hover:text-white'
                  }`}
                  aria-label="Calendar view"
                  title="Calendar view"
                >
                  <CalendarIcon className="w-4 h-4" />
                </button>

                <button
                  type="button"
                  onClick={() => setPrivateMode('scrapbook')}
                  className={`p-1.5 rounded-lg transition-colors cursor-pointer ${
                    privateMode === 'scrapbook'
                      ? 'bg-white dark:bg-neutral-800 text-neutral-900 dark:text-white shadow-2xs'
                      : 'text-neutral-400 hover:text-neutral-700 dark:hover:text-white'
                  }`}
                  aria-label="Scrapbook album view"
                  title="Scrapbook view"
                >
                  <BookOpen className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* Private Mode View: Calendar vs Scrapbook */}
            {privateMode === 'calendar' ? (
              <div className="w-full flex flex-col space-y-5">
                {/* Month Calendar */}
                <MemoriesCalendar
                  year={currentYear}
                  monthIndex={currentMonthIndex}
                  memories={monthMemories}
                  selectedDate={selectedDate}
                  onSelectDate={(d) => setSelectedDate(d)}
                  onNavigatePrev={handlePrevMonth}
                  onNavigateNext={handleNextMonth}
                  onAddMemory={handleOpenAdd}
                  loading={loadingMonth}
                />

                {/* Selected Date Header & Stamp Strip */}
                <div className="pt-2 border-t border-neutral-100 dark:border-neutral-800/80">
                  <div className="flex items-center justify-between mb-3 px-1">
                    <div>
                      <h3 className="text-sm font-bold text-neutral-900 dark:text-white">
                        {formatDisplayDate(selectedDate)}
                      </h3>
                      <span className="text-[11px] text-neutral-400">
                        {selectedDayMemories.length} of 15 memories captured
                      </span>
                    </div>

                    {selectedDayMemories.length < 15 && (
                      <button
                        type="button"
                        onClick={() => handleOpenAdd(selectedDate)}
                        className="text-xs font-semibold text-[#0095F6] hover:underline flex items-center gap-1"
                      >
                        <Plus className="w-3.5 h-3.5" />
                        <span>Add to this date</span>
                      </button>
                    )}
                  </div>

                  {/* Day Memories Grid / Thumbnails */}
                  {selectedDayMemories.length === 0 ? (
                    <div className="py-8 px-4 rounded-2xl border border-dashed border-neutral-200 dark:border-neutral-800 text-center flex flex-col items-center justify-center bg-neutral-50/40 dark:bg-neutral-900/20">
                      <p className="text-xs text-neutral-400 mb-2">
                        No stamps captured for {formatDisplayDate(selectedDate)}.
                      </p>
                      <button
                        type="button"
                        onClick={() => handleOpenAdd(selectedDate)}
                        className="px-3.5 py-1.5 rounded-xl bg-neutral-200/70 dark:bg-neutral-800 hover:bg-neutral-300 dark:hover:bg-neutral-700 text-neutral-800 dark:text-neutral-200 text-xs font-semibold flex items-center gap-1.5 transition-colors"
                      >
                        <Plus className="w-3.5 h-3.5" />
                        <span>Add Stamp</span>
                      </button>
                    </div>
                  ) : (
                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                      {selectedDayMemories.map((mem) => (
                        <div key={mem.id} className="flex justify-center">
                          <MemoryStamp
                            memory={mem}
                            variant={STAMP_VARIANTS.GALLERY}
                            showCaption
                            onClick={() => setActiveViewerMemory(mem)}
                          />
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            ) : (
              /* Scrapbook Album Mode */
              <MemoryScrapbookView
                memories={monthMemories}
                currentPage={scrapbookPage}
                onPageChange={(p) => setScrapbookPage(p)}
                onSelectMemory={(mem) => setActiveViewerMemory(mem)}
              />
            )}
          </div>
        )}

        {/* SECTION 2: SHARED */}
        {activeSection === 'shared' && (
          <SharedMemoriesView
            currentUser={user}
            onSelectMemory={(mem) => setActiveViewerMemory(mem)}
          />
        )}

        {/* SECTION 3: PUBLIC */}
        {activeSection === 'public' && (
          <PublicMemoriesView
            currentUser={user}
            onSelectMemory={(mem) => setActiveViewerMemory(mem)}
            onOpenShare={(mem) => setActiveShareMemory(mem)}
          />
        )}
      </main>

      {/* Capture Modal */}
      <MemoryCaptureModal
        open={showCaptureModal}
        onClose={() => setShowCaptureModal(false)}
        initialDate={captureDateTarget}
        onMemoryCreated={handleMemoryCreated}
        user={user}
      />

      {/* Full Memory Stamp Viewer Modal */}
      <MemoryFullViewerModal
        open={Boolean(activeViewerMemory)}
        memory={activeViewerMemory}
        onClose={() => setActiveViewerMemory(null)}
        currentUser={user}
        onDeleted={handleMemoryDeleted}
        onOpenShare={(mem) => setActiveShareMemory(mem)}
        onVisibilityChanged={handleVisibilityChanged}
      />

      {/* Private Share Modal */}
      <MemoryShareModal
        open={Boolean(activeShareMemory)}
        memory={activeShareMemory}
        onClose={() => setActiveShareMemory(null)}
        currentUser={user}
      />
    </div>
  );
}
