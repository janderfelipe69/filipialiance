/**
 * packages.logic.js
 * ─────────────────────────────────────────────────────────────────────────────
 * SOURCE OF TRUTH para todo o estado da aba de pacotes.
 *
 * REGRA: nenhum outro arquivo declara variáveis de estado de pacotes.
 * Tudo lê e escreve via window.pkgState.
 *
 * Carregado APÓS app.js (que define PACKAGES, items, cart, formatKK, etc.)
 * ─────────────────────────────────────────────────────────────────────────────
 */

/* ═══════════════════════════════════════════════════════════════════════════
   ESTADO CENTRALIZADO
   ═══════════════════════════════════════════════════════════════════════════ */

window.pkgState = {
  activePkgIdx:    null,      // número | null  — pacote selecionado
  activePkgCat:    'all',     // string          — categoria ativa no filtro
  activeSlotByPkg: {},        // { [pi]: slotIdx } — slot ativo por pacote
  disabledPkgItems: {},       // { [pi]: Set<"si:name"> } — itens removidos
  cartCount:       {},        // { [pi]: número } — vezes que o pacote está no carrinho
};

/* ═══════════════════════════════════════════════════════════════════════════
   MAPEAMENTOS PUROS (sem estado, sem DOM)
   ═══════════════════════════════════════════════════════════════════════════ */

function getPkgTypeColor(name) {
  const n = name.toLowerCase();
  if (n.includes('water'))                              return '#00aaff';
  if (n.includes('steel') || n.includes('metal'))       return '#ccddee';
  if (n.includes('rock'))                               return '#aa8855';
  if (n.includes('psychic'))                            return '#ff44bb';
  if (n.includes('poison'))                             return '#aa00cc';
  if (n.includes('normal'))                             return '#bbbbbb';
  if (n.includes('ice'))                                return '#80e8ff';
  if (n.includes('ground') || n.includes('sand'))       return '#cc8800';
  if (n.includes('fire'))                               return '#ff6a00';
  if (n.includes('grass'))                              return '#44cc00';
  if (n.includes('electric'))                           return '#ffe600';
  if (n.includes('dark'))                               return '#6666cc';
  if (n.includes('dragon'))                             return '#ffaa00';
  if (n.includes('ghost'))                              return '#9900ff';
  if (n.includes('fairy'))                              return '#ff66bb';
  if (n.includes('flying'))                             return '#aabbff';
  if (n.includes('bug'))                                return '#99cc00';
  if (n.includes('fighting') || n.includes('figthing')) return '#ff4400';
  if (n.includes('speed'))                              return '#00ffcc';
  if (n.includes('hp'))                                 return '#ff4466';
  if (n.startsWith('gym') || n.includes('gym'))         return '#ffd166';
  if (n.startsWith('full'))                             return '#60aaff';
  return '#60aaff';
}

