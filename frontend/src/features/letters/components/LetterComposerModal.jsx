import React, { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { X, ArrowLeft, MapPin, Send, ChevronDown } from 'lucide-react';
import UserAvatar from '@/components/UserAvatar';
import VerifiedBadge from '@/components/VerifiedBadge';
import CityPickerModal from './CityPickerModal';
import LetterRouteAnimation from './LetterRouteAnimation';
import { countGraphemes, MAX_LETTER_GRAPHEMES } from '../utils/graphemeCounter';
import {
  saveLetterDraft,
  getLetterDraft,
  clearLetterDraft,
  getLocalLetterPreference,
  saveLocalLetterPreference,
} from '../data/letterLocalStore';
import { sendLetterCommand } from '../data/letterRepository';
import { toast } from 'sonner';

export default function LetterComposerModal({
  isOpen,
  onClose,
  currentUser,
  recipient,
  onLetterSent = null,
}) {
  const [body, setBody] = useState('');
  const [originCity, setOriginCity] = useState(null);
  const [rememberCity, setRememberCity] = useState(false);
  const [isCityPickerOpen, setIsCityPickerOpen] = useState(false);
  const [isSending, setIsSending] = useState(false);

  // Gesture state
  const [dragProgress, setDragProgress] = useState(0); // 0 to 1
  const [isDragging, setIsDragging] = useState(false);
  const [flightPhase, setFlightPhase] = useState('idle'); // 'idle' | 'folding' | 'flying' | 'arrival' | 'complete'
  const dragStartYRef = useRef(0);
  const letterSheetRef = useRef(null);
  const textareaRef = useRef(null);

  const senderUid = currentUser?.id || currentUser?.uid;
  const recipientUid = recipient?.id || recipient?.uid;

  // Lock body scroll when composer is open
  useEffect(() => {
    if (!isOpen) return;
    const prevOverflow = document.body.style.overflow;
    const prevTouchAction = document.body.style.touchAction;
    document.body.style.overflow = 'hidden';
    document.body.style.touchAction = 'none';

    return () => {
      document.body.style.overflow = prevOverflow;
      document.body.style.touchAction = prevTouchAction;
    };
  }, [isOpen]);

  // Load existing draft & sender's saved city preference
  useEffect(() => {
    if (!isOpen || !senderUid || !recipientUid) return;

    let isMounted = true;
    (async () => {
      const draft = await getLetterDraft(senderUid, recipientUid);
      if (isMounted && draft) {
        setBody(draft.body || '');
        if (draft.originCityLabel) {
          setOriginCity({ id: draft.originCityId, name: draft.originCityLabel });
        }
        setRememberCity(Boolean(draft.rememberCity));
      } else if (isMounted) {
        const savedPref = await getLocalLetterPreference(senderUid);
        if (savedPref?.cityLabel) {
          setOriginCity({ id: savedPref.cityId, name: savedPref.cityLabel });
          setRememberCity(true);
        }
      }
    })();

    setDragProgress(0);
    setFlightPhase('idle');
    setIsSending(false);

    return () => {
      isMounted = false;
    };
  }, [isOpen, senderUid, recipientUid]);

  // Auto-save draft on changes
  useEffect(() => {
    if (!isOpen || !senderUid || !recipientUid || flightPhase !== 'idle') return;

    const timeout = setTimeout(() => {
      if (body.trim() || originCity) {
        saveLetterDraft(senderUid, recipientUid, {
          body,
          originCityId: originCity?.id || null,
          originCityLabel: originCity?.name || null,
          rememberCity,
        });
      }
    }, 350);

    return () => clearTimeout(timeout);
  }, [body, originCity, rememberCity, isOpen, senderUid, recipientUid, flightPhase]);

  // Grapheme calculation
  const graphemeCount = useMemo(() => countGraphemes(body), [body]);
  const isOverLimit = graphemeCount > MAX_LETTER_GRAPHEMES;
  const isBodyEmpty = !body.trim();
  const canSend = !isBodyEmpty && !isOverLimit && !isSending && flightPhase === 'idle';

  const handleBodyChange = (e) => {
    const val = e.target.value;
    const count = countGraphemes(val);
    if (count <= MAX_LETTER_GRAPHEMES + 10) {
      setBody(val);
    }
  };

  const handleSelectCity = (city) => {
    setOriginCity(city);
    if (rememberCity && city && senderUid) {
      saveLocalLetterPreference(senderUid, {
        cityId: city.id,
        cityLabel: city.name,
        cityVisibility: 'public',
      });
    }
  };

  // Trigger send action with physical paper animation sequence
  const executeSend = useCallback(async () => {
    if (!canSend) return;
    setIsSending(true);

    // Check reduced motion
    const prefersReducedMotion = typeof window !== 'undefined' &&
      window.matchMedia?.('(prefers-reduced-motion: reduce)')?.matches;

    if (prefersReducedMotion) {
      setFlightPhase('complete');
    } else {
      // Step 1: Folding (200ms)
      setFlightPhase('folding');
      // Step 2: Flying (500ms)
      setTimeout(() => setFlightPhase('flying'), 200);
      // Step 3: Arrival halo effect at recipient avatar (300ms)
      setTimeout(() => setFlightPhase('arrival'), 700);
      // Step 4: Completion (250ms)
      setTimeout(() => setFlightPhase('complete'), 1000);
    }

    try {
      const sent = await sendLetterCommand({
        senderUid,
        recipientUid,
        body,
        originCityId: originCity?.id || null,
        originCityLabel: originCity?.name || null,
        destinationCityId: recipient?.letterCityId || null,
        destinationCityLabel: recipient?.letterCityLabel || null,
        rememberCity,
      });

      await clearLetterDraft(senderUid, recipientUid);

      if (typeof onLetterSent === 'function') {
        onLetterSent(sent);
      }

      toast.success('Letter sent across the skies', {
        description: originCity?.name ? `Mailed from ${originCity.name}` : undefined,
      });

      setTimeout(() => {
        onClose();
      }, prefersReducedMotion ? 200 : 1250);
    } catch (err) {
      console.error('[LetterComposer] Send failed:', err);
      toast.error(err?.message || 'Could not deliver letter. Saved to outbox.');
      setFlightPhase('idle');
      setIsSending(false);
      setDragProgress(0);
    }
  }, [canSend, senderUid, recipientUid, body, originCity, recipient, rememberCity, onLetterSent, onClose]);

  // Tactile Drag-To-Send gesture handlers
  const handlePointerDown = (e) => {
    if (!canSend || flightPhase !== 'idle') return;
    setIsDragging(true);
    dragStartYRef.current = e.clientY || e.touches?.[0]?.clientY || 0;
  };

  const handlePointerMove = (e) => {
    if (!isDragging || !canSend || flightPhase !== 'idle') return;
    const currentY = e.clientY || e.touches?.[0]?.clientY || 0;
    const deltaY = dragStartYRef.current - currentY;
    const progress = Math.min(Math.max(deltaY / 160, 0), 1);
    setDragProgress(progress);

    if (progress >= 0.85 && flightPhase === 'idle') {
      if (typeof navigator !== 'undefined' && typeof navigator.vibrate === 'function') {
        navigator.vibrate(12);
      }
      setIsDragging(false);
      executeSend();
    }
  };

  const handlePointerUp = () => {
    if (!isDragging) return;
    setIsDragging(false);
    if (dragProgress < 0.85) {
      setDragProgress(0);
    }
  };

  if (!isOpen) return null;

  // Progressive fold parameters based on drag progress
  // 0–20%: paper follows pointer
  // 20–40%: bottom corners fold inward
  // 40–65%: side folds form
  // 65–85%: triangular paper-plane silhouette
  // 85%+: send armed
  const isFlying = flightPhase === 'flying' || flightPhase === 'arrival' || flightPhase === 'complete';
  const isArrival = flightPhase === 'arrival' || flightPhase === 'complete';

  // Dynamic transforms
  const translateY = isFlying ? -450 : -dragProgress * 90;
  const scale = isFlying ? 0.25 : (1 - dragProgress * 0.2);
  const foldRotationX = isFlying ? 75 : (dragProgress * 60);
  const opacity = flightPhase === 'complete' ? 0 : (isFlying ? 0.7 : 1);

  // Recipient info
  const recipientName = recipient?.displayName || recipient?.fullName || (recipient?.username ? `@${recipient.username}` : 'Discuss Member');
  const recipientHandle = recipient?.username ? `@${recipient.username}` : '';

  const modalContent = (
    <div
      className="fixed inset-0 z-[9999] flex flex-col bg-neutral-950/90 dark:bg-black/95 backdrop-blur-md select-none text-neutral-100"
      style={{
        height: '100dvh',
        paddingTop: 'env(safe-area-inset-top, 0px)',
        paddingBottom: 'env(safe-area-inset-bottom, 0px)',
      }}
      onPointerMove={handlePointerMove}
      onPointerUp={handlePointerUp}
      onTouchMove={handlePointerMove}
      onTouchEnd={handlePointerUp}
    >
      {/* Top Header Bar */}
      <div className="w-full max-w-xl mx-auto px-4 h-14 flex items-center justify-between shrink-0 border-b border-white/10">
        <button
          type="button"
          onClick={onClose}
          disabled={isSending}
          className="flex items-center gap-1.5 text-xs font-semibold text-neutral-300 hover:text-white transition-colors cursor-pointer disabled:opacity-50"
          aria-label="Back to messages"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Letter</span>
        </button>

        <button
          type="button"
          onClick={onClose}
          disabled={isSending}
          className="p-1.5 text-neutral-400 hover:text-white rounded-full hover:bg-white/10 transition-colors cursor-pointer disabled:opacity-50"
          aria-label="Close composer"
        >
          <X className="w-4 h-4" />
        </button>
      </div>

      {/* Main Content Container with hidden scrollbar */}
      <div 
        className="flex-1 overflow-y-auto px-4 py-3 flex flex-col items-center justify-start w-full max-w-xl mx-auto"
        style={{
          scrollbarWidth: 'none',
          msOverflowStyle: 'none',
        }}
      >
        {/* Recipient Header with Arrival Proximity Halo */}
        <div className="flex flex-col items-center mb-4 mt-1 relative">
          <div
            className={`relative rounded-full transition-all duration-300 ${
              isArrival ? 'scale-105' : 'scale-100'
            }`}
          >
            {/* Arrival Dual Gradient Rings (Discuss Red / Blue) */}
            {isArrival && (
              <>
                <div 
                  className="absolute -inset-2.5 rounded-full animate-ping pointer-events-none opacity-60"
                  style={{
                    background: 'radial-gradient(circle, rgba(239,68,68,0.4) 0%, rgba(59,130,246,0.3) 100%)',
                    animationDuration: '1.2s',
                  }}
                />
                <div 
                  className="absolute -inset-1.5 rounded-full border-2 border-blue-500/80 animate-pulse pointer-events-none"
                />
              </>
            )}

            {/* 44px - 48px Target Avatar */}
            <div className="w-12 h-12 rounded-full ring-2 ring-white/20 shadow-md flex items-center justify-center overflow-hidden">
              <UserAvatar user={recipient} size="md" className="w-12 h-12 rounded-full object-cover" />
            </div>
          </div>

          <div className="flex items-center gap-1.5 mt-2">
            <span className="text-sm font-semibold text-white truncate max-w-[200px]">
              {recipientName}
            </span>
            {recipient && <VerifiedBadge user={recipient} size="xs" />}
          </div>

          {recipientHandle && (
            <span className="text-xs text-neutral-400">
              {recipientHandle}
            </span>
          )}

          {/* Neutral City Selector Pill */}
          <div className="mt-2 flex items-center gap-2">
            <button
              type="button"
              onClick={() => setIsCityPickerOpen(true)}
              className="inline-flex items-center gap-1 text-[11px] font-medium text-neutral-300 hover:text-white bg-white/10 hover:bg-white/15 px-2.5 py-1 rounded-full border border-white/10 transition-colors cursor-pointer"
            >
              <MapPin className="w-3 h-3 text-neutral-400" />
              <span>{originCity ? `From: ${originCity.name}` : 'From: Add City'}</span>
              <ChevronDown className="w-3 h-3 opacity-60 ml-0.5" />
            </button>

            {recipient?.letterCityLabel && (
              <span className="text-[11px] text-neutral-400 bg-white/5 px-2 py-0.5 rounded-full border border-white/5">
                To: {recipient.letterCityLabel}
              </span>
            )}
          </div>
        </div>

        {/* Route Animation preview */}
        {originCity?.name && recipient?.letterCityLabel && (
          <div className="w-full mb-3">
            <LetterRouteAnimation
              originCityLabel={originCity.name}
              originCityId={originCity.id}
              destinationCityLabel={recipient.letterCityLabel}
              destinationCityId={recipient.letterCityId}
            />
          </div>
        )}

        {/* Tactile Letter Paper Container */}
        <div
          ref={letterSheetRef}
          onPointerDown={handlePointerDown}
          style={{
            transform: `perspective(1000px) translateY(${translateY}px) scale(${scale}) rotateX(${foldRotationX}deg)`,
            opacity,
            transition: isDragging ? 'none' : 'transform 0.4s cubic-bezier(0.16, 1, 0.3, 1), opacity 0.3s ease',
            transformOrigin: 'top center',
          }}
          className="w-full bg-[#fcfaf4] dark:bg-[#1c1a17] text-neutral-900 dark:text-neutral-100 rounded-xl shadow-xl border border-neutral-200/80 dark:border-neutral-800 overflow-hidden flex flex-col relative touch-none"
        >
          {/* Paper Texture Overlay */}
          <div className="absolute inset-0 opacity-[0.03] dark:opacity-[0.05] pointer-events-none bg-[radial-gradient(#000_1px,transparent_1px)] [background-size:16px_16px]" />

          {/* Letter Top Metadata */}
          <div className="px-4 py-2.5 border-b border-neutral-200/60 dark:border-neutral-800/70 flex items-center justify-between relative z-10 text-xs text-neutral-400 dark:text-neutral-500">
            <span className="tracking-widest font-semibold text-[10px] uppercase">
              DISCUSS LETTER
            </span>
            <span>
              {new Date().toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}
            </span>
          </div>

          {/* Writing Surface */}
          <div className="p-4 sm:p-5 flex-1 relative z-10">
            <textarea
              ref={textareaRef}
              value={body}
              onChange={handleBodyChange}
              disabled={isSending}
              placeholder="Write something worth keeping"
              rows={4}
              maxLength={200}
              className="w-full bg-transparent border-0 resize-none font-['Caveat'] text-2xl sm:text-[26px] leading-relaxed text-neutral-900 dark:text-neutral-100 placeholder-neutral-400/60 dark:placeholder-neutral-600 focus:outline-none focus:ring-0 select-text"
              style={{ minHeight: '120px' }}
            />

            {/* Character / Grapheme Counter (150 max) */}
            <div className="flex items-center justify-between pt-3 border-t border-neutral-200/50 dark:border-neutral-800/60 text-xs">
              <span className="text-[11px] text-neutral-400 dark:text-neutral-500">
                Handwritten note
              </span>
              <span
                className={`text-xs font-mono font-medium ${
                  isOverLimit
                    ? 'text-red-500 font-bold'
                    : graphemeCount >= 135
                    ? 'text-amber-500'
                    : 'text-neutral-400 dark:text-neutral-500'
                }`}
              >
                {graphemeCount} / {MAX_LETTER_GRAPHEMES}
              </span>
            </div>
          </div>

          {/* Tactile Drag Hint or Fold State Bar */}
          <div className="py-2.5 px-4 bg-neutral-100/70 dark:bg-neutral-900/80 border-t border-neutral-200/50 dark:border-neutral-800/60 flex items-center justify-center gap-2 cursor-grab active:cursor-grabbing text-neutral-500 dark:text-neutral-400 text-xs font-medium">
            <div className="w-8 h-1 rounded-full bg-neutral-300 dark:bg-neutral-700" />
            <span className="text-[11px]">
              {dragProgress > 0.5 ? 'Release to send into the skies' : 'Drag up to fold & send'}
            </span>
          </div>
        </div>

        {/* Accessible Send Fallback Button (always accessible for keyboard & non-gesture users) */}
        <div className="w-full mt-4 flex flex-col items-center gap-2 pb-6">
          <button
            type="button"
            onClick={executeSend}
            disabled={!canSend}
            className="w-full py-3 px-4 bg-neutral-100 hover:bg-white text-neutral-900 text-xs font-semibold rounded-xl transition-all active:scale-[0.99] disabled:opacity-40 disabled:cursor-not-allowed flex items-center justify-center gap-2 cursor-pointer shadow-sm"
          >
            <Send className="w-3.5 h-3.5" />
            <span>Send Letter</span>
          </button>
          <span className="text-[10px] text-neutral-500">
            Letters arrive quiet and personal.
          </span>
        </div>
      </div>

      {/* City Picker Modal */}
      {isCityPickerOpen && (
        <CityPickerModal
          isOpen={isCityPickerOpen}
          onClose={() => setIsCityPickerOpen(false)}
          onSelectCity={handleSelectCity}
          initialCity={originCity}
        />
      )}
    </div>
  );

  return typeof document !== 'undefined'
    ? createPortal(modalContent, document.body)
    : modalContent;
}
