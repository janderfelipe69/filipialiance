/* ================================================================
   wiki-medals-buffs.js
   Seção de Filtro de Buffs/Debuffs para a aba "Medal System".
   Carregue APÓS wiki-medals.js:
     <script src="wiki-medals-buffs.js"></script>
   Esta seção é inserida logo após o vídeo de demo, no painel
   #wiki-tab-medals.
================================================================ */
(function () {

/* ── Dados das Medalhas ──────────────────────────────────────── */
const MEDALS = [
  { name: 'Bulbasaur',      buff: 'Defense Boost',       debuff: 'Damage Boost' },
  { name: 'Ivysaur',        buff: 'HP Boost',             debuff: 'Pokemon Speed' },
  { name: 'Venusaur',       buff: 'Pokemon Speed',        debuff: 'HP Boost' },
  { name: 'Charmander',     buff: 'Character Speed',      debuff: 'Pokemon Speed' },
  { name: 'Charmelion',     buff: 'Critical Chance',      debuff: 'Character Speed' },
  { name: 'Charizard',      buff: 'Critical Damage',      debuff: 'Defense Boost' },
  { name: 'Squirtle',       buff: 'Life Leech',           debuff: 'Critical Damage' },
  { name: 'Wartortle',      buff: 'Precision Percent',    debuff: 'Life Leech' },
  { name: 'Blastoise',      buff: 'Evasion Percent',      debuff: 'Fishing Skill' },
  { name: 'Caterpie',       buff: 'Shiny Fishing Rate',   debuff: 'Evasion Percent' },
  { name: 'Metapod',        buff: 'Shiny Headbutt Rate',  debuff: 'Shiny Fishing Rate' },
  { name: 'Butterfree',     buff: 'Loot Boost',           debuff: 'Shiny Headbutt Rate' },
  { name: 'Weedle',         buff: 'Catch Rate',           debuff: 'Loot Boost' },
  { name: 'Kakuna',         buff: 'Shiny Catch Rate',     debuff: 'Catch Rate' },
  { name: 'Beedrill',       buff: 'Shiny Charm Rate',     debuff: 'Headbutt Skill' },
  { name: 'Pidgey',         buff: 'Critical Resistance',  debuff: 'Shiny Charm Rate' },
  { name: 'Pidgeotto',      buff: 'Fly Speed',            debuff: 'Extra Fishing' },
  { name: 'Pidgeot',        buff: 'Fly Speed',            debuff: 'Surf Speed' },
  { name: 'Rattata',        buff: 'Ride Speed',           debuff: 'Surf Speed' },
  { name: 'Raticate',       buff: 'Damage Boost',         debuff: 'Ride Speed' },
  { name: 'Spearow',        buff: 'Defense Boost',        debuff: 'Damage Boost' },
  { name: 'Fearow',         buff: 'HP Boost',             debuff: 'Defense Boost' },
  { name: 'Ekans',          buff: 'Pokemon Speed',        debuff: 'HP Boost' },
  { name: 'Arbok',          buff: 'Character Speed',      debuff: 'Pokemon Speed' },
  { name: 'Pikachu',        buff: 'Critical Chance',      debuff: 'Character Speed' },
  { name: 'Raichu',         buff: 'Critical Damage',      debuff: 'Critical Chance' },
  { name: 'Sandshrew',      buff: 'Life Leech',           debuff: 'Critical Damage' },
  { name: 'Sandslash',      buff: 'Precision Percent',    debuff: 'Life Leech' },
  { name: 'Nidoran ♀',      buff: 'Evasion Percent',      debuff: 'Fishing Skill' },
  { name: 'Nidorina',       buff: 'Shiny Fishing Rate',   debuff: 'Evasion Percent' },
  { name: 'Nidoqueen',      buff: 'Shiny Headbutt Rate',  debuff: 'Shiny Fishing Rate' },
  { name: 'Nidoran ♂',      buff: 'Loot Boost',           debuff: 'Shiny Headbutt Rate' },
  { name: 'Nidorino',       buff: 'Catch Rate',           debuff: 'Loot Boost' },
  { name: 'Nidoking',       buff: 'Shiny Catch Rate',     debuff: 'Catch Rate' },
  { name: 'Clefairy',       buff: 'Shiny Charm Rate',     debuff: 'Shiny Catch Rate' },
  { name: 'Clefable',       buff: 'Critical Resistance',  debuff: 'Shiny Charm Rate' },
  { name: 'Vulpix',         buff: 'Fly Speed',            debuff: 'Extra Fishing' },
  { name: 'Ninetales',      buff: 'Surf Speed',           debuff: 'Fly Speed' },
  { name: 'Jigglypuff',     buff: 'Ride Speed',           debuff: 'Surf Speed' },
  { name: 'Wigglytuff',     buff: 'Damage Boost',         debuff: 'Ride Speed' },
  { name: 'Zubat',          buff: 'Defense Boost',        debuff: 'Life Leech' },
  { name: 'Golbat',         buff: 'HP Boost',             debuff: 'Defense Boost' },
  { name: 'Oddish',         buff: 'Pokemon Speed',        debuff: 'HP Boost' },
  { name: 'Gloom',          buff: 'Character Speed',      debuff: 'Pokemon Speed' },
  { name: 'Vileplume',      buff: 'Critical Chance',      debuff: 'Character Speed' },
  { name: 'Paras',          buff: 'Critical Damage',      debuff: 'Critical Chance' },
  { name: 'Parasect',       buff: 'Life Leech',           debuff: 'Critical Damage' },
  { name: 'Venonat',        buff: 'Precision Percent',    debuff: 'Life Leech' },
  { name: 'Venomoth',       buff: 'Evasion Percent',      debuff: 'Fishing Skill' },
  { name: 'Diglett',        buff: 'Shiny Fishing Rate',   debuff: 'Evasion Percent' },
  { name: 'Dugtrio',        buff: 'Shiny Headbutt Rate',  debuff: 'Shiny Fishing Rate' },
  { name: 'Meowth',         buff: 'Loot Boost',           debuff: 'Shiny Headbutt Rate' },
  { name: 'Persian',        buff: 'Catch Rate',           debuff: 'Loot Boost' },
  { name: 'Psyduck',        buff: 'Shiny Catch Rate',     debuff: 'Catch Rate' },
  { name: 'Golduck',        buff: 'Shiny Charm Rate',     debuff: 'Shiny Catch Rate' },
  { name: 'Mankey',         buff: 'Critical Resistance',  debuff: 'Shiny Charm Rate' },
  { name: 'Primeape',       buff: 'Fly Speed',            debuff: 'Extra Fishing' },
  { name: 'Growlithe',      buff: 'Surf Speed',           debuff: 'Fly Speed' },
  { name: 'Arcanine',       buff: 'Ride Speed',           debuff: 'Surf Speed' },
  { name: 'Poliwag',        buff: 'Damage Boost',         debuff: 'Ride Speed' },
  { name: 'Poliwhirl',      buff: 'Defense Boost',        debuff: 'Surf Speed' },
  { name: 'Poliwrath',      buff: 'HP Boost',             debuff: 'Defense Boost' },
  { name: 'Abra',           buff: 'Pokemon Speed',        debuff: 'HP Boost' },
  { name: 'Kadabra',        buff: 'Character Speed',      debuff: 'Pokemon Speed' },
  { name: 'Alakazam',       buff: 'Critical Chance',      debuff: 'Character Speed' },
  { name: 'Machop',         buff: 'Critical Damage',      debuff: 'Critical Chance' },
  { name: 'Machoke',        buff: 'Life Leech',           debuff: 'Critical Damage' },
  { name: 'Machamp',        buff: 'Precision Percent',    debuff: 'Life Leech' },
  { name: 'Bellsprout',     buff: 'Evasion Percent',      debuff: 'Fishing Skill' },
  { name: 'Weepinbell',     buff: 'Shiny Fishing Rate',   debuff: 'Evasion Percent' },
  { name: 'Victreebel',     buff: 'Shiny Headbutt Rate',  debuff: 'Shiny Fishing Rate' },
  { name: 'Tentacool',      buff: 'Loot Boost',           debuff: 'Shiny Headbutt Rate' },
  { name: 'Tentacruel',     buff: 'Catch Rate',           debuff: 'Loot Boost' },
  { name: 'Geodude',        buff: 'Shiny Catch Rate',     debuff: 'Catch Rate' },
  { name: 'Graveler',       buff: 'Shiny Charm Rate',     debuff: 'Shiny Catch Rate' },
  { name: 'Golem',          buff: 'Critical Resistance',  debuff: 'Shiny Charm Rate' },
  { name: 'Ponyta',         buff: 'Fly Speed',            debuff: 'Extra Fishing' },
  { name: 'Rapidash',       buff: 'Surf Speed',           debuff: 'Fly Speed' },
  { name: 'Slowpoke',       buff: 'Ride Speed',           debuff: 'Surf Speed' },
  { name: 'Slowbro',        buff: 'Damage Boost',         debuff: 'Ride Speed' },
  { name: 'Magnemite',      buff: 'Defense Boost',        debuff: 'Damage Boost' },
  { name: 'Magneton',       buff: 'HP Boost',             debuff: 'Defense Boost' },
  { name: "Farfetch'd",     buff: 'Pokemon Speed',        debuff: 'HP Boost' },
  { name: 'Doduo',          buff: 'Character Speed',      debuff: 'Pokemon Speed' },
  { name: 'Dodrio',         buff: 'Critical Chance',      debuff: 'Character Speed' },
  { name: 'Seel',           buff: 'Critical Damage',      debuff: 'Critical Chance' },
  { name: 'Dewgong',        buff: 'Life Leech',           debuff: 'Critical Damage' },
  { name: 'Grimer',         buff: 'Precision Percent',    debuff: 'Life Leech' },
  { name: 'Muk',            buff: 'Evasion Percent',      debuff: 'Fishing Skill' },
  { name: 'Shellder',       buff: 'Shiny Fishing Rate',   debuff: 'Evasion Percent' },
  { name: 'Cloyster',       buff: 'Shiny Headbutt Rate',  debuff: 'Shiny Fishing Rate' },
  { name: 'Gastly',         buff: 'Loot Boost',           debuff: 'Shiny Headbutt Rate' },
  { name: 'Haunter',        buff: 'Catch Rate',           debuff: 'Loot Boost' },
  { name: 'Gengar',         buff: 'Shiny Catch Rate',     debuff: 'Catch Rate' },
  { name: 'Onix',           buff: 'Shiny Charm Rate',     debuff: 'Shiny Catch Rate' },
  { name: 'Drowzee',        buff: 'Critical Resistance',  debuff: 'Shiny Charm Rate' },
  { name: 'Hypno',          buff: 'Fly Speed',            debuff: 'Extra Fishing' },
  { name: 'Krabby',         buff: 'Surf Speed',           debuff: 'Fly Speed' },
  { name: 'Kingler',        buff: 'Ride Speed',           debuff: 'Surf Speed' },
  { name: 'Voltorb',        buff: 'Damage Boost',         debuff: 'Ride Speed' },
  { name: 'Electrode',      buff: 'Defense Boost',        debuff: 'Damage Boost' },
  { name: 'Exeggcute',      buff: 'HP Boost',             debuff: 'Defense Boost' },
  { name: 'Exeggutor',      buff: 'Pokemon Speed',        debuff: 'HP Boost' },
  { name: 'Cubone',         buff: 'Character Speed',      debuff: 'Pokemon Speed' },
  { name: 'Marowak',        buff: 'Critical Chance',      debuff: 'Character Speed' },
  { name: 'Hitmonlee',      buff: 'Critical Damage',      debuff: 'Critical Chance' },
  { name: 'Hitmonchan',     buff: 'Life Leech',           debuff: 'Critical Damage' },
  { name: 'Lickitung',      buff: 'Precision Percent',    debuff: 'Damage Boost' },
  { name: 'Koffing',        buff: 'Evasion Percent',      debuff: 'Fishing Skill' },
  { name: 'Weezing',        buff: 'Shiny Fishing Rate',   debuff: 'Evasion Percent' },
  { name: 'Rhyhorn',        buff: 'Shiny Headbutt Rate',  debuff: 'Shiny Fishing Rate' },
  { name: 'Rhydon',         buff: 'Loot Boost',           debuff: 'Shiny Headbutt Rate' },
  { name: 'Chansey',        buff: 'Catch Rate',           debuff: 'Loot Boost' },
  { name: 'Tangela',        buff: 'Shiny Catch Rate',     debuff: 'Catch Rate' },
  { name: 'Kangaskhan',     buff: 'Shiny Charm Rate',     debuff: 'Shiny Catch Rate' },
  { name: 'Horsea',         buff: 'Critical Resistance',  debuff: 'Shiny Fishing Rate' },
  { name: 'Seadra',         buff: 'Fly Speed',            debuff: 'Extra Fishing' },
  { name: 'Goldeen',        buff: 'Surf Speed',           debuff: 'Fly Speed' },
  { name: 'Seaking',        buff: 'Ride Speed',           debuff: 'Surf Speed' },
  { name: 'Staryu',         buff: 'Damage Boost',         debuff: 'Ride Speed' },
  { name: 'Starmie',        buff: 'Defense Boost',        debuff: 'Surf Speed' },
  { name: 'Mr. Mime',       buff: 'HP Boost',             debuff: 'Defense Boost' },
  { name: 'Scyther',        buff: 'Pokemon Speed',        debuff: 'HP Boost' },
  { name: 'Jynx',           buff: 'Character Speed',      debuff: 'Pokemon Speed' },
  { name: 'Electabuzz',     buff: 'Critical Chance',      debuff: 'Character Speed' },
  { name: 'Magmar',         buff: 'Critical Damage',      debuff: 'Critical Chance' },
  { name: 'Pinsir',         buff: 'Life Leech',           debuff: 'Critical Damage' },
  { name: 'Tauros',         buff: 'Precision Percent',    debuff: 'Life Leech' },
  { name: 'Magikarp',       buff: 'Evasion Percent',      debuff: 'Fishing Skill' },
  { name: 'Gyarados',       buff: 'Shiny Fishing Rate',   debuff: 'Headbutt Skill' },
  { name: 'Lapras',         buff: 'Shiny Headbutt Rate',  debuff: 'Shiny Fishing Rate' },
  { name: 'Ditto',          buff: 'Loot Boost',           debuff: 'Shiny Headbutt Rate' },
  { name: 'Eevee',          buff: 'Catch Rate',           debuff: 'Loot Boost' },
  { name: 'Vaporeon',       buff: 'Shiny Catch Rate',     debuff: 'Catch Rate' },
  { name: 'Jolteon',        buff: 'Shiny Charm Rate',     debuff: 'Shiny Catch Rate' },
  { name: 'Flareon',        buff: 'Critical Resistance',  debuff: 'Shiny Charm Rate' },
  { name: 'Porygon',        buff: 'Fly Speed',            debuff: 'Extra Fishing' },
  { name: 'Omanyte',        buff: 'Surf Speed',           debuff: 'Fly Speed' },
  { name: 'Omastar',        buff: 'Ride Speed',           debuff: 'Surf Speed' },
  { name: 'Kabuto',         buff: 'Damage Boost',         debuff: 'Ride Speed' },
  { name: 'Kabutops',       buff: 'Defense Boost',        debuff: 'Damage Boost' },
  { name: 'Aerodactyl',     buff: 'HP Boost',             debuff: 'Defense Boost' },
  { name: 'Snorlax',        buff: 'Pokemon Speed',        debuff: 'HP Boost' },
  { name: 'Articuno',       buff: 'Pokemon Speed',        debuff: null },
  { name: 'Zapdos',         buff: 'Character Speed',      debuff: null },
  { name: 'Moltres',        buff: 'Critical Chance',      debuff: null },
  { name: 'Dratini',        buff: 'Life Leech',           debuff: 'Critical Damage' },
  { name: 'Dragonair',      buff: 'Precision Percent',    debuff: 'Life Leech' },
  { name: 'Dragonite',      buff: 'Evasion Percent',      debuff: 'Fishing Skill' },
  { name: 'Mewtwo',         buff: 'Shiny Catch Rate',     debuff: null },
  { name: 'Mew',            buff: 'Shiny Charm Rate',     debuff: null },
];

/* Ícones temáticos por buff */
const BUFF_ICONS = {
  'Defense Boost':       '🛡️',
  'HP Boost':            '❤️',
  'Pokemon Speed':       '⚡',
  'Character Speed':     '💨',
  'Critical Chance':     '🎯',
  'Critical Damage':     '💥',
  'Life Leech':          '🩸',
  'Precision Percent':   '🔬',
  'Evasion Percent':     '🌀',
  'Shiny Fishing Rate':  '✨',
  'Shiny Headbutt Rate': '⭐',
  'Loot Boost':          '💰',
  'Catch Rate':          '🎣',
  'Shiny Catch Rate':    '🌟',
  'Shiny Charm Rate':    '🍀',
  'Critical Resistance': '🔰',
  'Fly Speed':           '🦅',
  'Ride Speed':          '🏇',
  'Damage Boost':        '⚔️',
  'Surf Speed':          '🌊',
  'Fishing Skill':       '🎣',
  'Extra Fishing':       '🐟',
  'Headbutt Skill':      '🌳',
};

/* Lista ordenada de buffs únicos */
const ALL_BUFFS = [...new Set(MEDALS.map(m => m.buff))].sort();

/* ── Estilos ─────────────────────────────────────────────────── */
const S = document.createElement('style');
S.textContent = `

/* ══════════════════════════════════════════
   BUFF FILTER — Seção completa
══════════════════════════════════════════ */
.ms-buff-section {
  margin-top: 36px;
}

/* ── Grid de chips de buff ── */
.ms-buff-chips {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  margin-bottom: 4px;
}

.ms-buff-chip {
  display: inline-flex;
  align-items: center;
  gap: 7px;
  padding: 7px 14px;
  border-radius: 24px;
  border: 1px solid rgba(205,127,50,0.2);
  background: rgba(205,127,50,0.05);
  font-family: var(--font-body, 'Rajdhani', sans-serif);
  font-size: 12px;
  font-weight: 600;
  color: rgba(255,220,150,0.65);
  letter-spacing: 0.4px;
  cursor: pointer;
  transition: all .2s cubic-bezier(.16,1,.3,1);
  user-select: none;
  position: relative;
  overflow: hidden;
}
.ms-buff-chip::before {
  content: '';
  position: absolute;
  inset: 0;
  background: rgba(205,127,50,0);
  transition: background .2s;
}
.ms-buff-chip:hover {
  border-color: rgba(205,127,50,0.55);
  color: rgba(255,220,150,0.95);
  transform: translateY(-2px);
  box-shadow: 0 4px 18px rgba(205,127,50,0.15);
}
.ms-buff-chip.active {
  border-color: rgba(205,127,50,0.85);
  background: rgba(205,127,50,0.18);
  color: #ffd166;
  box-shadow: 0 0 16px rgba(205,127,50,0.25), 0 4px 20px rgba(0,0,0,0.4);
}
.ms-buff-chip-icon {
  font-size: 14px;
  line-height: 1;
}
.ms-buff-chip-count {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  min-width: 18px;
  height: 18px;
  padding: 0 5px;
  border-radius: 10px;
  background: rgba(255,255,255,0.08);
  font-size: 10px;
  font-weight: 700;
  color: rgba(255,255,255,0.4);
  transition: all .2s;
}
.ms-buff-chip.active .ms-buff-chip-count {
  background: rgba(205,127,50,0.3);
  color: #ffd166;
}

/* ── Hint de instrução ── */
.ms-buff-hint {
  font-family: var(--font-body, 'Rajdhani', sans-serif);
  font-size: 11px;
  font-weight: 500;
  color: rgba(255,255,255,0.2);
  letter-spacing: 0.5px;
  margin-bottom: 24px;
  margin-top: 10px;
  text-align: center;
  font-style: italic;
}

/* ── Modal overlay ── */
.ms-buff-modal-overlay {
  position: fixed;
  inset: 0;
  background: rgba(0,0,0,0.75);
  backdrop-filter: blur(8px);
  z-index: 9999;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 20px;
  opacity: 0;
  pointer-events: none;
  transition: opacity .25s ease;
}
.ms-buff-modal-overlay.visible {
  opacity: 1;
  pointer-events: all;
}

/* ── Modal box ── */
.ms-buff-modal {
  background: #090e1c;
  border: 1px solid rgba(205,127,50,0.3);
  border-radius: 24px;
  width: 100%;
  max-width: 680px;
  max-height: 88vh;
  overflow: hidden;
  display: flex;
  flex-direction: column;
  box-shadow:
    0 0 60px rgba(205,127,50,0.12),
    0 24px 80px rgba(0,0,0,0.8),
    inset 0 1px 0 rgba(255,255,255,0.04);
  transform: translateY(20px) scale(0.97);
  transition: transform .28s cubic-bezier(.16,1,.3,1);
  position: relative;
}
.ms-buff-modal-overlay.visible .ms-buff-modal {
  transform: translateY(0) scale(1);
}

/* Linha decorativa topo do modal */
.ms-buff-modal::before {
  content: '';
  position: absolute;
  top: 0; left: 0; right: 0;
  height: 2px;
  background: linear-gradient(90deg, transparent 0%, rgba(205,127,50,0.7) 40%, rgba(255,209,102,0.9) 50%, rgba(205,127,50,0.7) 60%, transparent 100%);
}

/* ── Modal header ── */
.ms-buff-modal-header {
  padding: 28px 28px 20px;
  border-bottom: 1px solid rgba(255,255,255,0.06);
  flex-shrink: 0;
}
.ms-buff-modal-title-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  margin-bottom: 12px;
}
.ms-buff-modal-title {
  display: flex;
  align-items: center;
  gap: 12px;
}
.ms-buff-modal-title-icon {
  font-size: 32px;
  filter: drop-shadow(0 0 12px rgba(205,127,50,0.5));
  animation: ms-modal-glow 2.5s ease-in-out infinite;
}
@keyframes ms-modal-glow {
  0%, 100% { filter: drop-shadow(0 0 10px rgba(205,127,50,0.4)); }
  50%       { filter: drop-shadow(0 0 22px rgba(255,209,102,0.7)); }
}
.ms-buff-modal-title-text {
  font-family: var(--font-title, 'Cinzel', serif);
  font-size: 22px;
  font-weight: 900;
  color: #ffd166;
  letter-spacing: 1px;
  line-height: 1.1;
}
.ms-buff-modal-title-sub {
  font-family: var(--font-body, 'Rajdhani', sans-serif);
  font-size: 11px;
  font-weight: 500;
  letter-spacing: 3px;
  text-transform: uppercase;
  color: rgba(205,127,50,0.55);
  margin-top: 3px;
}
.ms-buff-modal-close {
  width: 38px; height: 38px;
  border-radius: 50%;
  border: 1px solid rgba(255,255,255,0.1);
  background: rgba(255,255,255,0.04);
  display: flex; align-items: center; justify-content: center;
  font-size: 18px;
  color: rgba(255,255,255,0.4);
  cursor: pointer;
  flex-shrink: 0;
  transition: all .2s;
  line-height: 1;
}
.ms-buff-modal-close:hover {
  border-color: rgba(255,80,80,0.4);
  background: rgba(255,80,80,0.08);
  color: rgba(255,120,120,0.9);
  transform: rotate(90deg);
}

/* Badges de buff/debuff no header */
.ms-buff-modal-badges {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}
.ms-buff-badge {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 5px 12px;
  border-radius: 20px;
  font-family: var(--font-body, 'Rajdhani', sans-serif);
  font-size: 12px;
  font-weight: 700;
  letter-spacing: 0.5px;
}
.ms-buff-badge.buff {
  background: rgba(80,200,120,0.1);
  border: 1px solid rgba(80,200,120,0.3);
  color: rgba(100,220,140,0.9);
}
.ms-buff-badge.buff-icon { font-size: 13px; }
.ms-buff-badge.debuff-note {
  background: rgba(255,80,80,0.08);
  border: 1px solid rgba(255,80,80,0.25);
  color: rgba(255,130,130,0.8);
  font-size: 11px;
}

/* ── Contador no header ── */
.ms-buff-modal-count {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 4px 10px;
  border-radius: 12px;
  background: rgba(205,127,50,0.1);
  border: 1px solid rgba(205,127,50,0.2);
  font-family: var(--font-body, 'Rajdhani', sans-serif);
  font-size: 11px;
  font-weight: 700;
  color: rgba(205,127,50,0.8);
  letter-spacing: 0.5px;
  margin-top: 10px;
}

/* ── Modal body — grid de medals ── */
.ms-buff-modal-body {
  padding: 24px 28px 28px;
  overflow-y: auto;
  flex: 1;
}
.ms-buff-modal-body::-webkit-scrollbar {
  width: 4px;
}
.ms-buff-modal-body::-webkit-scrollbar-track {
  background: rgba(255,255,255,0.03);
}
.ms-buff-modal-body::-webkit-scrollbar-thumb {
  background: rgba(205,127,50,0.3);
  border-radius: 2px;
}

/* Grid de medalhas no modal */
.ms-modal-medals-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(180px, 1fr));
  gap: 10px;
}

/* Card de medalha */
.ms-modal-medal-card {
  background: rgba(255,255,255,0.03);
  border: 1px solid rgba(255,255,255,0.07);
  border-radius: 14px;
  padding: 14px 16px;
  display: flex;
  flex-direction: column;
  gap: 8px;
  position: relative;
  overflow: hidden;
  transition: border-color .2s, box-shadow .2s, transform .22s cubic-bezier(.16,1,.3,1);
}
.ms-modal-medal-card::before {
  content: '';
  position: absolute;
  top: 0; left: 0; right: 0;
  height: 2px;
  background: linear-gradient(90deg, transparent, rgba(205,127,50,0.5), transparent);
  opacity: 0;
  transition: opacity .2s;
}
.ms-modal-medal-card:hover {
  border-color: rgba(205,127,50,0.3);
  box-shadow: 0 4px 20px rgba(205,127,50,0.08), 0 8px 24px rgba(0,0,0,0.4);
  transform: translateY(-2px);
}
.ms-modal-medal-card:hover::before {
  opacity: 1;
}

/* Nome do pokémon */
.ms-modal-medal-name {
  font-family: var(--font-title, 'Cinzel', serif);
  font-size: 13px;
  font-weight: 700;
  color: rgba(255,255,255,0.9);
  letter-spacing: 0.5px;
  line-height: 1.2;
}

/* Linha de stat (buff ou debuff) */
.ms-modal-medal-stat {
  display: flex;
  align-items: center;
  gap: 6px;
  font-family: var(--font-body, 'Rajdhani', sans-serif);
  font-size: 11px;
  font-weight: 600;
  letter-spacing: 0.3px;
  line-height: 1.2;
}
.ms-modal-medal-stat-dot {
  width: 5px; height: 5px;
  border-radius: 50%;
  flex-shrink: 0;
}
.ms-modal-medal-stat.is-buff {
  color: rgba(100,220,140,0.85);
}
.ms-modal-medal-stat.is-buff .ms-modal-medal-stat-dot {
  background: rgba(80,200,120,0.8);
  box-shadow: 0 0 6px rgba(80,200,120,0.5);
}
.ms-modal-medal-stat.is-debuff {
  color: rgba(255,120,100,0.7);
}
.ms-modal-medal-stat.is-debuff .ms-modal-medal-stat-dot {
  background: rgba(255,100,80,0.7);
  box-shadow: 0 0 6px rgba(255,100,80,0.4);
}
.ms-modal-medal-stat.no-debuff {
  color: rgba(255,255,255,0.2);
  font-style: italic;
}
.ms-modal-medal-stat.no-debuff .ms-modal-medal-stat-dot {
  background: rgba(255,255,255,0.15);
}

/* Tag lendário */
.ms-modal-medal-legendary {
  position: absolute;
  top: 10px;
  right: 10px;
  font-size: 13px;
  filter: drop-shadow(0 0 6px rgba(255,200,0,0.6));
  animation: ms-pulse 2s ease-in-out infinite;
}

/* ── Grid inline de todas as medalhas ── */
.ms-all-medals-section {
  margin-top: 32px;
}
.ms-all-medals-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(110px, 1fr));
  gap: 12px;
  margin-top: 16px;
}

/* Card medalha visual */
.ms-medal-card {
  display: flex;
  flex-direction: column;
  align-items: center;
  background: rgba(8,14,30,0.9);
  border: 1px solid rgba(205,127,50,0.15);
  border-radius: 18px;
  padding: 14px 10px 12px;
  position: relative;
  overflow: hidden;
  cursor: default;
  transition: border-color .22s, box-shadow .22s, transform .22s cubic-bezier(.16,1,.3,1);
}
.ms-medal-card::before {
  content: '';
  position: absolute;
  top: 0; left: 0; right: 0;
  height: 2px;
  background: linear-gradient(90deg, transparent, rgba(205,127,50,0.6), transparent);
  opacity: 0;
  transition: opacity .22s;
}
.ms-medal-card:hover {
  border-color: rgba(205,127,50,0.5);
  box-shadow: 0 6px 28px rgba(205,127,50,0.12), 0 2px 12px rgba(0,0,0,0.5);
  transform: translateY(-4px);
}
.ms-medal-card:hover::before { opacity: 1; }

/* Círculo medalha com sprite */
.ms-medal-coin {
  width: 72px;
  height: 72px;
  border-radius: 50%;
  background: radial-gradient(circle at 35% 35%, rgba(255,220,100,0.18), rgba(140,80,10,0.25));
  border: 2px solid rgba(205,127,50,0.45);
  box-shadow:
    0 0 0 3px rgba(205,127,50,0.1),
    0 4px 18px rgba(0,0,0,0.6),
    inset 0 1px 0 rgba(255,220,100,0.2);
  display: flex;
  align-items: center;
  justify-content: center;
  margin-bottom: 10px;
  flex-shrink: 0;
  position: relative;
  overflow: hidden;
  transition: box-shadow .22s;
}
.ms-medal-card:hover .ms-medal-coin {
  box-shadow:
    0 0 0 3px rgba(205,127,50,0.25),
    0 0 20px rgba(205,127,50,0.2),
    0 4px 18px rgba(0,0,0,0.6),
    inset 0 1px 0 rgba(255,220,100,0.3);
}
.ms-medal-coin::after {
  content: '';
  position: absolute;
  top: 6px; left: 10px;
  width: 22px; height: 10px;
  border-radius: 50%;
  background: rgba(255,255,255,0.12);
  transform: rotate(-20deg);
  pointer-events: none;
}
.ms-medal-sprite {
  width: 56px;
  height: 56px;
  object-fit: contain;
  image-rendering: pixelated;
  filter: drop-shadow(0 2px 4px rgba(0,0,0,0.6));
  position: relative;
  z-index: 1;
}
.ms-medal-sprite-fallback {
  font-size: 30px;
  line-height: 1;
}
.ms-medal-leg-tag {
  position: absolute;
  top: 10px; right: 10px;
  width: 20px; height: 20px;
  border-radius: 50%;
  background: rgba(255,200,0,0.15);
  border: 1px solid rgba(255,200,0,0.4);
  display: flex; align-items: center; justify-content: center;
  font-size: 10px;
  animation: ms-pulse 2.5s ease-in-out infinite;
}
.ms-medal-name {
  font-family: var(--font-title, 'Cinzel', serif);
  font-size: 10px;
  font-weight: 700;
  color: rgba(255,255,255,0.85);
  letter-spacing: 0.3px;
  text-align: center;
  line-height: 1.3;
  margin-bottom: 8px;
}
.ms-medal-tags {
  display: flex;
  flex-direction: column;
  gap: 4px;
  width: 100%;
}
.ms-medal-tag {
  display: flex;
  align-items: center;
  gap: 4px;
  padding: 3px 7px;
  border-radius: 8px;
  font-family: var(--font-body, 'Rajdhani', sans-serif);
  font-size: 9.5px;
  font-weight: 700;
  letter-spacing: 0.2px;
  line-height: 1.3;
}
.ms-medal-tag.buff {
  background: rgba(60,180,100,0.12);
  border: 1px solid rgba(60,180,100,0.25);
  color: rgba(100,220,140,0.9);
}
.ms-medal-tag.debuff {
  background: rgba(220,70,60,0.1);
  border: 1px solid rgba(220,70,60,0.22);
  color: rgba(255,120,100,0.8);
}
.ms-medal-tag.no-debuff {
  background: rgba(255,255,255,0.03);
  border: 1px solid rgba(255,255,255,0.07);
  color: rgba(255,255,255,0.2);
  font-style: italic;
}
.ms-medal-tag-dot {
  width: 5px; height: 5px;
  border-radius: 50%;
  flex-shrink: 0;
}
.ms-medal-tag.buff    .ms-medal-tag-dot { background: rgba(80,200,120,0.8); box-shadow: 0 0 5px rgba(80,200,120,0.5); }
.ms-medal-tag.debuff  .ms-medal-tag-dot { background: rgba(255,100,80,0.8);  box-shadow: 0 0 5px rgba(255,100,80,0.4); }
.ms-medal-tag.no-debuff .ms-medal-tag-dot { background: rgba(255,255,255,0.15); }

/* Highlight/dim quando filtro ativo */
.ms-medal-card.highlighted {
  border-color: rgba(205,127,50,0.7);
  box-shadow: 0 0 0 2px rgba(205,127,50,0.2), 0 6px 24px rgba(205,127,50,0.15);
}
.ms-medal-card.dimmed {
  opacity: 0.22;
  transform: none !important;
  pointer-events: none;
}

/* ── Responsivo ── */
@media (max-width: 640px) {
  .ms-buff-modal {
    border-radius: 18px;
    max-height: 92vh;
  }
  .ms-buff-modal-header {
    padding: 20px 18px 16px;
  }
  .ms-buff-modal-body {
    padding: 16px 18px 20px;
  }
  .ms-buff-modal-title-text {
    font-size: 17px;
  }
  .ms-modal-medals-grid {
    grid-template-columns: repeat(auto-fill, minmax(140px, 1fr));
    gap: 8px;
  }
  .ms-buff-chips {
    gap: 6px;
  }
  .ms-all-medals-grid {
    grid-template-columns: repeat(auto-fill, minmax(90px, 1fr));
    gap: 8px;
  }
  .ms-medal-coin { width: 58px; height: 58px; }
  .ms-medal-sprite { width: 44px; height: 44px; }
}
`;
document.head.appendChild(S);

/* Pokémons lendários para exibir tag especial */
const LEGENDARIES = new Set(['Articuno','Zapdos','Moltres','Mewtwo','Mew']);

/* ── Injeção no painel ───────────────────────────────────────── */
function injectBuffSection() {
  const panel = document.getElementById('wiki-tab-medals');
  if (!panel) return;
  if (document.getElementById('ms-buff-section-root')) return;

  /* ── Seção wrapper ── */
  const section = document.createElement('div');
  section.className = 'ms-buff-section';
  section.id = 'ms-buff-section-root';

  /* Divisor decorativo */
  section.innerHTML = `
    <div class="ms-divider">
      <div class="ms-divider-line"></div>
      <div class="ms-divider-gem"></div>
      <div class="ms-divider-gem" style="background:rgba(100,180,255,0.6);box-shadow:0 0 8px rgba(100,180,255,0.4)"></div>
      <div class="ms-divider-gem"></div>
      <div class="ms-divider-line" style="background:linear-gradient(90deg,transparent,rgba(205,127,50,0.25))"></div>
    </div>

    <div class="ms-section-label">⚔️ Filtro por Buff</div>

    <div class="ms-buff-chips" id="ms-buff-chips-container"></div>
    <div class="ms-buff-hint">Clique em um buff para ver todas as medalhas que o concedem</div>
  `;

  /* ── Grid inline de todas as medalhas ── */
  const allSection = document.createElement('div');
  allSection.className = 'ms-all-medals-section';
  allSection.innerHTML = `
    <div class="ms-divider" style="margin-top:0;margin-bottom:20px">
      <div class="ms-divider-line"></div>
      <div class="ms-divider-gem"></div>
      <div class="ms-divider-gem" style="background:rgba(205,127,50,0.6);box-shadow:0 0 8px rgba(205,127,50,0.4)"></div>
      <div class="ms-divider-gem"></div>
      <div class="ms-divider-line" style="background:linear-gradient(90deg,transparent,rgba(205,127,50,0.25))"></div>
    </div>
    <div class="ms-section-label">🏅 Todas as Medalhas — Gen 1</div>
    <div class="ms-all-medals-grid" id="ms-all-medals-grid"></div>
  `;
  section.appendChild(allSection);

  panel.appendChild(section);

  /* ── Mapeamento nome → número Pokedex (para sprite) ── */
  const POKEDEX = {
    'Bulbasaur':1,'Ivysaur':2,'Venusaur':3,'Charmander':4,'Charmelion':5,'Charizard':6,
    'Squirtle':7,'Wartortle':8,'Blastoise':9,'Caterpie':10,'Metapod':11,'Butterfree':12,
    'Weedle':13,'Kakuna':14,'Beedrill':15,'Pidgey':16,'Pidgeotto':17,'Pidgeot':18,
    'Rattata':19,'Raticate':20,'Spearow':21,'Fearow':22,'Ekans':23,'Arbok':24,
    'Pikachu':25,'Raichu':26,'Sandshrew':27,'Sandslash':28,'Nidoran ♀':29,'Nidorina':30,
    'Nidoqueen':31,'Nidoran ♂':32,'Nidorino':33,'Nidoking':34,'Clefairy':35,'Clefable':36,
    'Vulpix':37,'Ninetales':38,'Jigglypuff':39,'Wigglytuff':40,'Zubat':41,'Golbat':42,
    'Oddish':43,'Gloom':44,'Vileplume':45,'Paras':46,'Parasect':47,'Venonat':48,
    'Venomoth':49,'Diglett':50,'Dugtrio':51,'Meowth':52,'Persian':53,'Psyduck':54,
    'Golduck':55,'Mankey':56,'Primeape':57,'Growlithe':58,'Arcanine':59,'Poliwag':60,
    'Poliwhirl':61,'Poliwrath':62,'Abra':63,'Kadabra':64,'Alakazam':65,'Machop':66,
    'Machoke':67,'Machamp':68,'Bellsprout':69,'Weepinbell':70,'Victreebel':71,
    'Tentacool':72,'Tentacruel':73,'Geodude':74,'Graveler':75,'Golem':76,'Ponyta':77,
    'Rapidash':78,'Slowpoke':79,'Slowbro':80,'Magnemite':81,'Magneton':82,"Farfetch'd":83,
    'Doduo':84,'Dodrio':85,'Seel':86,'Dewgong':87,'Grimer':88,'Muk':89,'Shellder':90,
    'Cloyster':91,'Gastly':92,'Haunter':93,'Gengar':94,'Onix':95,'Drowzee':96,'Hypno':97,
    'Krabby':98,'Kingler':99,'Voltorb':100,'Electrode':101,'Exeggcute':102,'Exeggutor':103,
    'Cubone':104,'Marowak':105,'Hitmonlee':106,'Hitmonchan':107,'Lickitung':108,'Koffing':109,
    'Weezing':110,'Rhyhorn':111,'Rhydon':112,'Chansey':113,'Tangela':114,'Kangaskhan':115,
    'Horsea':116,'Seadra':117,'Goldeen':118,'Seaking':119,'Staryu':120,'Starmie':121,
    'Mr. Mime':122,'Scyther':123,'Jynx':124,'Electabuzz':125,'Magmar':126,'Pinsir':127,
    'Tauros':128,'Magikarp':129,'Gyarados':130,'Lapras':131,'Ditto':132,'Eevee':133,
    'Vaporeon':134,'Jolteon':135,'Flareon':136,'Porygon':137,'Omanyte':138,'Omastar':139,
    'Kabuto':140,'Kabutops':141,'Aerodactyl':142,'Snorlax':143,'Articuno':144,'Zapdos':145,
    'Moltres':146,'Dratini':147,'Dragonair':148,'Dragonite':149,'Mewtwo':150,'Mew':151,
  };

  /* ── Constrói cards inline ── */
  const allGrid = document.getElementById('ms-all-medals-grid');
  MEDALS.forEach((medal, idx) => {
    const num    = POKEDEX[medal.name] || 0;
    const sprite = num
      ? `https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/${num}.png`
      : '';
    const icon   = BUFF_ICONS[medal.buff] || '🏅';
    const isLeg  = LEGENDARIES.has(medal.name);
    const buffIcon = BUFF_ICONS[medal.buff] || '🏅';
    const debuffIcon = medal.debuff ? (BUFF_ICONS[medal.debuff] || '⬇️') : '';

    const card = document.createElement('div');
    card.className = 'ms-medal-card';
    card.dataset.buff = medal.buff;
    card.dataset.idx  = idx;

    card.innerHTML = `
      ${isLeg ? '<span class="ms-medal-leg-tag">⭐</span>' : ''}
      <div class="ms-medal-coin">
        ${sprite
          ? `<img class="ms-medal-sprite" src="${sprite}" alt="${medal.name}"
               onerror="this.style.display='none';this.nextElementSibling.style.display='block'">`
          : ''}
        <span class="ms-medal-sprite-fallback" style="display:${sprite ? 'none' : 'block'}">🏅</span>
      </div>
      <div class="ms-medal-name">${medal.name}</div>
      <div class="ms-medal-tags">
        <div class="ms-medal-tag buff">
          <span class="ms-medal-tag-dot"></span>
          ${buffIcon} ${medal.buff}
        </div>
        ${medal.debuff
          ? `<div class="ms-medal-tag debuff">
               <span class="ms-medal-tag-dot"></span>
               ${debuffIcon} ${medal.debuff}
             </div>`
          : `<div class="ms-medal-tag no-debuff">
               <span class="ms-medal-tag-dot"></span>
               Sem penalidade
             </div>`
        }
      </div>
    `;
    allGrid.appendChild(card);
  });

  /* ── Popula chips (com filtro inline, mantém modal também) ── */
  const container = document.getElementById('ms-buff-chips-container');
  ALL_BUFFS.forEach(buff => {
    const count = MEDALS.filter(m => m.buff === buff).length;
    const icon  = BUFF_ICONS[buff] || '🏅';

    const chip = document.createElement('button');
    chip.className = 'ms-buff-chip';
    chip.dataset.buff = buff;
    chip.innerHTML = `
      <span class="ms-buff-chip-icon">${icon}</span>
      ${buff}
      <span class="ms-buff-chip-count">${count}</span>
    `;
    chip.addEventListener('click', () => {
      filterMedalCards(buff, chip);
      openModal(buff, chip);
    });
    container.appendChild(chip);
  });

  /* ── Modal ── */
  const overlay = document.createElement('div');
  overlay.className = 'ms-buff-modal-overlay';
  overlay.id = 'ms-buff-modal-overlay';
  overlay.innerHTML = `
    <div class="ms-buff-modal" id="ms-buff-modal-box" role="dialog" aria-modal="true">
      <div class="ms-buff-modal-header">
        <div class="ms-buff-modal-title-row">
          <div class="ms-buff-modal-title">
            <span class="ms-buff-modal-title-icon" id="ms-modal-icon">🏅</span>
            <div>
              <div class="ms-buff-modal-title-text" id="ms-modal-title">Buff</div>
              <div class="ms-buff-modal-title-sub">Medalhas com este buff</div>
            </div>
          </div>
          <button class="ms-buff-modal-close" id="ms-modal-close-btn" aria-label="Fechar">✕</button>
        </div>
        <div class="ms-buff-modal-badges" id="ms-modal-badges"></div>
        <div class="ms-buff-modal-count" id="ms-modal-count"></div>
      </div>
      <div class="ms-buff-modal-body">
        <div class="ms-modal-medals-grid" id="ms-modal-medals-grid"></div>
      </div>
    </div>
  `;
  document.body.appendChild(overlay);

  /* Fecha ao clicar no overlay */
  overlay.addEventListener('click', (e) => {
    if (e.target === overlay) closeModal();
  });
  document.getElementById('ms-modal-close-btn').addEventListener('click', closeModal);

  /* Fecha com Escape */
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') closeModal();
  });
}

