// ============================================================
// price-history.js — Histórico de preço da comunidade
// Mercadão Aliance
//
// Mostra os preços de VENDAS CONCLUÍDAS de um Pokémon (por slug),
// no mundo ativo: mínimo / médio / máximo / última, + mini-gráfico.
//
// API:  PA.priceHistory.open(slug, name)
// Backend: rpc price_history(p_slug, p_server) -> { points:[{d,kk}], stats:{...} }
// ============================================================

;(function (global) {
  'use strict';

  var SB_URL = global.SUPABASE_URL;
  var SB_KEY = global.SUPABASE_KEY;

  function _world() {
    return (global.PA && global.PA.world && global.PA.world.get()) || 'Moon';
  }

  function _fmtKk(n) {
    if (n == null) return '—';
    var m = n / 1000000;
    if (m >= 1) return (Math.round(m * 10) / 10) + 'kk';
    var k = n / 1000;
    return (Math.round(k)) + 'k';
  }

  function _ensureEl() {
    var el = document.getElementById('price-hist-overlay');
    if (el) return el;
    el = document.createElement('div');
    el.id = 'price-hist-overlay';
    el.className = 'ph-overlay';
    el.addEventListener('click', function (e) { if (e.target === el) close(); });
    document.body.appendChild(el);
    return el;
  }

  // Mini-gráfico SVG (linha) a partir dos pontos
  function _sparkline(points) {
    if (!points || points.length < 2) return '';
    var w = 280, h = 70, pad = 6;
    var vals = points.map(function (p) { return p.kk; });
    var min = Math.min.apply(null, vals), max = Math.max.apply(null, vals);
    var range = (max - min) || 1;
    var step = (w - pad * 2) / (points.length - 1);
    var coords = points.map(function (p, i) {
      var x = pad + i * step;
      var y = h - pad - ((p.kk - min) / range) * (h - pad * 2);
      return [x, y];
    });
    var line = coords.map(function (c, i) { return (i ? 'L' : 'M') + c[0].toFixed(1) + ' ' + c[1].toFixed(1); }).join(' ');
    var area = line + ' L' + coords[coords.length - 1][0].toFixed(1) + ' ' + (h - pad) + ' L' + coords[0][0].toFixed(1) + ' ' + (h - pad) + ' Z';
    var dots = coords.map(function (c) {
      return '<circle cx="' + c[0].toFixed(1) + '" cy="' + c[1].toFixed(1) + '" r="2.5"/>';
    }).join('');
    return '<svg class="ph-spark" viewBox="0 0 ' + w + ' ' + h + '" preserveAspectRatio="none">'
      + '<path class="ph-spark-area" d="' + area + '"/>'
      + '<path class="ph-spark-line" d="' + line + '"/>'
      + '<g class="ph-spark-dots">' + dots + '</g>'
      + '</svg>';
  }

  function _render(el, name, data) {
    var stats  = (data && data.stats) || {};
    var points = (data && data.points) || [];
    var count  = stats.count || 0;

    var statsHtml = count > 0
      ? '<div class="ph-stats">'
        + '<div class="ph-stat"><span class="ph-stat-label">Menor</span><span class="ph-stat-val">' + _fmtKk(stats.min) + '</span></div>'
        + '<div class="ph-stat ph-stat--avg"><span class="ph-stat-label">Médio</span><span class="ph-stat-val">' + _fmtKk(stats.avg) + '</span></div>'
        + '<div class="ph-stat"><span class="ph-stat-label">Maior</span><span class="ph-stat-val">' + _fmtKk(stats.max) + '</span></div>'
        + '<div class="ph-stat"><span class="ph-stat-label">Última</span><span class="ph-stat-val">' + _fmtKk(stats.last) + '</span></div>'
        + '</div>'
        + _sparkline(points)
        + '<div class="ph-note">' + count + ' venda' + (count > 1 ? 's' : '') + ' registrada' + (count > 1 ? 's' : '') + ' no mundo ' + _world() + '</div>'
      : '<div class="ph-empty">Ainda não há vendas registradas deste Pokémon no mundo ' + _world() + '.<br><span>O histórico aparece conforme a comunidade fecha negócios.</span></div>';

    el.innerHTML =
      '<div class="ph-modal">'
      + '<button class="ph-close" aria-label="Fechar">✕</button>'
      + '<div class="ph-header">'
      +   '<span class="ph-title">📈 ' + (name ? name : 'Histórico de preço') + '</span>'
      +   '<span class="ph-sub">Vendas da comunidade</span>'
      + '</div>'
      + statsHtml
      + '</div>';
    el.querySelector('.ph-close').addEventListener('click', close);
  }

  function open(slug, name) {
    var el = _ensureEl();
    el.classList.add('open');
    _render(el, name, null);
    el.querySelector('.ph-modal').insertAdjacentHTML('beforeend', '<div class="ph-loading">Carregando…</div>');

    fetch(SB_URL + '/rest/v1/rpc/price_history', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'apikey': SB_KEY, 'Authorization': 'Bearer ' + SB_KEY },
      body: JSON.stringify({ p_slug: slug, p_server: _world() }),
    })
      .then(function (r) { return r.ok ? r.json() : null; })
      .then(function (data) { if (el.classList.contains('open')) _render(el, name, data || {}); })
      .catch(function () { if (el.classList.contains('open')) _render(el, name, {}); });
  }

  function close() {
    var el = document.getElementById('price-hist-overlay');
    if (el) el.classList.remove('open');
  }

  document.addEventListener('keydown', function (e) {
    if (e.key === 'Escape') close();
  });

  global.PA = global.PA || {};
  global.PA.priceHistory = { open: open, close: close };

})(typeof window !== 'undefined' ? window : this);
