/**
 * packages.logic.js
 * ──────────────────────────────────────────────────────────────────────────────
 * Responsabilidade única: lógica de estado e dados da aba de pacotes.
 *
 * Este módulo NÃO renderiza HTML.
 * NÃO injeta CSS. NÃO acessa o DOM (exceto para triggers de re-render).
 * NÃO altera estrutura do banco, carrinho ou sistema de tabs.
 *
 * Contém:
 *   • Mapeamento de tipo/cor/ícone pelo nome do pacote
 *   • Classificação por categoria
 *   • Cálculo de totais
 *   • Estado de slots ativos e itens desativados
 *   • Funções de seleção (selectPkg, selectPkgCat, selectPkgSlot)
 *   • Funções de toggle de item (togglePkgItem)
 *   • Funções de compatibilidade legadas (openPkgModal, renderPkgModalRows)
 *   • Funções de carrinho (addPackageToCartDirect, removePackageFromCart)
 *
 * Dependências externas (declaradas em app.js / dados.js):
 *   PACKAGES, items, pkgCartCount, activePkgIdx, activePkgCat,
 *   activeSlotByPkg, disabledPkgItems, formatKK, addToCart, cart,
 *   updateCartBadge, renderCart
 * ──────────────────────────────────────────────────────────────────────────────
 */

/* ─── Estado (mantido como estava em app.js) ──────────────────────────────── */

// Nota: activePkgIdx, activePkgCat, pkgCartCount já declarados em app.js (l.44, l.2285-2286)
// activeSlotByPkg e disabledPkgItems declarados em app.js (l.2599-2601)
// São preservados aqui apenas como documentação de dependência.

/* ─── Mapeamento de cor por tipo ──────────────────────────────────────────── */

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

/* ─── Mapeamento de ícone por nome ────────────────────────────────────────── */

