const CACHE_NAME = 'cunenevagas-v6';
const STATIC_ASSETS = [
  '/',
  '/manifest.webmanifest',
  '/icon.svg',
  '/icon-192.png',
  '/icon-512.png',
  '/apple-touch-icon.png'
];

self.addEventListener('install', (event) => {
  self.skipWaiting();
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(STATIC_ASSETS))
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(
        keys.map((key) => {
          if (key !== CACHE_NAME) {
            return caches.delete(key);
          }
        })
      )
    ).then(() => self.clients.claim())
  );
});

// Network First strategy: sempre buscar do servidor primeiro para garantir dados atualizados a cada deploy
self.addEventListener('fetch', (event) => {
  if (event.request.method !== 'GET') return;

  const url = new URL(event.request.url);

  // Não interferir com chamadas de terceiros (Supabase, Cloudinary, APIs externas)
  if (url.origin !== self.location.origin) return;

  // Não interceptar requisições com header de bypass
  if (url.pathname.startsWith('/rest/') || url.pathname.startsWith('/auth/')) return;

  // Para navegação HTML (páginas), sempre Network-First para pegar o build mais recente
  if (event.request.mode === 'navigate') {
    event.respondWith(
      fetch(event.request)
        .then((response) => response)
        .catch(async () => {
          const cached = await caches.match('/');
          return cached || (await caches.match('/index.html'));
        })
    );
    return;
  }

  // Para assets versionados (scripts e estilos com hash), busca da rede e fallback cache
  event.respondWith(
    fetch(event.request)
      .then((networkResponse) => {
        if (networkResponse && networkResponse.status === 200) {
          const responseClone = networkResponse.clone();
          caches.open(CACHE_NAME).then((cache) => cache.put(event.request, responseClone));
        }
        return networkResponse;
      })
      .catch(() => {
        return caches.match(event.request);
      })
  );
});
