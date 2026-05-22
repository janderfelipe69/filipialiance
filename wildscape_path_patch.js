// =====================================================================
// wildscape_path_patch.js
// Patch para suportar wildscape com caminho passo a passo.
//
// FORMATO DO DADO (exemplo Venusaur):
//   wildscape: 'https://i.imgur.com/phsFHqX.png',          ← Resp 1 (string normal)
//   wildcapePath: ['https://...', 'https://...', ...]      ← Caminho para Resp 2
//   wildscape2: 'https://i.imgur.com/vfbK7uX.png',         ← Resp 2 (destino)
//
// ALTERNATIVA com objeto (mais simples de usar):
//   wildscape: {
//     resp:  'https://i.imgur.com/phsFHqX.png',            ← Resp direto (Wildscape 1)
//     resp2: 'https://i.imgur.com/vfbK7uX.png',            ← Resp via caminho (Wildscape 2)
//     path:  ['url1', 'url2', 'url3', 'url4'],             ← Passo a passo para chegar
//   }
//
// Carregar DEPOIS de respawn_patch_modal.js no HTML:
//   <script src="wildscape_path_patch.js"></script>
// =====================================================================

(function () {
  'use strict';

  // ── Injetar estilos ────────────────────────────────────────────────
  var style = document.createElement('style');
  style.textContent = `

/* ── Slot wildscape com path ── */
.rsp-map-slot.wildscape.has-path {
  position: relative;
  flex-direction: column;
  align-items: stretch;
  gap: 0;
  padding: 0;
  overflow: hidden;
  cursor: default;
}
.rsp-map-slot.wildscape.has-path .rsp-ws-slot-top {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 13px 16px;
  cursor: pointer;
  transition: background 0.18s;
}
.rsp-map-slot.wildscape.has-path .rsp-ws-slot-top:hover {
  background: rgba(255,204,68,0.07);
}
.rsp-ws-slot-divider {
  height: 1px;
  background: rgba(255,255,255,0.06);
  margin: 0 16px;
}
.rsp-ws-path-btn {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 11px 16px;
  cursor: pointer;
  transition: background 0.18s;
  border: none;
  background: transparent;
  width: 100%;
  text-align: left;
  color: inherit;
}
.rsp-ws-path-btn:hover {
  background: rgba(120,220,255,0.07);
}
.rsp-ws-path-icon {
  font-size: 16px;
  flex-shrink: 0;
  opacity: 0.8;
}
.rsp-ws-path-text {
  flex: 1;
  min-width: 0;
}
.rsp-ws-path-label {
  font-family: var(--font-title, 'Cinzel', serif);
  font-size: 11px;
  font-weight: 700;
  letter-spacing: 0.5px;
  color: rgba(120,220,255,0.9);
  text-transform: uppercase;
}
.rsp-ws-path-sub {
  font-size: 11px;
  color: rgba(255,255,255,0.38);
  margin-top: 2px;
}
.rsp-ws-path-arrow {
  font-size: 14px;
  color: rgba(120,220,255,0.5);
}

/* ── Modal de caminho passo a passo ── */
#rsp-path-modal {
  position: fixed;
  inset: 0;
  z-index: 999999;
  display: flex;
  align-items: center;
  justify-content: center;
}
.rsp-path-backdrop {
  position: absolute;
  inset: 0;
  background: rgba(0,0,0,0.88);
  backdrop-filter: blur(8px);
  -webkit-backdrop-filter: blur(8px);
}
.rsp-path-panel {
  position: relative;
  z-index: 1;
  display: flex;
  flex-direction: column;
  width: min(96vw, 1060px);
  max-height: 94vh;
  background: #0d1018;
  border: 1px solid rgba(255,255,255,0.1);
  border-radius: 18px;
  overflow: hidden;
  box-shadow: 0 30px 100px rgba(0,0,0,0.85), 0 0 60px rgba(120,220,255,0.05);
  animation: rspPathIn 0.25s cubic-bezier(0.34,1.3,0.64,1) both;
}
@keyframes rspPathIn {
  from { opacity:0; transform: scale(0.93) translateY(14px); }
  to   { opacity:1; transform: scale(1) translateY(0); }
}

/* Header do modal de caminho */
.rsp-path-header {
  display: flex;
  align-items: center;
  gap: 14px;
  padding: 16px 20px;
  background: rgba(120,220,255,0.04);
  border-bottom: 1px solid rgba(255,255,255,0.07);
  flex-shrink: 0;
}
.rsp-path-header-icon { font-size: 20px; }
.rsp-path-header-info { flex: 1; min-width: 0; }
.rsp-path-header-title {
  font-family: var(--font-title, 'Cinzel', serif);
  font-size: 13px;
  font-weight: 700;
  letter-spacing: 1px;
  text-transform: uppercase;
  color: #fff;
}
.rsp-path-header-sub {
  font-size: 11px;
  color: rgba(255,255,255,0.35);
  margin-top: 2px;
  font-family: var(--font-body, sans-serif);
}
.rsp-path-close {
  background: rgba(255,255,255,0.07);
  border: 1px solid rgba(255,255,255,0.12);
  color: rgba(255,255,255,0.55);
  border-radius: 50%;
  width: 32px; height: 32px;
  cursor: pointer; font-size: 14px;
  display: flex; align-items: center; justify-content: center;
  transition: all 0.15s; flex-shrink: 0;
}
.rsp-path-close:hover { background: rgba(255,60,60,0.2); color: #fff; border-color: rgba(255,60,60,0.4); }

/* Navegação de steps */
.rsp-path-nav-bar {
  display: flex;
  align-items: center;
  gap: 0;
  padding: 0 20px;
  background: rgba(0,0,0,0.2);
  border-bottom: 1px solid rgba(255,255,255,0.06);
  overflow-x: auto;
  flex-shrink: 0;
  scrollbar-width: none;
}
.rsp-path-nav-bar::-webkit-scrollbar { display: none; }

.rsp-path-step-btn {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 12px 16px;
  background: transparent;
  border: none;
  cursor: pointer;
  color: rgba(255,255,255,0.38);
  font-family: var(--font-body, sans-serif);
  font-size: 12px;
  white-space: nowrap;
  border-bottom: 2px solid transparent;
  margin-bottom: -1px;
  transition: all 0.18s;
  flex-shrink: 0;
}
.rsp-path-step-btn:hover {
  color: rgba(255,255,255,0.7);
  background: rgba(255,255,255,0.03);
}
.rsp-path-step-btn.active {
  color: #78dcff;
  border-bottom-color: #78dcff;
  background: rgba(120,220,255,0.05);
}
.rsp-path-step-num {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 22px; height: 22px;
  border-radius: 50%;
  background: rgba(255,255,255,0.08);
  font-size: 11px;
  font-weight: 700;
  color: rgba(255,255,255,0.5);
  border: 1px solid rgba(255,255,255,0.1);
  flex-shrink: 0;
  transition: all 0.18s;
}
.rsp-path-step-btn.active .rsp-path-step-num {
  background: rgba(120,220,255,0.18);
  color: #78dcff;
  border-color: rgba(120,220,255,0.4);
}
.rsp-path-step-btn.is-dest .rsp-path-step-num {
  background: rgba(255,200,60,0.18);
  color: #ffc83c;
  border-color: rgba(255,200,60,0.4);
}
.rsp-path-step-btn.is-dest.active .rsp-path-step-num {
  background: rgba(255,200,60,0.3);
}
.rsp-path-step-btn.is-dest { color: rgba(255,200,60,0.7); }
.rsp-path-step-btn.is-dest.active { color: #ffc83c; border-bottom-color: #ffc83c; }
.rsp-path-step-divider {
  color: rgba(255,255,255,0.15);
  font-size: 16px;
  flex-shrink: 0;
  padding: 0 2px;
  line-height: 1;
  pointer-events: none;
}

/* Área da imagem */
.rsp-path-body {
  flex: 1;
  overflow: hidden;
  display: flex;
  flex-direction: column;
  background: #080a0d;
  min-height: 0;
}
.rsp-path-img-wrap {
  flex: 1;
  display: flex;
  align-items: center;
  justify-content: center;
  overflow: auto;
  padding: 8px;
  position: relative;
}
.rsp-path-img {
  display: block;
  max-width: 100%;
  max-height: calc(94vh - 270px);
  object-fit: contain;
  border-radius: 8px;
  box-shadow: 0 8px 40px rgba(0,0,0,0.6);
  animation: rspPathImgIn 0.2s ease both;
}
@keyframes rspPathImgIn {
  from { opacity: 0; transform: scale(0.97); }
  to   { opacity: 1; transform: scale(1); }
}
.rsp-path-img-loading {
  display: none;
  position: absolute;
  inset: 0;
  align-items: center;
  justify-content: center;
  color: rgba(255,255,255,0.25);
  font-size: 13px;
  font-family: var(--font-body, sans-serif);
}
.rsp-path-img-loading.show { display: flex; }

/* Footer de navegação */
.rsp-path-footer {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 12px 20px;
  background: rgba(255,255,255,0.025);
  border-top: 1px solid rgba(255,255,255,0.06);
  flex-shrink: 0;
  gap: 12px;
}
.rsp-path-footer-counter {
  font-family: var(--font-mono, monospace);
  font-size: 11px;
  color: rgba(255,255,255,0.3);
  letter-spacing: 1px;
  white-space: nowrap;
}
.rsp-path-footer-dest {
  font-size: 11px;
  color: rgba(255,200,60,0.6);
  font-family: var(--font-body, sans-serif);
  font-style: italic;
  flex: 1;
  text-align: center;
}
.rsp-path-footer-btns {
  display: flex;
  gap: 8px;
  flex-shrink: 0;
}
.rsp-path-nav-btn {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 8px 16px;
  border-radius: 10px;
  border: 1px solid rgba(255,255,255,0.12);
  background: rgba(255,255,255,0.05);
  color: rgba(255,255,255,0.7);
  cursor: pointer;
  font-size: 12px;
  font-family: var(--font-body, sans-serif);
  transition: all 0.18s;
  white-space: nowrap;
}
.rsp-path-nav-btn:hover:not(:disabled) {
  background: rgba(120,220,255,0.1);
  border-color: rgba(120,220,255,0.35);
  color: #fff;
}
.rsp-path-nav-btn:disabled {
  opacity: 0.3;
  cursor: not-allowed;
}
.rsp-path-nav-btn.is-dest-btn {
  border-color: rgba(255,200,60,0.3);
  color: #ffc83c;
  background: rgba(255,200,60,0.07);
}
.rsp-path-nav-btn.is-dest-btn:hover:not(:disabled) {
  background: rgba(255,200,60,0.15);
  border-color: rgba(255,200,60,0.5);
}
.rsp-path-dest-badge {
  display: inline-flex;
  align-items: center;
  gap: 5px;
  padding: 3px 10px;
  border-radius: 20px;
  background: rgba(255,200,60,0.12);
  border: 1px solid rgba(255,200,60,0.25);
  color: #ffc83c;
  font-size: 10px;
  font-family: var(--font-title, serif);
  font-weight: 700;
  letter-spacing: 0.5px;
  text-transform: uppercase;
}

/* Dots de progresso */
.rsp-path-progress {
  display: flex;
  align-items: center;
  gap: 5px;
  justify-content: center;
  padding: 8px 0 4px;
  flex-shrink: 0;
}
.rsp-path-dot {
  width: 7px; height: 7px;
  border-radius: 50%;
  background: rgba(255,255,255,0.15);
  border: 1px solid rgba(255,255,255,0.1);
  transition: all 0.2s;
  cursor: pointer;
}
.rsp-path-dot.active {
  background: #78dcff;
  border-color: #78dcff;
  box-shadow: 0 0 8px #78dcffaa;
  width: 20px;
  border-radius: 4px;
}
.rsp-path-dot.is-dest {
  background: rgba(255,200,60,0.4);
  border-color: rgba(255,200,60,0.5);
}
.rsp-path-dot.is-dest.active {
  background: #ffc83c;
  border-color: #ffc83c;
  box-shadow: 0 0 8px #ffc83caa;
}

/* ── Grade de thumbnails ── */
.rsp-path-thumbs {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
  padding: 10px 16px;
  background: rgba(0,0,0,0.25);
  border-top: 1px solid rgba(255,255,255,0.06);
  justify-content: center;
  flex-shrink: 0;
  overflow-x: auto;
  scrollbar-width: thin;
  scrollbar-color: rgba(255,255,255,0.1) transparent;
}
.rsp-path-thumbs::-webkit-scrollbar { height: 3px; }
.rsp-path-thumbs::-webkit-scrollbar-thumb { background: rgba(255,255,255,0.12); border-radius: 2px; }

.rsp-path-thumb {
  position: relative;
  width: 64px;
  height: 48px;
  border-radius: 6px;
  overflow: hidden;
  cursor: pointer;
  border: 2px solid rgba(255,255,255,0.1);
  transition: border-color 0.18s, transform 0.15s, box-shadow 0.18s;
  flex-shrink: 0;
  background: rgba(255,255,255,0.04);
}
.rsp-path-thumb:hover {
  border-color: rgba(120,220,255,0.5);
  transform: scale(1.08);
  z-index: 2;
  box-shadow: 0 4px 16px rgba(0,0,0,0.5);
}
.rsp-path-thumb.active {
  border-color: #78dcff;
  box-shadow: 0 0 0 1px #78dcff55, 0 4px 14px rgba(120,220,255,0.25);
  transform: scale(1.05);
}
.rsp-path-thumb.is-dest {
  border-color: rgba(255,200,60,0.3);
}
.rsp-path-thumb.is-dest:hover {
  border-color: rgba(255,200,60,0.7);
}
.rsp-path-thumb.is-dest.active {
  border-color: #ffc83c;
  box-shadow: 0 0 0 1px #ffc83c55, 0 4px 14px rgba(255,200,60,0.25);
}
.rsp-path-thumb img {
  width: 100%;
  height: 100%;
  object-fit: cover;
  display: block;
  transition: opacity 0.2s;
}
.rsp-path-thumb-num {
  position: absolute;
  bottom: 2px;
  left: 3px;
  background: rgba(0,0,0,0.72);
  color: rgba(255,255,255,0.75);
  font-size: 9px;
  font-weight: 700;
  font-family: var(--font-mono, monospace);
  padding: 1px 4px;
  border-radius: 3px;
  line-height: 1.4;
  letter-spacing: 0.3px;
}
.rsp-path-thumb.is-dest .rsp-path-thumb-num {
  background: rgba(255,200,60,0.85);
  color: #000;
}
.rsp-path-thumb.active .rsp-path-thumb-num {
  background: rgba(120,220,255,0.85);
  color: #000;
}
  `;
  document.head.appendChild(style);

  // ── Helpers ────────────────────────────────────────────────────────

  // Normaliza o campo wildscape para um objeto padronizado:
  // { entries: [{ label, url, path? }] }
  // path = array de URLs do passo a passo para chegar naquele resp
  function normalizeWildscape(ws) {
    if (!ws) return { entries: [] };

    // Formato objeto: { resp, resp2, path } ou { resp, path }
    if (typeof ws === 'object' && !Array.isArray(ws)) {
      var entries = [];
      if (ws.resp) {
        entries.push({ label: 'Wildscape 1', url: ws.resp, path: null });
      }
      if (ws.resp2) {
        entries.push({ label: 'Wildscape 2', url: ws.resp2, path: ws.path || null });
      } else if (ws.path && !ws.resp2) {
        // só tem path, sem resp2 definido — usa o último do path como destino
        var pathArr = ws.path;
        var dest = pathArr[pathArr.length - 1];
        var guideSteps = pathArr.slice(0, -1);
        entries.push({ label: 'Wildscape 2', url: dest, path: guideSteps.length ? guideSteps : null });
      }
      return { entries: entries };
    }

    // Formato string
    if (typeof ws === 'string') {
      return { entries: [{ label: 'Wildscape', url: ws, path: null }] };
    }

    // Formato array legado (sem path) — ex: ['url1','url2']
    if (Array.isArray(ws)) {
      return {
        entries: ws.map(function(url, i) {
          return { label: ws.length > 1 ? 'Wildscape ' + (i + 1) : 'Wildscape', url: url, path: null };
        })
      };
    }

    return { entries: [] };
  }

  // Converte URL imgur para direta
  function toDirectImgur(url) {
    if (!url) return url;
    var albumMatch = url.match(/imgur\.com\/a\/([A-Za-z0-9]+)/);
    var imageMatch = url.match(/imgur\.com\/([A-Za-z0-9]+)(?:\.[a-z]+)?$/);
    if (albumMatch) return 'https://i.imgur.com/' + albumMatch[1] + '.jpg';
    if (imageMatch) return 'https://i.imgur.com/' + imageMatch[1] + '.png';
    return url;
  }

  // ── Modal de Caminho Passo a Passo ────────────────────────────────

  var _pathCurrentStep = 0;
  var _pathSteps = [];       // array de { url, isDestino }
  var _pathPokeName = '';

  function openPathModal(steps, pokeName, destLabel) {
    _pathSteps = steps;
    _pathCurrentStep = 0;
    _pathPokeName = pokeName;

    var existing = document.getElementById('rsp-path-modal');
    if (existing) existing.remove();

    var modal = document.createElement('div');
    modal.id = 'rsp-path-modal';
    modal.innerHTML = _buildPathModalHtml(pokeName, destLabel);
    document.body.appendChild(modal);

    _renderPathStep(0);

    document.addEventListener('keydown', _pathKeyHandler);
  }

  function _buildPathModalHtml(pokeName, destLabel) {
    var total = _pathSteps.length;

    // Tabs de steps
    var tabsHtml = _pathSteps.map(function(step, i) {
      var isLast = i === total - 1;
      var numEl = '<span class="rsp-path-step-num">' + (isLast ? '🏁' : (i + 1)) + '</span>';
      var lbl   = isLast ? (destLabel || 'Destino') : 'Passo ' + (i + 1);
      var divider = i < total - 1 ? '<span class="rsp-path-step-divider">›</span>' : '';
      return '<button class="rsp-path-step-btn' + (isLast ? ' is-dest' : '') + '" onclick="rspPathGoTo(' + i + ')">'
        + numEl + lbl + '</button>' + divider;
    }).join('');

    // Dots
    var dotsHtml = _pathSteps.map(function(step, i) {
      var isLast = i === total - 1;
      return '<div class="rsp-path-dot' + (isLast ? ' is-dest' : '') + '" onclick="rspPathGoTo(' + i + ')" id="rsp-path-dot-' + i + '"></div>';
    }).join('');

    // Thumbnails
    var thumbsHtml = _pathSteps.map(function(step, i) {
      var isLast = i === total - 1;
      var directUrl = toDirectImgur(step.url);
      var label = isLast ? '🏁' : (i + 1);
      return '<div class="rsp-path-thumb' + (isLast ? ' is-dest' : '') + '" id="rsp-path-thumb-' + i + '" onclick="rspPathGoTo(' + i + ')" title="' + (isLast ? (destLabel || 'Destino') : 'Passo ' + (i + 1)) + '">'
        + '<img src="' + directUrl + '" alt="Passo ' + (i + 1) + '" loading="lazy" />'
        + '<span class="rsp-path-thumb-num">' + label + '</span>'
        + '</div>';
    }).join('');

    return (
      '<div class="rsp-path-backdrop" onclick="closePathModal()"></div>'
      + '<div class="rsp-path-panel">'

      // Header
      + '<div class="rsp-path-header">'
      +   '<span class="rsp-path-header-icon">🧭</span>'
      +   '<div class="rsp-path-header-info">'
      +     '<div class="rsp-path-header-title">Caminho para ' + (destLabel || 'Wildscape 2') + '</div>'
      +     '<div class="rsp-path-header-sub">' + pokeName + ' · ' + total + ' imagens de guia</div>'
      +   '</div>'
      +   '<button class="rsp-path-close" onclick="closePathModal()">✕</button>'
      + '</div>'

      // Nav bar de tabs
      + '<div class="rsp-path-nav-bar">' + tabsHtml + '</div>'

      // Dots de progresso
      + '<div class="rsp-path-progress" id="rsp-path-progress">' + dotsHtml + '</div>'

      // Imagem
      + '<div class="rsp-path-body">'
      +   '<div class="rsp-path-img-wrap">'
      +     '<div class="rsp-path-img-loading" id="rsp-path-loading">Carregando...</div>'
      +     '<img class="rsp-path-img" id="rsp-path-img" src="" alt="Passo" />'
      +   '</div>'
      + '</div>'

      // Thumbnails
      + '<div class="rsp-path-thumbs" id="rsp-path-thumbs">' + thumbsHtml + '</div>'

      // Footer
      + '<div class="rsp-path-footer">'
      +   '<button class="rsp-path-nav-btn" id="rsp-path-prev" onclick="rspPathPrev()">← Anterior</button>'
      +   '<div style="display:flex;flex-direction:column;align-items:center;gap:4px;flex:1;min-width:0">'
      +     '<span class="rsp-path-footer-counter" id="rsp-path-counter">1 / ' + total + '</span>'
      +     '<span class="rsp-path-footer-dest" id="rsp-path-dest-note"></span>'
      +   '</div>'
      +   '<button class="rsp-path-nav-btn" id="rsp-path-next" onclick="rspPathNext()">Próximo →</button>'
      + '</div>'

      + '</div>'
    );
  }

  function _renderPathStep(idx) {
    _pathCurrentStep = idx;
    var step  = _pathSteps[idx];
    var total = _pathSteps.length;
    var isLast = idx === total - 1;

    // Imagem
    var img = document.getElementById('rsp-path-img');
    var loading = document.getElementById('rsp-path-loading');
    if (img) {
      loading && loading.classList.add('show');
      img.style.opacity = '0';
      var directUrl = toDirectImgur(step.url);
      img.onload = function() {
        loading && loading.classList.remove('show');
        img.style.opacity = '1';
        img.style.transition = 'opacity 0.2s';
      };
      img.onerror = function() {
        loading && loading.classList.remove('show');
        img.style.opacity = '1';
      };
      img.src = directUrl;
    }

    // Counter
    var counter = document.getElementById('rsp-path-counter');
    if (counter) counter.textContent = (idx + 1) + ' / ' + total;

    // Nota de destino
    var destNote = document.getElementById('rsp-path-dest-note');
    if (destNote) {
      if (isLast) {
        destNote.innerHTML = '<span class="rsp-path-dest-badge">🏁 Destino — Wildscape 2</span>';
      } else {
        destNote.innerHTML = '';
      }
    }

    // Botões prev/next
    var prev = document.getElementById('rsp-path-prev');
    var next = document.getElementById('rsp-path-next');
    if (prev) prev.disabled = idx === 0;
    if (next) {
      if (isLast) {
        next.disabled = true;
        next.textContent = '🏁 Chegou!';
      } else {
        next.disabled = false;
        next.textContent = 'Próximo →';
      }
    }

    // Tabs
    var tabs = document.querySelectorAll('.rsp-path-step-btn');
    tabs.forEach(function(t, i) { t.classList.toggle('active', i === idx); });

    // Dots
    var dots = document.querySelectorAll('.rsp-path-dot');
    dots.forEach(function(d, i) { d.classList.toggle('active', i === idx); });

    // Thumbnails
    var thumbs = document.querySelectorAll('.rsp-path-thumb');
    thumbs.forEach(function(th, i) { th.classList.toggle('active', i === idx); });

    // Scroll thumbnail ativo para visível
    var activeThumb = document.getElementById('rsp-path-thumb-' + idx);
    if (activeThumb) {
      activeThumb.scrollIntoView({ behavior: 'smooth', block: 'nearest', inline: 'center' });
    }
  }

  window.rspPathGoTo = function(idx) {
    _renderPathStep(idx);
  };
  window.rspPathNext = function() {
    if (_pathCurrentStep < _pathSteps.length - 1) _renderPathStep(_pathCurrentStep + 1);
  };
  window.rspPathPrev = function() {
    if (_pathCurrentStep > 0) _renderPathStep(_pathCurrentStep - 1);
  };

  function _pathKeyHandler(e) {
    if (e.key === 'Escape') closePathModal();
    if (e.key === 'ArrowRight') window.rspPathNext();
    if (e.key === 'ArrowLeft')  window.rspPathPrev();
  }

  window.closePathModal = function() {
    var m = document.getElementById('rsp-path-modal');
    if (m) m.remove();
    document.removeEventListener('keydown', _pathKeyHandler);
  };

  window.openPathModalGlobal = function(stepsJson, pokeName, destLabel) {
    try {
      var steps = JSON.parse(stepsJson);
      openPathModal(steps, pokeName, destLabel);
    } catch(e) { console.error('openPathModalGlobal parse error', e); }
  };

  // ── Sobrescreve openRespawnModal para suportar o novo formato ─────

  var _origOpenRespawnModal = window.openRespawnModal;

  window.openRespawnModal = function(idx) {
    _rspCurrentIdx = idx;
    var list = window._rspFiltered || RAW_RESPAWN;
    var poke = list[idx];
    if (!poke) return;

    // Se o wildscape não tem o formato especial, usa o original
    var ws = poke.wildscape;
    var hasSpecial = ws && typeof ws === 'object' && !Array.isArray(ws) && (ws.path || ws.resp2);

    // Verifica também se tem wildcapePath (formato alternativo de campo separado)
    var hasPath = hasSpecial || poke.wildcapePath;

    if (!hasPath) {
      // Formato legado: delega para o original
      return _origOpenRespawnModal(idx);
    }

    // ── Formato novo: abre modal customizado ──────────────────────
    var existing = document.getElementById('rsp-poke-modal');
    if (existing) existing.remove();

    var types    = (typeof getPokemonTypes === 'function') ? getPokemonTypes(poke.name) : [];
    var accent   = (typeof getPrimaryTypeColor === 'function') ? getPrimaryTypeColor(types) : '#78dcff';
    var glowCol  = accent + '22';
    var sdName   = (typeof toShowdownName === 'function') ? toShowdownName(poke.name) : poke.name.toLowerCase();
    var animSrc   = 'https://play.pokemonshowdown.com/sprites/ani/'  + sdName + '.gif';
    var staticSrc = 'https://play.pokemonshowdown.com/sprites/dex/'  + sdName + '.png';
    var gen5Src   = 'https://play.pokemonshowdown.com/sprites/gen5/' + sdName + '.png';

    var typeChips = types.map(function(t) {
      var c = (typeof TYPE_COLORS !== 'undefined' && TYPE_COLORS[t]) ? TYPE_COLORS[t] : '#aaa';
      return '<span class="rsp-modal-type-chip" style="background:' + c + '22;border-color:' + c + '55;color:' + c + '">' + t.charAt(0).toUpperCase() + t.slice(1) + '</span>';
    }).join('');

    // Normaliza
    var normalized = normalizeWildscape(ws);

    // Se tiver wildcapePath separado (formato alternativo)
    if (poke.wildcapePath && !hasSpecial) {
      var wsUrl = typeof ws === 'string' ? ws : null;
      normalized = {
        entries: [
          wsUrl ? { label: 'Wildscape 1', url: wsUrl, path: null } : null,
          { label: 'Wildscape 2', url: null, path: poke.wildcapePath }
        ].filter(Boolean)
      };
    }

    // Gera slots
    var mapBtns = '';

    // Mapa Comum
    mapBtns += _makeSlotLegacy('comum', '🗺️', 'Mapa Comum', poke.mapImg || null, poke.name);
    // Hoenn
    mapBtns += _makeSlotLegacy('hoenn', '🌿', 'Hoenn', poke.mapHoenn || null, poke.name);

    // Wildscape slots
    if (normalized.entries.length === 0) {
      mapBtns += _makeSlotLegacy('wildscape', '⚡', 'Wildscape', null, poke.name);
    } else {
      normalized.entries.forEach(function(entry) {
        mapBtns += _makeWildscapeSlot(entry, poke.name);
      });
    }

    var modal = document.createElement('div');
    modal.id = 'rsp-poke-modal';
    modal.style.setProperty('--rsp-m-accent', accent);
    modal.style.setProperty('--rsp-m-glow', glowCol);

    var _navList  = window._rspFiltered || RAW_RESPAWN;
    var _navTotal = _navList.length;

    modal.innerHTML =
      '<div class="rsp-modal-backdrop" onclick="closeRespawnModal()"></div>'
      + '<div class="rsp-modal-panel">'
      +   '<button class="rsp-modal-close" onclick="closeRespawnModal()">✕</button>'
      +   '<button class="rsp-modal-nav rsp-modal-nav--prev" onclick="navigateRespawnModal(-1)" title="Anterior (←)">'
      +     '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" width="20" height="20"><polyline points="15 18 9 12 15 6"/></svg>'
      +   '</button>'
      +   '<button class="rsp-modal-nav rsp-modal-nav--next" onclick="navigateRespawnModal(1)" title="Próximo (→)">'
      +     '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" width="20" height="20"><polyline points="9 18 15 12 9 6"/></svg>'
      +   '</button>'
      +   '<div class="rsp-modal-counter">' + (_rspCurrentIdx + 1) + ' / ' + _navTotal + '</div>'

      +   '<div class="rsp-modal-header">'
      +     '<div class="rsp-modal-sprite-wrap">'
      +       '<img class="rsp-modal-sprite" src="' + animSrc + '" alt="' + poke.name + '" '
      +         'onerror="this.src=\'' + staticSrc + '\';this.onerror=function(){this.src=\'' + gen5Src + '\';this.onerror=null}" />'
      +     '</div>'
      +     '<div class="rsp-modal-info">'
      +       '<div class="rsp-modal-name">' + poke.name + '</div>'
      +       (typeChips ? '<div class="rsp-modal-types">' + typeChips + '</div>' : '')
      +     '</div>'
      +   '</div>'

      +   '<div class="rsp-modal-section">🗺️ Localização & Mapas</div>'
      +   '<div class="rsp-map-slots">' + mapBtns + '</div>'
      + '</div>';

    document.body.appendChild(modal);
    document.addEventListener('keydown', _rspEscHandler);
  };

  // Slot legado (igual ao original, sem path)
  function _makeSlotLegacy(type, icon, label, url, pokeName) {
    var hasMap = !!(url);
    var cls = 'rsp-map-slot ' + type + ' ' + (hasMap ? 'has-map' : 'no-map');
    var sub = hasMap ? 'Clique para ver o mapa' : 'Esse Pokémon não possui respawn nesse local';
    var onclick = hasMap ? ' onclick="openImgurMapModal(\'' + url + '\', \'' + label + '\', \'' + pokeName + '\')"' : '';
    var arrow = hasMap ? '<span class="rsp-map-slot-arrow">→</span>' : '';
    return '<div class="' + cls + '"' + onclick + '>'
      + '<span class="rsp-map-slot-icon">' + icon + '</span>'
      + '<span class="rsp-map-slot-body">'
      +   '<div class="rsp-map-slot-label">' + label + '</div>'
      +   '<div class="rsp-map-slot-sub">' + sub + '</div>'
      + '</span>'
      + arrow
      + '</div>';
  }

  // Slot wildscape — pode ter resp direto + botão de caminho
  function _makeWildscapeSlot(entry, pokeName) {
    var hasResp = !!(entry.url);
    var hasPath = !!(entry.path && entry.path.length > 0);

    if (!hasPath) {
      // Slot simples sem caminho
      return _makeSlotLegacy('wildscape', '⚡', entry.label, entry.url || null, pokeName);
    }

    // Monta steps: guia (path) + destino (url) se existir
    var steps = entry.path.map(function(u) { return { url: u }; });
    if (hasResp) steps.push({ url: entry.url, isDestino: true });

    var stepsJson = JSON.stringify(steps).replace(/'/g, "\\'");
    var destLabel = entry.label;

    // Slot com duas ações
    var respPart = '';
    if (hasResp) {
      var directUrl = toDirectImgur(entry.url);
      respPart = '<div class="rsp-ws-slot-top" onclick="openImgurMapModal(\'' + entry.url + '\', \'' + entry.label + '\', \'' + pokeName + '\')">'
        + '<span class="rsp-map-slot-icon">⚡</span>'
        + '<span class="rsp-map-slot-body">'
        +   '<div class="rsp-map-slot-label">' + entry.label + '</div>'
        +   '<div class="rsp-map-slot-sub">Clique para ver o mapa do respawn</div>'
        + '</span>'
        + '<span class="rsp-map-slot-arrow">→</span>'
        + '</div>'
        + '<div class="rsp-ws-slot-divider"></div>';
    } else {
      respPart = '<div class="rsp-ws-slot-top" style="cursor:default;opacity:0.55;">'
        + '<span class="rsp-map-slot-icon">⚡</span>'
        + '<span class="rsp-map-slot-body">'
        +   '<div class="rsp-map-slot-label">' + entry.label + '</div>'
        +   '<div class="rsp-map-slot-sub">Clique no caminho abaixo para navegar até o resp</div>'
        + '</span>'
        + '</div>'
        + '<div class="rsp-ws-slot-divider"></div>';
    }

    var pathPart = '<button class="rsp-ws-path-btn" onclick="openPathModalGlobal(\'' + stepsJson.replace(/"/g, '&quot;') + '\', \'' + pokeName + '\', \'' + destLabel + '\')">'
      + '<span class="rsp-ws-path-icon">🧭</span>'
      + '<span class="rsp-ws-path-text">'
      +   '<div class="rsp-ws-path-label">Ver Caminho Passo a Passo</div>'
      +   '<div class="rsp-ws-path-sub">' + (entry.path.length) + ' imagens de guia' + (hasResp ? ' + destino final' : '') + '</div>'
      + '</span>'
      + '<span class="rsp-ws-path-arrow">→</span>'
      + '</button>';

    return '<div class="rsp-map-slot wildscape has-map has-path">' + respPart + pathPart + '</div>';
  }

})();