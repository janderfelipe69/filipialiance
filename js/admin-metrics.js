// ============================================================
// admin-metrics.js — Presença online + visitas do dia
// Mercadão Aliance
//
// • Todo visitante envia heartbeat (conta como "online") e 1 visita/sessão.
// • Apenas ADMIN vê o badge no header (online + visitas de hoje).
//
// Backend (já migrado):
//   rpc track_visit(p_server)        -> registra visita do dia
//   rpc heartbeat(p_client_id, srv)  -> marca presença, devolve nº online
//   rpc admin_visits_today()         -> [{server, visits}] (admin-only via RLS)
// ============================================================

;(function (global) {
  'use strict';

  var SB_URL = global.SUPABASE_URL;
  var SB_KEY = global.SUPABASE_KEY;
  var HEARTBEAT_MS = 20000;

  var _clientId = _ensureClientId();
  var _online   = 0;
  var _visits   = 0;
  var _timer    = null;

  function _ensureClientId() {
    var id = null;
    try { id = localStorage.getItem('pa_client_id'); } catch (_) {}
    if (!id) {
      id = 'c_' + Math.random().toString(36).slice(2) + Date.now().toString(36);
      try { localStorage.setItem('pa_client_id', id); } catch (_) {}
    }
    return id;
  }

  function _world() {
    return (global.PA && global.PA.world && global.PA.world.get()) || 'Moon';
  }

  function _jwt() {
    return (typeof Session !== 'undefined' && Session.getAccessToken)
      ? Session.getAccessToken() : null;
  }

  function _headers(auth) {
    var tok = (auth && _jwt()) || SB_KEY;
    return {
      'Content-Type': 'application/json',
      'apikey': SB_KEY,
      'Authorization': 'Bearer ' + tok,
    };
  }

  function _rpc(name, body, auth) {
    return fetch(SB_URL + '/rest/v1/rpc/' + name, {
      method: 'POST',
      headers: _headers(auth),
      body: JSON.stringify(body || {}),
    }).then(function (r) { return r.ok ? r.json() : null; })
      .catch(function () { return null; });
  }

  function _isAdmin() {
    return typeof Session !== 'undefined' && Session.isAdmin && Session.isAdmin();
  }

  // ── Visita única por dispositivo POR DIA ────────────────────
  // Antes era por sessão (sessionStorage) → reabrir aba recontava. Agora usa
  // localStorage com a data → conta no máximo 1 visita por mundo por dia, por
  // dispositivo. Refresh, nova aba ou reabrir no mesmo dia NÃO recontam; fica
  // bem mais perto de "visitantes únicos do dia".
  function _trackVisitOnce() {
    var today = new Date().toISOString().slice(0, 10); // AAAA-MM-DD
    var k = 'pa_visit_' + _world() + '_' + today;
    var done = false;
    try { done = localStorage.getItem(k) === '1'; } catch (_) {}
    if (done) return;
    _rpc('track_visit', { p_server: _world() });
    try {
      localStorage.setItem(k, '1');
      // limpa marcas de visita de dias anteriores (evita acúmulo)
      for (var i = localStorage.length - 1; i >= 0; i--) {
        var key = localStorage.key(i);
        if (key && key.indexOf('pa_visit_') === 0 && key.indexOf(today) === -1) {
          localStorage.removeItem(key);
        }
      }
    } catch (_) {}
  }

  // ── Heartbeat: marca presença (não exibe nada por si só) ────
  function _beat() {
    _rpc('heartbeat', { p_client_id: _clientId, p_server: _world() });
  }

  // ── Estatísticas públicas por mundo (online real + postagens) ─
  function _refreshStats() {
    _rpc('world_stats', {}).then(function (rows) {
      if (!Array.isArray(rows)) return;
      var counts = {};
      var onlineByWorld = {};
      rows.forEach(function (r) {
        counts[r.server] = r.postings || 0;
        onlineByWorld[r.server] = r.online || 0;
      });
      if (global.PA && global.PA.world && global.PA.world.setCounts) {
        global.PA.world.setCounts(counts);
      }
      _online = onlineByWorld[_world()] || 0;
      _renderBadge();
    });
  }

  // ── Visitas de hoje (admin) ─────────────────────────────────
  function _refreshVisits() {
    if (!_isAdmin()) return;
    _rpc('admin_visits_today', {}, true).then(function (rows) {
      if (Array.isArray(rows)) {
        _visits = rows.reduce(function (s, r) { return s + (r.visits || 0); }, 0);
        _renderBadge();
      }
    });
  }

  // ── UI: online é PÚBLICO; visitas só para admin ─────────────
  function _renderBadge() {
    var mount = document.getElementById('admin-metrics');
    if (!mount) return;
    mount.style.display = '';
    var html =
      '<span class="metric-chip metric-online" title="Jogadores online agora no mundo ' + _world() + '">' +
        '<span class="metric-dot"></span>' + _online + ' online' +
      '</span>';
    if (_isAdmin()) {
      html +=
        '<span class="metric-chip metric-visits" title="Visitas hoje (Moon + Sun)">' +
          '<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>' +
          _visits + ' hoje' +
        '</span>';
    }
    mount.innerHTML = html;
  }

  function _start() {
    _trackVisitOnce();
    _beat();
    _refreshStats();
    _refreshVisits();
    _renderBadge();
    _timer = setInterval(function () { _beat(); _refreshStats(); _refreshVisits(); }, HEARTBEAT_MS);
    // Re-registra visita e atualiza ao trocar de servidor
    global.addEventListener('pa:server-change', function () {
      _trackVisitOnce();
      _beat();
      _refreshStats();
      _refreshVisits();
    });
    // Quando o login/logout muda o papel, re-renderiza o badge
    global.addEventListener('pa:session-change', function () {
      _renderBadge(); _refreshVisits();
    });
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', _start);
  } else {
    _start();
  }

  global.PA = global.PA || {};
  global.PA.metrics = {
    online: function () { return _online; },
    visits: function () { return _visits; },
    refresh: function () { _beat(); _refreshVisits(); },
  };

})(typeof window !== 'undefined' ? window : this);