function getPkgIcon(name) {
  const img = (url) => `<img src="${url}" style="width:32px;height:32px;object-fit:contain" />`;
  const n = name.toLowerCase();

  if (n.startsWith('reduces') || n.startsWith('reduce')) {
    if (n.includes('ice'))                               return img('https://i.imgur.com/ssFz0sA.png');
    if (n.includes('sand') || n.includes('ground'))      return img('https://i.imgur.com/JPcD2l3.png');
    if (n.includes('fire'))                              return img('https://i.imgur.com/O8TONGE.png');
    if (n.includes('grass'))                             return img('https://i.imgur.com/YjKxtoE.png');
    if (n.includes('electric'))                          return img('https://i.imgur.com/Yv2WEYc.png');
    if (n.includes('psychic'))                           return img('https://i.imgur.com/ASiZi1K.png');
    if (n.includes('poison'))                            return img('https://i.imgur.com/xfX0ReE.png');
    if (n.includes('normal'))                            return img('https://i.imgur.com/w2ChsIe.png');
    if (n.includes('steel') || n.includes('metal'))      return img('https://i.imgur.com/GleRjiM.png');
    if (n.includes('rock'))                              return img('https://i.imgur.com/GvD1Mtq.png');
    if (n.includes('dark'))                              return img('https://i.imgur.com/7Luj4az.png');
    if (n.includes('dragon'))                            return img('https://i.imgur.com/o7JWbaN.png');
    if (n.includes('ghost'))                             return img('https://i.imgur.com/HuybbPn.png');
    if (n.includes('fairy'))                             return img('https://i.imgur.com/j3HaXTh.png');
    if (n.includes('flying'))                            return img('https://i.imgur.com/npGjQae.png');
    if (n.includes('bug'))                               return img('https://i.imgur.com/V4IXR51.png');
    if (n.includes('fighting') || n.includes('figthing')) return img('https://i.imgur.com/OKsJXh7.png');
    if (n.includes('water'))                             return img('https://i.imgur.com/zpRe43i.png');
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

/* ─── Categorias ──────────────────────────────────────────────────────────── */

function getPkgCategory(name) {
  const n = name.toLowerCase();
  if (n.startsWith('talent'))                          return 'talent';
  if (n.startsWith('gym'))                             return 'gym';
  if (n.startsWith('full'))                            return 'full';
  if (n.startsWith('reduces') || n.startsWith('reduce')) return 'reduces';
  return 'outros';
}

/* Meta de UI das categorias — usado por renderPkgCatTabs em packages.render.js */
var PKG_CAT_META = {
  all:     { label: 'Todos',    icon: '📦' },
  talent:  { label: 'Talents',  icon: '✨' },
  gym:     { label: 'Gym',      icon: '<img src="https://i.imgur.com/XyBY6d2.png" style="width:18px;height:18px;object-fit:contain" />' },
  full:    { label: 'Full',     icon: '⚡' },
  reduces: { label: 'Reduces',  icon: '<img src="https://i.imgur.com/KgwwD7D.png" style="width:18px;height:18px;object-fit:contain" />' },
  outros:  { label: 'Outros',   icon: '🎲' },
};

/* ─── Label de slot ───────────────────────────────────────────────────────── */

function getSlotLabel(pkg, si) {
  const n = pkg.name.toLowerCase();
  if (n.includes('talent')) return 'Talent ' + (si + 1);
  if (n.includes('gym'))    return 'Slot '   + (si + 1);
  if (n.includes('full'))   return 'Slot '   + (si + 1);
  return 'Slot ' + (si + 1);
}

/* ─── Acesso a dados dos itens ────────────────────────────────────────────── */
// Nota: getPkgItemData, getPkgAllItems e getPkgTotal permanecem em app.js.
// packages.logic.js os consome via escopo global.

/* ─── Estado de itens desativados ─────────────────────────────────────────── */

function pkgItemKey(si, name) { return si + ':' + name; }

function isPkgItemDisabled(pi, si, name) {
  return disabledPkgItems[pi] && disabledPkgItems[pi].has(pkgItemKey(si, name));
}

function togglePkgItem(pi, si, name) {
  if (!disabledPkgItems[pi]) disabledPkgItems[pi] = new Set();
  const key = pkgItemKey(si, name);
  if (disabledPkgItems[pi].has(key)) {
    disabledPkgItems[pi].delete(key);
  } else {
    disabledPkgItems[pi].add(key);
  }
  renderPkgDetail(pi);
}

function getPkgActiveItems(pkg, pi) {
  return (pkg.slots || []).flatMap((slot, si) =>
    slot.filter(([name]) => !isPkgItemDisabled(pi, si, name))
  );
}

/* ─── Cálculo de total ────────────────────────────────────────────────────── */

function getPkgTotal(pkg, pi) {
  const src = (pi !== undefined) ? getPkgActiveItems(pkg, pi) : getPkgAllItems(pkg);
  return src.reduce((sum, [name, qty]) => {
    const item = getPkgItemData(name);
    return sum + (item && item.price ? item.price * qty : 0);
  }, 0);
}

/* ─── Navegação / seleção ─────────────────────────────────────────────────── */

function selectPkg(pi) {
  activePkgIdx = pi;
  renderPackages();
  renderPkgDetail(pi);
}

function selectPkgCat(cat) {
  activePkgCat = cat;
  /* Se o pacote ativo não pertence à nova categoria, deseleciona */
  if (activePkgIdx !== null && cat !== 'all') {
    if (getPkgCategory(PACKAGES[activePkgIdx].name) !== cat) {
      activePkgIdx = null;
      const detail = document.getElementById('pkg-detail');
      if (detail) {
        detail.innerHTML = `
          <div class="pkg-detail-empty" id="pkg-detail-empty">
            <div class="pkg-detail-empty-icon">📋</div>
            <div class="pkg-detail-empty-text">Selecione um pacote</div>
          </div>`;
      }
    }
  }
  renderPackages();
}

function selectPkgSlot(pi, si) {
  activeSlotByPkg[pi] = si;
  renderPkgDetail(pi);
}

/* ─── Compatibilidade legada ──────────────────────────────────────────────── */

/** Mantido para compatibilidade — agora redireciona para seleção inline */
function openPkgModal(pi) {
  selectPkg(pi);
}

/** Mantido para compatibilidade */
function renderPkgModalRows() {
  if (activePkgIdx !== null) renderPkgDetail(activePkgIdx);
}

/* ─── Carrinho de pacotes ─────────────────────────────────────────────────── */
// addPackageToCartDirect e removePackageFromCart estão em app.js
// (versões completas com toast, atualização de botões individuais e renderCart).
// packages.logic.js não os redefine para evitar shadowing.
