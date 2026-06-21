const CACHE_NAME = 'eesnaf-v1';

self.addEventListener('install', (event) => {
    self.skipWaiting();
});

self.addEventListener('fetch', (event) => {
    // Firebase ve API isteklerini cache'leme, sadece static dosyalar için basit yapıyı kuruyoruz
    if (event.request.url.includes('firestore')) return;
    
    event.respondWith(
        fetch(event.request).catch(() => {
            return caches.match(event.request);
        })
    );
});