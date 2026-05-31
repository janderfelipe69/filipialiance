// ============================================================
// escape-html.js — Helper central de escape de HTML
//
// Fonte ÚNICA de verdade para neutralizar conteúdo de usuário
// antes de injetá-lo via innerHTML / template strings.
//
// Carregue ANTES de qualquer script que renderize HTML
// (logo após supabase-client.js no index.html).
//
// Uso:
//   PA.escapeHtml(valorDoUsuario)   // recomendado
//   escapeHtml(valorDoUsuario)      // alias global
//
// Escapa & < > " ' para que strings controladas pelo usuário
// (nickname, observações, mensagens, URLs de avatar, etc.) não
// consigam quebrar atributos nem injetar tags/scripts.
// ============================================================
;(function (global) {
  'use strict';

  var MAP = {
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#39;',
  };

  function escapeHtml(value) {
    return String(value == null ? '' : value).replace(/[&<>"']/g, function (c) {
      return MAP[c];
    });
  }

  global.PA = global.PA || {};
  // Não sobrescreve se já existir (compat com outras fases do PA)
  if (typeof global.PA.escapeHtml !== 'function') {
    global.PA.escapeHtml = escapeHtml;
  }
  // Alias global, sem clobberar um eventual escapeHtml pré-existente
  if (typeof global.escapeHtml !== 'function') {
    global.escapeHtml = global.PA.escapeHtml;
  }
})(typeof window !== 'undefined' ? window : this);
