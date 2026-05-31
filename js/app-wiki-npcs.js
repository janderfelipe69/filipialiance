// ============================================================
// app-wiki-npcs.js — extraído de app.js (refactor: quebra do monólito)
// NPC sub-categorias, Officers e Hazard Tasks.
// ESCOPO GLOBAL (NÃO é IIFE): preserva os mesmos globais que estavam
// em app.js. DEVE carregar logo após app.js no index.html — não reordenar.
// ============================================================
// ===================== NPC SUB-CATEGORIAS =====================
function switchNpcSubcat(subcat, btn) {
  document.querySelectorAll('.npc-subcat-btn').forEach(function(b) { b.classList.remove('active'); });
  if (btn) btn.classList.add('active');
  document.querySelectorAll('.npc-subcat-content').forEach(function(el) { el.style.display = 'none'; });
  var panel = document.getElementById('npc-tab-' + subcat);
  if (panel) panel.style.display = 'block';
  if (subcat === 'rockets') renderRockets();
  if (subcat === 'officers') renderOfficers();
}

function renderRockets() {
  var grid = document.getElementById('rockets-grid');
  if (!grid) return;

  var q = (document.getElementById('rockets-search') ? document.getElementById('rockets-search').value : '').toLowerCase().trim();

  var filtered = RAW_ROCKETS.filter(function(r) {
    return !q || r.name.toLowerCase().includes(q);
  });

  document.getElementById('rockets-count-label').textContent = filtered.length + ' rockets';

  if (!filtered.length) {
    grid.innerHTML = '<div class="wiki-empty-state"><span class="empty-icon">🚀</span><span class="empty-label">Nenhum Rocket encontrado.</span></div>';
    return;
  }

  grid.innerHTML = filtered.map(function(rocket, idx) {
    var isGiovanni = rocket.name === 'Giovanni';

    var pokeCards = rocket.pokemons.map(function(entry) {
      var pokeName = entry.name;
      var rewardKey = entry.reward;
      var rewardData = getRocketRewardData(rewardKey);
      var rewardName = rewardKey.replace(/^sh\s+/i, 'Shiny ');
      var rewardTag = rewardData ? rewardData.tag : null;
      var rewardImg = rewardData ? rewardData.image : null;
      var TCFG = {
        't1':{'label':'T1','cls':'tier-t1'},'t2':{'label':'T2','cls':'tier-t2'},'t3':{'label':'T3','cls':'tier-t3'},
        't4':{'label':'T4','cls':'tier-t4'},'t5':{'label':'T5','cls':'tier-t5'},'hard':{'label':'HARD','cls':'tier-hard'},
        'mark':{'label':'MARK','cls':'tier-mark'},'super-raro':{'label':'SUPER RARO','cls':'tier-super-raro'},
      };
      var tagHtml = rewardTag && TCFG[rewardTag.toLowerCase()]
        ? '<span class="tier-tag '+TCFG[rewardTag.toLowerCase()].cls+'">'+TCFG[rewardTag.toLowerCase()].label+'</span>'
        : '';
      var spriteUrl    = getShowdownSpriteRocket(pokeName);
      var rewardSpriteUrl = rewardImg || getShowdownSpriteRocket(rewardName);

      var isShinyPoke = /^sh\s+/i.test(pokeName) || /^shiny\s+/i.test(pokeName);
      var displayPokeName = isShinyPoke
        ? '<span style="color:#ffd166;font-weight:700">✨ '+pokeName+'</span>'
        : '<span style="color:var(--text-muted,#aab)">'+pokeName+'</span>';
      var lookupKeyRocket = pokeName.replace(/^sh\s+/i,'shiny ').toLowerCase().trim();
      var typesRocket = POKE_TYPES[lookupKeyRocket] || [];
      var typeChipsRocket = typesRocket.map(function(t) {
        var bm = BANNER_TYPE_MAP.find(function(m) { return m.type === t; });
        return bm ? '<img src="https://i.imgur.com/'+bm.url+'.png" alt="'+t+'" title="'+t+'" style="width:18px;height:18px;object-fit:contain;border-radius:3px" loading="lazy" />' : '';
      }).join('');

      return '<div class="rocket-poke-card" style="flex-direction:column;gap:4px" onclick="openRocketPokeInfo(\''+pokeName.replace(/'/g,"\\'")+'\')" title="Ver info de '+pokeName+'">' +
        '<img class="rocket-poke-sprite" src="'+spriteUrl+'" alt="'+pokeName+'" loading="lazy" onerror="this.src=\'https://play.pokemonshowdown.com/sprites/gen5/substitute.png\'" />' +
        '<div class="rocket-poke-name" style="font-size:11px;text-align:center;line-height:1.2">'+displayPokeName+'</div>' +
        (typeChipsRocket ? '<div style="display:flex;flex-wrap:wrap;gap:3px;justify-content:center;margin-top:2px">'+typeChipsRocket+'</div>' : '') +
        '<div class="rocket-poke-info-hint">🔍 ver info</div>' +
      '</div>';
    }).join('');

    var winsNote = rocket.wins ? '<span class="rocket-wins-note">🏆 Requer '+rocket.wins+' batalhas contra os demais Rockets</span>' : '';
    var headerClass = isGiovanni ? 'rocket-row-header giovanni-header' : 'rocket-row-header';

    return '<div class="rocket-row'+(isGiovanni?' giovanni-row':'')+'" id="rocket-row-'+idx+'">' +
      '<div class="'+headerClass+'" onclick="toggleRocketRow('+idx+')">' +
        '<span class="rocket-row-icon">'+(isGiovanni?'👑':'🚀')+'</span>' +
        '<span class="rocket-row-name">'+rocket.name+'</span>' +
        (winsNote?winsNote:'') +
        '<svg class="rocket-row-chevron" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="6 9 12 15 18 9"/></svg>' +
      '</div>' +
      '<div class="rocket-row-panel">' +
        '<div class="rocket-poke-grid">'+pokeCards+'</div>' +
      '</div>' +
    '</div>';
  }).join('');

  if (!document.getElementById('npcs-css')) {
    var npcStyle = document.createElement('style');
    npcStyle.id = 'npcs-css';
    npcStyle.textContent = `
      .npc-subcats {
        display: flex;
        gap: 8px;
        padding: 12px 0 4px;
        flex-wrap: wrap;
      }
      .npc-subcat-btn {
        display: flex;
        align-items: center;
        gap: 6px;
        padding: 7px 18px;
        background: rgba(255,255,255,0.04);
        border: 1px solid var(--border, #2a2f45);
        border-radius: 20px;
        color: var(--muted, #8899aa);
        font-family: var(--font-title, inherit);
        font-size: 12px;
        font-weight: 700;
        letter-spacing: 0.08em;
        text-transform: uppercase;
        cursor: pointer;
        transition: all 0.18s;
      }
      .npc-subcat-btn:hover {
        background: rgba(96,170,255,0.08);
        border-color: rgba(96,170,255,0.35);
        color: #fff;
      }
      .npc-subcat-btn.active {
        background: rgba(96,170,255,0.12);
        border-color: rgba(96,170,255,0.6);
        color: #60aaff;
      }
      .npc-subcat-content { display: none; }
      .npc-subcat-content:first-of-type { display: block; }
    `;
    document.head.appendChild(npcStyle);
  }

  if (!document.getElementById('rockets-css')) {
    var style = document.createElement('style');
    style.id = 'rockets-css';
    style.textContent = `
      #rockets-grid { padding: 8px 0; }
      .rocket-row { border: 1px solid var(--border, #2a2f45); border-radius: 10px; margin-bottom: 10px; overflow: hidden; background: var(--card-bg, #161b2e); transition: box-shadow 0.2s; }
      .rocket-row:hover { box-shadow: 0 0 12px rgba(96,170,255,0.15); }
      .giovanni-row { border-color: #f5c518 !important; box-shadow: 0 0 18px rgba(245,197,24,0.18); }
      .rocket-row-header { display: flex; align-items: center; gap: 10px; padding: 13px 16px; cursor: pointer; user-select: none; transition: background 0.15s; }
      .rocket-row-header:hover { background: rgba(255,255,255,0.04); }
      .giovanni-header { background: linear-gradient(90deg, rgba(245,197,24,0.12) 0%, transparent 100%); }
      .rocket-row-icon { font-size: 18px; }
      .rocket-row-name { font-weight: 700; font-size: 15px; flex: 1; }
      .rocket-wins-note { font-size: 11px; color: #f5c518; background: rgba(245,197,24,0.1); border-radius: 5px; padding: 2px 8px; white-space: nowrap; }
      .rocket-row-chevron { width: 18px; height: 18px; stroke: var(--muted, #8899aa); transition: transform 0.2s; }
      .rocket-row.open .rocket-row-chevron { transform: rotate(180deg); }
      .rocket-row-panel { display: none; padding: 4px 12px 14px; border-top: 1px solid var(--border, #2a2f45); }
      .rocket-row.open .rocket-row-panel { display: block; }
      .rocket-poke-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(160px, 1fr)); gap: 10px; margin-top: 10px; }
      .rocket-poke-card { background: rgba(255,255,255,0.03); border: 1px solid var(--border, #2a2f45); border-radius: 8px; padding: 10px 8px; display: flex; align-items: center; gap: 6px; justify-content: space-between; transition: background 0.15s, border-color 0.15s; cursor: pointer; }
      .rocket-poke-card:hover { background: rgba(96,170,255,0.08); border-color: rgba(96,170,255,0.4); }
      .rocket-poke-enemy, .rocket-poke-reward { display: flex; flex-direction: column; align-items: center; gap: 2px; flex: 1; }
      .rocket-poke-sprite { width: 56px; height: 56px; image-rendering: pixelated; object-fit: contain; }
      .reward-sprite { filter: drop-shadow(0 0 6px rgba(96,170,255,0.35)); }
      .rocket-poke-name, .rocket-poke-reward-name { font-size: 11px; text-align: center; color: var(--text-muted, #aab); line-height: 1.2; }
      .rocket-poke-reward-name { color: var(--accent, #60aaff); font-weight: 600; }
      .rocket-poke-tags { margin-top: 3px; }
      .rocket-poke-arrow { font-size: 16px; color: var(--muted, #556); flex-shrink: 0; }
      .rocket-poke-info-hint { font-size: 9px; color: rgba(96,170,255,0.5); margin-top: 2px; }
      .rocket-poke-card:hover .rocket-poke-info-hint { color: rgba(96,170,255,0.9); }
      .tier-super-raro { background: linear-gradient(90deg,#a855f7,#ec4899); color: #fff; font-size: 10px; padding: 2px 6px; border-radius: 4px; font-weight: 700; }

      /* ── Modal Pokémon Info ── */
      .rpoke-backdrop { position: fixed; inset: 0; background: rgba(0,0,0,0.7); z-index: 9000; }
      .rpoke-panel { position: fixed; top: 50%; left: 50%; transform: translate(-50%,-50%); z-index: 9001; background: #0f1628; border: 1px solid #2a2f45; border-radius: 14px; width: min(520px, 94vw); max-height: 85vh; overflow-y: auto; padding: 20px 20px 24px; box-shadow: 0 8px 40px rgba(0,0,0,0.6); }
      .rpoke-close { position: absolute; top: 12px; right: 14px; background: none; border: none; color: #aaa; font-size: 18px; cursor: pointer; padding: 4px 8px; border-radius: 6px; transition: background 0.15s; }
      .rpoke-close:hover { background: rgba(255,255,255,0.08); color: #fff; }
      .rpoke-header { display: flex; align-items: center; gap: 14px; margin-bottom: 16px; }
      .rpoke-main-sprite { width: 80px; height: 80px; image-rendering: pixelated; }
      .rpoke-poke-name { font-size: 20px; font-weight: 800; color: #fff; margin-bottom: 6px; }
      .rpoke-chips { display: flex; flex-wrap: wrap; gap: 4px; }
      .rpoke-section-label { font-size: 11px; font-weight: 700; color: #60aaff; text-transform: uppercase; letter-spacing: 0.08em; margin: 14px 0 7px; }
      .rpoke-chips-row { display: flex; flex-wrap: wrap; gap: 5px; }
      .rpoke-usedby { display: flex; flex-wrap: wrap; gap: 6px; }
      .rpoke-rocket-tag { background: rgba(96,170,255,0.1); border: 1px solid rgba(96,170,255,0.3); color: #60aaff; font-size: 12px; font-weight: 600; padding: 3px 10px; border-radius: 20px; }
      .rpoke-counters-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(90px, 1fr)); gap: 8px; margin-top: 4px; }
      .rpoke-counter-card { background: rgba(255,255,255,0.03); border: 1px solid #2a2f45; border-radius: 8px; padding: 8px 4px; display: flex; flex-direction: column; align-items: center; gap: 4px; transition: background 0.15s; }
      .rpoke-counter-card:hover { background: rgba(96,170,255,0.07); }
      .rpoke-counter-card img { width: 52px; height: 52px; image-rendering: pixelated; cursor: pointer; }
      .rpoke-counter-name { font-size: 10px; text-align: center; color: #ccd; line-height: 1.2; }

      @media (max-width: 480px) {
        .rocket-poke-grid { grid-template-columns: 1fr 1fr; }
        .rocket-poke-sprite { width: 44px; height: 44px; }
        .rpoke-counters-grid { grid-template-columns: repeat(3, 1fr); }
      }
    `;
    document.head.appendChild(style);
  }
}

function toggleRocketRow(idx) {
  var row = document.getElementById('rocket-row-' + idx);
  if (!row) return;
  var isOpen = row.classList.contains('open');
  document.querySelectorAll('.rocket-row.open').forEach(function(r) { r.classList.remove('open'); });
  if (!isOpen) row.classList.add('open');
}

// ===================== OFFICERS =====================

// Tipo temático de cada Officer → banner image URL
var OFFICER_TYPE_BANNER = {
  'Officer Blaze':    'https://i.imgur.com/O8TONGE.png',  // fire
  'Officer Marina':   'https://i.imgur.com/zpRe43i.png',  // water
  'Sergeant Volt':    'https://i.imgur.com/Yv2WEYc.png',  // electric
  'Captain Verdant':  'https://i.imgur.com/YjKxtoE.png',  // grass
  'Inspector Frost':  'https://i.imgur.com/ssFz0sA.png',  // ice
  'Commander Mind':   'https://i.imgur.com/ASiZi1K.png',  // psychic
  'Warden Shade':     'https://i.imgur.com/7Luj4az.png',  // dark
  'Lieutenant Alloy': 'https://i.imgur.com/GleRjiM.png',  // steel
  'Marshal Boulder':  'https://i.imgur.com/GvD1Mtq.png',  // rock
  'Detective Terra':  'https://i.imgur.com/JPcD2l3.png',  // ground
  'Chief Toxin':      'https://i.imgur.com/xfX0ReE.png',  // poison
  'Ranger Strike':    'https://i.imgur.com/OKsJXh7.png',  // fighting
  'Captain Chitin':   'https://i.imgur.com/V4IXR51.png',  // bug
};

// Tipo temático de cada Officer (para calcular fraquezas/counters no modal)
var OFFICER_TYPE_KEY = {
  'Officer Blaze':    'fire',
  'Officer Marina':   'water',
  'Sergeant Volt':    'electric',
  'Captain Verdant':  'grass',
  'Inspector Frost':  'ice',
  'Commander Mind':   'psychic',
  'Warden Shade':     'dark',
  'Lieutenant Alloy': 'steel',
  'Marshal Boulder':  'rock',
  'Detective Terra':  'ground',
  'Chief Toxin':      'poison',
  'Ranger Strike':    'fighting',
  'Captain Chitin':   'bug',
};

var RAW_OFFICERS = [
  { name: 'Officer Blaze',    icon: '🔥', rank: 'officer',
    pokemons: ['sh Charizard','sh Magmar','sh Flareon','sh Typhlosion','sh Ninetales','sh Arcanine'] },
  { name: 'Officer Marina',   icon: '💧', rank: 'officer',
    pokemons: ['sh Feraligatr','sh Lapras','sh Gyarados','sh Vaporeon','sh Starmie','sh Blastoise'] },
  { name: 'Sergeant Volt',    icon: '⚡', rank: 'sergeant',
    pokemons: ['sh Magneton','sh Ampharos','sh Lanturn','sh Electabuzz','sh Raichu','sh Jolteon'] },
  { name: 'Captain Verdant',  icon: '🌿', rank: 'captain',
    pokemons: ['sh Meganium','sh Vileplume','sh Venusaur','sh Exeggutor','sh Victreebel','sh Jumpluff'] },
  { name: 'Inspector Frost',  icon: '❄️', rank: 'inspector',
    pokemons: ['sh Piloswine','sh Cloyster','sh Jynx','sh Lapras','sh Dewgong','sh Sneasel'] },
  { name: 'Commander Mind',   icon: '🔮', rank: 'commander',
    pokemons: ['sh Starmie','sh Alakazam','sh Espeon','sh Exeggutor','sh Mr. Mime','sh Xatu'] },
  { name: 'Warden Shade',     icon: '👻', rank: 'warden',
    pokemons: ['Houndoom','sh Sneasel','Tyranitar','sh Houndoom','sh Tyranitar','sh Umbreon'] },
  { name: 'Lieutenant Alloy', icon: '⚙️', rank: 'lieutenant',
    pokemons: ['sh Scizor','sh Magneton','sh Skarmory','sh Steelix','sh Forretress','Scizor'] },
  { name: 'Marshal Boulder',  icon: '🪨', rank: 'marshal',
    pokemons: ['sh Omastar','sh Golem','sh Tyranitar','sh Sudowoodo','sh Kabutops','sh Rhydon'] },
  { name: 'Detective Terra',  icon: '🌍', rank: 'detective',
    pokemons: ['sh Nidoqueen','sh Nidoking','sh Marowak','sh Sandslash','sh Donphan','sh Dugtrio'] },
  { name: 'Chief Toxin',      icon: '☠️', rank: 'chief',
    pokemons: ['sh Weezing','sh Muk','sh Nidoking','sh Crobat','sh Toxicroak','sh Vileplume'] },
  { name: 'Ranger Strike',    icon: '🥊', rank: 'ranger',
    pokemons: ['sh Primeape','sh Machamp','sh Heracross','sh Hitmonchan','sh Poliwrath','sh Hitmonlee'] },
  { name: 'Captain Chitin',   icon: '🪲', rank: 'captain',
    pokemons: ['sh Forretress','sh Ariados','sh Scyther','sh Scizor','sh Pinsir','sh Heracross'] },
];

var OFFICER_RANK_CONFIG = {
  officer:    { color: '#3b82f6', label: 'Officer'    },
  sergeant:   { color: '#22c55e', label: 'Sergeant'   },
  captain:    { color: '#f59e0b', label: 'Captain'    },
  inspector:  { color: '#60a5fa', label: 'Inspector'  },
  commander:  { color: '#a855f7', label: 'Commander'  },
  warden:     { color: '#6b7280', label: 'Warden'     },
  lieutenant: { color: '#94a3b8', label: 'Lieutenant' },
  marshal:    { color: '#b45309', label: 'Marshal'    },
  detective:  { color: '#ec4899', label: 'Detective'  },
  chief:      { color: '#ef4444', label: 'Chief'      },
  ranger:     { color: '#84cc16', label: 'Ranger'     },
};

var _officersSearchTimer;

function officerPokeKey(rawName) {
  return rawName.replace(/^sh\s+/i, 'shiny ').toLowerCase().trim();
}

function getOfficerSprite(rawName) {
  var isShiny = /^sh\s+/i.test(rawName);
  var n = toShowdownName((isShiny ? 'shiny ' : '') + rawName.replace(/^sh\s+/i, ''));
  return isShiny
    ? 'https://play.pokemonshowdown.com/sprites/ani-shiny/' + n + '.gif'
    : 'https://play.pokemonshowdown.com/sprites/ani/' + n + '.gif';
}

function getOfficerFallbackSprite(rawName) {
  var isShiny = /^sh\s+/i.test(rawName);
  var n = toShowdownName((isShiny ? 'shiny ' : '') + rawName.replace(/^sh\s+/i, ''));
  return isShiny
    ? 'https://play.pokemonshowdown.com/sprites/gen5-shiny/' + n + '.png'
    : 'https://play.pokemonshowdown.com/sprites/gen5/' + n + '.png';
}

function renderOfficers() {
  var grid = document.getElementById('officers-grid');
  if (!grid) return;

  var q = (document.getElementById('officers-search') ? document.getElementById('officers-search').value : '').toLowerCase().trim();
  var filtered = RAW_OFFICERS.filter(function(o) { return !q || o.name.toLowerCase().includes(q); });

  document.getElementById('officers-count-label').textContent = filtered.length + ' officers';

  if (!filtered.length) {
    grid.innerHTML = '<div class="wiki-empty-state"><span class="empty-icon">👮</span><span class="empty-label">Nenhum Officer encontrado.</span></div>';
    return;
  }

  grid.innerHTML = filtered.map(function(officer, idx) {
    var rankCfg   = OFFICER_RANK_CONFIG[officer.rank] || { color: '#60aaff', label: officer.rank };
    var isHighRank = (officer.rank === 'captain' || officer.rank === 'commander' || officer.rank === 'chief' || officer.rank === 'marshal');
    var bannerUrl  = OFFICER_TYPE_BANNER[officer.name];

    var rankBadge = '<span style="font-size:10px;font-weight:700;padding:2px 8px;border-radius:4px;text-transform:uppercase;background:'+rankCfg.color+'22;border:1px solid '+rankCfg.color+';color:'+rankCfg.color+'">'+rankCfg.label+'</span>';

    // Banner de tipo no header — substitui o ícone/emoji à esquerda
    var typeBannerHtml = bannerUrl
      ? '<img src="'+bannerUrl+'" alt="tipo" style="width:28px;height:28px;object-fit:contain;border-radius:4px;flex-shrink:0" loading="lazy" />'
      : '<span class="rocket-row-icon">'+officer.icon+'</span>';

    var pokeCards = officer.pokemons.map(function(rawName) {
      var isShiny   = /^sh\s+/i.test(rawName);
      var lookupKey = officerPokeKey(rawName);
      var types     = POKE_TYPES[lookupKey] || [];
      var spriteUrl = getOfficerSprite(rawName);
      var fallback  = getOfficerFallbackSprite(rawName);

      // Chips de tipo usando imagem do banner
      var typeChips = types.map(function(t) {
        var bannerImg = BANNER_TYPE_MAP.find(function(m) { return m.type === t; });
        if (bannerImg) {
          return '<img src="https://i.imgur.com/'+bannerImg.url+'.png" alt="'+t+'" title="'+t+'" '+
            'style="width:18px;height:18px;object-fit:contain;border-radius:3px" loading="lazy" />';
        }
        return '';
      }).join('');

      var displayName = isShiny
        ? '<span style="color:#ffd166;font-weight:700">✨ '+rawName+'</span>'
        : '<span style="color:var(--text-muted,#aab)">'+rawName+'</span>';

      return '<div class="rocket-poke-card" style="flex-direction:column;gap:4px;cursor:pointer" '+
        'onclick="openOfficerPokeInfo(\''+rawName.replace(/'/g,"\\'")+'\''+')" title="Ver info de '+rawName+'">' +
        '<img class="rocket-poke-sprite" src="'+spriteUrl+'" alt="'+rawName+'" loading="lazy" '+
          'onerror="this.src=\''+fallback+'\';this.onerror=function(){this.src=\'https://play.pokemonshowdown.com/sprites/gen5/substitute.png\'}" />' +
        '<div class="rocket-poke-name" style="font-size:11px;text-align:center;line-height:1.2">'+displayName+'</div>' +
        (typeChips ? '<div style="display:flex;flex-wrap:wrap;gap:3px;justify-content:center;margin-top:2px">'+typeChips+'</div>' : '') +
        '<div class="rocket-poke-info-hint">🔍 ver info</div>' +
      '</div>';
    }).join('');

    return '<div class="rocket-row" id="officer-row-'+idx+'" '+
      'style="'+(isHighRank ? 'border-color:'+rankCfg.color+'88!important;box-shadow:0 0 14px '+rankCfg.color+'22;' : '')+'">' +
      '<div class="rocket-row-header" onclick="toggleOfficerRow('+idx+')" '+
        'style="'+(isHighRank ? 'background:linear-gradient(90deg,'+rankCfg.color+'18 0%,transparent 100%);' : '')+'">' +
        typeBannerHtml +
        '<span class="rocket-row-name">'+officer.name+'</span>' +
        rankBadge +
        '<svg class="rocket-row-chevron" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="6 9 12 15 18 9"/></svg>' +
      '</div>' +
      '<div class="rocket-row-panel">' +
        '<div class="rocket-poke-grid">'+pokeCards+'</div>' +
      '</div>' +
    '</div>';
  }).join('');
}

function toggleOfficerRow(idx) {
  var row = document.getElementById('officer-row-' + idx);
  if (!row) return;
  var isOpen = row.classList.contains('open');
  document.querySelectorAll('#officers-grid .rocket-row.open').forEach(function(r) { r.classList.remove('open'); });
  if (!isOpen) row.classList.add('open');
}

function openOfficerPokeInfo(rawName) {
  var existing = document.getElementById('officer-poke-modal');
  if (existing) existing.remove();

  var lookupKey  = officerPokeKey(rawName);
  var isShiny    = /^sh\s+/i.test(rawName);
  var counters   = getCountersFromPOKEMONS(lookupKey);
  var weaknesses = getPokeWeaknesses(lookupKey);
  var types      = POKE_TYPES[lookupKey] || [];
  var spriteUrl  = getOfficerSprite(rawName);
  var fallback   = getOfficerFallbackSprite(rawName);

  // Qual Officer usa este Pokémon
  var usedBy = [];
  RAW_OFFICERS.forEach(function(o) {
    o.pokemons.forEach(function(p) {
      if (p.toLowerCase() === rawName.toLowerCase()) usedBy.push(o.name);
    });
  });

  var TCFG = {
    't1':{'label':'T1','cls':'tier-t1'},'t2':{'label':'T2','cls':'tier-t2'},'t3':{'label':'T3','cls':'tier-t3'},
    't4':{'label':'T4','cls':'tier-t4'},'t5':{'label':'T5','cls':'tier-t5'},'hard':{'label':'HARD','cls':'tier-hard'},
    'mark':{'label':'MARK','cls':'tier-mark'},'super-raro':{'label':'SUPER RARO','cls':'tier-super-raro'},
  };
  var TC = {
    fire:'#f97316',water:'#3b82f6',grass:'#22c55e',electric:'#eab308',psychic:'#ec4899',
    ghost:'#8b5cf6',dark:'#6b7280',fighting:'#ef4444',poison:'#a855f7',ground:'#b45309',
    flying:'#7dd3fc',rock:'#a3a3a3',ice:'#67e8f9',dragon:'#6366f1',steel:'#94a3b8',
    normal:'#d4d4d4',bug:'#84cc16',fairy:'#f9a8d4',
  };

  // Tipo chips com imagem banner no modal
  var typeChips = types.map(function(t) {
    var bannerImg = BANNER_TYPE_MAP.find(function(m) { return m.type === t; });
    var c = TC[t] || '#aaa';
    if (bannerImg) {
      return '<span style="display:inline-flex;align-items:center;gap:4px;background:'+c+'22;border:1px solid '+c+';border-radius:6px;padding:3px 8px">'+
        '<img src="https://i.imgur.com/'+bannerImg.url+'.png" alt="'+t+'" style="width:16px;height:16px;object-fit:contain" />'+
        '<span style="color:'+c+';font-size:10px;font-weight:700;text-transform:uppercase">'+t+'</span>'+
      '</span>';
    }
    return '<span style="background:'+c+';color:#000;font-size:10px;font-weight:700;padding:2px 8px;border-radius:4px;text-transform:uppercase">'+t+'</span>';
  }).join(' ');

  var weakChips = weaknesses.map(function(t) {
    var bannerImg = BANNER_TYPE_MAP.find(function(m) { return m.type === t; });
    var c = TC[t] || '#aaa';
    if (bannerImg) {
      return '<span style="display:inline-flex;align-items:center;gap:4px;background:'+c+'22;border:1px solid '+c+';border-radius:6px;padding:3px 8px">'+
        '<img src="https://i.imgur.com/'+bannerImg.url+'.png" alt="'+t+'" style="width:16px;height:16px;object-fit:contain" />'+
        '<span style="color:'+c+';font-size:10px;font-weight:700;text-transform:uppercase">'+t+'</span>'+
      '</span>';
    }
    return '<span style="background:'+c+'22;border:1px solid '+c+';color:'+c+';font-size:10px;font-weight:700;padding:2px 8px;border-radius:4px;text-transform:uppercase">'+t+'</span>';
  }).join(' ');

  var usedByHtml = usedBy.length
    ? usedBy.map(function(n) {
        var b = OFFICER_TYPE_BANNER[n];
        return '<span class="rpoke-rocket-tag" style="display:inline-flex;align-items:center;gap:5px">'+
          (b ? '<img src="'+b+'" style="width:16px;height:16px;object-fit:contain" />' : '👮')+
          n+'</span>';
      }).join('')
    : '<span style="color:#666;font-size:12px">Nenhum</span>';

  var counterCards = counters.length
    ? counters.map(function(p) {
        var tc = TCFG[p.tag] ? '<span class="tier-tag '+TCFG[p.tag].cls+'">'+TCFG[p.tag].label+'</span>' : '';
        var spr = getShowdownSpriteRocket(p.name);
        var mainSrc = p.image || spr;
        var isShinyCounter = /^sh\s+/i.test(p.name) || /^shiny\s+/i.test(p.name);
        var counterLookup = p.name.replace(/^sh\s+/i,'shiny ').replace(/^shiny\s+/i,'shiny ').trim().toLowerCase();
        var counterTypes = POKE_TYPES[counterLookup] || [];
        var counterTypeChips = counterTypes.map(function(t) {
          var bm = BANNER_TYPE_MAP.find(function(m) { return m.type === t; });
          return bm ? '<img src="https://i.imgur.com/'+bm.url+'.png" alt="'+t+'" title="'+t+'" style="width:16px;height:16px;object-fit:contain;border-radius:3px" loading="lazy" />' : '';
        }).join('');
        var counterDisplayName = isShinyCounter
          ? '<span style="color:#ffd166;font-weight:700">✨ '+p.name+'</span>'
          : p.name;
        return '<div class="rpoke-counter-card">'+
          '<img src="'+mainSrc+'" alt="'+p.name+'" onerror="this.src=\''+spr+'\';this.onerror=null;" />'+
          '<div class="rpoke-counter-name">'+counterDisplayName+'</div>'+
          (counterTypeChips ? '<div style="display:flex;flex-wrap:wrap;gap:2px;justify-content:center">'+counterTypeChips+'</div>' : '') +
          '<div>'+tc+'</div>'+
        '</div>';
      }).join('')
    : '<div style="color:#666;font-size:12px;padding:8px">Nenhum counter encontrado no catálogo.</div>';

  var displayName = isShiny ? '<span style="color:#ffd166">✨ '+rawName+'</span>' : rawName;

  var modal = document.createElement('div');
  modal.id = 'officer-poke-modal';
  modal.innerHTML =
    '<div class="rpoke-backdrop" onclick="document.getElementById(\'officer-poke-modal\').remove()"></div>'+
    '<div class="rpoke-panel">'+
      '<button class="rpoke-close" onclick="document.getElementById(\'officer-poke-modal\').remove()">✕</button>'+
      '<div class="rpoke-header">'+
        '<img class="rpoke-main-sprite" src="'+spriteUrl+'" alt="'+rawName+'" '+
          'onerror="this.src=\''+fallback+'\';this.onerror=function(){this.style.opacity=\'0.3\'}" />'+
        '<div class="rpoke-title-block">'+
          '<div class="rpoke-poke-name">'+displayName+'</div>'+
          '<div class="rpoke-chips" style="flex-wrap:wrap;gap:5px">'+typeChips+'</div>'+
        '</div>'+
      '</div>'+
      '<div class="rpoke-section-label">⚔️ Fraquezas</div>'+
      '<div class="rpoke-chips-row" style="flex-wrap:wrap;gap:5px">'+(weakChips||'<span style="color:#666;font-size:12px">Sem fraquezas conhecidas</span>')+'</div>'+
      '<div class="rpoke-section-label">👮 Usado pelos Officers</div>'+
      '<div class="rpoke-usedby">'+usedByHtml+'</div>'+
      '<div class="rpoke-section-label">✅ Pokémons recomendados para batalhar</div>'+
      '<div class="rpoke-counters-grid">'+counterCards+'</div>'+
    '</div>';

  document.body.appendChild(modal);
}
// ===================== HAZARD TASKS =====================

var RAW_HAZARD = [
  { npc: 'Nerida',  imgId: 'eIoGIEv.png', task: '6 Sh Wailord, 6 Sh Whiscash, 6 Sh Crawdaunt, 6 Sh Luvdisk, 6 Sh Clamperl' },
  { npc: 'Verdra',  imgId: 'sCT8XeS.png', task: '15 Sh Roselia, 15 Sh Cradily' },
  { npc: 'Rohgar',  imgId: '0c8mJ4B.png', task: '6 Sh Mightyena, 6 Sh Zangoose, 6 Sh Seviper, 6 Sh Absol, 6 Sh Sharpedo' },
  { npc: 'Draven',  imgId: 'HTMFh6N.png', task: '15 Sh Flygon, 15 Sh Salamalence' },
  { npc: 'Ferris',  imgId: 'b6dRGyY.png', task: '10 Sh Aggron, 10 Sh Mawile, 10 Sh Metagross' },
  { npc: 'Talia',   imgId: 'Ue7V6kw.png', task: '8 Sh Breloom, 8 Sh Shiftry, 7 Sh Cacturne, 7 Sh Tropius' },
  { npc: 'Nyxen',   imgId: 'wJ8hCPS.png', task: '10 Sh Sableye, 10 Sh Banette, 10 Sh Dusclops' },
  { npc: 'Voltrix', imgId: 'M1VkDef.png', task: '30 Sh Manectric' },
  { npc: 'Glacis',  imgId: 'T3EKiyY.png', task: '15 Sh Glalie, 15 Sh Walrein' },
  { npc: 'Hadriel', imgId: 'I5wubJc.png', task: '10 Sh Hariyama, 10 Sh Medicham, 10 Sh Slaking' },
  { npc: 'Lucine',  imgId: 'w8p1cJw.png', task: '8 Sh Linoone, 8 Sh Delcatty, 7 Sh Swellow, 7 Sh Kecleon' },
  { npc: 'Veska',   imgId: 'c78R578.png', task: '5 Sh Beautifly, 5 Sh Dustox, 4 Sh Masquerain, 4 Sh Ninjask, 4 Sh Volbeat, 4 Sh Ilumise, 4 Sh Shedinja' },
  { npc: 'Calder',  imgId: 'kgjNPJa.png', task: '15 Sh Camerupt, 15 Sh Torkoal' },
  { npc: 'Kaela',   imgId: 'wlF1RZh.png', task: '10 Sh Sceptile, 10 Sh Blaziken, 10 Sh Swampert' },
  { npc: 'Orlan',   imgId: '7E6igom.png', task: '15 Sh Pelipper, 15 Sh Altaria' },
  { npc: 'Selene',  imgId: '7E6igom.png', task: '5 Sh Gardevoir, 5 Sh Grumpig, 5 Sh Chimecho, 5 Sh Claydol, 5 Sh Lunatone, 5 Sh Solrock' },
  { npc: 'Maera',   imgId: 'NhzLpkd.png', task: '8 Sh Milotic, 8 Sh Huntail, 7 Sh Gorebyss, 7 Sh Relicanth' },
];

function getImgurDirectUrl(imgId) {
  return 'https://i.imgur.com/' + imgId + '.jpg';
}

function parseHazardTask(taskStr) {
  return taskStr.split(',').map(function(part) {
    part = part.trim();
    var m = part.match(/^(\d+)\s+Sh\s+(.+)$/i);
    if (m) return { qty: parseInt(m[1]), name: m[2].trim() };
    return { qty: 0, name: part };
  });
}

function getShowdownSpriteHazard(name) {
  var key = name.toLowerCase().replace(/[^a-z0-9]/g, '-').replace(/-+/g, '-').replace(/^-|-$/g, '');
  var fixes = { 'salamalence': 'salamence', 'ilumise': 'illumise', 'luvdisk': 'luvdisc' };
  if (fixes[key]) key = fixes[key];
  return 'https://play.pokemonshowdown.com/sprites/ani-shiny/' + key + '.gif';
}

function openHazardMapModal(npcName, imgId) {
  var existing = document.getElementById('hazard-map-modal');
  if (existing) existing.remove();

  var modal = document.createElement('div');
  modal.id = 'hazard-map-modal';
  modal.innerHTML =
    '<div class="hzmap-backdrop" onclick="document.getElementById(\'hazard-map-modal\').remove()"></div>' +
    '<div class="hzmap-panel">' +
      '<div class="hzmap-header">' +
        '<div class="hzmap-title">' +
          '<span class="hzmap-title-icon">📍</span>' +
          '<span>Localização — ' + npcName + '</span>' +
        '</div>' +
        '<button class="hzmap-close" onclick="document.getElementById(\'hazard-map-modal\').remove()">✕</button>' +
      '</div>' +
      '<div class="hzmap-body">' +
        '<div class="hzmap-loading" id="hzmap-loading">Carregando imagem...</div>' +
        '<img ' +
          'class="hzmap-img" ' +
          'src="' + getImgurDirectUrl(imgId) + '" ' +
          'alt="Localização ' + npcName + '" ' +
          'onload="document.getElementById(\'hzmap-loading\').style.display=\'none\';this.style.opacity=\'1\'" ' +
          'onerror="document.getElementById(\'hzmap-loading\').textContent=\'Não foi possível carregar a imagem.\'" ' +
          'style="opacity:0;transition:opacity 0.3s"' +
        '/>' +
      '</div>' +
      '<div class="hzmap-footer">' +
        '<a class="hzmap-ext-link" href="' + getImgurDirectUrl(imgId) + '" target="_blank" rel="noopener">' +
          '<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"/><polyline points="15 3 21 3 21 9"/><line x1="10" y1="14" x2="21" y2="3"/></svg>' +
          'Abrir no Imgur' +
        '</a>' +
      '</div>' +
    '</div>';

  document.body.appendChild(modal);

  // Close on Escape
  function onKey(e) {
    if (e.key === 'Escape') {
      var m = document.getElementById('hazard-map-modal');
      if (m) m.remove();
      document.removeEventListener('keydown', onKey);
    }
  }
  document.addEventListener('keydown', onKey);
}

function renderHazard() {
  var grid = document.getElementById('hazard-grid');
  if (!grid) return;

  var q = (document.getElementById('hazard-search') ? document.getElementById('hazard-search').value : '').toLowerCase().trim();

  var filtered = RAW_HAZARD.filter(function(h) {
    return !q || h.npc.toLowerCase().includes(q) || h.task.toLowerCase().includes(q);
  });

  document.getElementById('hazard-count-label').textContent = filtered.length + ' NPCs';

  if (!filtered.length) {
    grid.innerHTML = '<div class="wiki-empty-state"><span class="empty-icon">⚠️</span><span class="empty-label">Nenhum NPC encontrado.</span></div>';
    return;
  }

  if (!document.getElementById('hazard-css')) {
    var s = document.createElement('style');
    s.id = 'hazard-css';
    s.textContent = `
      /* ── Hazard Page ── */
      .hazard-page { max-width: 960px; margin: 0 auto; padding: 8px 0 40px; }
      .hazard-hero { text-align: center; padding: 28px 20px 20px; margin-bottom: 8px; }
      .hazard-hero-icon { font-size: 40px; margin-bottom: 8px; }
      .hazard-hero-title {
        font-family: var(--font-title);
        font-size: 22px; font-weight: 900; letter-spacing: 3px;
        text-transform: uppercase; color: #fff; margin-bottom: 4px;
      }
      .hazard-hero-sub { font-size: 12px; color: var(--muted); letter-spacing: 1px; }

      /* ── Grid of cards ── */
      .hazard-grid-list {
        display: grid;
        grid-template-columns: repeat(auto-fill, minmax(270px, 1fr));
        gap: 14px; padding: 0 8px;
      }
      .hazard-card {
        background: rgba(255,255,255,0.03);
        border: 1px solid rgba(255,200,50,0.12);
        border-radius: 14px; overflow: hidden;
        transition: border-color 0.2s, background 0.2s, transform 0.15s;
      }
      .hazard-card:hover {
        background: rgba(255,200,50,0.04);
        border-color: rgba(255,200,50,0.28);
        transform: translateY(-2px);
      }
      .hazard-card-header {
        display: flex; align-items: center; gap: 10px;
        padding: 12px 14px 10px;
        border-bottom: 1px solid rgba(255,200,50,0.08);
      }
      .hazard-npc-icon {
        width: 34px; height: 34px; border-radius: 50%;
        background: rgba(255,200,50,0.12);
        border: 1.5px solid rgba(255,200,50,0.3);
        display: flex; align-items: center; justify-content: center;
        font-size: 16px; flex-shrink: 0;
      }
      .hazard-npc-name {
        font-family: var(--font-title);
        font-size: 15px; font-weight: 700; letter-spacing: 1.5px;
        text-transform: uppercase; color: #ffe066; flex: 1;
      }
      .hazard-map-btn {
        display: inline-flex; align-items: center; gap: 5px;
        font-family: var(--font-mono, monospace);
        font-size: 10px; font-weight: 700; letter-spacing: 0.5px;
        text-transform: uppercase; color: #60c0ff;
        background: rgba(96,192,255,0.1);
        border: 1px solid rgba(96,192,255,0.25);
        border-radius: 6px; padding: 5px 9px;
        cursor: pointer; white-space: nowrap;
        transition: background 0.15s, border-color 0.15s, transform 0.1s;
      }
      .hazard-map-btn:hover {
        background: rgba(96,192,255,0.2);
        border-color: rgba(96,192,255,0.5);
        transform: scale(1.04);
      }
      .hazard-poke-list {
        display: flex; flex-wrap: wrap; gap: 8px;
        padding: 12px 14px 14px;
      }
      .hazard-poke-chip {
        display: flex; flex-direction: column; align-items: center; gap: 3px;
        background: rgba(255,255,255,0.04);
        border: 1px solid rgba(255,255,255,0.07);
        border-radius: 10px; padding: 8px 10px 6px; min-width: 64px;
        transition: background 0.15s, border-color 0.15s;
      }
      .hazard-poke-chip:hover { background: rgba(255,220,80,0.07); border-color: rgba(255,220,80,0.2); }
      .hazard-poke-sprite { width: 48px; height: 48px; object-fit: contain; image-rendering: pixelated; }
      .hazard-poke-name {
        font-size: 10px; font-weight: 700; color: #ffe066;
        text-align: center; letter-spacing: 0.3px; line-height: 1.2;
      }
      .hazard-poke-qty {
        font-family: var(--font-mono, monospace);
        font-size: 11px; font-weight: 900;
        color: rgba(255,255,255,0.5);
        background: rgba(255,255,255,0.06);
        border-radius: 5px; padding: 1px 6px;
      }

      /* ── Map Modal ── */
      #hazard-map-modal {
        position: fixed; inset: 0; z-index: 9000;
        display: flex; align-items: center; justify-content: center;
        animation: hzFadeIn 0.2s ease;
      }
      @keyframes hzFadeIn { from { opacity: 0; } to { opacity: 1; } }
      .hzmap-backdrop {
        position: absolute; inset: 0;
        background: rgba(0,0,0,0.75);
        backdrop-filter: blur(6px);
        -webkit-backdrop-filter: blur(6px);
      }
      .hzmap-panel {
        position: relative; z-index: 1;
        width: min(1100px, 96vw);
        max-height: 92vh;
        display: flex; flex-direction: column;
        background: #0c1424;
        border: 1px solid rgba(255,200,50,0.25);
        border-radius: 16px; overflow: hidden;
        box-shadow: 0 24px 80px rgba(0,0,0,0.7), 0 0 0 1px rgba(255,200,50,0.08);
        animation: hzSlideUp 0.25s cubic-bezier(0.16,1,0.3,1);
      }
      @keyframes hzSlideUp {
        from { transform: translateY(28px) scale(0.97); opacity: 0; }
        to   { transform: translateY(0)    scale(1);    opacity: 1; }
      }
      .hzmap-header {
        display: flex; align-items: center; justify-content: space-between;
        padding: 14px 18px;
        border-bottom: 1px solid rgba(255,200,50,0.12);
        background: rgba(255,200,50,0.04);
      }
      .hzmap-title {
        display: flex; align-items: center; gap: 8px;
        font-family: var(--font-title);
        font-size: 14px; font-weight: 700; letter-spacing: 1.5px;
        text-transform: uppercase; color: #ffe066;
      }
      .hzmap-title-icon { font-size: 18px; }
      .hzmap-close {
        background: rgba(255,255,255,0.06);
        border: 1px solid rgba(255,255,255,0.12);
        color: #fff; border-radius: 8px;
        width: 30px; height: 30px;
        display: flex; align-items: center; justify-content: center;
        font-size: 14px; cursor: pointer;
        transition: background 0.15s;
      }
      .hzmap-close:hover { background: rgba(255,80,80,0.2); border-color: rgba(255,80,80,0.4); }
      .hzmap-body {
        position: relative;
        flex: 1;
        min-height: 65vh;
        background: #070d1a;
        display: flex; align-items: center; justify-content: center;
        overflow: hidden;
      }
      .hzmap-loading {
        position: absolute;
        font-family: var(--font-mono, monospace);
        font-size: 12px; color: var(--muted); letter-spacing: 1px;
      }
      .hzmap-img {
        width: 100%; height: 100%;
        object-fit: contain;
        display: block;
      }
      .hzmap-iframe {
        position: absolute; inset: 0;
        width: 100%; height: 100%;
        border: none;
      }
      }
      .hzmap-footer {
        padding: 10px 18px;
        border-top: 1px solid rgba(255,255,255,0.05);
        display: flex; justify-content: flex-end;
      }
      .hzmap-ext-link {
        display: inline-flex; align-items: center; gap: 5px;
        font-family: var(--font-mono, monospace);
        font-size: 10px; font-weight: 700;
        text-transform: uppercase; letter-spacing: 0.5px;
        color: rgba(255,255,255,0.35);
        text-decoration: none;
        transition: color 0.15s;
      }
      .hzmap-ext-link:hover { color: rgba(255,255,255,0.7); }
    `;
    document.head.appendChild(s);
  }

  grid.innerHTML =
    '<div class="hazard-page">' +
      '<div class="hazard-hero">' +
        '<div class="hazard-hero-icon">⚠️</div>' +
        '<div class="hazard-hero-title">Hazard Tasks</div>' +
        '<div class="hazard-hero-sub">NPCs que entregam tasks de Shinys — clique em "Ver Mapa" para ver a localização do NPC</div>' +
      '</div>' +
      '<div class="hazard-grid-list">' +
        filtered.map(function(h) {
          var entries = parseHazardTask(h.task);
          var chips = entries.map(function(e) {
            var sprite = getShowdownSpriteHazard(e.name);
            var fallback = 'https://play.pokemonshowdown.com/sprites/gen5/substitute.png';
            return '<div class="hazard-poke-chip">' +
              '<img class="hazard-poke-sprite" src="' + sprite + '" alt="' + e.name + '" loading="lazy" ' +
                'onerror="this.src=\'' + fallback + '\';this.onerror=null;" />' +
              '<div class="hazard-poke-name">' + e.name + '</div>' +
              '<div class="hazard-poke-qty">×' + e.qty + '</div>' +
            '</div>';
          }).join('');

          return '<div class="hazard-card">' +
            '<div class="hazard-card-header">' +
              '<div class="hazard-npc-icon">🧑</div>' +
              '<div class="hazard-npc-name">' + h.npc + '</div>' +
              '<button class="hazard-map-btn" onclick="openHazardMapModal(\'' + h.npc + '\',\'' + h.imgId + '\')">' +
                '<svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5">' +
                  '<path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/>' +
                  '<circle cx="12" cy="10" r="3"/>' +
                '</svg>' +
                'Ver Mapa' +
              '</button>' +
            '</div>' +
            '<div class="hazard-poke-list">' + chips + '</div>' +
          '</div>';
        }).join('') +
      '</div>' +
    '</div>';
}

