// ============================================================
// price-layer.js — Camada centralizada de preços
// PokeAlliance Shop
//
// MODELO CANÔNICO:
//   item.price = null   → sem preço definido (dispara toast, mostra "sem preço")
//   item.price = 0      → item gratuito/craftável (preço válido, sem toast)
//   item.price = N > 0  → item pago, valor em unidades raw (ex: 350000 = 350k)
//
// NUNCA usar:
//   item.price || 0        (trata gratuito como inválido)
//   !item.price            (trata gratuito como inválido)
//   item.price ? ...       (trata gratuito como inválido)
//
// SEMPRE usar:
//   hasValidPrice(item)    → true para 0 e N>0, false para null
//   hasPaidPrice(item)     → true somente para N>0
//   getItemPriceRaw(item)  → retorna number (0 para gratuitos, 0 para sem preço)
// ============================================================

;(function (global) {
  'use strict';

  // ── Constante de conversão (fonte: dados.js) ─────────────────────────────
  // KK_TO_BRL é declarada em dados.js. Lemos de lá para não duplicar.
  function _kkToBrl() {
    return (typeof KK_TO_BRL !== 'undefined') ? KK_TO_BRL : 1.70;
  }

  // ── 1. Classificadores de preço ──────────────────────────────────────────

  /**
   * Retorna true para qualquer preço DEFINIDO — inclusive gratuito (0).
   * Retorna false somente quando price === null (não definido).
   * @param {object} item
   * @returns {boolean}
   */
  function hasValidPrice(item) {
    return item !== null &&
           item !== undefined &&
           item.price !== null &&
           item.price !== undefined;
  }

  /**
   * Retorna true somente quando o item possui preço monetário real (> 0).
   * Itens gratuitos (price === 0) retornam false — sem exibição de valor.
   * @param {object} item
   * @returns {boolean}
   */
  function hasPaidPrice(item) {
    return hasValidPrice(item) && item.price > 0;
  }

  /**
   * Retorna o valor raw numérico do preço.
   * Retorna 0 tanto para itens gratuitos quanto para sem preço
   * (sem preço não deve entrar em cálculos).
   * Use hasPaidPrice para distinguir os dois casos.
   * @param {object} item
   * @returns {number}
   */
  function getItemPriceRaw(item) {
    if (!hasValidPrice(item)) return 0;
    return item.price;          // 0 ou N>0
  }

  // ── 2. Formatadores ──────────────────────────────────────────────────────

  /**
   * Formata valor raw em label KK/kkk/k e BRL.
   * Retorna null para qualquer valor <= 0 ou nulo.
   * @param {number|null} raw
   * @returns {{ label: string, brl: string } | null}
   */
  function fmtKK(raw) {
    if (raw === null || raw === undefined || raw <= 0) return null;
    let label;
    if (raw >= 1_000_000_000) {
      const v = raw / 1_000_000_000;
      label = (v % 1 === 0 ? v.toFixed(0) : parseFloat(v.toFixed(2))) + 'kkk';
    } else if (raw >= 1_000_000) {
      const v = raw / 1_000_000;
      label = (v % 1 === 0 ? v.toFixed(0) : parseFloat(v.toFixed(2))) + 'kk';
    } else if (raw >= 1_000) {
      const v = raw / 1_000;
      label = (v % 1 === 0 ? v.toFixed(0) : parseFloat(v.toFixed(2))) + 'k';
    } else {
      label = raw.toString();
    }
    const brl = (raw / 1_000_000 * _kkToBrl())
      .toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
    return { label, brl };
  }

  /**
   * Formata item para exibição de preço.
   * Se item não tem preço definido → retorna null (caller mostra "sem preço").
   * Se item é gratuito → retorna null (caller mostra "sem preço" ou "grátis" conforme UX).
   * @param {object} item
   * @returns {{ label: string, brl: string } | null}
   */
  function fmtItemPrice(item) {
    if (!hasPaidPrice(item)) return null;
    return fmtKK(item.price);
  }

  // ── 3. Calculadores de total ─────────────────────────────────────────────

  /**
   * Soma total do carrinho em raw.
   * Itens gratuitos (price=0) contribuem com 0 — correto.
   * Itens sem preço (price=null) contribuem com 0 — não entram no total.
   * @param {Object} cart      — { itemIndex: qty }
   * @param {Array}  items     — array global de itens
   * @returns {number}
   */
  function calcCartTotal(cart, items) {
    return Object.keys(cart).reduce(function (sum, k) {
      var item = items[k];
      var qty  = cart[k];
      if (!item || !qty) return sum;
      return sum + getItemPriceRaw(item) * qty;
    }, 0);
  }

  /**
   * Soma total de um pacote (array de [name, qty] pairs) em raw.
   * @param {Array} pairs      — [ [name, qty], ... ]
   * @param {Function} lookupFn — function(name) → item object
   * @returns {number}
   */
  function calcPackageTotal(pairs, lookupFn) {
    return pairs.reduce(function (sum, pair) {
      var name = pair[0];
      var qty  = pair[1];
      if (!qty || qty <= 0) return sum;
      var item = lookupFn(name);
      return sum + getItemPriceRaw(item) * qty;
    }, 0);
  }

  /**
   * Filtra os nomes de itens sem preço definido (price === null) de um array.
   * Itens gratuitos (price === 0) NÃO aparecem nessa lista.
   * @param {Array} names      — array de nomes
   * @param {Function} lookupFn — function(name) → item object
   * @returns {string[]}
   */
  function getNoPriceNames(names, lookupFn) {
    return names.filter(function (name) {
      var item = lookupFn(name);
      return !hasValidPrice(item);
    });
  }

  // ── Exposição pública ────────────────────────────────────────────────────
  global.PriceLayer = {
    hasValidPrice:    hasValidPrice,
    hasPaidPrice:     hasPaidPrice,
    getItemPriceRaw:  getItemPriceRaw,
    fmtKK:            fmtKK,
    fmtItemPrice:     fmtItemPrice,
    calcCartTotal:    calcCartTotal,
    calcPackageTotal: calcPackageTotal,
    getNoPriceNames:  getNoPriceNames,
  };

}(window));
