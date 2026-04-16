import { useState, useEffect, useRef } from 'react';
import { Globe, ExternalLink } from 'lucide-react';

// Module-level in-memory cache — survives re-renders and component remounts
// within the same browser tab session
const _previewCache = new Map();

// URL regex (same as LinkifiedText)
const URL_REGEX = /(https?:\/\/[^\s]+)|(www\.[^\s]+)/i;

/**
 * Extract the first URL from a block of text.
 * Returns the full URL (adds https:// for www. links).
 */
export function extractFirstUrl(text) {
  if (!text) return null;
  const match = text.match(URL_REGEX);
  if (!match) return null;
  const raw = match[0];
  return raw.startsWith('www.') ? `https://${raw}` : raw;
}

/**
 * UrlPreviewCard — shows an Open Graph preview card for the first URL
 * found in post/comment content.
 *
 * Features:
 * - In-memory cache (instant on re-renders / remounts)
 * - sessionStorage cache (instant on same-session navigation)
 * - 5-second fetch timeout via AbortSignal
 * - Preview never disappears once loaded (state is never reset to null
 *   after a successful fetch)
 * - Themed for light, dark, and discuss-black themes
 */
export default function UrlPreviewCard({ url }) {
  // Initialise meta from cache so it never flickers on remount
  const [meta, setMeta] = useState(() => {
    if (url && _previewCache.has(url)) {
      const cached = _previewCache.get(url);
      return cached !== null ? cached : null;
    }
    return null;
  });
  const [loading, setLoading] = useState(false);
  const [failed, setFailed] = useState(() => {
    if (url && _previewCache.has(url)) return _previewCache.get(url) === null;
    return false;
  });

  // Guard against double-fetch across StrictMode double-invoke or re-renders
  const didFetch = useRef(false);

  useEffect(() => {
    if (!url) return;

    // Prevent duplicate requests — didFetch is set to true on first run per URL.
    // Cache checks below (in-memory and sessionStorage) serve as instant paths
    // so even if meta was pre-populated from useState initializer, we skip the fetch.
    if (didFetch.current) return;
    didFetch.current = true;

    // Fast path: in-memory cache (already set if useState initializer found it,
    // but also catches the case where another component cached it since mount)
    if (_previewCache.has(url)) {
      const cached = _previewCache.get(url);
      if (cached) setMeta(cached);
      else setFailed(true);
      return;
    }

    // Medium path: sessionStorage cache
    const CACHE_KEY = `post_og_${encodeURIComponent(url).slice(0, 120)}`;
    try {
      const stored = sessionStorage.getItem(CACHE_KEY);
      if (stored) {
        const parsed = JSON.parse(stored);
        _previewCache.set(url, parsed);
        setMeta(parsed);
        return;
      }
    } catch {}

    // Slow path: fetch from microlink.io with timeout
    setLoading(true);

    const fetchMeta = async () => {
      try {
        const res = await fetch(
          `https://api.microlink.io/?url=${encodeURIComponent(url)}`,
          { signal: AbortSignal.timeout(5000) }
        );
        const data = await res.json();

        if (data.status === 'success') {
          const result = {
            title: data.data.title || '',
            description: data.data.description || '',
            image: data.data.image?.url || null,
            siteName: data.data.publisher || '',
            domain: (() => {
              try {
                return new URL(url).hostname.replace(/^www\./, '');
              } catch {
                return url;
              }
            })(),
          };
          _previewCache.set(url, result);
          try {
            sessionStorage.setItem(CACHE_KEY, JSON.stringify(result));
          } catch {}
          setMeta(result);
        } else {
          _previewCache.set(url, null);
          setFailed(true);
        }
      } catch {
        setFailed(true);
      } finally {
        setLoading(false);
      }
    };

    fetchMeta();
  }, [url]); // Only re-runs when the URL itself changes

  if (!url || failed) return null;

  if (loading) {
    return (
      <div
        className="rounded-[10px] animate-pulse bg-neutral-100 dark:bg-neutral-700/40"
        style={{ height: '72px', border: '1px solid transparent' }}
      />
    );
  }

  if (!meta) return null;

  return (
    <a
      href={url}
      target="_blank"
      rel="noopener noreferrer"
      onClick={(e) => e.stopPropagation()}
      className="url-preview-card block rounded-[10px] overflow-hidden transition-colors bg-neutral-50 dark:bg-neutral-700/40 border border-neutral-200 dark:border-neutral-600/50 hover:bg-neutral-100 dark:hover:bg-neutral-700/60"
      style={{ textDecoration: 'none' }}
    >
      <div style={{ display: 'flex' }}>
        {/* Thumbnail */}
        {meta.image && (
          <div
            className="bg-neutral-200 dark:bg-neutral-600"
            style={{ width: '80px', flexShrink: 0, overflow: 'hidden' }}
          >
            <img
              src={meta.image}
              alt=""
              style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }}
              onError={(e) => { e.target.style.display = 'none'; }}
            />
          </div>
        )}

        {/* Text metadata */}
        <div style={{ padding: '10px 12px', flex: 1, minWidth: 0 }}>
          {/* Domain / site name */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '4px', marginBottom: '4px' }}>
            <Globe
              className="url-preview-domain text-[#2563EB] dark:text-[#60A5FA]"
              style={{ width: '10px', height: '10px', flexShrink: 0 }}
            />
            <span
              className="url-preview-domain text-[#2563EB] dark:text-[#60A5FA]"
              style={{
                fontSize: '10px',
                fontWeight: 600,
                textTransform: 'uppercase',
                letterSpacing: '0.04em',
                overflow: 'hidden',
                whiteSpace: 'nowrap',
                textOverflow: 'ellipsis',
              }}
            >
              {meta.siteName || meta.domain}
            </span>
          </div>

          {/* Title */}
          {meta.title && (
            <p
              className="url-preview-title text-neutral-900 dark:text-neutral-100"
              style={{
                fontSize: '12px',
                fontWeight: 600,
                lineHeight: 1.3,
                margin: '0 0 3px',
                overflow: 'hidden',
                display: '-webkit-box',
                WebkitLineClamp: 2,
                WebkitBoxOrient: 'vertical',
              }}
            >
              {meta.title}
            </p>
          )}

          {/* Description */}
          {meta.description && (
            <p
              className="url-preview-desc text-neutral-500 dark:text-neutral-400"
              style={{
                fontSize: '11px',
                lineHeight: 1.4,
                margin: 0,
                overflow: 'hidden',
                display: '-webkit-box',
                WebkitLineClamp: 2,
                WebkitBoxOrient: 'vertical',
              }}
            >
              {meta.description}
            </p>
          )}
        </div>

        {/* External link icon */}
        <div style={{ padding: '10px 10px 0 0', flexShrink: 0 }}>
          <ExternalLink
            className="url-preview-icon text-neutral-400 dark:text-neutral-500"
            style={{ width: '12px', height: '12px' }}
          />
        </div>
      </div>
    </a>
  );
}