/* ── Filtra cards inline por buff ── */
let _activeFilterBuff = null;

function filterMedalCards(buff, chip) {
  const cards = document.querySelectorAll('#ms-all-medals-grid .ms-medal-card');
  if (!cards.length) return;

  /* Toggle: clicar no mesmo buff ativo remove o filtro */
  if (_activeFilterBuff === buff) {
    _activeFilterBuff = null;
    cards.forEach(c => { c.classList.remove('highlighted', 'dimmed'); });
    return;
  }

  _activeFilterBuff = buff;
  cards.forEach(c => {
    if (c.dataset.buff === buff) {
      c.classList.add('highlighted');
      c.classList.remove('dimmed');
    } else {
      c.classList.add('dimmed');
      c.classList.remove('highlighted');
    }
  });

  /* Scroll suave até a seção de medalhas */
  const grid = document.getElementById('ms-all-medals-grid');
  if (grid) grid.scrollIntoView({ behavior: 'smooth', block: 'start' });
}

/* ── Abre o modal com dados do buff ── */
let activeChip = null;

function openModal(buff, chip) {
  /* Atualiza chip ativo */
  if (activeChip) activeChip.classList.remove('active');
  activeChip = chip;
  chip.classList.add('active');

  const icon    = BUFF_ICONS[buff] || '🏅';
  const results = MEDALS.filter(m => m.buff === buff);

  /* Coleta debuffs distintos que esse buff causa */
  const debuffs = [...new Set(results.map(m => m.debuff).filter(Boolean))];

  /* Header */
  document.getElementById('ms-modal-icon').textContent  = icon;
  document.getElementById('ms-modal-title').textContent = buff;
  document.getElementById('ms-modal-count').innerHTML   =
    `🏅 <strong>${results.length}</strong> medalha${results.length !== 1 ? 's' : ''} concedem este buff`;

  /* Badges */
  const badgesEl = document.getElementById('ms-modal-badges');
  badgesEl.innerHTML = `
    <span class="ms-buff-badge buff">
      <span class="buff-icon">${icon}</span> BUFF: ${buff}
    </span>
    ${debuffs.length ? debuffs.map(d =>
      `<span class="ms-buff-badge debuff-note">⬇️ Penaliza: ${d}</span>`
    ).join('') : '<span class="ms-buff-badge debuff-note">— Sem penalidade</span>'}
  `;

  /* Grid de medalhas */
  const grid = document.getElementById('ms-modal-medals-grid');
  grid.innerHTML = '';

  results.forEach((medal, i) => {
    const isLeg   = LEGENDARIES.has(medal.name);
    const card    = document.createElement('div');
    card.className = 'ms-modal-medal-card';
    card.style.animationDelay = `${i * 30}ms`;

    card.innerHTML = `
      ${isLeg ? '<span class="ms-modal-medal-legendary">⭐</span>' : ''}
      <div class="ms-modal-medal-name">${medal.name}</div>
      <div class="ms-modal-medal-stat is-buff">
        <span class="ms-modal-medal-stat-dot"></span>
        ${icon} ${medal.buff}
      </div>
      ${medal.debuff
        ? `<div class="ms-modal-medal-stat is-debuff">
             <span class="ms-modal-medal-stat-dot"></span>
             ⬇️ ${medal.debuff}
           </div>`
        : `<div class="ms-modal-medal-stat no-debuff">
             <span class="ms-modal-medal-stat-dot"></span>
             Sem penalidade
           </div>`
      }
    `;
    grid.appendChild(card);
  });

  /* Mostra overlay */
  const overlay = document.getElementById('ms-buff-modal-overlay');
  overlay.classList.add('visible');
  document.body.style.overflow = 'hidden';
}