function getPkgIcon(name) {
  const img = (url) => `<img src="${url}" style="width:32px;height:32px;object-fit:contain" />`;
  const n = name.toLowerCase();

  if (n.startsWith('reduces') || n.startsWith('reduce')) {
    if (n.includes('ice'))                                return img('https://i.imgur.com/ssFz0sA.png');
    if (n.includes('sand') || n.includes('ground'))       return img('https://i.imgur.com/JPcD2l3.png');
    if (n.includes('fire'))                               return img('https://i.imgur.com/O8TONGE.png');
    if (n.includes('grass'))                              return img('https://i.imgur.com/YjKxtoE.png');
    if (n.includes('electric'))                           return img('https://i.imgur.com/Yv2WEYc.png');
    if (n.includes('psychic'))                            return img('https://i.imgur.com/ASiZi1K.png');
    if (n.includes('poison'))                             return img('https://i.imgur.com/xfX0ReE.png');
    if (n.includes('normal'))                             return img('https://i.imgur.com/w2ChsIe.png');
    if (n.includes('steel') || n.includes('metal'))       return img('https://i.imgur.com/GleRjiM.png');
    if (n.includes('rock'))                               return img('https://i.imgur.com/GvD1Mtq.png');
    if (n.includes('dark'))                               return img('https://i.imgur.com/7Luj4az.png');
    if (n.includes('dragon'))                             return img('https://i.imgur.com/o7JWbaN.png');
    if (n.includes('ghost'))                              return img('https://i.imgur.com/HuybbPn.png');
    if (n.includes('fairy'))                              return img('https://i.imgur.com/j3HaXTh.png');
    if (n.includes('flying'))                             return img('https://i.imgur.com/npGjQae.png');
    if (n.includes('bug'))                                return img('https://i.imgur.com/V4IXR51.png');
    if (n.includes('fighting') || n.includes('figthing')) return img('https://i.imgur.com/OKsJXh7.png');
    if (n.includes('water'))                              return img('https://i.imgur.com/zpRe43i.png');
    return img('https://i.imgur.com/zpRe43i.png');
  }

  if (n.includes('viridian'))  return img('https://i.imgur.com/AvX9Hbj.png');
  if (n.includes('cinnabar'))  return img('https://i.imgur.com/RsJe7OO.png');
  if (n.includes('pewter'))    return img('https://i.imgur.com/ViA3uQO.png');
  if (n.includes('cerulean'))  return img('https://i.imgur.com/uCRmZvq.png');
  if (n.includes('vermilion')) return img('https://i.imgur.com/GEfwZ4B.png');
  if (n.includes('celadon'))   return img('https://i.imgur.com/ocPJIHg.png');
  if (n.includes('fuchsia'))   return img('https://i.imgur.com/i8U2tWd.png');
  if (n.includes('saffron'))   return img('https://i.imgur.com/dzVfRLq.png');
  if (n.startsWith('gym'))     return img('https://i.imgur.com/XyBY6d2.png');
  if (n.includes('speed'))     return img('https://i.imgur.com/ODTCGEc.gif');
  if (n.includes('hp'))        return img('https://i.imgur.com/QhZ8LL5.gif');
  if (n.includes('water'))     return img('https://i.imgur.com/zpRe43i.png');
  if (n.includes('steel') || n.includes('metal')) return img('https://i.imgur.com/GleRjiM.png');
  if (n.includes('rock'))      return img('https://i.imgur.com/GvD1Mtq.png');
  if (n.includes('psychic'))   return img('https://i.imgur.com/ASiZi1K.png');
  if (n.includes('poison'))    return img('https://i.imgur.com/xfX0ReE.png');
  if (n.includes('normal'))    return img('https://i.imgur.com/w2ChsIe.png');
  if (n.includes('ice'))       return img('https://i.imgur.com/ssFz0sA.png');
  if (n.includes('ground'))    return img('https://i.imgur.com/JPcD2l3.png');
  if (n.includes('fire'))      return img('https://i.imgur.com/O8TONGE.png');
  if (n.includes('grass'))     return img('https://i.imgur.com/YjKxtoE.png');
  if (n.includes('electric'))  return img('https://i.imgur.com/Yv2WEYc.png');
  if (n.includes('dark'))      return img('https://i.imgur.com/7Luj4az.png');
  if (n.includes('dragon'))    return img('https://i.imgur.com/o7JWbaN.png');
  if (n.includes('ghost'))     return img('https://i.imgur.com/HuybbPn.png');
  if (n.includes('fairy'))     return img('https://i.imgur.com/j3HaXTh.png');
  if (n.includes('flying'))    return img('https://i.imgur.com/npGjQae.png');
  if (n.includes('bug'))       return img('https://i.imgur.com/V4IXR51.png');
  if (n.includes('fighting') || n.includes('figthing')) return img('https://i.imgur.com/OKsJXh7.png');
  return img('https://i.imgur.com/zpRe43i.png');
}

function getPkgCategory(name) {
  const n = name.toLowerCase();
  if (n.startsWith('talent'))                            return 'talent';
  if (n.startsWith('gym'))                               return 'gym';
  if (n.startsWith('full'))                              return 'full';
  if (n.startsWith('reduces') || n.startsWith('reduce')) return 'reduces';
  return 'outros';
}

var PKG_CAT_META = {
  all:     { label: 'Todos',   icon: '📦' },
  talent:  { label: 'Talents', icon: '✨' },
  gym:     { label: 'Gym',     icon: '<img src="https://i.imgur.com/XyBY6d2.png" style="width:18px;height:18px;object-fit:contain" />' },
  full:    { label: 'Full',    icon: '⚡' },
  reduces: { label: 'Reduces', icon: '<img src="https://i.imgur.com/KgwwD7D.png" style="width:18px;height:18px;object-fit:contain" />' },
  outros:  { label: 'Outros',  icon: '🎲' },
};

function getSlotLabel(pkg, si) {
  const n = pkg.name.toLowerCase();
  if (n.includes('talent')) return 'Talent ' + (si + 1);
  return 'Slot ' + (si + 1);
}

/* ═══════════════════════════════════════════════════════════════════════════
   ACESSO A DADOS (delegam para funções definidas em app.js)
   ═══════════════════════════════════════════════════════════════════════════ */

// getPkgItemData, getPkgAllItems → definidos em app.js, usados aqui via escopo global

/* ═══════════════════════════════════════════════════════════════════════════
   ESTADO DE ITENS DESATIVADOS — lê/escreve em pkgState.disabledPkgItems
   ═══════════════════════════════════════════════════════════════════════════ */

function pkgItemKey(si, name) {
  return si + ':' + name;
}

function isPkgItemDisabled(pi, si, name) {
  var set = pkgState.disabledPkgItems[pi];
  return set ? set.has(pkgItemKey(si, name)) : false;
}

