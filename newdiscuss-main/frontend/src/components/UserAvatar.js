/**
 * UserAvatar.js — Shared avatar image component
 *
 * Fixes the "profile pic broken on deployment, works on localhost" issue:
 *
 *  Root cause: Google profile photo service (lh3.googleusercontent.com) and
 *  Firebase Storage block image requests that include a Referer header pointing
 *  to an unknown/cross-origin domain. On localhost there's no Referer (or the
 *  browser sends none by default for file://) so it works. On production, the
 *  Netlify domain is sent as Referer and Google rejects it.
 *
 *  Fix: referrerPolicy="no-referrer" on every profile image suppresses the
 *  Referer header so Google's CDN accepts the request.
 *
 *  Fallback: Shows initials (first 1–2 letters of username) when no image is
 *  available or the image fails to load, instead of a generic icon.
 */

import { useState } from 'react';

/**
 * @param {string}  src          — image URL (photo_url / photoURL)
 * @param {string}  username     — used to generate the initials fallback
 * @param {string}  [className]  — additional CSS classes (e.g. "w-9 h-9")
 * @param {string}  [alt]        — alt text (defaults to username)
 * @param {string}  [fallbackBg] — CSS background for the initials avatar
 */
export default function UserAvatar({
  src,
  username = '?',
  className = 'w-9 h-9',
  alt,
  fallbackBg = 'linear-gradient(135deg, #2563EB, #1d4ed8)',
  style = {},
}) {
  const [failed, setFailed] = useState(false);

  const altText = alt || username || 'User';

  // Derive initials: up to 2 alphanumeric characters from the username
  const raw = username ? username.replace(/[^a-zA-Z0-9]/g, '').slice(0, 2).toUpperCase() : '';
  const initials = raw.length > 0 ? raw : '?';

  // Show initials fallback if: no src provided, or the image failed to load
  if (!src || failed) {
    const initial = (username && username !== '?')
      ? username.trim()[0].toUpperCase()
      : '?';
    return (
      <div
        className={`${className} rounded-full flex items-center justify-center flex-shrink-0 select-none font-semibold text-white`}
        style={{ background: fallbackBg, ...style }}
        aria-label={altText}
        role="img"
      >
        <span style={{ fontSize: 'clamp(10px, 40%, 18px)', lineHeight: 1 }}>
          {initials}
        </span>
      </div>
    );
  }

  return (
    <img
      src={src}
      alt={altText}
      className={`${className} rounded-full object-cover flex-shrink-0`}
      style={style}
      referrerPolicy="no-referrer"
      onError={() => setFailed(true)}
      loading="lazy"
      decoding="async"
    />
  );
}
