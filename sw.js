// Service Worker – macht die App nach dem ersten Laden offline verfügbar.
// Die Versionsnummer bei jeder Änderung erhöhen, damit Clients aktualisieren.
const CACHE = 'spinnanker-traglast-v1.1';
const ASSETS = [
  '.',
  'index.html',
  'styles.css',
  'app.js',
  'calculation.js',
  'manifest.webmanifest',
  'icon.svg',
  'icon-192.png',
  'icon-512.png',
  'apple-touch-icon.png',
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE).then((cache) => cache.addAll(ASSETS)).then(() => self.skipWaiting()),
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) => Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k))))
      .then(() => self.clients.claim()),
  );
});

// Cache-first: offline-tauglich; App-Dateien ändern sich nur mit neuer Version.
self.addEventListener('fetch', (event) => {
  if (event.request.method !== 'GET') return;
  event.respondWith(
    caches.match(event.request).then((cached) => cached || fetch(event.request)),
  );
});
