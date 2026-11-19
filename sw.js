// Offline support for ScoreKalam.
// Online  -> always load the newest files from the server (and refresh the saved copy).
// Offline -> use the saved copy, so the app still opens at the court.
// Bump VERSION when you change any file.
const VERSION = 'badminton-v5';
const FILES = ['./', './index.html', './manifest.json', './icon-192.png', './icon-512.png'];

self.addEventListener('install', e => {
  e.waitUntil(caches.open(VERSION).then(c => c.addAll(FILES)));
  self.skipWaiting();
});

self.addEventListener('activate', e => {
  e.waitUntil(caches.keys().then(keys => Promise.all(keys.filter(k => k !== VERSION).map(k => caches.delete(k)))));
  self.clients.claim();
});

self.addEventListener('fetch', e => {
  const req = e.request;
  if (req.method !== 'GET' || new URL(req.url).origin !== location.origin) return;
  e.respondWith((async () => {
    const cache = await caches.open(VERSION);
    try {
      // Network first, but don't wait forever on a weak signal at the court
      const fresh = await Promise.race([
        fetch(req, { cache: 'no-cache' }),
        new Promise((_, reject) => setTimeout(() => reject(new Error('slow network')), 3000))
      ]);
      if (fresh && fresh.ok) cache.put(req, fresh.clone());
      return fresh;
    } catch (err) {
      return (await cache.match(req, { ignoreSearch: true })) ||
             (req.mode === 'navigate' && await cache.match('./index.html')) ||
             Response.error();
    }
  })());
});
