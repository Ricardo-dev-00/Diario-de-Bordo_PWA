/* ============================================================
   Diário de Bordo – service-worker.js
   Estratégia: Cache-First para assets estáticos.
   ============================================================ */

const CACHE_NAME  = 'diario-bordo-v10';
const ASSETS = [
  './',
  './index.html',
  './style.css',
  './script.js',
  './manifest.json',
  './icons/icon-192x192.png',
  './icons/icon-512x512.png',
  './icons/tela-app-diario-de-bordo.png',
];

// ── Install: pré-cacheia os assets essenciais ──────────────────
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches
      .open(CACHE_NAME)
      .then((cache) => cache.addAll(ASSETS))
      .then(() => self.skipWaiting())   // ativa imediatamente
  );
});

// ── Activate: remove caches de versões antigas ─────────────────
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) =>
        Promise.all(
          keys
            .filter((key) => key !== CACHE_NAME)
            .map((key) => caches.delete(key))
        )
      )
      .then(() => self.clients.claim())  // assume controle das abas abertas
  );
});

// ── Fetch: Cache-First → rede → fallback ──────────────────────
self.addEventListener('fetch', (event) => {
  // Ignora requisições não-GET e cross-origin que não estão em cache
  if (event.request.method !== 'GET') return;

  event.respondWith(
    caches.match(event.request).then((cached) => {
      if (cached) return cached;

      // Não está em cache: busca na rede e armazena para uso futuro
      return fetch(event.request)
        .then((response) => {
          // Só armazena respostas válidas e same-origin
          if (
            response.ok &&
            response.type !== 'opaque' &&
            event.request.url.startsWith(self.location.origin)
          ) {
            const clone = response.clone();
            caches.open(CACHE_NAME).then((cache) =>
              cache.put(event.request, clone)
            );
          }
          return response;
        })
        .catch(() =>
          // Offline e sem cache: devolve o index.html como fallback
          caches.match('./index.html')
        );
    })
  );
});
