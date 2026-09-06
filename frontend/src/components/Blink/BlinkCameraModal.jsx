import React, { useState, useEffect, useRef, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { useAuth } from '@/contexts/AuthContext';
import { useTheme } from '@/contexts/ThemeContext';
import { getFriendsWithDetails } from '@/lib/relationshipsDb';
import { getUserGroups } from '@/lib/groupsDb';
import { compressImage } from '@/lib/mediaUtils';
import { uploadImage } from '@/lib/cloudinary';
import { sendDirectBlink, sendGroupBlink } from '@/lib/blinkService';
import UserAvatar from '@/components/UserAvatar';
import VerifiedBadge from '@/components/VerifiedBadge';
import BlinkIntroModal, { INTRO_STORAGE_KEY } from './BlinkIntroModal';
import {
  X, RotateCcw, Send, RefreshCw, Zap, ZapOff, Check,
  Search, Users, User, AlertTriangle, Loader2
} from 'lucide-react';
import { toast } from 'sonner';
import './Blink.css';

/**
 * Verifies browser execution context before requesting camera permissions
 */
export const verifyCameraContext = () => {
  if (typeof window === 'undefined') {
    return { allowed: false, reason: 'SSR_ENV', message: 'Camera is unavailable in this environment.' };
  }

  // 1. Check secure context (HTTPS or localhost)
  if (window.isSecureContext === false) {
    return {
      allowed: false,
      reason: 'INSECURE_CONTEXT',
      message: 'Camera access requires a secure connection (HTTPS).'
    };
  }

  // 2. Check if mediaDevices API is supported
  if (!navigator?.mediaDevices?.getUserMedia) {
    return {
      allowed: false,
      reason: 'UNSUPPORTED',
      message: 'Camera is not supported on this browser or platform.'
    };
  }

  // 3. Check document feature policy if defined
  try {
    if (document.featurePolicy && typeof document.featurePolicy.allowsFeature === 'function') {
      if (!document.featurePolicy.allowsFeature('camera')) {
        return {
          allowed: false,
          reason: 'POLICY_BLOCKED',
          message: 'Camera access is restricted by document policy.'
        };
      }
    }
  } catch {
    // Ignore featurePolicy inspection errors
  }

  return { allowed: true };
};

export default function BlinkCameraModal({
  isOpen,
  onClose,
  initialRecipientId = null,
  initialGroupId = null,
  onSent
}) {
  const { user } = useAuth();
  const themeContext = useTheme();
  const isDark = themeContext?.theme === 'dark' || document.documentElement.classList.contains('dark');

  // First-time introduction state
  const [showIntro, setShowIntro] = useState(false);
  const [introChecked, setIntroChecked] = useState(false);

  // Camera state
  const [cameraActive, setCameraActive] = useState(false);
  const [cameraError, setCameraError] = useState(null);
  const [facingMode, setFacingMode] = useState('user'); // 'user' or 'environment'
  const [torchSupported, setTorchSupported] = useState(false);
  const [torchOn, setTorchOn] = useState(false);
  const videoRef = useRef(null);
  const streamRef = useRef(null);

  // Session ref to prevent race conditions and duplicate initializations
  const activeSessionRef = useRef(0);
  const isStartingRef = useRef(false);

  // Photo & Preview state
  const [capturedBlob, setCapturedBlob] = useState(null);
  const [previewUrl, setPreviewUrl] = useState(null);

  // Step state: 'camera' | 'preview' | 'recipients'
  const [step, setStep] = useState('camera');

  // Recipient selection state
  const [activeTab, setActiveTab] = useState('friends'); // 'friends' | 'groups'
  const [searchQuery, setSearchQuery] = useState('');
  const [friendsList, setFriendsList] = useState([]);
  const [groupsList, setGroupsList] = useState([]);
  const [loadingRecipients, setLoadingRecipients] = useState(false);

  // Selected targets
  const [selectedFriendIds, setSelectedFriendIds] = useState(() => (initialRecipientId ? [initialRecipientId] : []));
  const [selectedGroupId, setSelectedGroupId] = useState(() => initialGroupId || null);

  // Confirmation modal & Sending state
  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const [sending, setSending] = useState(false);

  // ── 1. First-time Introduction Check ────────────────────────
  useEffect(() => {
    if (!isOpen) return;
    try {
      const seen = localStorage.getItem(INTRO_STORAGE_KEY);
      if (!seen) {
        setShowIntro(true);
      }
    } catch {
      // Ignore storage errors
    }
    setIntroChecked(true);
  }, [isOpen]);

  // ── 2. Camera Lifecycle ──────────────────────────────────────
  const stopCameraStream = useCallback(() => {
    activeSessionRef.current++;
    isStartingRef.current = false;
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((t) => {
        try {
          t.stop();
        } catch {
          // Ignore track stop exceptions
        }
      });
      streamRef.current = null;
    }
    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }
    setCameraActive(false);
    setTorchOn(false);
    setTorchSupported(false);
  }, []);

  const startCameraStream = useCallback(async () => {
    if (isStartingRef.current) return;
    // Release a previous stream before allocating the new session id. Calling
    // stopCameraStream after allocating it invalidates the request we are just
    // about to start and causes every successful stream to be stopped.
    stopCameraStream();
    isStartingRef.current = true;
    const sessionId = ++activeSessionRef.current;
    setCameraError(null);

    // Verify browser context before requesting stream
    const contextCheck = verifyCameraContext();
    if (!contextCheck.allowed) {
      isStartingRef.current = false;
      setCameraError(contextCheck.message);
      return;
    }

    try {
      const primaryConstraints = {
        video: {
          facingMode: { ideal: facingMode },
          width: { ideal: 1920 },
          height: { ideal: 1080 }
        },
        audio: false
      };

      // One permission request per camera session. All constraints are ideals,
      // so browsers can select the closest supported camera without a second
      // getUserMedia call (important for WebKit user activation and prompts).
      const stream = await navigator.mediaDevices.getUserMedia(primaryConstraints);

      // Check if session was invalidated or modal closed while awaiting getUserMedia
      if (activeSessionRef.current !== sessionId) {
        if (stream) {
          stream.getTracks().forEach((t) => {
            try { t.stop(); } catch {}
          });
        }
        isStartingRef.current = false;
        return;
      }

      streamRef.current = stream;

      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        try {
          await videoRef.current.play();
        } catch (playErr) {
          // Play request might be interrupted by new load or require user interaction
          console.warn('[Blink Camera] Video play warning:', playErr);
        }
      }

      // Closing, flipping, or unmounting while play() was pending invalidates
      // this callback. Never revive stale camera UI state afterward.
      if (activeSessionRef.current !== sessionId) {
        stream.getTracks().forEach((track) => {
          try { track.stop(); } catch {}
        });
        return;
      }

      setCameraActive(true);

      // Check torch/flash support safely without throwing on iOS WebKit
      try {
        const videoTrack = stream.getVideoTracks()[0];
        if (typeof videoTrack?.getCapabilities === 'function') {
          const capabilities = videoTrack.getCapabilities();
          setTorchSupported(Boolean(capabilities?.torch));
        } else {
          setTorchSupported(false);
        }
      } catch {
        setTorchSupported(false);
      }
    } catch (err) {
      if (activeSessionRef.current !== sessionId) return;
      console.error('[Blink Camera] Access error:', err);
      let message = 'Unable to access camera. Please check your camera permissions.';

      const errName = err?.name || '';
      const errMsg = (err?.message || '').toLowerCase();
      const isPolicyViolation =
        errMsg.includes('permissions policy') ||
        errMsg.includes('not allowed in this document') ||
        errMsg.includes('feature policy') ||
        (typeof document !== 'undefined' && document.featurePolicy && typeof document.featurePolicy.allowsFeature === 'function' && !document.featurePolicy.allowsFeature('camera'));

      if (isPolicyViolation) {
        console.warn('[Blink Camera] Document Permissions-Policy restricts camera access on origin:', window.location.origin);
        message = 'Camera is restricted by document policy on this domain. Please ensure camera=(self) is enabled in site headers.';
      } else if (errName === 'NotAllowedError' || errName === 'PermissionDeniedError') {
        message = 'Camera permission was denied. Please allow camera access in your device or browser settings.';
      } else if (errName === 'NotFoundError' || errName === 'DevicesNotFoundError') {
        message = 'No camera device found on this system.';
      } else if (errName === 'NotReadableError' || errName === 'TrackStartError') {
        message = 'Camera is currently in use by another app or tab. Please close other apps using the camera and try again.';
      } else if (errName === 'SecurityError') {
        message = 'Camera access was blocked by browser security policy (requires HTTPS).';
      }

      setCameraError(message);
    } finally {
      // An obsolete request must not unlock a newer in-flight session.
      if (activeSessionRef.current === sessionId) {
        isStartingRef.current = false;
      }
    }
  }, [facingMode, stopCameraStream]);

  // Start camera ONLY when Blink is intentionally opened
  useEffect(() => {
    if (isOpen && introChecked && !showIntro && step === 'camera') {
      startCameraStream();
    }
    return () => {
      stopCameraStream();
    };
  }, [isOpen, introChecked, showIntro, step, facingMode, startCameraStream, stopCameraStream]);

  // Toggle Torch
  const handleToggleTorch = async () => {
    if (!streamRef.current || !torchSupported) return;
    try {
      const track = streamRef.current.getVideoTracks()[0];
      const nextTorch = !torchOn;
      await track.applyConstraints({
        advanced: [{ torch: nextTorch }]
      });
      setTorchOn(nextTorch);
    } catch (err) {
      console.error('[Blink Camera] Torch toggle failed:', err);
    }
  };

  // Flip Camera
  const handleFlipCamera = () => {
    setFacingMode((prev) => (prev === 'user' ? 'environment' : 'user'));
  };

  // ── 3. Capture Photo ─────────────────────────────────────────
  const handleCapturePhoto = () => {
    try {
      if (!videoRef.current) return;
      const video = videoRef.current;
      if (video.videoWidth === 0 || video.videoHeight === 0) return;

      const canvas = document.createElement('canvas');
      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;
      const ctx = canvas.getContext('2d');
      if (!ctx) return;

      // If front camera, mirror image to match view
      if (facingMode === 'user') {
        ctx.translate(canvas.width, 0);
        ctx.scale(-1, 1);
      }
      ctx.drawImage(video, 0, 0, canvas.width, canvas.height);

      canvas.toBlob(
        (blob) => {
          if (!blob) {
            toast.error('Failed to capture photo. Please try again.');
            return;
          }
          const url = URL.createObjectURL(blob);
          setCapturedBlob(blob);
          setPreviewUrl(url);
          stopCameraStream();
          setStep('preview');
        },
        'image/jpeg',
        0.92
      );
    } catch (err) {
      console.error('[Blink Camera] Capture error:', err);
      toast.error('Could not capture photo. Please try again.');
    }
  };

  // Retake Photo
  const handleRetake = () => {
    if (previewUrl) {
      URL.revokeObjectURL(previewUrl);
    }
    setCapturedBlob(null);
    setPreviewUrl(null);
    setStep('camera');
  };

  // ── 4. Fetch Friends & Real Groups ────────────────────────────
  const loadRecipients = useCallback(async () => {
    if (!user?.id) return;
    setLoadingRecipients(true);
    try {
      const [friends, groups] = await Promise.all([
        getFriendsWithDetails(user.id),
        getUserGroups(user.id)
      ]);
      setFriendsList(friends || []);
      setGroupsList(groups || []);
    } catch (err) {
      console.error('Error loading recipients:', err);
      toast.error('Could not load friends or groups.');
    } finally {
      setLoadingRecipients(false);
    }
  }, [user?.id]);

  const handleProceedToRecipients = () => {
    loadRecipients();
    setStep('recipients');
  };

  // ── 5. Recipient Selection Toggles ───────────────────────────
  const toggleFriendSelection = (friendId) => {
    setSelectedGroupId(null); // Deselect group if choosing individual friends
    setSelectedFriendIds((prev) =>
      prev.includes(friendId) ? prev.filter((id) => id !== friendId) : [...prev, friendId]
    );
  };

  const handleSelectAllFriends = () => {
    setSelectedGroupId(null);
    if (selectedFriendIds.length === friendsList.length) {
      setSelectedFriendIds([]);
    } else {
      setSelectedFriendIds(friendsList.map((f) => f.id));
    }
  };

  const handleSelectGroup = (groupId) => {
    setSelectedFriendIds([]); // Deselect friends if choosing a group
    setSelectedGroupId((prev) => (prev === groupId ? null : groupId));
  };

  // Filtered lists based on search query
  const filteredFriends = friendsList.filter((f) => {
    const q = searchQuery.toLowerCase().trim();
    return !q || f.username?.toLowerCase().includes(q) || f.name?.toLowerCase().includes(q);
  });

  const filteredGroups = groupsList.filter((g) => {
    const q = searchQuery.toLowerCase().trim();
    const gName = g.name || g.groupName || '';
    return !q || gName.toLowerCase().includes(q);
  });

  // Calculate recipient summary text
  const getRecipientSummary = () => {
    if (selectedGroupId) {
      const group = groupsList.find((g) => (g.id || g.groupId) === selectedGroupId);
      return group ? `Group: ${group.name || group.groupName}` : 'Group selected';
    }
    if (selectedFriendIds.length === 0) return 'No recipient selected';
    if (selectedFriendIds.length === 1) {
      const friend = friendsList.find((f) => f.id === selectedFriendIds[0]);
      return friend ? `@${friend.username}` : '1 friend selected';
    }
    if (selectedFriendIds.length === friendsList.length && friendsList.length > 0) {
      return `All Friends (${friendsList.length})`;
    }
    return `${selectedFriendIds.length} friends`;
  };

  const hasSelectedRecipient = selectedFriendIds.length > 0 || Boolean(selectedGroupId);

  // ── 6. Final Send Execution ──────────────────────────────────
  const handleConfirmSend = async () => {
    if (!capturedBlob || !user?.id) return;
    setSending(true);

    try {
      // 1. Compress photo using existing Discuss media pipeline
      const compressed = await compressImage(capturedBlob, {
        maxSizeMB: 1,
        maxWidthOrHeight: 1920,
        initialQuality: 0.85
      });

      // 2. Upload to Cloudinary under 'discuss/blink'
      const uploadResult = await uploadImage(compressed, 'blink');

      // 3. Dispatch to selected recipients
      const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString();

      if (selectedGroupId) {
        // Send to group chat
        await sendGroupBlink({
          groupId: selectedGroupId,
          senderId: user.id,
          senderUsername: user.username,
          mediaData: uploadResult
        });
      } else if (selectedFriendIds.length > 0) {
        // Register in central registry for safe multi-recipient lifecycle
        if (uploadResult.publicId) {
          const { registerBlinkMedia } = await import('@/lib/blinkService');
          await registerBlinkMedia({
            publicId: uploadResult.publicId,
            url: uploadResult.url,
            recipientIds: selectedFriendIds,
            expiresAt
          });
        }

        // Send individually to each friend's 1-on-1 chat
        await Promise.all(
          selectedFriendIds.map((recipientId) =>
            sendDirectBlink({
              senderId: user.id,
              senderUsername: user.username,
              recipientId,
              mediaData: uploadResult,
              expiresAt
            })
          )
        );
      }

      toast.success('Blink sent!');
      setShowConfirmModal(false);
      onSent?.();
      handleCloseAll();
    } catch (err) {
      console.error('Blink dispatch error:', err);
      toast.error('Failed to send Blink. Please check your connection and try again.');
    } finally {
      setSending(false);
    }
  };

  // Close & Clean up
  const handleCloseAll = () => {
    stopCameraStream();
    if (previewUrl) {
      URL.revokeObjectURL(previewUrl);
    }
    setCapturedBlob(null);
    setPreviewUrl(null);
    setStep('camera');
    setShowConfirmModal(false);
    onClose();
  };

  if (!isOpen) return null;

  return createPortal(
    <div className={`blink-overlay ${isDark ? 'dark' : 'light'}`} role="dialog" aria-modal="true">
      {/* 1. First-time Introduction Dialog */}
      {showIntro && (
        <BlinkIntroModal
          onContinue={() => setShowIntro(false)}
          onClose={handleCloseAll}
        />
      )}

      {/* 2. Main Camera / Preview / Recipient Container */}
      {!showIntro && (
        <div className={`blink-camera-container ${step === 'recipients' ? (isDark ? 'theme-dark' : 'theme-light') : ''}`}>
          {/* ── STEP 1: LIVE CAMERA ─────────────────────────────── */}
          {step === 'camera' && (
            <>
              {/* Top Controls */}
              <div className="blink-top-bar">
                <button
                  type="button"
                  onClick={handleCloseAll}
                  aria-label="Close camera"
                  className="blink-action-icon"
                >
                  <X className="w-5 h-5" />
                </button>

                <div className="flex items-center gap-2">
                  <span className="font-['Grand_Hotel'] text-white text-2xl tracking-wider select-none px-2">
                    Blink
                  </span>
                </div>

                <div className="flex items-center gap-2">
                  {torchSupported && (
                    <button
                      type="button"
                      onClick={handleToggleTorch}
                      aria-label="Toggle flash"
                      className="blink-action-icon"
                    >
                      {torchOn ? <Zap className="w-5 h-5 text-amber-300" /> : <ZapOff className="w-5 h-5" />}
                    </button>
                  )}
                  <button
                    type="button"
                    onClick={handleFlipCamera}
                    aria-label="Flip camera"
                    className="blink-action-icon"
                  >
                    <RefreshCw className="w-5 h-5" />
                  </button>
                </div>
              </div>

              {/* Viewport */}
              <div className="blink-viewport">
                {cameraError ? (
                  <div className="text-center p-6 max-w-xs">
                    <div className="w-12 h-12 rounded-full bg-neutral-900 border border-neutral-800 flex items-center justify-center text-amber-400 mx-auto mb-3">
                      <AlertTriangle className="w-6 h-6" />
                    </div>
                    <p className="text-sm font-semibold text-white mb-2">Camera Unavailable</p>
                    <p className="text-xs text-neutral-400 mb-5 leading-relaxed">{cameraError}</p>
                    <div className="flex items-center justify-center gap-2">
                      <button
                        type="button"
                        onClick={handleCloseAll}
                        className="rounded-full bg-neutral-800 px-5 py-2 text-xs font-semibold text-neutral-300 hover:bg-neutral-700 transition-colors"
                      >
                        Close
                      </button>
                      <button
                        type="button"
                        onClick={startCameraStream}
                        className="rounded-full bg-white px-5 py-2 text-xs font-bold text-neutral-950 hover:bg-neutral-200 transition-colors"
                      >
                        Try Again
                      </button>
                    </div>
                  </div>
                ) : (
                  <video
                    ref={videoRef}
                    autoPlay
                    playsInline
                    webkit-playsinline="true"
                    muted
                    className={`blink-video ${facingMode === 'user' ? 'mirror' : ''}`}
                  />
                )}
              </div>

              {/* Bottom Bar: Shutter */}
              {!cameraError && (
                <div className="blink-bottom-bar">
                  <button
                    type="button"
                    onClick={handleCapturePhoto}
                    aria-label="Take Blink photo"
                    className="blink-shutter-btn"
                  >
                    <div className="blink-shutter-inner" />
                  </button>
                </div>
              )}
            </>
          )}

          {/* ── STEP 2: PHOTO PREVIEW ───────────────────────────── */}
          {step === 'preview' && (
            <>
              {/* Top Controls */}
              <div className="blink-top-bar">
                <button
                  type="button"
                  onClick={handleRetake}
                  aria-label="Retake photo"
                  className="blink-action-icon"
                >
                  <RotateCcw className="w-5 h-5" />
                </button>

                <span className="font-['Grand_Hotel'] text-white text-2xl tracking-wider select-none">
                  Blink
                </span>

                <button
                  type="button"
                  onClick={handleCloseAll}
                  aria-label="Cancel"
                  className="blink-action-icon"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Viewport: Captured Photo */}
              <div className="blink-viewport">
                {previewUrl && (
                  <img
                    src={previewUrl}
                    alt="Blink capture preview"
                    className="blink-preview-img"
                  />
                )}
              </div>

              {/* Bottom Bar: Retake or Proceed */}
              <div className="blink-preview-bar">
                <button
                  type="button"
                  onClick={handleRetake}
                  className="blink-retake-btn"
                >
                  <RotateCcw className="w-4 h-4" />
                  Retake
                </button>

                <button
                  type="button"
                  onClick={handleProceedToRecipients}
                  className="blink-send-btn"
                >
                  Send
                  <Send className="w-4 h-4" />
                </button>
              </div>
            </>
          )}

          {/* ── STEP 3: RECIPIENT SELECTOR ──────────────────────── */}
          {step === 'recipients' && (
            <div className={`blink-selector-sheet ${isDark ? 'dark' : 'light'}`}>
              {/* Sheet Header */}
              <div className={`blink-selector-header ${isDark ? 'border-neutral-800 bg-neutral-950' : 'border-neutral-200 bg-white'}`}>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setStep('preview')}
                    className={`p-1.5 rounded-full transition-colors ${
                      isDark
                        ? 'text-neutral-300 hover:bg-neutral-800'
                        : 'text-neutral-600 hover:bg-neutral-100'
                    }`}
                    aria-label="Back to preview"
                  >
                    <X className="w-5 h-5" />
                  </button>
                  <h3 className={`font-bold text-base ${isDark ? 'text-white' : 'text-neutral-900'}`}>
                    Select Recipients
                  </h3>
                </div>

                {activeTab === 'friends' && friendsList.length > 0 && (
                  <button
                    type="button"
                    onClick={handleSelectAllFriends}
                    className="text-xs font-bold text-[#0095F6] hover:underline"
                  >
                    {selectedFriendIds.length === friendsList.length ? 'Deselect All' : 'Select All Friends'}
                  </button>
                )}
              </div>

              {/* Tabs: Friends | Groups */}
              <div className={`flex items-center px-4 pt-1 border-b ${isDark ? 'border-neutral-800 bg-neutral-950' : 'border-neutral-200 bg-white'}`}>
                <button
                  type="button"
                  onClick={() => setActiveTab('friends')}
                  className={`flex items-center gap-2 pb-2.5 px-3 text-sm font-bold border-b-2 transition-colors ${
                    activeTab === 'friends'
                      ? 'border-[#0095F6] text-[#0095F6]'
                      : isDark
                      ? 'border-transparent text-neutral-400 hover:text-white'
                      : 'border-transparent text-neutral-500 hover:text-neutral-900'
                  }`}
                >
                  <User className="w-4 h-4" />
                  Friends ({friendsList.length})
                </button>
                <button
                  type="button"
                  onClick={() => setActiveTab('groups')}
                  className={`flex items-center gap-2 pb-2.5 px-3 text-sm font-bold border-b-2 transition-colors ${
                    activeTab === 'groups'
                      ? 'border-[#0095F6] text-[#0095F6]'
                      : isDark
                      ? 'border-transparent text-neutral-400 hover:text-white'
                      : 'border-transparent text-neutral-500 hover:text-neutral-900'
                  }`}
                >
                  <Users className="w-4 h-4" />
                  Groups ({groupsList.length})
                </button>
              </div>

              {/* Search Bar */}
              <div className={`p-3 border-b ${isDark ? 'border-neutral-800 bg-neutral-950' : 'border-neutral-100 bg-neutral-50/50'}`}>
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-neutral-400" />
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder={activeTab === 'friends' ? 'Search friends...' : 'Search groups...'}
                    className={`w-full text-xs rounded-xl pl-9 pr-8 py-2.5 border transition-all focus:outline-none ${
                      isDark
                        ? 'bg-neutral-900 text-white placeholder:text-neutral-500 border-neutral-800 focus:border-[#0095F6]'
                        : 'bg-neutral-100 text-neutral-900 placeholder:text-neutral-500 border-neutral-200 focus:border-[#0095F6] focus:bg-white'
                    }`}
                  />
                  {searchQuery && (
                    <button
                      type="button"
                      onClick={() => setSearchQuery('')}
                      className="absolute right-2.5 top-1/2 -translate-y-1/2 text-neutral-400 hover:text-neutral-600 dark:hover:text-neutral-200"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>
              </div>

              {/* Recipient List Body */}
              <div className="flex-1 overflow-y-auto p-2">
                {loadingRecipients ? (
                  <div className="flex flex-col items-center justify-center h-48 text-neutral-400">
                    <Loader2 className="w-6 h-6 animate-spin mb-2 text-[#0095F6]" />
                    <p className="text-xs">Loading recipients...</p>
                  </div>
                ) : activeTab === 'friends' ? (
                  filteredFriends.length === 0 ? (
                    <div className="text-center py-12 px-4">
                      <p className={`text-sm font-semibold ${isDark ? 'text-neutral-400' : 'text-neutral-600'}`}>
                        {searchQuery ? 'No matching friends found.' : 'No friends yet.'}
                      </p>
                      <p className="text-xs text-neutral-400 dark:text-neutral-500 mt-1">
                        Only existing friends can receive individual Blinks.
                      </p>
                    </div>
                  ) : (
                    <div className="space-y-1">
                      {filteredFriends.map((friend) => {
                        const isSelected = selectedFriendIds.includes(friend.id);
                        return (
                          <div
                            key={friend.id}
                            onClick={() => toggleFriendSelection(friend.id)}
                            className={`blink-recipient-item flex items-center justify-between p-3 rounded-xl cursor-pointer transition-colors ${
                              isSelected
                                ? isDark
                                  ? 'bg-neutral-900 border border-[#0095F6]/40'
                                  : 'bg-sky-50/80 border border-[#0095F6]/30'
                                : isDark
                                ? 'hover:bg-neutral-900/60 border border-transparent'
                                : 'hover:bg-neutral-50 border border-transparent'
                            }`}
                          >
                            <div className="flex items-center gap-3 min-w-0">
                              <UserAvatar
                                src={friend.photo_url}
                                username={friend.username}
                                className="w-10 h-10 shrink-0"
                              />
                              <div className="flex flex-col min-w-0">
                                <div className="flex items-center gap-1">
                                  <span className={`text-sm font-semibold truncate ${isDark ? 'text-white' : 'text-neutral-900'}`}>
                                    {friend.username}
                                  </span>
                                  {friend.verified && <VerifiedBadge />}
                                </div>
                                <span className="text-xs text-neutral-500 dark:text-neutral-400 truncate">
                                  {friend.name || `@${friend.username}`}
                                </span>
                              </div>
                            </div>

                            <div className={`blink-checkbox ${isSelected ? 'checked' : ''} ${isDark ? 'dark-check' : 'light-check'}`}>
                              {isSelected && <Check className="w-3.5 h-3.5 text-white" />}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )
                ) : (
                  filteredGroups.length === 0 ? (
                    <div className="text-center py-12 px-4">
                      <p className={`text-sm font-semibold ${isDark ? 'text-neutral-400' : 'text-neutral-600'}`}>
                        {searchQuery ? 'No matching groups found.' : 'No groups joined yet.'}
                      </p>
                    </div>
                  ) : (
                    <div className="space-y-1">
                      {filteredGroups.map((group) => {
                        const gId = group.id || group.groupId;
                        const isSelected = selectedGroupId === gId;
                        const groupName = group.name || group.groupName || 'Group';
                        const photo = group.photo_url || group.photoUrl || group.avatar || group.image;
                        const memberCount = group.memberCount || group.membersCount || (group.members ? Object.keys(group.members).length : 1);
                        const initials = groupName.slice(0, 2).toUpperCase();

                        return (
                          <div
                            key={gId}
                            onClick={() => handleSelectGroup(gId)}
                            className={`blink-recipient-item flex items-center justify-between p-3 rounded-xl cursor-pointer transition-colors ${
                              isSelected
                                ? isDark
                                  ? 'bg-neutral-900 border border-[#0095F6]/40'
                                  : 'bg-sky-50/80 border border-[#0095F6]/30'
                                : isDark
                                ? 'hover:bg-neutral-900/60 border border-transparent'
                                : 'hover:bg-neutral-50 border border-transparent'
                            }`}
                          >
                            <div className="flex items-center gap-3 min-w-0">
                              {photo ? (
                                <img
                                  src={photo}
                                  alt={groupName}
                                  className="w-10 h-10 rounded-full object-cover shrink-0"
                                />
                              ) : (
                                <div className="w-10 h-10 rounded-full bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center text-white font-bold text-xs shrink-0 select-none">
                                  {initials}
                                </div>
                              )}
                              <div className="flex flex-col min-w-0">
                                <span className={`text-sm font-semibold truncate ${isDark ? 'text-white' : 'text-neutral-900'}`}>
                                  {groupName}
                                </span>
                                <span className="text-xs text-neutral-500 dark:text-neutral-400 truncate">
                                  {memberCount} {memberCount === 1 ? 'member' : 'members'}
                                </span>
                              </div>
                            </div>

                            <div className={`blink-checkbox ${isSelected ? 'checked' : ''} ${isDark ? 'dark-check' : 'light-check'}`}>
                              {isSelected && <Check className="w-3.5 h-3.5 text-white" />}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )
                )}
              </div>

              {/* Bottom Dispatch Footer */}
              <div className={`p-4 border-t flex items-center justify-between gap-3 ${
                isDark
                  ? 'border-neutral-800 bg-neutral-950'
                  : 'border-neutral-200 bg-white'
              }`}>
                <div className="flex flex-col min-w-0">
                  <span className="text-xs text-neutral-500 dark:text-neutral-400 font-medium">Recipient</span>
                  <span className={`text-sm font-bold truncate ${isDark ? 'text-white' : 'text-neutral-900'}`}>
                    {getRecipientSummary()}
                  </span>
                </div>

                <button
                  type="button"
                  disabled={!hasSelectedRecipient}
                  onClick={() => setShowConfirmModal(true)}
                  className="rounded-xl bg-[#0095F6] px-6 py-2.5 text-sm font-bold text-white hover:bg-[#1877F2] disabled:opacity-40 disabled:pointer-events-none shadow-sm transition-all active:scale-95"
                >
                  Send Blink
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* ── STEP 4: CONFIRMATION PROMPT ───────────────────────── */}
      {showConfirmModal && (
        <div
          className="fixed inset-0 z-[10005] flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm"
          role="dialog"
          aria-modal="true"
        >
          <div className={`w-full max-w-sm rounded-2xl border p-6 shadow-2xl ${
            isDark
              ? 'border-neutral-800 bg-neutral-950 text-white'
              : 'border-neutral-200 bg-white text-neutral-900'
          }`}>
            <h3 className={`text-base font-bold ${isDark ? 'text-white' : 'text-neutral-900'}`}>
              Send this Blink?
            </h3>

            <p className={`mt-2 text-sm font-medium ${isDark ? 'text-neutral-300' : 'text-neutral-600'}`}>
              Once sent, this Blink cannot be undone.
            </p>

            <div className={`mt-3 p-2.5 rounded-xl text-xs ${
              isDark
                ? 'bg-neutral-900 text-neutral-300'
                : 'bg-neutral-100 text-neutral-700'
            }`}>
              Sending to: <span className={`font-bold ${isDark ? 'text-white' : 'text-neutral-900'}`}>{getRecipientSummary()}</span>
            </div>

            <div className="mt-6 flex items-center justify-end gap-3">
              <button
                type="button"
                disabled={sending}
                onClick={() => setShowConfirmModal(false)}
                className={`rounded-xl px-4 py-2 text-sm font-semibold transition-colors ${
                  isDark
                    ? 'text-neutral-400 hover:text-white'
                    : 'text-neutral-500 hover:text-neutral-900'
                }`}
              >
                Cancel
              </button>

              <button
                type="button"
                disabled={sending}
                onClick={handleConfirmSend}
                className="rounded-xl bg-[#0095F6] px-5 py-2 text-sm font-bold text-white hover:bg-[#1877F2] flex items-center gap-2 shadow-sm transition-all active:scale-95"
              >
                {sending && <Loader2 className="w-4 h-4 animate-spin" />}
                Confirm Send
              </button>
            </div>
          </div>
        </div>
      )}
    </div>,
    document.body
  );
}
