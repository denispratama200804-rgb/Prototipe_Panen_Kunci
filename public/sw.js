/**
 * Service Worker - Panen Kunci PWA
 * Mengaktifkan fitur offline, caching aset, dan install prompt Android
 */

const CACHE_NAME = 'panen-kunci-v1.2.0';
const STATIC_ASSETS = [
  '/',
  '/index.html',
  '/Logo_PK.jpg',
  '/hero-illustration.jpg',
  '/manifest.json',
];

// ── Install: Cache semua aset statis ─────────────────────────────────────────
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      console.log('[SW] Pre-caching static assets');
      return cache.addAll(STATIC_ASSETS);
    }).then(() => self.skipWaiting())
  );
});

// ── Activate: Hapus cache lama ────────────────────────────────────────────────
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames
          .filter((name) => name !== CACHE_NAME)
          .map((name) => {
            console.log('[SW] Deleting old cache:', name);
            return caches.delete(name);
          })
      );
    }).then(() => self.clients.claim())
  );
});

// ── Fetch: Network-first dengan fallback ke cache ─────────────────────────────
self.addEventListener('fetch', (event) => {
  // Hanya handle request GET dari origin yang sama
  if (event.request.method !== 'GET') return;

  const url = new URL(event.request.url);

  // Skip request ke Google Fonts / CDN eksternal — biarkan langsung ke network
  if (!url.origin.includes(self.location.origin)) {
    return;
  }

  event.respondWith(
    fetch(event.request)
      .then((networkResponse) => {
        // Jika berhasil, simpan ke cache dan kembalikan response
        if (networkResponse && networkResponse.status === 200) {
          const responseClone = networkResponse.clone();
          caches.open(CACHE_NAME).then((cache) => {
            cache.put(event.request, responseClone);
          });
        }
        return networkResponse;
      })
      .catch(() => {
        // Jika offline, coba ambil dari cache
        return caches.match(event.request).then((cachedResponse) => {
          if (cachedResponse) {
            return cachedResponse;
          }
          // Fallback ke index.html untuk SPA routing
          return caches.match('/index.html');
        });
      })
  );
});
