/* Service Worker：缓存静态资源，支持离线/主屏打开 */
const CACHE = 'cbec-wb-v1';
const ASSETS = [
  '.', 'index.html', 'manifest.webmanifest',
  'css/styles.css',
  'js/store.js', 'js/daily.js', 'js/ecom.js', 'js/policy.js', 'js/report.js', 'js/app.js',
  'icons/icon-192.png', 'icons/icon-512.png'
];
self.addEventListener('install', e => { e.waitUntil(caches.open(CACHE).then(c => c.addAll(ASSETS)).catch(()=>{})); self.skipWaiting(); });
self.addEventListener('activate', e => { e.waitUntil(caches.keys().then(ks => Promise.all(ks.filter(k=>k!==CACHE).map(k=>caches.delete(k)))).then(()=>self.clients.claim())); });
self.addEventListener('fetch', e => {
  if (e.request.method !== 'GET') return;
  e.respondWith(caches.match(e.request).then(r => r || fetch(e.request).then(resp => {
    const cp = resp.clone(); caches.open(CACHE).then(c => c.put(e.request, cp)).catch(()=>{}); return resp;
  }).catch(() => caches.match('index.html'))));
});
