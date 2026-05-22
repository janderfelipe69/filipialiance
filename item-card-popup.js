// =====================================================================
// ITEM CARD POPUP v3 — 2 abas: Pokémon que dropam | Onde é usado
// Onde é usado = Pacotes + Quests (com campo items:[]) + Roupas de Speed
// Carregue APÓS app.js no index.html
// =====================================================================

(function () {

// ── Estilos ────────────────────────────────────────────────────────────
const css = document.createElement('style');
css.textContent = `
/* ── Overlay ── */
#icp-overlay {
  position: fixed; inset: 0; z-index: 9900;
  background: rgba(2,5,14,0.80);
  backdrop-filter: blur(18px); -webkit-backdrop-filter: blur(18px);
  display: flex; align-items: center; justify-content: center;
  padding: 16px;
  opacity: 0; pointer-events: none;
  transition: opacity 0.25s cubic-bezier(.16,1,.3,1);
}
#icp-overlay.open { opacity: 1; pointer-events: all; }

/* ── Modal ── */
#icp-modal {
  background: linear-gradient(160deg, #0e1729 0%, #06101f 100%);
  border: 1px solid rgba(58,140,255,0.22);
  border-radius: 20px;
  width: 100%; max-width: 680px; max-height: 90vh;
  overflow: hidden; display: flex; flex-direction: column;
  box-shadow:
    0 0 90px rgba(58,140,255,0.10),
    0 32px 64px rgba(0,0,0,0.72),
    inset 0 1px 0 rgba(255,255,255,0.055);
  transform: translateY(20px) scale(0.97);
  transition: transform 0.3s cubic-bezier(.16,1,.3,1);
}
#icp-overlay.open #icp-modal { transform: none; }

/* topo colorido */
#icp-modal::before {
  content: ''; display: block; height: 2px; flex-shrink: 0;
  background: linear-gradient(90deg,
    transparent 0%,
    var(--icp-c1,#3a8cff) 35%,
    var(--icp-c2,#f0b429) 65%,
    transparent 100%);
}

/* ── Header ── */
.icp-hd {
  display: flex; align-items: center; gap: 15px;
  padding: 18px 22px 14px;
  border-bottom: 1px solid rgba(255,255,255,0.065);
  flex-shrink: 0;
}
.icp-hd-icon {
  width: 52px; height: 52px; border-radius: 14px; flex-shrink: 0;
  background: rgba(58,140,255,0.09); border: 1px solid rgba(58,140,255,0.22);
  display: flex; align-items: center; justify-content: center; overflow: hidden;
}
.icp-hd-icon img { width: 44px; height: 44px; object-fit: contain; image-rendering: pixelated; }
.icp-hd-info { flex: 1; min-width: 0; }
.icp-hd-name {
  font-family: var(--font-title,'Cinzel',serif);
  font-size: 17px; font-weight: 700; color: #fff; letter-spacing: .5px;
  white-space: nowrap; overflow: hidden; text-overflow: ellipsis;
}
.icp-hd-meta { display: flex; align-items: center; gap: 7px; margin-top: 4px; flex-wrap: wrap; }
.icp-badge {
  font-family: var(--font-mono,monospace); font-size: 9px; font-weight: 700;
  letter-spacing: 1.5px; text-transform: uppercase;
  padding: 2px 8px; border-radius: 20px;
  border: 1px solid rgba(255,255,255,0.11); color: rgba(255,255,255,0.45);
}
.icp-badge.tier-t1  { color:#a0d4ff; border-color:rgba(160,212,255,.30); background:rgba(160,212,255,.07); }
.icp-badge.tier-t2  { color:#66e5a0; border-color:rgba(102,229,160,.30); background:rgba(102,229,160,.07); }
.icp-badge.tier-t3  { color:#ffd166; border-color:rgba(255,209,102,.30); background:rgba(255,209,102,.07); }
.icp-badge.tier-t4  { color:#ff9f43; border-color:rgba(255,159,67 ,.30); background:rgba(255,159,67 ,.07); }
.icp-badge.tier-t5  { color:#ff6b6b; border-color:rgba(255,107,107,.30); background:rgba(255,107,107,.07); }
.icp-badge.tier-hard{ color:#ff4a7d; border-color:rgba(255,74 ,125,.30); background:rgba(255,74 ,125,.07); }
.icp-badge.tier-mark{ color:#d4a0ff; border-color:rgba(212,160,255,.30); background:rgba(212,160,255,.07); }
.icp-price {
  font-family: var(--font-mono,monospace); font-size: 11px; font-weight: 700;
  color: #5ba8ff; letter-spacing: .4px;
}
.icp-close {
  width: 34px; height: 34px;
  background: rgba(255,255,255,0.04); border: 1px solid rgba(255,255,255,0.09);
  border-radius: 10px; color: rgba(255,255,255,0.4); font-size: 14px; cursor: pointer;
  display: flex; align-items: center; justify-content: center; flex-shrink: 0;
  transition: background .14s, color .14s, border-color .14s;
}
.icp-close:hover { background: rgba(255,60,60,.14); border-color: rgba(255,60,60,.28); color: #ff6b6b; }

/* ── Tabs ── */
.icp-tabs {
  display: flex; gap: 2px; padding: 11px 22px 0;
  border-bottom: 1px solid rgba(255,255,255,0.065);
  flex-shrink: 0;
}
.icp-tab {
  font-family: var(--font-body,'Rajdhani',sans-serif);
  font-size: 11px; font-weight: 600; letter-spacing: 1px; text-transform: uppercase;
  padding: 8px 14px; border: none; background: transparent;
  color: rgba(255,255,255,0.35); cursor: pointer;
  border-bottom: 2px solid transparent; margin-bottom: -1px;
  transition: color .14s, border-color .14s;
  display: flex; align-items: center; gap: 6px;
}
.icp-tab:hover  { color: rgba(255,255,255,0.62); }
.icp-tab.active { color: #5ba8ff; border-bottom-color: #3a8cff; }
.icp-cnt {
  font-size: 10px; font-weight: 700; line-height: 1;
  padding: 2px 7px; border-radius: 20px; min-width: 18px; text-align: center;
  background: rgba(58,140,255,0.16); border: 1px solid rgba(58,140,255,0.28); color: #5ba8ff;
}
.icp-cnt.zero { background: rgba(255,255,255,0.04); border-color: rgba(255,255,255,0.09); color: rgba(255,255,255,0.22); }

/* ── Body ── */
.icp-body {
  flex: 1; overflow-y: auto; padding: 18px 22px 26px;
  scrollbar-width: thin; scrollbar-color: rgba(58,140,255,0.25) transparent;
}
.icp-body::-webkit-scrollbar { width: 4px; }
.icp-body::-webkit-scrollbar-thumb { background: rgba(58,140,255,0.25); border-radius: 2px; }

/* ── Empty ── */
.icp-empty {
  display: flex; flex-direction: column; align-items: center;
  gap: 10px; padding: 40px 20px; text-align: center;
}
.icp-empty-icon { font-size: 34px; opacity: .3; }
.icp-empty-text { font-family: var(--font-body,sans-serif); font-size: 13px; color: rgba(255,255,255,0.28); }

/* ── Intro ── */
.icp-intro {
  font-family: var(--font-body,sans-serif); font-size: 12px;
  color: rgba(255,255,255,0.32); margin-bottom: 14px;
}
.icp-intro b { color: rgba(255,255,255,0.58); font-weight: 600; }

/* ── Grid de Pokémon (drops) ── */
.icp-poke-grid {
  display: grid; grid-template-columns: repeat(auto-fill,minmax(108px,1fr)); gap: 9px;
}
.icp-poke-card {
  background: rgba(255,255,255,0.03); border: 1px solid rgba(255,255,255,0.075);
  border-radius: 13px; padding: 13px 9px 11px; text-align: center;
  transition: background .14s, border-color .14s, transform .14s;
}
.icp-poke-card:hover {
  background: rgba(58,140,255,0.07); border-color: rgba(58,140,255,0.28);
  transform: translateY(-2px);
}
.icp-poke-card img {
  width: 62px; height: 62px; object-fit: contain; image-rendering: pixelated;
  display: block; margin: 0 auto 7px;
}
.icp-poke-name {
  font-family: var(--font-body,sans-serif); font-size: 11px; font-weight: 600;
  color: rgba(255,255,255,0.68); line-height: 1.3; word-break: break-word;
}

/* ── Separador de seção (usado) ── */
.icp-sep {
  display: flex; align-items: center; gap: 9px; margin: 18px 0 10px;
}
.icp-sep:first-child { margin-top: 2px; }
.icp-sep-lbl {
  font-family: var(--font-mono,monospace); font-size: 9px; font-weight: 700;
  letter-spacing: 1.8px; text-transform: uppercase; white-space: nowrap;
  color: rgba(255,255,255,0.22);
}
.icp-sep-line { flex: 1; height: 1px; background: rgba(255,255,255,0.06); }

/* ── Item de uso ── */
.icp-used-row {
  display: flex; align-items: center; gap: 12px;
  padding: 12px 15px; border-radius: 13px; cursor: pointer;
  background: rgba(255,255,255,0.025);
  border: 1px solid rgba(255,255,255,0.07);
  border-left: 3px solid var(--ua, rgba(255,255,255,0.10));
  transition: background .14s, border-color .14s;
  margin-bottom: 7px;
}
.icp-used-row:last-child { margin-bottom: 0; }
.icp-used-row:hover {
  background: rgba(255,255,255,0.048);
  border-color: var(--ua, rgba(255,255,255,0.18));
}
.icp-used-ico {
  width: 38px; height: 38px; flex-shrink: 0; border-radius: 10px;
  background: rgba(255,255,255,0.045); border: 1px solid rgba(255,255,255,0.09);
  display: flex; align-items: center; justify-content: center;
  font-size: 17px; overflow: hidden;
}
.icp-used-ico img { width: 32px; height: 32px; object-fit: contain; }
.icp-used-info { flex: 1; min-width: 0; }
.icp-used-name {
  font-family: var(--font-title,'Cinzel',serif);
  font-size: 12px; font-weight: 700; color: #fff; letter-spacing: .3px;
  white-space: nowrap; overflow: hidden; text-overflow: ellipsis; margin-bottom: 2px;
}
.icp-used-sub {
  font-family: var(--font-body,sans-serif); font-size: 11px;
  color: rgba(255,255,255,0.35); line-height: 1.4;
  white-space: nowrap; overflow: hidden; text-overflow: ellipsis;
}
.icp-used-qty {
  flex-shrink: 0; font-family: var(--font-mono,monospace); font-size: 10px; font-weight: 700;
  background: rgba(240,180,41,0.09); border: 1px solid rgba(240,180,41,0.22);
  color: #f0b429; border-radius: 8px; padding: 3px 9px; white-space: nowrap;
}
.icp-used-tag {
  flex-shrink: 0; font-family: var(--font-mono,monospace);
  font-size: 8px; font-weight: 700; letter-spacing: 1.1px; text-transform: uppercase;
  padding: 3px 8px; border-radius: 20px; white-space: nowrap;
  background: rgba(255,255,255,0.05); border: 1px solid rgba(255,255,255,0.10);
  color: rgba(255,255,255,0.38);
}
.icp-tag-pkg   { color:#f0b429; border-color:rgba(240,180,41,.28); background:rgba(240,180,41,.07); }
.icp-tag-quest { color:#ffaa44; border-color:rgba(255,140,0 ,.28); background:rgba(255,140,0 ,.07); }
.icp-tag-roupa { color:#5ba8ff; border-color:rgba(58,140,255,.28); background:rgba(58,140,255,.07); }
.icp-used-arr {
  flex-shrink: 0; width: 26px; height: 26px; border-radius: 7px;
  background: rgba(58,140,255,0.07); border: 1px solid rgba(58,140,255,0.15);
  color: rgba(91,168,255,0.45); font-size: 11px;
  display: flex; align-items: center; justify-content: center;
  transition: background .14s, color .14s;
}
.icp-used-row:hover .icp-used-arr { background: rgba(58,140,255,0.18); color: #5ba8ff; }

/* Mobile */
@media (max-width: 500px) {
  #icp-modal  { border-radius: 16px; max-height: 93vh; }
  .icp-hd     { padding: 14px 14px 12px; }
  .icp-tabs   { padding: 10px 14px 0; }
  .icp-body   { padding: 14px 14px 22px; }
  .icp-poke-grid { grid-template-columns: repeat(auto-fill,minmax(88px,1fr)); }
}
`;
document.head.appendChild(css);

// ── HTML ──────────────────────────────────────────────────────────────
const overlay = document.createElement('div');
overlay.id = 'icp-overlay';
overlay.innerHTML = `
  <div id="icp-modal">
    <div class="icp-hd">
      <div class="icp-hd-icon" id="icp-icon"></div>
      <div class="icp-hd-info">
        <div class="icp-hd-name" id="icp-name"></div>
        <div class="icp-hd-meta" id="icp-meta"></div>
      </div>
      <button class="icp-close" onclick="icpClose()">✕</button>
    </div>
    <div class="icp-tabs">
      <button class="icp-tab active" onclick="icpTab('drops',this)">
        🐾 Pokémon que dropam
        <span class="icp-cnt zero" id="icp-n-drops">0</span>
      </button>
      <button class="icp-tab" onclick="icpTab('usado',this)">
        🔗 Onde é usado
        <span class="icp-cnt zero" id="icp-n-usado">0</span>
      </button>
    </div>
    <div class="icp-body">
      <div id="icp-drops"></div>
      <div id="icp-usado" style="display:none"></div>
    </div>
  </div>
`;
document.body.appendChild(overlay);

// ── Controles ─────────────────────────────────────────────────────────
window.icpClose = function () { overlay.classList.remove('open'); };

// Navega para aba principal + sub-aba da wiki, e abre o item correto.
// Para pacotes: chama selectPkg(index) diretamente.
// Para wiki: abre a sub-aba e faz scroll+highlight no elemento certo.
window.icpNavigate = function (mainTab, wikiSubTab, targetName) {
  icpClose();

  setTimeout(function () {
    // 1. Abre a aba principal
    var mainBtn = document.querySelector(".tab-btn[onclick*='" + mainTab + "']");
    if (mainBtn) switchTab(mainTab, mainBtn);

    // 2. Pacotes — usa selectPkg(index) para abrir direto o pacote certo
    if (mainTab === 'pacotes' && targetName) {
      setTimeout(function () {
        if (typeof PACKAGES !== 'undefined') {
          var idx = PACKAGES.findIndex(function(p) {
            return p.name === targetName;
          });
          if (idx >= 0 && typeof selectPkg === 'function') {
            selectPkg(idx);
            // Scroll o item da sidebar ao centro
            setTimeout(function () {
              var sidebarItem = document.querySelector('.pkg-sidebar-item.active');
              if (sidebarItem) sidebarItem.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
              icpHighlight(document.querySelector('.pkg-detail-title'));
            }, 120);
          }
        }
      }, 100);
      return;
    }

    // 3. Wiki com sub-aba — abre subtab e faz scroll+highlight
    if (wikiSubTab) {
      setTimeout(function () {
        var subBtn = document.querySelector(".wiki-subtab-btn[onclick*='" + wikiSubTab + "']");
        if (subBtn) switchWikiTab(wikiSubTab, subBtn);
        if (targetName) {
          setTimeout(function () { icpScrollToTarget(targetName); }, 200);
        }
      }, 80);
    }
  }, 80);
};

// Scroll até o elemento com o nome alvo e destaca com glow.
window.icpScrollToTarget = function (targetName) {
  if (!targetName) return;
  var lc = targetName.toLowerCase();

  // Seletores específicos do app (mais confiáveis)
  var el = null;
  var specific = document.querySelectorAll(
    '.pkg-sidebar-item-name, .pkg-detail-title, .quest-name, .quest-title, ' +
    '.roupa-name, .npc-name, [data-name], [data-pkg], [data-quest]'
  );
  for (var i = 0; i < specific.length; i++) {
    if (specific[i].textContent.trim().toLowerCase() === lc) {
      el = specific[i]; break;
    }
  }

  // Fallback: qualquer nó folha com texto exato
  if (!el) {
    var all = document.querySelectorAll('h2,h3,h4,h5,[class*="name"],[class*="title"],[class*="label"]');
    for (var j = 0; j < all.length; j++) {
      if (all[j].children.length === 0 && all[j].textContent.trim().toLowerCase() === lc) {
        el = all[j]; break;
      }
    }
  }

  if (!el) return;

  // Sobe até o card/row pai
  var target = el;
  var ascend = el;
  for (var k = 0; k < 6; k++) {
    if (!ascend.parentElement) break;
    ascend = ascend.parentElement;
    if (/card|row|item|pkg|quest|package|roupa/i.test(ascend.className || '')) {
      target = ascend; break;
    }
  }

  target.scrollIntoView({ behavior: 'smooth', block: 'center' });
  icpHighlight(target);
};

// Aplica glow azul temporário num elemento.
window.icpHighlight = function (el) {
  if (!el) return;
  el.style.transition = 'box-shadow 0.25s, outline 0.25s';
  el.style.outline    = '2px solid rgba(58,140,255,0.85)';
  el.style.boxShadow  = '0 0 0 4px rgba(58,140,255,0.22), 0 0 28px rgba(58,140,255,0.20)';
  setTimeout(function () {
    el.style.outline   = '';
    el.style.boxShadow = '';
    setTimeout(function () { el.style.transition = ''; }, 300);
  }, 1800);
};

window.icpTab = function (tab, btn) {
  document.querySelectorAll('.icp-tab').forEach(b => b.classList.remove('active'));
  if (btn) btn.classList.add('active');
  document.getElementById('icp-drops').style.display = tab === 'drops' ? '' : 'none';
  document.getElementById('icp-usado').style.display = tab === 'usado'  ? '' : 'none';
};

overlay.addEventListener('click', e => {
  if (e.target === overlay) { icpClose(); return; }
  // Clique em qualquer icp-nav-row (ou filho dela)
  const navRow = e.target.closest('.icp-nav-row');
  if (navRow) {
    const arg0 = navRow.dataset.icpArg0 || null;
    const arg1 = navRow.dataset.icpArg1 || null;
    const arg2 = navRow.dataset.icpArg2 || null;
    if (arg0) icpNavigate(arg0, arg1 || undefined, arg2 || undefined);
  }
});
document.addEventListener('keydown', e => {
  if (e.key === 'Escape' && overlay.classList.contains('open')) icpClose();
});

// ── Helpers ───────────────────────────────────────────────────────────
function cnt(id, n) {
  const el = document.getElementById(id);
  if (!el) return;
  el.textContent = n;
  el.className = 'icp-cnt' + (n === 0 ? ' zero' : '');
}

function sep(lbl) {
  return `<div class="icp-sep">
    <span class="icp-sep-lbl">${lbl}</span>
    <div class="icp-sep-line"></div>
  </div>`;
}

function row({ ico, name, sub, tag, tagCls, qty, accent, action }) {
  // Extrai args de icpNavigate(...) e armazena em data-* para evitar
  // problemas de aspas duplas dentro de onclick="..."
  // Usa regex para extrair cada argumento individualmente (evita JSON.parse com aspas simples).
  let dataAttrs = '';
  const m = action.match(/^icpNavigate\(([\s\S]*)\);?$/);
  if (m) {
    // Extrai args: string entre aspas simples/duplas, null, ou undefined
    const raw = m[1];
    const argRx = /(?:'([^']*)'|"([^"]*)"|\b(null|undefined)\b)/g;
    let match; let i = 0;
    while ((match = argRx.exec(raw)) !== null) {
      const val = match[1] !== undefined ? match[1]
                : match[2] !== undefined ? match[2]
                : null; // null/undefined → skip
      if (val !== null) {
        dataAttrs += ` data-icp-arg${i}="${val.replace(/&/g,'&amp;').replace(/"/g,'&quot;').replace(/'/g,'&#39;')}"`;
      }
      i++;
    }
  }
  return `<div class="icp-used-row icp-nav-row" style="--ua:${accent};"${dataAttrs}>
    <div class="icp-used-ico">${ico}</div>
    <div class="icp-used-info">
      <div class="icp-used-name">${name}</div>
      ${sub ? `<div class="icp-used-sub">${sub}</div>` : ''}
    </div>
    ${qty != null ? `<div class="icp-used-qty">×${qty}</div>` : ''}
    <span class="icp-used-tag ${tagCls}">${tag}</span>
    <div class="icp-used-arr">→</div>
  </div>`;
}

// ── FUNÇÃO PRINCIPAL ──────────────────────────────────────────────────
// Compatível com openWikiLookup (chamado no wiki-cards-upgrade.js)
window.openWikiLookup = function (itemName, e) {
  if (e) { e.stopPropagation(); e.preventDefault(); }

  // Reset para aba Drops
  document.querySelectorAll('.icp-tab').forEach((b, i) => b.classList.toggle('active', i === 0));
  document.getElementById('icp-drops').style.display = '';
  document.getElementById('icp-usado').style.display  = 'none';

  const nl = itemName.toLowerCase();

  // Dados base
  const it = (typeof items !== 'undefined') ? items.find(x => x.name.toLowerCase() === nl) : null;

  // Header — ícone
  document.getElementById('icp-name').textContent = itemName;
  const iconEl = document.getElementById('icp-icon');
  iconEl.innerHTML = (it && it.image)
    ? `<img src="${it.image}" alt="${itemName}" onerror="this.parentElement.innerHTML='📦'">`
    : '📦';

  // Header — meta badges
  let meta = '';
  if (it && it.tier) {
    const tk = it.tier.toLowerCase();
    meta += `<span class="icp-badge tier-${tk}">${it.tier.toUpperCase()}</span>`;
  }
  if (it && it.price && typeof formatKK === 'function') {
    const pd = formatKK(it.price);
    if (pd) meta += `<span class="icp-price">${pd.label} unit.</span>`;
  }
  document.getElementById('icp-meta').innerHTML = meta;

  // Cor da linha topo
  const modal = document.getElementById('icp-modal');
  let c1 = '#3a8cff', c2 = '#f0b429';
  if (it && it.bannerImage && typeof getTypeFromBanner === 'function') {
    const t = getTypeFromBanner(it.bannerImage);
    if (t && typeof TYPE_COLORS !== 'undefined' && TYPE_COLORS[t]) c1 = TYPE_COLORS[t];
  }
  modal.style.setProperty('--icp-c1', c1);
  modal.style.setProperty('--icp-c2', c2);

  // ════════════════════════════════════════
  // ABA 1 — POKÉMON QUE DROPAM
  // ════════════════════════════════════════
  const wEntry = (typeof RAW_WIKI !== 'undefined')
    ? RAW_WIKI.find(en => en[0].toLowerCase() === nl) : null;
  const sources = wEntry ? wEntry.slice(1).filter(s => s && s.trim()) : [];

  cnt('icp-n-drops', sources.length);

  const dropsEl = document.getElementById('icp-drops');
  if (!sources.length) {
    dropsEl.innerHTML = `<div class="icp-empty"><div class="icp-empty-icon">🔍</div><div class="icp-empty-text">Nenhum Pokémon registrado para este item na Wiki.</div></div>`;
  } else {
    // Usa getShowdownSprite e toShowdownName do app.js se disponíveis
    const sprite   = (typeof getShowdownSprite === 'function') ? getShowdownSprite
      : (n => `https://play.pokemonshowdown.com/sprites/gen5/${n.toLowerCase().replace(/[^a-z0-9]/g,'')}.png`);
    const fallback = (typeof toShowdownName === 'function')
      ? (n => `https://play.pokemonshowdown.com/sprites/gen5/${toShowdownName(n)}.png`)
      : (n => `https://play.pokemonshowdown.com/sprites/gen5/${n.toLowerCase().replace(/[^a-z0-9]/g,'')}.png`);

    dropsEl.innerHTML = `
      <div class="icp-intro">
        <b>${sources.length} Pokémon</b> ${sources.length > 1 ? 'dropam' : 'dropa'} este item
      </div>
      <div class="icp-poke-grid">
        ${sources.map(pn => `
          <div class="icp-poke-card">
            <img src="${sprite(pn)}" alt="${pn}"
                 onerror="this.src='${fallback(pn)}';this.onerror=null;" loading="lazy"/>
            <div class="icp-poke-name">${pn}</div>
          </div>`).join('')}
      </div>`;
  }

  // ════════════════════════════════════════
  // ABA 2 — ONDE É USADO
  // ════════════════════════════════════════
  let usadoHtml = '';
  let total = 0;

  // ── Pacotes ──
  let pkgBlock = '';
  if (typeof PACKAGES !== 'undefined') {
    PACKAGES.forEach(pkg => {
      let qty = 0;
      (pkg.slots || []).forEach(slot => {
        const m = slot.find(([n]) => n.toLowerCase() === nl);
        if (m) qty += (m[1] || 0);
      });
      if (qty > 0) {
        const getIco = (typeof getPkgIcon     === 'function') ? getPkgIcon     : (() => '📦');
        const getCat = (typeof getPkgCategory === 'function') ? getPkgCategory : (() => 'outros');
        const CAT_LABELS = { talent:'Talent', gym:'Gym', full:'Full', reduces:'Reduces', outros:'Outros' };
        const cat = getCat(pkg.name);
        pkgBlock += row({
          ico:    getIco(pkg.name) || '📦',
          name:   pkg.name,
          sub:    `Categoria: ${CAT_LABELS[cat] || cat}`,
          tag:    'Pacote', tagCls: 'icp-tag-pkg',
          qty, accent: 'rgba(240,180,41,0.38)',
          action: `icpNavigate('pacotes',null,${JSON.stringify(pkg.name)});`
        });
        total++;
      }
    });
  }
  if (pkgBlock) usadoHtml += sep('📦  Pacotes') + pkgBlock;

  // ── Roupas de Speed ──
  // Pedras mapeadas por nome (lowercase)
  const ROUPAS = [
    { nome:'Roupa de Ski',      terreno:'Neve',  pedra:'ice stone',    qtd:3, emoji:'❄️',  img:'https://i.imgur.com/DjU6sM4.png'  },
    { nome:'Sandboard',         terreno:'Areia', pedra:'enigma stone', qtd:3, emoji:'🏜️', img:'https://i.imgur.com/YUCTD6p.jpeg' },
    { nome:'Roupa de Mergulho', terreno:'Água',  pedra:'water stone',  qtd:3, emoji:'🌊', img:'https://i.imgur.com/LbDx18X.png'  },
  ];
  let roupaBlock = '';
  ROUPAS.filter(r => r.pedra === nl).forEach(r => {
    roupaBlock += row({
      ico:    `<img src="${r.img}" alt="${r.nome}" onerror="this.parentElement.innerHTML='${r.emoji}'">`,
      name:   r.nome,
      sub:    `Terreno: ${r.terreno} · Entregar ao NPC responsável`,
      tag:    'Roupa de Speed', tagCls: 'icp-tag-roupa',
      qty:    r.qtd, accent: 'rgba(58,140,255,0.38)',
      action: `icpNavigate('wiki','roupasspeed',${JSON.stringify(r.nome)});`
    });
    total++;
  });
  if (roupaBlock) usadoHtml += sep('🎽  Roupas de Speed') + roupaBlock;

  // ── Quests ──
  // Busca em: items[], parts[].drops[].item, drop (texto), description
  let questBlock = '';
  if (typeof RAW_QUESTS !== 'undefined') {
    RAW_QUESTS.forEach(q => {
      const inItems = Array.isArray(q.items) && q.items.some(i => i.toLowerCase() === nl);
      const inParts = !inItems && Array.isArray(q.parts) && q.parts.some(p =>
        Array.isArray(p.drops) && p.drops.some(d => d.item && d.item.toLowerCase() === nl)
      );
      const inDrop  = !inItems && !inParts && q.drop  && q.drop.toLowerCase().includes(nl);
      const inDesc  = !inItems && !inParts && !inDrop && q.description && q.description.toLowerCase().includes(nl);
      if (inItems || inParts || inDrop || inDesc) {
        // Monta sub-texto: usa reward se disponível, senão description truncada
        const sub = q.reward
          ? `🎁 ${q.reward}`.substring(0, 72)
          : (q.description ? q.description.substring(0, 68) + (q.description.length > 68 ? '…' : '') : '');
        questBlock += row({
          ico:    q.icon || '📜',
          name:   q.name, sub,
          tag:    'Quest', tagCls: 'icp-tag-quest',
          accent: 'rgba(255,140,0,0.38)',
          action: `icpNavigate('wiki','quests',${JSON.stringify(q.name)});`
        });
        total++;
      }
    });
  }
  if (questBlock) usadoHtml += sep('📜  Quests') + questBlock;

  // ── Resultado ──
  cnt('icp-n-usado', total);

  const usadoEl = document.getElementById('icp-usado');
  usadoEl.innerHTML = total
    ? usadoHtml
    : `<div class="icp-empty"><div class="icp-empty-icon">🔗</div><div class="icp-empty-text">Este item não é usado em nenhum lugar cadastrado.</div></div>`;

  overlay.classList.add('open');
};

})();