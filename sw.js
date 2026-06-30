/* ONS OdontoTécnica — Service Worker v5 */
const CACHE_V = 'ons-v5';
const STATIC  = CACHE_V + '-static';
const CDN     = CACHE_V + '-cdn';
const BASE    = '/ONS-IO-V2';

const LOCAL = [
  BASE + '/',
  BASE + '/index.html',
  BASE + '/manifest.json',
  BASE + '/sw.js',
  BASE + '/icon-192x192.png',
  BASE + '/icon-512x512.png'
];

const CDNS = [
  'https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/css/all.min.css',
  'https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&family=Barlow+Condensed:wght@600;700&display=swap',
  'https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2',
  'https://cdnjs.cloudflare.com/ajax/libs/html2pdf.js/0.10.1/html2pdf.bundle.min.js'
];

self.addEventListener('install', e => {
  e.waitUntil(
    Promise.all([
      caches.open(STATIC).then(c => Promise.allSettled(LOCAL.map(u => c.add(u).catch(() => {})))),
      caches.open(CDN).then(c => Promise.allSettled(CDNS.map(u => c.add(u).catch(() => {}))))
    ]).then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', e => {
  e.waitUntil(
    caches.keys()
      .then(keys => Promise.all(keys.filter(k => k !== STATIC && k !== CDN).map(k => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', e => {
  const url = e.request.url;
  if (url.includes('supabase.co')) {
    e.respondWith(fetch(e.request).catch(() => new Response('{"error":"offline"}', { headers: { 'Content-Type': 'application/json' } })));
    return;
  }
  if (url.includes('fonts.') || url.includes('cdnjs.') || url.includes('cdn.jsdelivr')) {
    e.respondWith(caches.match(e.request).then(c => c || fetch(e.request).then(r => {
      if (r && r.status === 200) caches.open(CDN).then(cache => cache.put(e.request, r.clone()));
      return r;
    }).catch(() => new Response('', { status: 503 }))));
    return;
  }
  e.respondWith(caches.match(e.request).then(cached => {
    const net = fetch(e.request).then(r => {
      if (r && r.status === 200 && e.request.method === 'GET')
        caches.open(STATIC).then(c => c.put(e.request, r.clone()));
      return r;
    }).catch(() => null);
    return cached || net || new Response('Offline', { status: 503 });
  }));
});

self.addEventListener('message', e => {
  if (e.data?.type === 'SKIP_WAITING') self.skipWaiting();
});
