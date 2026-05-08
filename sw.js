/**
 * sw.js — PokeAlliance Shop · Service Worker com Cache Buster Automático
 *
 * ✅ Como usar: quando fizer uma atualização nos arquivos, basta mudar o
 *    número da VERSAO abaixo (ex: 'v5', 'v6'...). O Service Worker vai
 *    detectar a mudança automaticamente e limpar o cache antigo para todos
 *    os usuários na próxima vez que abrirem o site.
 */

const VERSAO = 'v4.6'; // ← mude aqui a cada deploy
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
            // Apaga qualquer cache que não seja o atual
            return name.startsWith('pokealliance-') && name !== CACHE_NAME;
          })
          .map(function(name) {
            console.log('[SW] Cache antigo apagado:', name);
            return caches.delete(name);
          })
      );
    }).then(function() {
      // Assume controle de todas as abas abertas imediatamente
      return self.clients.claim();
    })
  );
});

// ── Fetch: serve do cache, busca na rede se não tiver ─────────────────────
self.addEventListener('fetch', function(event) {
  // Ignora requisições externas (Google Fonts, Imgur, APIs etc.)
  if (!event.request.url.startsWith(self.location.origin)) return;
  // Ignora requisições não-GET
  if (event.request.method !== 'GET') return;

  event.respondWith(
    caches.match(event.request).then(function(cached) {
      if (cached) return cached;

      // Não está no cache: busca na rede e salva
      return fetch(event.request).then(function(response) {
        if (!response || response.status !== 200 || response.type === 'opaque') {
          return response;
        }
        var responseClone = response.clone();
        caches.open(CACHE_NAME).then(function(cache) {
          cache.put(event.request, responseClone);
        });
        return response;
      });
    })
  );
});
