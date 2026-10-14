// Service Worker de limpeza para carregamento ultrarrápido nativo
self.addEventListener('install', () => {
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(keys.map((key) => caches.delete(key))))
      .then(() => self.clients.claim())
  );
});

// Sem interceptação de fetch para permitir carregamento nativo em 5G/4G/LTE sem bloqueios
