import React, { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import { X, MapPin, Send, AlertCircle, Sparkles, ChevronDown } from 'lucide-react';
import UserAvatar from '@/components/UserAvatar';
import VerifiedBadge from '@/components/VerifiedBadge';
import CityPickerModal from './CityPickerModal';
import LetterRouteAnimation from './LetterRouteAnimation';
import { countGraphemes, validateLetterBody, MAX_LETTER_GRAPHEMES } from '../utils/graphemeCounter';
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
  const [isLaunching, setIsLaunching] = useState(false);
  const dragStartYRef = useRef(0);
  const letterSheetRef = useRef(null);
  const textareaRef = useRef(null);

  const senderUid = currentUser?.id || currentUser?.uid;
  const recipientUid = recipient?.id || recipient?.uid;

  // Load existing draft & sender's saved city preference
  useEffect(() => {
    if (!isOpen || !senderUid || !recipientUid) return;

    let isMounted = true;
    (async () => {
      // 1. Check composite draft
      const draft = await getLetterDraft(senderUid, recipientUid);
      if (isMounted && draft) {
        setBody(draft.body || '');
        if (draft.originCityLabel) {
          setOriginCity({ id: draft.originCityId, name: draft.originCityLabel });
        }
        setRememberCity(Boolean(draft.rememberCity));
      } else if (isMounted) {
        // 2. Check user's saved city preference
        const savedPref = await getLocalLetterPreference(senderUid);
        if (savedPref?.cityLabel) {
          setOriginCity({ id: savedPref.cityId, name: savedPref.cityLabel });
          setRememberCity(true);
        }
      }
    })();

    setDragProgress(0);
    setIsLaunching(false);
    setIsSending(false);

    return () => {
      isMounted = false;
    };
  }, [isOpen, senderUid, recipientUid]);

  // Auto-save draft on changes
  useEffect(() => {
    if (!isOpen || !senderUid || !recipientUid || isLaunching) return;

    const timeout = setTimeout(() => {
      if (body.trim() || originCity) {
        saveLetterDraft(senderUid, recipientUid, {
          body,
          originCityId: originCity?.id || null,
          originCityLabel: originCity?.name || null,
          rememberCity,
        });
      }
    }, 400);

    return () => clearTimeout(timeout);
  }, [body, originCity, rememberCity, isOpen, senderUid, recipientUid, isLaunching]);

  // Grapheme calculation
  const graphemeCount = useMemo(() => countGraphemes(body), [body]);
  const isOverLimit = graphemeCount > MAX_LETTER_GRAPHEMES;
  const isBodyEmpty = !body.trim();
  const canSend = !isBodyEmpty && !isOverLimit && !isSending && !isLaunching;

  const handleBodyChange = (e) => {
    const val = e.target.value;
    const count = countGraphemes(val);
    // Allow typing up to limit + 5 so user can backspace cleanly
    if (count <= MAX_LETTER_GRAPHEMES + 5) {
      setBody(val);
    }
  };

  // City selection
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

  // Trigger send action
  const executeSend = useCallback(async () => {
    if (!canSend) return;
    setIsSending(true);
    setIsLaunching(true);

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

      // Clear composite draft upon successful dispatch
      await clearLetterDraft(senderUid, recipientUid);

      if (typeof onLetterSent === 'function') {
        onLetterSent(sent);
      }

      toast.success('Letter sent across the skies!', {
        description: originCity?.name ? `Mailed from ${originCity.name}` : undefined,
      });

      setTimeout(() => {
        onClose();
      }, 700);
    } catch (err) {
      console.error('[LetterComposer] Send failed:', err);
      toast.error(err?.message || 'Could not deliver letter. Saved to outbox.');
      setIsLaunching(false);
      setIsSending(false);
      setDragProgress(0);
    }
  }, [canSend, senderUid, recipientUid, body, originCity, recipient, rememberCity, onLetterSent, onClose]);

  // Pointer / Touch Drag gesture handlers for tactile fold
  const handlePointerDown = (e) => {
    if (!canSend || isLaunching) return;
    setIsDragging(true);
    dragStartYRef.current = e.clientY || e.touches?.[0]?.clientY || 0;
  };

  const handlePointerMove = (e) => {
    if (!isDragging || !canSend || isLaunching) return;
    const currentY = e.clientY || e.touches?.[0]?.clientY || 0;
    const deltaY = dragStartYRef.current - currentY;
    // Max drag required is 180px
    const progress = Math.min(Math.max(deltaY / 180, 0), 1);
    setDragProgress(progress);

    if (progress >= 0.95 && !isLaunching) {
      setIsDragging(false);
      executeSend();
    }
  };

  const handlePointerUp = () => {
    if (!isDragging) return;
    setIsDragging(false);
    if (dragProgress < 0.95) {
      setDragProgress(0);
    }
  };

  if (!isOpen) return null;

  // CSS 3D transforms for physical paper folding effect
  const foldRotation = dragProgress * 65; // Fold up to 65deg
  const sheetScale = 1 - dragProgress * 0.25; // Scale down into paper plane
  const planeTranslateY = isLaunching ? -600 : -dragProgress * 120;
  const avatarHaloOpacity = Math.min(dragProgress * 1.5, 1);
  const avatarGlowSpread = dragProgress * 24;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/75 backdrop-blur-md animate-in fade-in duration-200"
      onPointerMove={handlePointerMove}
      onPointerUp={handlePointerUp}
      onTouchMove={handlePointerMove}
      onTouchEnd={handlePointerUp}
    >
      <div className="w-full max-w-lg flex flex-col items-center select-none">
        
        {/* Recipient Avatar Proximity Halo */}
        <div className="flex flex-col items-center mb-3 relative">
          <div
            className="relative rounded-full transition-all duration-150"
            style={{
              boxShadow: `0 0 ${avatarGlowSpread}px rgba(245, 158, 11, ${avatarHaloOpacity})`,
            }}
          >
            {avatarHaloOpacity > 0.3 && (
              <div
                className="absolute -inset-2 rounded-full border border-amber-400/60 animate-ping pointer-events-none"
                style={{ animationDuration: '1.8s' }}
              />
            )}
            <UserAvatar user={recipient} size="lg" className="ring-2 ring-white/20 shadow-xl" />
          </div>

          <div className="flex items-center gap-1.5 mt-2">
            <span className="text-sm font-semibold text-white truncate max-w-[180px]">
              {recipient?.displayName || recipient?.username || 'Discuss Member'}
            </span>
            {recipient && <VerifiedBadge user={recipient} size="xs" />}
          </div>

          <span className="text-xs text-zinc-400">
            @{recipient?.username || 'member'}
          </span>

          {recipient?.letterCityLabel && (
            <div className="mt-1 flex items-center gap-1 text-[11px] text-amber-300 bg-amber-500/10 px-2 py-0.5 rounded-full border border-amber-500/20">
              <MapPin className="w-3 h-3" />
              <span>{recipient.letterCityLabel}</span>
            </div>
          )}
        </div>

        {/* Tactile Letter Paper Container */}
        <div
          ref={letterSheetRef}
          style={{
            transform: `perspective(1000px) rotateX(${foldRotation}deg) scale(${sheetScale}) translateY(${planeTranslateY}px)`,
            transition: isDragging ? 'none' : 'transform 0.4s cubic-bezier(0.16, 1, 0.3, 1)',
            transformOrigin: 'top center',
          }}
          className="w-full bg-[#fcfaf2] dark:bg-[#1c1a17] text-zinc-800 dark:text-zinc-100 rounded-2xl shadow-2xl border border-amber-900/15 dark:border-amber-500/15 overflow-hidden flex flex-col relative"
        >
          {/* Paper Texture Overlay */}
          <div className="absolute inset-0 opacity-[0.03] dark:opacity-[0.06] pointer-events-none bg-[radial-gradient(#000_1px,transparent_1px)] [background-size:16px_16px]" />

          {/* Letter Top Navigation Bar */}
          <div className="flex items-center justify-between px-4 py-3 border-b border-amber-900/10 dark:border-amber-500/10 relative z-10">
            <div className="flex items-center gap-2">
              <span className="text-xs font-serif font-medium tracking-wide uppercase text-amber-900/60 dark:text-amber-400/60">
                Discuss Letter
              </span>
              <span className="text-zinc-300 dark:text-zinc-700">•</span>
              {/* Origin city pill */}
              <button
                type="button"
                onClick={() => setIsCityPickerOpen(true)}
                className="inline-flex items-center gap-1 text-xs font-medium text-amber-700 dark:text-amber-400 bg-amber-500/10 hover:bg-amber-500/20 px-2.5 py-1 rounded-full border border-amber-500/20 transition-colors"
              >
                <MapPin className="w-3 h-3" />
                <span>{originCity ? `From: ${originCity.name}` : 'From: Add City'}</span>
                <ChevronDown className="w-3 h-3 ml-0.5 opacity-60" />
              </button>
            </div>

            <button
              type="button"
              onClick={onClose}
              className="p-1 text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-200 rounded-lg hover:bg-black/5 dark:hover:bg-white/5 transition-colors"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          {/* Flight trajectory preview if cities are defined */}
          {originCity?.name && recipient?.letterCityLabel && (
            <LetterRouteAnimation
              originCityLabel={originCity.name}
              originCityId={originCity.id}
              destinationCityLabel={recipient.letterCityLabel}
              destinationCityId={recipient.letterCityId}
              className="border-b border-amber-900/5 dark:border-amber-500/10 py-1 bg-amber-500/[0.02]"
            />
          )}

          {/* Handwritten Body Area */}
          <div className="p-5 flex-1 relative z-10">
            <textarea
              ref={textareaRef}
              value={body}
              onChange={handleBodyChange}
              placeholder="Write something thoughtful... letters move slowly and stay meaningful."
              rows={5}
              autoFocus
              className="w-full bg-transparent resize-none focus:outline-none font-['Caveat'] text-2xl sm:text-[26px] leading-relaxed text-zinc-800 dark:text-zinc-100 placeholder-zinc-400/60"
            />
          </div>

          {/* Bottom Controls Bar */}
          <div className="px-5 py-3.5 border-t border-amber-900/10 dark:border-amber-500/10 bg-amber-500/[0.02] flex items-center justify-between relative z-10">
            {/* Unicode Grapheme Counter */}
            <div className="flex items-center gap-2">
              <div
                className={`text-xs font-mono font-medium ${
                  isOverLimit
                    ? 'text-red-500 font-bold'
                    : graphemeCount > 130
                    ? 'text-amber-500'
                    : 'text-zinc-400'
                }`}
              >
                {graphemeCount} / {MAX_LETTER_GRAPHEMES}
              </div>
              {isOverLimit && (
                <span className="text-[11px] text-red-500 flex items-center gap-1">
                  <AlertCircle className="w-3 h-3" />
                  Too long
                </span>
              )}
            </div>

            {/* Accessible Send Button (Tap fallback for keyboard & screen readers) */}
            <button
              type="button"
              onClick={executeSend}
              disabled={!canSend}
              className="inline-flex items-center gap-2 px-4 py-2 bg-amber-500 hover:bg-amber-600 active:scale-95 disabled:opacity-40 disabled:pointer-events-none text-white text-xs font-semibold rounded-xl shadow-md shadow-amber-500/20 transition-all"
              aria-label="Send letter"
            >
              <Send className="w-3.5 h-3.5" />
              <span>{isSending ? 'Sending...' : 'Send Letter'}</span>
            </button>
          </div>

          {/* Upward Drag-to-Fold Handle Bar */}
          <div
            onPointerDown={handlePointerDown}
            onTouchStart={handlePointerDown}
            className={`w-full py-2.5 bg-amber-500/10 dark:bg-amber-500/5 hover:bg-amber-500/15 border-t border-amber-500/20 cursor-grab active:cursor-grabbing flex flex-col items-center justify-center transition-colors ${
              !canSend ? 'opacity-40 pointer-events-none' : ''
            }`}
          >
            <div className="w-12 h-1 rounded-full bg-amber-500/40 mb-1" />
            <div className="flex items-center gap-1 text-[11px] font-medium text-amber-700 dark:text-amber-400">
              <Sparkles className="w-3 h-3 animate-pulse" />
              <span>
                {dragProgress > 0.5 ? 'Release to launch paper plane!' : 'Swipe up to fold & launch'}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* City Picker Modal */}
      <CityPickerModal
        isOpen={isCityPickerOpen}
        onClose={() => setIsCityPickerOpen(false)}
        onSelectCity={handleSelectCity}
        selectedCity={originCity}
        rememberCity={rememberCity}
        onToggleRemember={setRememberCity}
      />
    </div>
  );
}
