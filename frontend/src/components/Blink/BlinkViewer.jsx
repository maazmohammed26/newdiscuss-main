import React, { useEffect, useState, useCallback, useRef } from 'react';
import { createPortal } from 'react-dom';
import UserAvatar from '@/components/UserAvatar';
import { X, Lock } from 'lucide-react';
import {
  getDecryptedBlinkMedia,
  markBlinkAsViewed,
  markGroupBlinkAsViewed,
  recordBlinkScreenshot,
  isBlinkExpired
} from '@/lib/blinkService';
import './Blink.css';

export default function BlinkViewer({
  message,
  chatId,
  groupId,
  isGroup = false,
  sender,
  currentUserId,
  currentUsername,
  onClose
}) {
  const [closed, setClosed] = useState(false);
  const screenshotRecordedRef = useRef(false);
  const media = getDecryptedBlinkMedia(message?.media);
  const expired = isBlinkExpired(message);

  const handleClose = useCallback(() => {
    if (closed) return;
    setClosed(true);

    // Consume the view-once status and wipe media payload from database for 1-on-1
    if (message?.id && currentUserId) {
      if (isGroup && groupId) {
        markGroupBlinkAsViewed(groupId, message.id, currentUserId);
      } else if (chatId) {
        markBlinkAsViewed(chatId, message.id, currentUserId);
      }
    }

    onClose();
  }, [closed, message?.id, currentUserId, isGroup, groupId, chatId, onClose]);

  // Screenshot Detection on Desktop and Platforms where API/Key events are reliably detectable
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape') {
        handleClose();
        return;
      }

      // Detect PrintScreen or OS screenshot shortcut triggers
      const isPrintScreen = e.key === 'PrintScreen' || e.code === 'PrintScreen';
      const isMacScreenCapture = (e.metaKey || e.ctrlKey) && e.shiftKey && ['3', '4', '5'].includes(e.key);
      const isWinSnippingTool = (e.metaKey || e.ctrlKey) && e.shiftKey && (e.key === 'S' || e.key === 's');

      if ((isPrintScreen || isMacScreenCapture || isWinSnippingTool) && !screenshotRecordedRef.current) {
        screenshotRecordedRef.current = true;
        recordBlinkScreenshot({
          chatId,
          groupId,
          messageId: message.id,
          viewerId: currentUserId,
          viewerUsername: currentUsername,
          isGroup
        });
      }
    };

    const handleKeyUp = (e) => {
      if ((e.key === 'PrintScreen' || e.code === 'PrintScreen') && !screenshotRecordedRef.current) {
        screenshotRecordedRef.current = true;
        recordBlinkScreenshot({
          chatId,
          groupId,
          messageId: message.id,
          viewerId: currentUserId,
          viewerUsername: currentUsername,
          isGroup
        });
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);

    // Lock body scroll while viewer is open
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';

    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
      document.body.style.overflow = prevOverflow;
    };
  }, [handleClose, chatId, groupId, message?.id, currentUserId, currentUsername, isGroup]);

  if (!media?.url || expired) {
    return createPortal(
      <div className="blink-viewer-overlay" role="dialog" aria-modal="true">
        <div className="text-center p-6 max-w-sm">
          <div className="mx-auto w-12 h-12 rounded-full bg-neutral-900 flex items-center justify-center text-neutral-400 mb-4 border border-neutral-800">
            <Lock className="w-6 h-6" />
          </div>
          <h3 className="text-lg font-bold text-white mb-2">Blink Expired</h3>
          <p className="text-sm text-neutral-400 mb-6">
            This Blink is no longer available because its 24-hour viewing window has ended.
          </p>
          <button
            type="button"
            onClick={handleClose}
            className="rounded-full bg-white px-6 py-2.5 text-sm font-bold text-neutral-950 hover:bg-neutral-200 transition-colors"
          >
            Close
          </button>
        </div>
      </div>,
      document.body
    );
  }

  return createPortal(
    <div
      className="blink-viewer-overlay"
      role="dialog"
      aria-modal="true"
      aria-label="View Once Photo"
      onClick={handleClose}
    >
      {/* Top Header */}
      <div
        className="blink-viewer-header"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center gap-3">
          <UserAvatar
            src={sender?.photo_url}
            username={sender?.username || message.senderName || 'Discuss User'}
            className="w-9 h-9 ring-1 ring-white/20"
          />
          <div className="flex flex-col">
            <span className="text-sm font-bold text-white">
              {sender?.username || message.senderName || 'Friend'}
            </span>
            <span className="text-[11px] font-medium text-neutral-400">
              View once
            </span>
          </div>
        </div>

        <button
          type="button"
          onClick={handleClose}
          aria-label="Close Blink"
          className="p-2 rounded-full bg-black/40 text-white hover:bg-white/20 transition-all active:scale-95"
        >
          <X className="w-6 h-6" />
        </button>
      </div>

      {/* Complete photo, perfectly fitted without forced zoom, cropping, or stretching */}
      <div
        className="blink-viewer-content"
        onClick={(e) => e.stopPropagation()}
      >
        <img
          src={media.url}
          alt="Blink photo"
          className="blink-viewer-photo"
          loading="eager"
          draggable="false"
          onContextMenu={(e) => e.preventDefault()}
        />

        {/* Elegant subtle watermark */}
        <div className="blink-watermark">
          Blink
        </div>
      </div>
    </div>,
    document.body
  );
}
