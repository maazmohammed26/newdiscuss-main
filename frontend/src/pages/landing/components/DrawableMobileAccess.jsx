import React, { useState } from 'react';
import { ExternalLink, Loader2, CheckCircle2, Mail } from 'lucide-react';
import { FaApple } from 'react-icons/fa';
import { SiGoogleplay } from 'react-icons/si';
import {
  DrawableUnderline,
  DrawableFrame,
  DrawableNote,
  DrawableInput,
  DrawableButton,
} from './DrawablePrimitives';

export const PLAY_STORE_URL =
  'https://play.google.com/store/apps/details?id=co.median.android.lpowadz';

/**
 * DrawableMobileAccess
 * Preserves the exact Android early-access flow, endpoint (/api/android-access),
 * honeypot, validation, and feedback states.
 * Preserves the exact iOS PWA install guidance.
 * Visual treatment: Hand-drawn drawable form fields and buttons on pure white canvas.
 */
export default function DrawableMobileAccess() {
  const [email, setEmail] = useState('');
  const [status, setStatus] = useState('idle');
  const [message, setMessage] = useState('');
  const [showIosHelp, setShowIosHelp] = useState(false);

  const requestAndroidAccess = async (event) => {
    event.preventDefault();
    if (status === 'sending' || status === 'success') return;

    const normalizedEmail = email.trim().toLowerCase();
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalizedEmail)) {
      setStatus('error');
      setMessage('Enter a valid Google Play email.');
      return;
    }

    setStatus('sending');
    setMessage('');

    try {
      const response = await fetch('/api/android-access', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: normalizedEmail, website: '' }),
      });
      const result = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(result.error || 'Could not send your request.');

      setStatus('success');
      setMessage('Request sent. Check Google Play in 4–6 hours with this email.');
    } catch (error) {
      setStatus('error');
      setMessage(error.message || 'Could not send your request. Please try again.');
    }
  };

  return (
    <section
      className="py-16 sm:py-24 border-t border-neutral-200/80 bg-white relative overflow-hidden"
      id="mobile-access"
    >
      <div className="mx-auto max-w-6xl px-4 sm:px-6">
        {/* Section Header */}
        <div className="max-w-2xl mb-12">
          <div className="flex items-center gap-2 mb-2">
            <span className="font-mono text-xs uppercase tracking-widest text-[#EF4444] font-bold select-none">
              // mobile access
            </span>
            <span className="text-neutral-300">·</span>
            <span className="font-mono text-[11px] text-neutral-400">
              New Discuss 2.0 app icon rolling out
            </span>
          </div>

          <h2 className="text-3xl sm:text-4xl font-black text-neutral-950 tracking-tight">
            Take Discuss with you.{' '}
            <span className="block mt-1 sm:inline sm:mt-0">
              <DrawableUnderline color="red">Android & iOS.</DrawableUnderline>
            </span>
          </h2>
          <p className="mt-3 text-base text-neutral-600 leading-relaxed">
            Google Play early access for Android, or install the standalone full-screen PWA on iOS.
          </p>
        </div>

        {/* Responsive Side-by-Side Grid */}
        <div className="grid gap-8 lg:grid-cols-2 items-stretch">
          {/* Card 1: Android Early Access */}
          <div className="flex flex-col">
            <div className="flex items-center justify-between mb-3 px-1">
              <span className="font-mono text-xs font-bold text-neutral-500 uppercase tracking-wide">
                GOOGLE PLAY
              </span>
              <DrawableNote rotate={-2} color="blue" className="text-sm">
                * early access rollout
              </DrawableNote>
            </div>

            <DrawableFrame
              variant="charcoal-pen"
              className="flex-1 p-6 sm:p-7 bg-white flex flex-col justify-between"
              ariaLabel="Android Early Access"
            >
              <div>
                <div className="flex items-start justify-between gap-4 pb-4 border-b border-neutral-200">
                  <div className="flex items-center gap-3">
                    <div className="flex h-11 w-11 items-center justify-center rounded-xs bg-neutral-950 text-white shadow-2xs">
                      <SiGoogleplay className="h-5 w-5" aria-hidden="true" />
                    </div>
                    <div>
                      <h3 className="text-xl font-bold text-neutral-900 tracking-tight">Discuss on Android</h3>
                      <span className="font-mono text-xs text-neutral-400 block mt-0.5">Google Play Early Access</span>
                    </div>
                  </div>
                  <span className="rounded-xs bg-neutral-100 px-2.5 py-1 font-mono text-[10px] font-bold uppercase tracking-wider text-neutral-700 border border-neutral-300">
                    Early access
                  </span>
                </div>

                <p className="mt-4 text-xs sm:text-sm text-neutral-600 leading-relaxed">
                  Enter your Google Play email below. Access is reviewed and granted via the Discuss Admin flow within 4–6 hours.
                </p>

                {/* Hand-Drawn Android Access Form */}
                <form onSubmit={requestAndroidAccess} className="mt-5" noValidate>
                  <label
                    htmlFor="android-access-email"
                    className="block font-mono text-xs font-bold uppercase tracking-wider text-neutral-500 mb-1.5"
                  >
                    Google Play email
                  </label>

                  <div className="flex flex-col sm:flex-row gap-3 items-stretch">
                    {/* Hand-drawn input field */}
                    <div className="flex-1">
                      <DrawableInput
                        id="android-access-email"
                        type="email"
                        inputMode="email"
                        autoComplete="email"
                        value={email}
                        onChange={(event) => {
                          setEmail(event.target.value);
                          if (status === 'error') setStatus('idle');
                        }}
                        placeholder="you@gmail.com"
                        disabled={status === 'sending' || status === 'success'}
                        icon={Mail}
                        ariaDescribedBy="android-access-status"
                        required
                      />
                      {/* Honeypot field preserved exactly */}
                      <input
                        name="website"
                        tabIndex="-1"
                        autoComplete="off"
                        className="absolute -left-[9999px]"
                        aria-hidden="true"
                      />
                    </div>

                    {/* Red Hand-Drawn Button */}
                    <DrawableButton
                      type="submit"
                      variant="red-marker"
                      size="md"
                      disabled={status === 'sending' || status === 'success'}
                      className="shrink-0"
                    >
                      {status === 'sending' ? (
                        <>
                          <Loader2 className="h-4 w-4 animate-spin" />
                          <span>Sending</span>
                        </>
                      ) : status === 'success' ? (
                        <>
                          <CheckCircle2 className="h-4 w-4 text-white" />
                          <span>Requested</span>
                        </>
                      ) : (
                        'Request access'
                      )}
                    </DrawableButton>
                  </div>

                  <div
                    id="android-access-status"
                    aria-live="polite"
                    className={`mt-2.5 min-h-5 text-xs font-mono ${
                      status === 'error'
                        ? 'text-red-600'
                        : status === 'success'
                        ? 'text-[#0095F6] font-semibold'
                        : 'text-neutral-500'
                    }`}
                  >
                    {message || 'We only send this request to the Discuss Admin bot. It is not saved in our database.'}
                  </div>
                </form>
              </div>

              <div className="mt-5 pt-3 border-t border-neutral-100 flex items-center justify-between">
                <a
                  href={PLAY_STORE_URL}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex items-center gap-1.5 text-xs font-bold text-[#0095F6] hover:text-[#1877F2] transition-colors"
                >
                  Open Google Play <ExternalLink className="h-3 w-3" />
                </a>
                <span className="font-mono text-[11px] text-neutral-400">v2.0 build</span>
              </div>
            </DrawableFrame>
          </div>

          {/* Card 2: iOS PWA */}
          <div className="flex flex-col">
            <div className="flex items-center justify-between mb-3 px-1">
              <span className="font-mono text-xs font-bold text-neutral-500 uppercase tracking-wide">
                APPLE IOS
              </span>
              <DrawableNote rotate={2} color="red" className="text-sm">
                * full-screen app
              </DrawableNote>
            </div>

            <DrawableFrame
              variant="charcoal-pen"
              className="flex-1 p-6 sm:p-7 bg-white flex flex-col justify-between"
              ariaLabel="iOS PWA Installation"
            >
              <div>
                <div className="flex items-start justify-between gap-4 pb-4 border-b border-neutral-200">
                  <div className="flex items-center gap-3">
                    <div className="flex h-11 w-11 items-center justify-center rounded-xs bg-neutral-950 text-white shadow-2xs">
                      <FaApple className="h-6 w-6" aria-hidden="true" />
                    </div>
                    <div>
                      <h3 className="text-xl font-bold text-neutral-900 tracking-tight">Discuss on iPhone</h3>
                      <span className="font-mono text-xs text-neutral-400 block mt-0.5">Standalone Web App</span>
                    </div>
                  </div>
                  <span className="rounded-xs bg-neutral-100 px-2.5 py-1 font-mono text-[10px] font-bold uppercase tracking-wider text-neutral-700 border border-neutral-300">
                    PWA
                  </span>
                </div>

                <p className="mt-4 text-xs sm:text-sm text-neutral-600 leading-relaxed">
                  Install the progressive web app directly from Safari for a fast, standalone full-screen experience with native gestures and instant launch.
                </p>

                <div className="mt-5">
                  <DrawableButton
                    type="button"
                    onClick={() => setShowIosHelp((curr) => !curr)}
                    variant="charcoal-outline"
                    size="md"
                    className="w-full"
                  >
                    <span>{showIosHelp ? 'Hide install instructions' : 'Install iOS PWA'}</span>
                  </DrawableButton>

                  {showIosHelp && (
                    <div className="mt-3 rounded-xs border border-neutral-200 bg-neutral-50 p-3.5 text-xs leading-relaxed text-neutral-700">
                      In Safari, tap <span className="font-bold text-neutral-950">Share</span> (the box with arrow), then select <span className="font-bold text-neutral-950">Add to Home Screen</span>.
                    </div>
                  )}
                </div>
              </div>

              <div className="mt-5 pt-3 border-t border-neutral-100 flex items-center justify-between text-xs font-mono text-neutral-400">
                <span>No App Store needed</span>
                <span className="text-neutral-600 font-semibold">Offline-ready</span>
              </div>
            </DrawableFrame>
          </div>
        </div>
      </div>
    </section>
  );
}
