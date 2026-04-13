// Push Notification Service Worker
// Handles push events and notification clicks for real-time notifications

const CACHE_NAME = 'discuss-v3';
const OFFLINE_URL = '/offline.html';
const APP_ICON = '/favicon-new.png';

// Only pre-cache these truly-static offline fallbacks
const STATIC_ASSETS = [
  '/offline.html',
  '/favicon-new.png',
];

// Install — pre-cache only the offline fallback, nothing else
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => cache.addAll(STATIC_ASSETS))
      .catch((err) => console.log('[SW] Cache error:', err))
  );
  self.skipWaiting();
});

// Activate — clean up old caches
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((names) =>
      Promise.all(
        names
          .filter((n) => n !== CACHE_NAME)
          .map((n) => caches.delete(n))
      )
    )
  );
  self.clients.claim();
});

// ─── Fetch strategy ────────────────────────────────────────────
// Key rule: NEVER cache navigation (HTML) requests or Firebase requests.
// This was causing stale app shells to be served, breaking auth on PWA restart.
self.addEventListener('fetch', (event) => {
  const { request } = event;

  // Only handle GET
  if (request.method !== 'GET') return;

  // Skip non-http requests (chrome-extension://, etc.)
  if (!request.url.startsWith('http')) return;

  // ── Skip Firebase: auth, RTDB, Firestore, Storage ─────────
  const url = new URL(request.url);
  const isFirebase =
    url.hostname.includes('firebaseio.com') ||
    url.hostname.includes('firebaseapp.com') ||
    url.hostname.includes('googleapis.com') ||
    url.hostname.includes('identitytoolkit.google') ||
    url.hostname.includes('securetoken.google') ||
    url.hostname.includes('firebase') ||
    url.hostname.includes('microlink.io') ||  // URL preview API
    url.hostname.includes('cloudflare') ||
    url.hostname.includes('netlify');

  if (isFirebase) return; // Let Firebase handle its own network calls

  // ── Skip navigation (HTML page) requests ──────────────────
  // CRITICAL: Never cache the app shell HTML. If we cache the HTML while the
  // user is authenticated, a PWA cold restart would serve stale cached HTML
  // that may have old state, and the auth redirect wouldn't happen properly.
  if (request.mode === 'navigate') {
    event.respondWith(
      fetch(request).catch(() => caches.match(OFFLINE_URL))
    );
    return;
  }

  // ── Static assets: Cache-first strategy ───────────────────
  // Only cache truly static assets: JS chunks, CSS, images, fonts
  const isStaticAsset =
    url.pathname.match(/\.(js|css|png|jpg|jpeg|gif|svg|ico|woff2?|ttf|eot)$/) &&
    !url.pathname.includes('sw-push') &&
    !url.pathname.includes('service-worker');

  if (isStaticAsset) {
    event.respondWith(
      caches.match(request).then((cached) => {
        if (cached) return cached;
        return fetch(request).then((response) => {
          if (response.status === 200) {
            const clone = response.clone();
            caches.open(CACHE_NAME).then((cache) => cache.put(request, clone));
          }
          return response;
        });
      }).catch(() => new Response('Offline', { status: 503 }))
    );
    return;
  }

  // ── All other requests: Network-only (no caching) ─────────
  // API calls, dynamic content — always go to network
  event.respondWith(
    fetch(request).catch(() => new Response('Offline', { status: 503 }))
  );
});

// ─── Push notification ─────────────────────────────────────────
self.addEventListener('push', (event) => {
  let data = {
    title: 'Discuss',
    body: 'You have a new notification',
    icon: APP_ICON,
    badge: APP_ICON,
    data: { url: '/' }
  };

  try {
    if (event.data) {
      const payload = event.data.json();
      data = { ...data, ...payload };
    }
  } catch (e) {
    console.log('[SW] Error parsing push data:', e);
  }

  event.waitUntil(
    self.registration.showNotification(data.title, {
      body: data.body,
      icon: data.icon || APP_ICON,
      badge: data.badge || APP_ICON,
      vibrate: [200, 100, 200],
      tag: data.tag || 'discuss-notification',
      renotify: true,
      requireInteraction: false,
      data: data.data || { url: '/' },
      actions: data.actions || [],
    })
  );
});

// ─── Notification click ────────────────────────────────────────
self.addEventListener('notificationclick', (event) => {
  event.notification.close();

  const urlToOpen = event.notification.data?.url || '/';

  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true })
      .then((clientList) => {
        for (const client of clientList) {
          if (client.url.includes(self.location.origin) && 'focus' in client) {
            client.postMessage({ type: 'NOTIFICATION_CLICK', url: urlToOpen });
            return client.focus();
          }
        }
        if (clients.openWindow) return clients.openWindow(urlToOpen);
      })
  );
});

// ─── Message handler ───────────────────────────────────────────
self.addEventListener('message', (event) => {
  if (event.data?.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }

  if (event.data?.type === 'SHOW_NOTIFICATION') {
    const { title, options } = event.data;
    self.registration.showNotification(title, {
      icon: APP_ICON,
      badge: APP_ICON,
      vibrate: [200, 100, 200],
      ...options,
    });
  }
});
