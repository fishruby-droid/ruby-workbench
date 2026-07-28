/* Service Worker：网络优先 + 后台更新缓存，保证用户始终拿到最新版本 */
const VERSION = 'cbec-wb-v1';
const ASSETS = [
  '.', 'index.html', 'manifest.webmanifest',
  'css/styles.css',
  'js/store.js', 'js/regulations_bundle.js', 'js/daily.js', 'js/ecom.js',
  'js/policy.js', 'js/other.js', 'js/meetings.js', 'js/report.js', 'js/datamgr.js', 'js/app.js',
  'icons/icon-192.png', 'icons/icon-512.png'
];

self.addEventListener('install', e => {
  self.skipWaiting();
  e.waitUntil(caches.open(VERSION).then(c => c.addAll(ASSETS).catch(() => {})).catch(() => {}));
});

self.addEventListener('activate', e => {
  e.waitUntil(
    caches.keys().then(ks => Promise.all(ks.filter(k => k !== VERSION).map(k => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

// 网络优先：始终先尝试网络（拿最新），失败才回退缓存；并后台刷新缓存
self.addEventListener('fetch', e => {
  if (e.request.method !== 'GET') return;
  const url = new URL(e.request.url);
  // 仅处理同源静态资源
  if (url.origin !== self.location.origin) return;
  e.respondWith(
    fetch(e.request)
      .then(resp => {
        if (resp && resp.status === 200 && resp.type === 'basic') {
          const cp = resp.clone();
          caches.open(VERSION).then(c => c.put(e.request, cp)).catch(() => {});
        }
        return resp;
      })
      .catch(() => caches.match(e.request).then(r => r || caches.match('index.html')))
  );
});

// 允许页面主动触发跳过等待（立即激活新 SW）
self.addEventListener('message', e => {
  if (e.data === 'SKIP_WAITING') self.skipWaiting();
});
