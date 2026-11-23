// Service Worker: legt die App beim ersten Öffnen im Speicher ab, danach läuft sie ohne Internet.
const CACHE = 'mealprep-v2';
const CORE = ['./', './index.html', './manifest.webmanifest', './icon-180.png', './icon-192.png', './icon-512.png', './icon-maskable-512.png'];

self.addEventListener('install', e => {
  e.waitUntil(caches.open(CACHE).then(c => c.addAll(CORE)).then(() => self.skipWaiting()));
});
self.addEventListener('activate', e => {
  e.waitUntil(caches.keys()
    .then(keys => Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k))))
    .then(() => self.clients.claim()));
});
self.addEventListener('fetch', e => {
  const req = e.request;
  if (req.method !== 'GET') return;
  const url = new URL(req.url);
  if (req.mode === 'navigate' && url.origin === location.origin) {
    // sofort aus dem Speicher öffnen, im Hintergrund still aktualisieren
    const update = fetch(req).then(res => {
      if (res && res.ok && !res.redirected) caches.open(CACHE).then(c => c.put('./index.html', res.clone()));
      return res;
    }).catch(() => null);
    e.waitUntil(update);
    e.respondWith(caches.match('./index.html').then(hit => hit || update.then(r => r || new Response('Offline', {status: 503}))));
    return;
  }
  if (url.origin === location.origin || url.hostname === 'fonts.googleapis.com' || url.hostname === 'fonts.gstatic.com') {
    e.respondWith(caches.open(CACHE).then(c => c.match(req).then(hit => {
      const net = fetch(req).then(res => { if (res && (res.ok || res.type === 'opaque')) c.put(req, res.clone()); return res; }).catch(() => hit);
      return hit || net;
    })));
  }
});
