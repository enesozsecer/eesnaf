const CACHE_NAME = 'eesnaf-v2';

self.addEventListener('install', (event) => {
    self.skipWaiting();
});

self.addEventListener('activate', (event) => {
    event.waitUntil(clients.claim());
});

self.addEventListener('fetch', (event) => {
    // Firebase ve API isteklerini atla, sadece statik dosyalar
    if (event.request.url.includes('firestore') || event.request.url.includes('googleapis')) return;
    
    event.respondWith(
        fetch(event.request).catch(() => caches.match(event.request))
    );
});