/**
 * sw.js — PokeAlliance Shop · Service Worker com Cache Buster Automático
 *
 * ✅ Como usar: quando fizer uma atualização nos arquivos, basta mudar o
 *    número da VERSAO abaixo (ex: 'v5', 'v6'...). O Service Worker vai
 *    detectar a mudança automaticamente e limpar o cache antigo para todos
 *    os usuários na próxima vez que abrirem o site.
 *
 * ⚠️  IMPORTANTE: configure seu servidor para enviar este header no sw.js:
 *       Cache-Control: no-store, no-cache, must-revalidate
 *     Isso garante que o browser sempre baixe o sw.js mais recente.
 */

const VERSAO = 'v4.7'; // ← mude aqui a cada deploy
const CACHE_NAME = 'pokealliance-' + VERSAO;

// Arquivos que serão cacheados
const ARQUIVOS = [
  './',
  './index.html',
  './style.css',
  './mobile-patch.css',
  './dados.js',
  './app.js',
  './mobile-ux.js',
  './url-hash.js',
  './tutorial.js',
  './respawn_patch_modal.js',
  './wildscape_path_patch.js',
  './item-card-popup.js',
  './wiki-nav.js',
  './wiki-cards-upgrade.js',
  './quest-modal.js',
  './filter-smart.js',
  './tierlist.js',
  './tierlist-types.js',
];

// ── Instalação: cacheia todos os arquivos ──────────────────────────────────
self.addEventListener('install', function(event) {
  event.waitUntil(
    caches.open(CACHE_NAME).then(function(cache) {
      return cache.addAll(ARQUIVOS);
    }).then(function() {
      // Ativa imediatamente sem esperar fechar a aba antiga
      return self.skipWaiting();
    })
  );
});

// ── Ativação: apaga TODOS os caches antigos automaticamente ───────────────
self.addEventListener('activate', function(event) {
  event.waitUntil(
    caches.keys().then(function(cacheNames) {
      return Promise.all(
        cacheNames
          .filter(function(name) {
            return name.startsWith('pokealliance-') && name !== CACHE_NAME;
          })
          .map(function(name) {
            console.log('[SW] Cache antigo apagado:', name);
            return caches.delete(name);
          })
      );
    }).then(function() {
      return self.clients.claim();
    })
  );
});

// ── Fetch ──────────────────────────────────────────────────────────────────
self.addEventListener('fetch', function(event) {
  var url = event.request.url;

  // Ignora requisições externas (Google Fonts, Imgur, APIs etc.)
  if (!url.startsWith(self.location.origin)) return;
  // Ignora requisições não-GET
  if (event.request.method !== 'GET') return;

  // ⚠️ NUNCA cacheia o próprio sw.js — deixa o browser buscar sempre na rede
  if (url.includes('sw.js')) return;

  // HTML (index.html e raiz) → Network-first: tenta a rede, cai no cache se offline
  var isHTML = url.endsWith('/') || url.endsWith('.html') || url === self.location.origin;
  if (isHTML) {
    event.respondWith(
      fetch(event.request).then(function(response) {
        if (response && response.status === 200) {
          var clone = response.clone();
          caches.open(CACHE_NAME).then(function(cache) {
            cache.put(event.request, clone);
          });
        }
        return response;
      }).catch(function() {
        return caches.match(event.request);
      })
    );
    return;
  }

  // JS e CSS → Stale-while-revalidate: serve cache imediato E atualiza em segundo plano
  event.respondWith(
    caches.open(CACHE_NAME).then(function(cache) {
      return cache.match(event.request).then(function(cached) {
        var fetchPromise = fetch(event.request).then(function(response) {
          if (response && response.status === 200) {
            cache.put(event.request, response.clone());
          }
          return response;
        }).catch(function() {
          return cached; // offline: usa o cache
        });

        // Serve o cache imediatamente se existir, mas já atualiza em background
        return cached || fetchPromise;
      });
    })
  );
});
