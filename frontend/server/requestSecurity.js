'use strict';

const TRUSTED_WEB_HOSTS = new Set(['discussit.in', 'www.discussit.in']);

const normalizeHost = (host = '') => String(host).split(':')[0].trim().toLowerCase();

const isAllowedOrigin = (origin, host) => {
  if (!origin || origin === 'null' || origin === 'file://') return true;

  try {
    const parsed = new URL(origin);
    const hostname = parsed.hostname.toLowerCase();
    if (parsed.protocol === 'capacitor:' || parsed.protocol === 'ionic:') return true;
    if (hostname === 'localhost' || hostname === '127.0.0.1') return true;
    if (TRUSTED_WEB_HOSTS.has(hostname) || hostname.endsWith('.discussit.in')) return true;
    if (hostname.endsWith('.vercel.app')) return true;
    return Boolean(host) && hostname === normalizeHost(host);
  } catch (_) {
    return false;
  }
};

module.exports = { isAllowedOrigin };

