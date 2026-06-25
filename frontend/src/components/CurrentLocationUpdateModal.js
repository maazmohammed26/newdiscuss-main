import React, { useState } from 'react';
import { CheckCircle2, Loader2, MapPin, RefreshCw, ShieldAlert, Navigation } from 'lucide-react';

export default function CurrentLocationUpdateModal({
  open,
  status = 'idle',
  errorMessage = '',
  onClose,
  onConfirm,
  onRetry,
  onManualPin,
  theme = 'light',
}) {
  const [showManualWarning, setShowManualWarning] = useState(false);
  if (!open) return null;

  const isDiscussLight = theme === 'discuss-light';
  const isDiscussBlack = theme === 'discuss-black';
  const isDark = theme === 'dark';
  const isLoading = status === 'loading';
  const isSuccess = status === 'success';
  const isBlocked = status === 'blocked';
  const isError = status === 'error';

  const cardClass = isDiscussBlack
    ? 'bg-[#13131A] border border-[#FF007F]/35 text-[#F5F5F5] rounded-2xl'
    : isDiscussLight
    ? 'bg-white border-2 border-black text-black rounded-none'
    : isDark
    ? 'bg-[#0F172A] border border-white/10 text-white rounded-2xl'
    : 'bg-white border border-slate-200 text-slate-900 rounded-2xl';

  const primaryButtonClass = isDiscussBlack
    ? 'bg-[#FF007F] text-black hover:bg-[#ff3d9d]'
    : isDiscussLight
    ? 'bg-[#EF4444] text-white hover:bg-[#dc2626] border-2 border-black'
    : 'bg-[#2563EB] text-white hover:bg-blue-500';

  return (
    <div className="fixed inset-0 z-[10040] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
      <div className={`w-full max-w-sm p-5 shadow-2xl animate-in zoom-in-95 duration-200 ${cardClass}`}>
        <div className="flex items-start gap-3">
          <div className="mt-0.5">
            {isLoading ? (
              <Loader2 className="w-5 h-5 animate-spin text-[#2563EB] discuss:text-[#EF4444]" />
            ) : isSuccess ? (
              <CheckCircle2 className="w-5 h-5 text-emerald-500" />
            ) : isBlocked ? (
              <ShieldAlert className="w-5 h-5 text-amber-500" />
            ) : (
              <MapPin className="w-5 h-5 text-[#2563EB] discuss:text-[#EF4444]" />
            )}
          </div>
          <div className="flex-1">
            <h3 className="text-sm font-black uppercase tracking-wide">
              {showManualWarning ? 'Manual Pinning' : 'Update Current Location'}
            </h3>
            {!isLoading && !isSuccess && !isBlocked && !isError && (
              <p className="mt-1.5 text-xs opacity-80 leading-relaxed">
                {showManualWarning 
                  ? "For the most accurate DevRadar experience, we recommend using your device's current location. Do you want to continue pinning manually?"
                  : "Get your live location now and instantly update your DevRadar coordinates."}
              </p>
            )}
            {isLoading && (
              <p className="mt-1.5 text-xs opacity-80 leading-relaxed">
                Fetching your live location… please keep this screen open.
              </p>
            )}
            {isSuccess && (
              <p className="mt-1.5 text-xs text-emerald-500 font-semibold leading-relaxed">
                Location updated successfully.
              </p>
            )}
            {isBlocked && (
              <div className="mt-1.5 text-xs opacity-90 leading-relaxed space-y-2">
                <p>Location access is blocked for Discuss on this device.</p>
                <ul className="list-disc ml-4 space-y-1 opacity-80">
                  <li>Open browser app settings.</li>
                  <li>Go to Site settings for discussit.in.</li>
                  <li>Allow Location, then return and retry.</li>
                </ul>
              </div>
            )}
            {isError && (
              <p className="mt-1.5 text-xs text-amber-500 leading-relaxed">
                {errorMessage || 'Unable to update location. Please retry.'}
              </p>
            )}
          </div>
        </div>

        <div className="mt-5 flex gap-2">
          {!isLoading && !isSuccess && (
            <button
              type="button"
              onClick={() => {
                if (showManualWarning) setShowManualWarning(false);
                else onClose();
              }}
              className={`flex-1 text-xs font-bold uppercase px-3 py-2.5 border transition-all active:scale-95 ${
                isDiscussLight
                  ? 'border-black text-black hover:bg-neutral-100'
                  : 'border-slate-300 dark:border-white/10 hover:bg-black/5 dark:hover:bg-white/5'
              }`}
            >
              Cancel
            </button>
          )}

          {!isLoading && !isSuccess && !isBlocked && !isError && (
            <>
              {showManualWarning ? (
                <>
                  <button
                    type="button"
                    onClick={() => {
                      if (onManualPin) onManualPin();
                    }}
                    className={`flex-1 text-xs font-black uppercase px-2 py-2.5 transition-all active:scale-95 border border-[#2563EB] text-[#2563EB] discuss:border-[#EF4444] discuss:text-[#EF4444] hover:bg-[#2563EB]/10 discuss:hover:bg-[#EF4444]/10`}
                  >
                    Skip & Pin
                  </button>
                  <button
                    type="button"
                    onClick={onConfirm}
                    className={`flex-1 text-xs font-black uppercase px-2 py-2.5 transition-all active:scale-95 inline-flex items-center justify-center gap-1 ${primaryButtonClass}`}
                  >
                    <Navigation className="w-3.5 h-3.5" /> Use GPS
                  </button>
                </>
              ) : (
                <>
                  <button
                    type="button"
                    onClick={() => setShowManualWarning(true)}
                    className={`flex-1 text-xs font-black uppercase px-2 py-2.5 transition-all active:scale-95 border border-[#2563EB] text-[#2563EB] discuss:border-[#EF4444] discuss:text-[#EF4444] hover:bg-[#2563EB]/10 discuss:hover:bg-[#EF4444]/10`}
                  >
                    Pin Manually
                  </button>
                  <button
                    type="button"
                    onClick={onConfirm}
                    className={`flex-1 text-xs font-black uppercase px-2 py-2.5 transition-all active:scale-95 inline-flex items-center justify-center gap-1 ${primaryButtonClass}`}
                  >
                    <Navigation className="w-3.5 h-3.5" /> Use GPS
                  </button>
                </>
              )}
            </>
          )}

          {(isBlocked || isError) && (
            <button
              type="button"
              onClick={onRetry || onConfirm}
              className={`flex-1 text-xs font-black uppercase px-3 py-2.5 transition-all active:scale-95 inline-flex items-center justify-center gap-1.5 ${primaryButtonClass}`}
            >
              <RefreshCw className="w-3.5 h-3.5" />
              Retry
            </button>
          )}

          {isSuccess && (
            <button
              type="button"
              onClick={onClose}
              className={`w-full text-xs font-black uppercase px-3 py-2.5 transition-all active:scale-95 ${primaryButtonClass}`}
            >
              Done
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