/* ── Fecha o modal ── */
function closeModal() {
  const overlay = document.getElementById('ms-buff-modal-overlay');
  if (!overlay) return;
  overlay.classList.remove('visible');
  document.body.style.overflow = '';
  if (activeChip) {
    activeChip.classList.remove('active');
    activeChip = null;
  }
  /* Limpa filtro inline */
  _activeFilterBuff = null;
  document.querySelectorAll('#ms-all-medals-grid .ms-medal-card').forEach(c => {
    c.classList.remove('highlighted', 'dimmed');
  });
}

/* ── Inicialização ───────────────────────────────────────────── */
/*
   Estratégia: decorar window.renderMedals para que, toda vez que o
   wiki-medals.js criar/revelar o painel, a seção de buffs seja
   injetada logo a seguir (com um tick de atraso para garantir que
   o innerHTML já foi populado).
*/
function hookRenderMedals() {
  var _orig = window.renderMedals;

  window.renderMedals = function () {
    /* Chama o renderizador original */
    if (typeof _orig === 'function') _orig.apply(this, arguments);

    /* Injeta a seção de buffs após o painel estar pronto */
    setTimeout(function () {
      injectBuffSection();
    }, 0);
  };
}

function init() {
  /* Se renderMedals já existe, decora agora */
  if (typeof window.renderMedals === 'function') {
    hookRenderMedals();
    return;
  }
  /* Ainda não existe — espera o script wiki-medals.js terminar de carregar */
  var maxWait = 5000;
  var elapsed = 0;
  var interval = setInterval(function () {
    elapsed += 50;
    if (typeof window.renderMedals === 'function') {
      clearInterval(interval);
      hookRenderMedals();
    } else if (elapsed >= maxWait) {
      clearInterval(interval);
      console.warn('[wiki-medals-buffs] renderMedals não encontrado após 5s');
    }
  }, 50);
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', init);
} else {
  init();
}

})();