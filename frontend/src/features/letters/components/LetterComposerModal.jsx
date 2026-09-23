import React, { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { X, ArrowLeft, MapPin, Send, ChevronDown, Clock } from 'lucide-react';
import UserAvatar from '@/components/UserAvatar';
import VerifiedBadge from '@/components/VerifiedBadge';
import CityPickerModal from './CityPickerModal';
import LetterRouteAnimation from './LetterRouteAnimation';
import PaperFoldPlane from './PaperFoldPlane';
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

  // Blocked / Pending Non-Friend notice toast state
  const [blockedNotice, setBlockedNotice] = useState(null);

  // Gesture & flight state machine
  const [dragProgress, setDragProgress] = useState(0); // 0 to 1
  const [isDragging, setIsDragging] = useState(false);
  const [flightPhase, setFlightPhase] = useState('idle'); // 'idle' | 'folding' | 'flying' | 'arrival' | 'complete'
  const [targetAvatarRect, setTargetAvatarRect] = useState(null);

  const dragStartYRef = useRef(0);
  const avatarWrapperRef = useRef(null);
  const textareaRef = useRef(null);
  const rafMoveRef = useRef(null);

  const senderUid = currentUser?.id || currentUser?.uid;
  const recipientUid = recipient?.id || recipient?.uid;

  // Measure recipient avatar coordinates for exact trajectory calculations
  const updateAvatarRect = useCallback(() => {
    if (avatarWrapperRef.current) {
      const rect = avatarWrapperRef.current.getBoundingClientRect();
      setTargetAvatarRect({
        left: rect.left,
        top: rect.top,
        width: rect.width,
        height: rect.height,
      });
    }
  }, []);

  useEffect(() => {
    if (isOpen) {
      updateAvatarRect();
      const timer = setTimeout(updateAvatarRect, 100);
      window.addEventListener('resize', updateAvatarRect);
      return () => {
        clearTimeout(timer);
        window.removeEventListener('resize', updateAvatarRect);
      };
    }
  }, [isOpen, updateAvatarRect]);

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
    setBlockedNotice(null);

    return () => {
      isMounted = false;
    };
  }, [isOpen, senderUid, recipientUid]);

  // Auto-save draft on changes (preserved in blocked / idle states)
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
  const canSend = !isBodyEmpty && !isOverLimit && !isSending && flightPhase === 'idle' && !blockedNotice;

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

  // Trigger send action with authentic folding + flight sequence
  const executeSend = useCallback(async () => {
    if (!canSend) return;
    setIsSending(true);
    updateAvatarRect();

    // Check reduced motion
    const prefersReducedMotion = typeof window !== 'undefined' &&
      window.matchMedia?.('(prefers-reduced-motion: reduce)')?.matches;

    // Phase 1: Snap fold complete (200ms)
    setFlightPhase('folding');

    const startFlightTimer = setTimeout(() => {
      // Phase 2: Glide flight (650ms)
      setFlightPhase('flying');
    }, prefersReducedMotion ? 0 : 200);

    try {
      const sentPromise = sendLetterCommand({
        senderUid,
        recipientUid,
        body,
        originCityId: originCity?.id || null,
        originCityLabel: originCity?.name || null,
        destinationCityId: recipient?.letterCityId || null,
        destinationCityLabel: recipient?.letterCityLabel || null,
        rememberCity,
      });

      const sent = await sentPromise;

      // Clean local draft only on confirmed dispatch
      await clearLetterDraft(senderUid, recipientUid);

      if (typeof onLetterSent === 'function') {
        onLetterSent(sent);
      }

      // Phase 3: Arrival halo effect at recipient avatar
      if (!prefersReducedMotion) {
        setTimeout(() => {
          setFlightPhase('arrival');
          if (typeof navigator !== 'undefined' && typeof navigator.vibrate === 'function') {
            navigator.vibrate(10);
          }
        }, 850);
      }

      // Phase 4: Auto-close composer automatically after flight
      setTimeout(() => {
        setFlightPhase('complete');
        onClose();
      }, prefersReducedMotion ? 150 : 1150);

    } catch (err) {
      clearTimeout(startFlightTimer);
      const isPendingNonFriend = err?.code === 'pending-unopened-letter' ||
        err?.code === 'PENDING_NON_FRIEND_LETTER' ||
        err?.domainResult === 'PENDING_LETTER_EXISTS' ||
        err?.status === 429 ||
        err?.isPolicyRejection ||
        err?.message?.includes('already sent a Letter') ||
        err?.message?.includes('Wait for them to open');

      if (isPendingNonFriend) {
        // Race condition / server rejection:
        // 1. Do NOT play flight
        // 2. Do NOT mark Sent
        // 3. Preserve draft locally (clearLetterDraft is skipped)
        // 4. Show compact notice panel
        // 5. Hold notice ~1.2s
        // 6. Automatically close composer
        setFlightPhase('idle');
        setIsSending(false);
        setDragProgress(0);

        setBlockedNotice(
          "You've already sent a Letter.\nWait for them to open it before sending another."
        );

        setTimeout(() => {
          onClose();
        }, 1200);
      } else {
        console.error('[LetterComposer] Send failed:', err);
        toast.error(err?.message || 'Could not deliver letter. Saved to outbox.');
        setFlightPhase('idle');
        setIsSending(false);
        setDragProgress(0);
      }
    }
  }, [canSend, senderUid, recipientUid, body, originCity, recipient, rememberCity, onLetterSent, onClose, updateAvatarRect]);

  // Pointer event handlers with RAF for fluid 60fps tracking
  const handlePointerDown = (e) => {
    if (!canSend || flightPhase !== 'idle') return;
    setIsDragging(true);
    dragStartYRef.current = e.clientY || e.touches?.[0]?.clientY || 0;
  };

  const handlePointerMove = (e) => {
    if (!isDragging || !canSend || flightPhase !== 'idle') return;
    const clientY = e.clientY || e.touches?.[0]?.clientY || 0;

    if (rafMoveRef.current) cancelAnimationFrame(rafMoveRef.current);
    rafMoveRef.current = requestAnimationFrame(() => {
      const deltaY = dragStartYRef.current - clientY;
      // 160px drag distance for 100% fold
      const progress = Math.min(Math.max(deltaY / 160, 0), 1);
      setDragProgress(progress);

      // Above 85% threshold: arm send commit
      if (progress >= 0.85 && flightPhase === 'idle' && !isSending) {
        if (typeof navigator !== 'undefined' && typeof navigator.vibrate === 'function') {
          navigator.vibrate(12);
        }
        setIsDragging(false);
        executeSend();
      }
    });
  };

  const handlePointerUp = () => {
    if (!isDragging) return;
    setIsDragging(false);
    if (dragProgress < 0.85) {
      setDragProgress(0);
    }
  };

  if (!isOpen) return null;

  // Recipient profile loading state
  const isProfileResolving = !recipient || (!recipient.displayName && !recipient.username && !recipient.isDeleted);
  const recipientName = recipient?.isDeleted
    ? 'Deleted user'
    : (recipient?.displayName || recipient?.fullName || (recipient?.username ? `@${recipient.username}` : 'Discuss Member'));
  const recipientHandle = (!recipient?.isDeleted && recipient?.username) ? `@${recipient.username}` : '';

  const isArrival = flightPhase === 'arrival' || flightPhase === 'complete';
  const isFlying = flightPhase === 'flying' || flightPhase === 'arrival' || flightPhase === 'complete';

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
          aria-label="Back to letters"
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
        className="flex-1 overflow-y-auto px-4 py-3 flex flex-col items-center justify-start w-full max-w-xl mx-auto relative"
        style={{
          scrollbarWidth: 'none',
          msOverflowStyle: 'none',
        }}
      >
        {/* Recipient Header with Discuss Proximity Halo */}
        <div className="flex flex-col items-center mb-4 mt-1 relative z-20">
          <div
            ref={avatarWrapperRef}
            className="relative rounded-full shrink-0"
          >
            {/* Discuss Proximity Halo: Red + Blue soft rings, 2 rings max */}
            {isArrival && (
              <>
                <div
                  className="absolute -inset-2 rounded-full pointer-events-none opacity-60 animate-ping"
                  style={{
                    background: 'radial-gradient(circle, rgba(239, 68, 68, 0.4) 0%, rgba(59, 130, 246, 0.3) 100%)',
                    animationDuration: '0.9s',
                  }}
                />
                <div
                  className="absolute -inset-1 rounded-full border border-blue-500/70 pointer-events-none animate-pulse"
                />
              </>
            )}

            {/* Target Avatar (48px) */}
            <div className="w-12 h-12 rounded-full aspect-square ring-2 ring-white/20 shadow-md flex items-center justify-center overflow-hidden bg-neutral-800 shrink-0">
              {isProfileResolving ? (
                <div className="w-12 h-12 rounded-full bg-neutral-800 animate-letters-skeleton shrink-0" />
              ) : (
                <UserAvatar user={recipient?.isDeleted ? null : recipient} className="w-full h-full" interactive={false} fit="cover" />
              )}
            </div>
          </div>

          {/* Profile Name & Handle Skeleton / Content */}
          {isProfileResolving ? (
            <div className="flex flex-col items-center gap-1.5 mt-2">
              <div className="w-24 h-3.5 bg-neutral-800 rounded animate-pulse" />
              <div className="w-16 h-2.5 bg-neutral-800/80 rounded animate-pulse" />
            </div>
          ) : (
            <>
              <div className="flex items-center gap-1.5 mt-2">
                <span className="text-sm font-semibold text-white truncate max-w-[200px]">
                  {recipientName}
                </span>
                {!recipient?.isDeleted && recipient && <VerifiedBadge user={recipient} size="xs" />}
              </div>

              {recipientHandle && (
                <span className="text-xs text-neutral-400">
                  {recipientHandle}
                </span>
              )}
            </>
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

        {/* Route Animation preview if cities present */}
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

        {/* Writing Surface & Paper Plane Morph Area */}
        <div className="w-full flex flex-col items-center relative">
          {/* While typing and at rest (dragProgress === 0 and not flying), editable textarea sits over paper */}
          {dragProgress === 0 && flightPhase === 'idle' ? (
            <div
              onPointerDown={handlePointerDown}
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

                {/* Grapheme Counter (150 max) */}
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

              {/* Tactile Drag Hint Bar */}
              <div
                onPointerDown={handlePointerDown}
                className="py-2.5 px-4 bg-neutral-100/70 dark:bg-neutral-900/80 border-t border-neutral-200/50 dark:border-neutral-800/60 flex items-center justify-center gap-2 cursor-grab active:cursor-grabbing text-neutral-500 dark:text-neutral-400 text-xs font-medium"
              >
                <div className="w-8 h-1 rounded-full bg-neutral-300 dark:bg-neutral-700" />
                <span className="text-[11px]">
                  Drag up to fold & send
                </span>
              </div>
            </div>
          ) : (
            /* During Drag and Flight: The True Morphing Paper Plane takes over! */
            <div onPointerDown={handlePointerDown} className="w-full touch-none">
              <PaperFoldPlane
                body={body}
                dateLabel={new Date().toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}
                dragProgress={dragProgress}
                flightPhase={flightPhase}
                targetAvatarRect={targetAvatarRect}
                onLaunchComplete={() => {
                  setFlightPhase('arrival');
                }}
              />
            </div>
          )}
        </div>

        {/* Accessible Send Fallback Button (always reachable for keyboard & accessibility) */}
        {!isFlying && (
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
        )}

        {/* Non-friend Rejection / Stale Pending Notice Toast */}
        {blockedNotice && (
          <div className="absolute inset-0 z-50 flex items-center justify-center p-6 bg-black/40 backdrop-blur-sm animate-in fade-in zoom-in-95 duration-200">
            <div className="w-full max-w-xs bg-neutral-900 border border-neutral-800 text-white rounded-2xl p-5 shadow-2xl flex flex-col items-center text-center space-y-2.5">
              <div className="w-9 h-9 rounded-full bg-neutral-800 text-neutral-300 flex items-center justify-center">
                <Clock className="w-4 h-4" />
              </div>
              <h4 className="text-xs font-bold text-neutral-100">
                Letter already on the way
              </h4>
              <p className="text-[11px] text-neutral-400 leading-relaxed whitespace-pre-line">
                {blockedNotice}
              </p>
            </div>
          </div>
        )}
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