function togglePkgItem(pi, si, name) {
  if (!pkgState.disabledPkgItems[pi]) pkgState.disabledPkgItems[pi] = new Set();
  var key = pkgItemKey(si, name);
  if (pkgState.disabledPkgItems[pi].has(key)) {
    pkgState.disabledPkgItems[pi].delete(key);
  } else {
    pkgState.disabledPkgItems[pi].add(key);
  }
  renderPkgDetail(pi);
}

function getPkgActiveItems(pkg, pi) {
  return (pkg.slots || []).flatMap(function(slot, si) {
    return slot.filter(function(entry) {
      return !isPkgItemDisabled(pi, si, entry[0]);
    });
  });
}

/* ═══════════════════════════════════════════════════════════════════════════
   CÁLCULO DE TOTAL
   ═══════════════════════════════════════════════════════════════════════════ */

function getPkgTotal(pkg, pi) {
  var src = (pi !== undefined) ? getPkgActiveItems(pkg, pi) : getPkgAllItems(pkg);
  return src.reduce(function(sum, entry) {
    var item = getPkgItemData(entry[0]);
    return sum + (PriceLayer.getItemPriceRaw(item) * (entry[1] || 0));
  }, 0);
}

/* ═══════════════════════════════════════════════════════════════════════════
   NAVEGAÇÃO — escreve em pkgState, chama render
   ═══════════════════════════════════════════════════════════════════════════ */

function selectPkg(pi) {
  pkgState.activePkgIdx = pi;
  renderPackages();
  renderPkgDetail(pi);
  requestAnimationFrame(function() {
    // Reseta scroll do container interno do detalhe
    var body = document.getElementById('pkg-detail-body-' + pi) || document.querySelector('.pkg-detail-body');
    if (body) body.scrollTop = 0;
    // Reseta scroll do pkg-detail inteiro
    var detail = document.getElementById('pkg-detail');
    if (detail) detail.scrollTop = 0;
  });
}

function selectPkgCat(cat) {
  pkgState.activePkgCat = cat;
  // Se pacote ativo não pertence à nova categoria, deseleciona
  if (pkgState.activePkgIdx !== null && cat !== 'all') {
    if (getPkgCategory(PACKAGES[pkgState.activePkgIdx].name) !== cat) {
      pkgState.activePkgIdx = null;
      var detail = document.getElementById('pkg-detail');
      if (detail) {
        detail.innerHTML =
          '<div class="pkg-detail-empty" id="pkg-detail-empty">' +
            '<div class="pkg-detail-empty-icon">📋</div>' +
            '<div class="pkg-detail-empty-text">Selecione um pacote</div>' +
          '</div>';
      }
    }
  }
  renderPackages();
}

function selectPkgSlot(pi, si) {
  pkgState.activeSlotByPkg[pi] = si;
  renderPkgDetail(pi);
}

/* ═══════════════════════════════════════════════════════════════════════════
   COMPATIBILIDADE LEGADA
   ═══════════════════════════════════════════════════════════════════════════ */

function openPkgModal(pi)    { selectPkg(pi); }
function renderPkgModalRows() {
  if (pkgState.activePkgIdx !== null) renderPkgDetail(pkgState.activePkgIdx);
}

/* ═══════════════════════════════════════════════════════════════════════════
   ALIASES — app.js usa pkgCartCount e activePkgIdx como variáveis soltas
   em addPackageToCartDirect / removePackageFromCart.
   Criamos proxies somente-leitura para compatibilidade sem redeclarar.
   ═══════════════════════════════════════════════════════════════════════════ */

// Garante que pkgCartCount aponta para pkgState.cartCount.
// app.js declara `let pkgCartCount = {}` na linha 44 e o reseta em clearCart().
// Sobrescrevemos a referência global DEPOIS que app.js carregou.
window.pkgCartCount = pkgState.cartCount;

// activePkgIdx: app.js lê direto em addPackageToCartDirect / removePackageFromCart.
// Expõe como getter/setter no window para que qualquer leitura/escrita
// reflita em pkgState sem precisar alterar app.js.
Object.defineProperty(window, 'activePkgIdx', {
  get: function() { return pkgState.activePkgIdx; },
  set: function(v) { pkgState.activePkgIdx = v; },
  configurable: true,
});

// activeSlotByPkg e disabledPkgItems: app.js não os usa diretamente,
// mas packages.render.js precisava deles como globais. Agora vêm de pkgState.
// Expõe aliases por segurança caso algum script legado ainda os referencie.
Object.defineProperty(window, 'activeSlotByPkg', {
  get: function() { return pkgState.activeSlotByPkg; },
  configurable: true,
});
Object.defineProperty(window, 'disabledPkgItems', {
  get: function() { return pkgState.disabledPkgItems; },
  configurable: true,
});
Object.defineProperty(window, 'activePkgCat', {
  get: function() { return pkgState.activePkgCat; },
  set: function(v) { pkgState.activePkgCat = v; },
  configurable: true,
});
