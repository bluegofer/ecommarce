/*
 * SkyMart service worker — Step 8.12
 *
 * Strategy:
 *  - Precache: app shell + icons
 *  - Runtime: network-first for HTML (catalog pages), cache-first for
 *    static assets, cache-only fallback to offline when network fails
 *  - Explicit bypass: /api/**, /auth/**, /checkout, /cart, /account —
 *    never cache authenticated or money-path responses
 *  - Push: order status notifications (Step 10 wires to server)
 */

const VERSION = 'v1.0.0';
const STATIC_CACHE = `skymart-static-${VERSION}`;
const RUNTIME_CACHE = `skymart-runtime-${VERSION}`;

const PRECACHE_URLS = [
  '/icons/icon-192.svg',
  '/icons/icon-512.svg',
  '/icons/apple-touch-icon.svg',
];

const BYPASS_PATTERNS = [
  /^\/api\//,
  /^\/auth\//,
  /\/checkout(\/|$)/,
  /\/cart(\/|$)/,
  /\/account(\/|$)/,
  /\/signin(\/|$)/,
  /\/register(\/|$)/,
  /\/order-confirmation(\/|$)/,
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(STATIC_CACHE).then((cache) => cache.addAll(PRECACHE_URLS)).then(() => self.skipWaiting()),
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) =>
        Promise.all(
          keys
            .filter((k) => k !== STATIC_CACHE && k !== RUNTIME_CACHE)
            .map((k) => caches.delete(k)),
        ),
      )
      .then(() => self.clients.claim()),
  );
});

self.addEventListener('fetch', (event) => {
  const url = new URL(event.request.url);

  // Only handle same-origin GETs
  if (event.request.method !== 'GET' || url.origin !== self.location.origin) return;

  // Bypass auth/money/api paths
  if (BYPASS_PATTERNS.some((p) => p.test(url.pathname))) return;

  // Static assets: cache-first
  if (/\.(?:svg|png|jpg|jpeg|webp|gif|ico|woff2?|ttf|otf)$/i.test(url.pathname)) {
    event.respondWith(
      caches.match(event.request).then((cached) => {
        if (cached) return cached;
        return fetch(event.request).then((res) => {
          if (res.ok) {
            const clone = res.clone();
            caches.open(RUNTIME_CACHE).then((cache) => cache.put(event.request, clone));
          }
          return res;
        });
      }),
    );
    return;
  }

  // HTML navigation: network-first, cache fallback
  if (event.request.mode === 'navigate') {
    event.respondWith(
      fetch(event.request)
        .then((res) => {
          if (res.ok) {
            const clone = res.clone();
            caches.open(RUNTIME_CACHE).then((cache) => cache.put(event.request, clone));
          }
          return res;
        })
        .catch(() =>
          caches.match(event.request).then((cached) => cached || caches.match('/bn')),
        ),
    );
  }
});

// Push notifications (Step 10 will wire real events)
self.addEventListener('push', (event) => {
  let data = { title: 'SkyMart', body: '' };
  try {
    if (event.data) data = event.data.json();
  } catch (_e) {
    /* fallback */
  }
  event.waitUntil(
    self.registration.showNotification(data.title, {
      body: data.body,
      icon: '/icons/icon-192.svg',
      badge: '/icons/icon-192.svg',
      tag: data.tag || 'skymart',
    }),
  );
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  const url = event.notification.data?.url || '/bn/account/orders';
  event.waitUntil(
    self.clients.matchAll({ type: 'window' }).then((clients) => {
      for (const c of clients) {
        if (c.url.includes(url) && 'focus' in c) return c.focus();
      }
      if (self.clients.openWindow) return self.clients.openWindow(url);
    }),
  );
});