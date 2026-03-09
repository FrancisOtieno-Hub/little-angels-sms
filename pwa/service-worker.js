const CACHE_NAME = 'laa-sms-v2';
const urlsToCache = [
  '/',
  '/index.html',
  '/dashboard.html',
  '/learners.html',
  '/fees.html',
  '/custom-fees.html',
  '/payments.html',
  '/receipts.html',
  '/fee-reports.html',
  '/sms.html',
  '/promotion.html',
  '/css/style.css',
  '/js/auth.js',
  '/js/learners.js',
  '/js/fees.js',
  '/js/custom-fees.js',
  '/js/payments.js',
  '/js/receipts.js',
  '/js/fee-reports.js',
  '/js/sms.js',
  '/js/promotion.js',
  '/js/supabase.js',
  '/assets/logo.png'
];

self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => cache.addAll(urlsToCache))
  );
});

self.addEventListener('fetch', event => {
  event.respondWith(
    caches.match(event.request)
      .then(response => response || fetch(event.request))
  );
});

self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(cacheNames => {
      return Promise.all(
        cacheNames.map(cacheName => {
          if (cacheName !== CACHE_NAME) {
            return caches.delete(cacheName);
          }
        })
      );
    })
  );
});
