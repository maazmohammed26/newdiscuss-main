import React, { useState, useRef, useEffect } from 'react';
import { X, Camera, Upload, MapPin, Lock, Globe, Loader2, RefreshCw } from 'lucide-react';
import MemoryStamp from './MemoryStamp';
import { STAMP_VARIANTS } from '../utils/stampTheme';
import { createMemory } from '../data/memoryRepository';
import { formatDisplayDate } from '../utils/dateUtils';
import { toast } from 'sonner';

/**
 * MemoryCaptureModal — Capture, preview, crop framing, and upload a new memory.
 *
 * Rules:
 * - One image at a time
 * - Live stamp preview before saving
 * - Caption max 100 characters with visible counter
 * - Location free-text (no GPS required)
 * - Private (default) vs Public visibility
 * - Enforces max 15 memories per date
 */
export default function MemoryCaptureModal({
  open,
  onClose,
  initialDate,
  onMemoryCreated,
  user,
}) {
  const [file, setFile] = useState(null);
  const [previewUrl, setPreviewUrl] = useState('');
  const [caption, setCaption] = useState('');
  const [location, setLocation] = useState('');
  const [visibility, setVisibility] = useState('private'); // 'private' | 'public'
  const [uploading, setUploading] = useState(false);
  const [uploadProgressStage, setUploadProgressStage] = useState(''); // 'compressing' | 'uploading' | ''
  const [error, setError] = useState('');

  const galleryInputRef = useRef(null);
  const cameraInputRef = useRef(null);

  // Reset modal state whenever opened
  useEffect(() => {
    if (open) {
      setFile(null);
      setPreviewUrl('');
      setCaption('');
      setLocation('');
      setVisibility('private');
      setUploading(false);
      setUploadProgressStage('');
      setError('');
    }
  }, [open, initialDate]);

  // Clean up blob URL on unmount or file change
  useEffect(() => {
    return () => {
      if (previewUrl && previewUrl.startsWith('blob:')) {
        URL.revokeObjectURL(previewUrl);
      }
    };
  }, [previewUrl]);

  if (!open) return null;

  const handleFilePicked = (e) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    const selectedFile = files[0];
    // Reject non-image files
    if (!selectedFile.type.startsWith('image/')) {
      toast.error('Please choose a valid image file (JPEG, PNG, WEBP, or HEIC).');
      return;
    }

    if (previewUrl && previewUrl.startsWith('blob:')) {
      URL.revokeObjectURL(previewUrl);
    }

    const localUrl = URL.createObjectURL(selectedFile);
    setFile(selectedFile);
    setPreviewUrl(localUrl);
    setError('');
  };

  const handleSaveMemory = async () => {
    if (!file) {
      setError('Please select or capture a photograph first.');
      return;
    }

    setUploading(true);
    setError('');
    setUploadProgressStage('Optimizing stamp image…');

    try {
      setUploadProgressStage('Preserving memory…');
      const memory = await createMemory(
        file,
        {
          memoryDate: initialDate,
          caption,
          location,
          visibility,
        },
        user
      );

      toast.success('Memory preserved as a stamp.');
      onMemoryCreated?.(memory);
      onClose();
    } catch (err) {
      console.error('[MemoryCapture] Error:', err);
      setError(err.message || 'Failed to save memory. Please try again.');
    } finally {
      setUploading(false);
      setUploadProgressStage('');
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center select-none bg-black/60 backdrop-blur-xs p-0 sm:p-4"
      role="dialog"
      aria-modal="true"
      aria-label="Add Memory"
    >
      <div
        className="w-full sm:max-w-md bg-white dark:bg-[#141414] border-t sm:border border-neutral-200 dark:border-neutral-800 rounded-t-3xl sm:rounded-3xl shadow-2xl overflow-hidden max-h-[92vh] flex flex-col pb-[calc(env(safe-area-inset-bottom,0px)+12px)] sm:pb-4"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Modal Header */}
        <div className="flex items-center justify-between px-5 pt-4 pb-3 border-b border-neutral-100 dark:border-neutral-800/80">
          <div>
            <h3 className="text-base font-bold text-neutral-900 dark:text-white">
              Preserve a Memory
            </h3>
            <span className="text-xs text-neutral-500 dark:text-neutral-400">
              {formatDisplayDate(initialDate)}
            </span>
          </div>

          <button
            type="button"
            onClick={onClose}
            disabled={uploading}
            aria-label="Close"
            className="p-1.5 rounded-full text-neutral-400 hover:text-neutral-700 dark:hover:text-white hover:bg-neutral-100 dark:hover:bg-neutral-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Content */}
        <div className="flex-1 overflow-y-auto px-5 py-4 space-y-4">
          {/* Stamp Preview or Picker Trigger */}
          <div className="flex flex-col items-center justify-center">
            {previewUrl ? (
              <div className="relative group flex flex-col items-center">
                <MemoryStamp
                  memory={{
                    id: 'temp-preview',
                    url: previewUrl,
                    memoryDate: initialDate,
                  }}
                  variant={STAMP_VARIANTS.PREVIEW}
                  alt="Memory stamp preview"
                />

                {!uploading && (
                  <button
                    type="button"
                    onClick={() => {
                      setFile(null);
                      setPreviewUrl('');
                    }}
                    className="mt-2 text-xs text-neutral-500 hover:text-[#0095F6] flex items-center gap-1 transition-colors"
                  >
                    <RefreshCw className="w-3 h-3" />
                    <span>Change photograph</span>
                  </button>
                )}
              </div>
            ) : (
              <div className="w-full py-8 px-4 border-2 border-dashed border-neutral-200 dark:border-neutral-800 rounded-2xl flex flex-col items-center justify-center gap-3 bg-neutral-50/50 dark:bg-neutral-900/30">
                <p className="text-xs text-neutral-500 dark:text-neutral-400 text-center max-w-[220px]">
                  Select a photograph to frame as a nostalgic postage stamp.
                </p>

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => cameraInputRef.current?.click()}
                    className="px-4 py-2.5 rounded-xl bg-neutral-200/80 dark:bg-neutral-800 hover:bg-neutral-300 dark:hover:bg-neutral-700 text-neutral-900 dark:text-white font-medium text-xs flex items-center gap-2 transition-colors cursor-pointer"
                  >
                    <Camera className="w-4 h-4" />
                    <span>Camera</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => galleryInputRef.current?.click()}
                    className="px-4 py-2.5 rounded-xl bg-neutral-900 dark:bg-white text-white dark:text-neutral-900 font-medium text-xs flex items-center gap-2 transition-colors cursor-pointer"
                  >
                    <Upload className="w-4 h-4" />
                    <span>Upload</span>
                  </button>
                </div>
              </div>
            )}

            {/* Hidden file inputs */}
            <input
              type="file"
              ref={galleryInputRef}
              onChange={handleFilePicked}
              accept="image/*"
              style={{ display: 'none' }}
            />
            <input
              type="file"
              ref={cameraInputRef}
              onChange={handleFilePicked}
              accept="image/*"
              capture="environment"
              style={{ display: 'none' }}
            />
          </div>

          {/* Caption Input (Optional, max 100 chars) */}
          <div className="space-y-1">
            <div className="flex items-center justify-between text-xs">
              <label htmlFor="memory-caption" className="font-semibold text-neutral-700 dark:text-neutral-300">
                Caption <span className="font-normal text-neutral-400">(optional)</span>
              </label>
              <span
                className={`text-[11px] ${
                  caption.length >= 100 ? 'text-red-500 font-bold' : 'text-neutral-400'
                }`}
              >
                {caption.length}/100
              </span>
            </div>
            <textarea
              id="memory-caption"
              value={caption}
              onChange={(e) => setCaption(e.target.value.slice(0, 100))}
              placeholder="What made this moment special?"
              rows={2}
              disabled={uploading}
              className="w-full px-3 py-2 text-sm rounded-xl border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-900 text-neutral-900 dark:text-white placeholder-neutral-400 focus:outline-none focus:ring-2 focus:ring-[#0095F6] resize-none"
            />
          </div>

          {/* Location Input (Optional, plain text) */}
          <div className="space-y-1">
            <label htmlFor="memory-location" className="font-semibold text-xs text-neutral-700 dark:text-neutral-300">
              Location <span className="font-normal text-neutral-400">(optional)</span>
            </label>
            <div className="relative">
              <MapPin className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-neutral-400" />
              <input
                id="memory-location"
                type="text"
                value={location}
                onChange={(e) => setLocation(e.target.value.slice(0, 100))}
                placeholder="e.g. Café de Flore, Paris or Home"
                disabled={uploading}
                className="w-full pl-8 pr-3 py-2 text-sm rounded-xl border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-900 text-neutral-900 dark:text-white placeholder-neutral-400 focus:outline-none focus:ring-2 focus:ring-[#0095F6]"
              />
            </div>
          </div>

          {/* Visibility Selector */}
          <div className="space-y-1.5 pt-1">
            <span className="font-semibold text-xs text-neutral-700 dark:text-neutral-300 block">
              Visibility
            </span>
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => setVisibility('private')}
                disabled={uploading}
                className={`px-3 py-2.5 rounded-xl border text-xs font-semibold flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
                  visibility === 'private'
                    ? 'border-[#0095F6] bg-blue-50/50 dark:bg-blue-950/20 text-[#0095F6]'
                    : 'border-neutral-200 dark:border-neutral-800 text-neutral-600 dark:text-neutral-400 hover:bg-neutral-50 dark:hover:bg-neutral-900'
                }`}
              >
                <Lock className="w-3.5 h-3.5" />
                <span>Private</span>
              </button>

              <button
                type="button"
                onClick={() => setVisibility('public')}
                disabled={uploading}
                className={`px-3 py-2.5 rounded-xl border text-xs font-semibold flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
                  visibility === 'public'
                    ? 'border-[#0095F6] bg-blue-50/50 dark:bg-blue-950/20 text-[#0095F6]'
                    : 'border-neutral-200 dark:border-neutral-800 text-neutral-600 dark:text-neutral-400 hover:bg-neutral-50 dark:hover:bg-neutral-900'
                }`}
              >
                <Globe className="w-3.5 h-3.5" />
                <span>Public</span>
              </button>
            </div>
            <p className="text-[11px] text-neutral-400 dark:text-neutral-500">
              {visibility === 'private'
                ? 'Only visible to you unless explicitly shared with friends.'
                : 'Visible to Discuss users in the Public Memories gallery.'}
            </p>
          </div>

          {/* Error notice */}
          {error && (
            <div className="p-3 rounded-xl bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-900 text-red-600 dark:text-red-400 text-xs">
              {error}
            </div>
          )}
        </div>

        {/* Modal Actions */}
        <div className="px-5 pt-3 border-t border-neutral-100 dark:border-neutral-800/80 flex items-center gap-2">
          <button
            type="button"
            onClick={onClose}
            disabled={uploading}
            className="flex-1 py-2.5 rounded-xl border border-neutral-200 dark:border-neutral-800 text-neutral-700 dark:text-neutral-300 font-semibold text-xs hover:bg-neutral-50 dark:hover:bg-neutral-900 transition-colors"
          >
            Cancel
          </button>

          <button
            type="button"
            onClick={handleSaveMemory}
            disabled={uploading || !file}
            className="flex-1 py-2.5 rounded-xl bg-[#0095F6] hover:bg-[#1877F2] disabled:opacity-50 text-white font-semibold text-xs flex items-center justify-center gap-1.5 transition-colors cursor-pointer shadow-xs"
          >
            {uploading ? (
              <>
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
                <span>{uploadProgressStage || 'Preserving…'}</span>
              </>
            ) : (
              <span>Preserve Stamp</span>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
