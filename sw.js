/**
 * sw.js — PokeAlliance Shop · Service Worker
 *
 * 🔑 Cache-bust automático:
 *    - VERSAO usa Date.now() a cada deploy → cache novo a cada build
 *    - Deploy é feito automaticamente pela Vercel a cada push
 *
 * 🔑 Anti-deadlock:
 *    - sw.js NUNCA é cacheado por este SW
 *    - index.html: network-first (sempre busca na rede)
 *    - JS/CSS: stale-while-revalidate (serve cache + atualiza em background)
 */

const VERSAO = 'v5.3-' + Date.now();
const CACHE_NAME = 'pokealliance-' + VERSAO;

const ARQUIVOS = [
  './css/style.css',
  './js/dados.js',
  './js/app.js',
  './js/mobile-ux.js',
  './js/respawn_patch_modal.js',
  './js/item-card-popup.js',
  './js/wiki-nav.js',
  './js/wiki-cards-upgrade.js',
  './js/quest-modal.js',
  './js/filter-smart.js',
  './js/tierlist.js',
  './js/tierlist-types.js',
];

// ── Instalação: cacheia assets (NÃO força skipWaiting) ────────────────────
// O novo SW fica "waiting" até o usuário aceitar a atualização pelo banner
// (sw-register.js envia SKIP_WAITING ao clicar). Evita reload abrupto.
self.addEventListener('install', function(event) {
  event.waitUntil(
    caches.open(CACHE_NAME).then(function(cache) {
      return Promise.allSettled(
        ARQUIVOS.map(function(url) {
          return fetch(url, { cache: 'no-store' }).then(function(res) {
            if (res.ok) return cache.put(url, res);
          });
        })
      );
    })
  );
});

// ── Ativação: apaga TODOS os caches antigos ────────────────────────────────
self.addEventListener('activate', function(event) {
  event.waitUntil(
    caches.keys().then(function(names) {
      return Promise.all(
        names
          .filter(function(n) { return n.startsWith('pokealliance-') && n !== CACHE_NAME; })
          .map(function(n) {
            console.log('[SW] Cache antigo apagado:', n);
            return caches.delete(n);
          })
      );
    }).then(function() {
      return self.clients.claim(); // assume controle de todas as abas abertas
    })
  );
});

// ── Fetch ──────────────────────────────────────────────────────────────────
self.addEventListener('fetch', function(event) {
  var url = event.request.url;

  if (event.request.method !== 'GET') return;
  if (!url.startsWith(self.location.origin)) return;

  // sw.js: NUNCA intercepta — browser sempre baixa direto da rede
  if (url.includes('sw.js')) return;

  // index.html e raiz: Network-first
  var isHTML = url.endsWith('/') || url.endsWith('index.html') || url === self.location.origin;
  if (isHTML) {
    event.respondWith(
      fetch(event.request, { cache: 'no-store' })
        .then(function(res) {
          if (res && res.status === 200) {
            caches.open(CACHE_NAME).then(function(cache) { cache.put(event.request, res.clone()); });
          }
          return res;
        })
        .catch(function() { return caches.match(event.request); })
    );
    return;
  }

  // JS/CSS: Stale-while-revalidate
  event.respondWith(
    caches.open(CACHE_NAME).then(function(cache) {
      return cache.match(event.request).then(function(cached) {
        var networkFetch = fetch(event.request, { cache: 'no-store' })
          .then(function(res) {
            if (res && res.status === 200) cache.put(event.request, res.clone());
            return res;
          })
          .catch(function() { return cached; });

        return cached || networkFetch;
      });
    })
  );
});

// ── Mensagens da página ────────────────────────────────────────────────────
self.addEventListener('message', function(event) {
  if (event.data && event.data.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }
});