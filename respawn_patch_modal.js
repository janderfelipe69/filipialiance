// =====================================================================
// respawn_patch_modal.js
// Contém: RAW_RESPAWN (dados de localização) + lógica do modal de respawn
// Deve ser carregado ANTES de app.js no index.html
// =====================================================================

// ===================== DADOS DE RESPAWN =====================
var RAW_RESPAWN = [
  // ── Gen 1 ────────────────────────────────────────────────────────
  {
    name:      'Bulbasaur',
    wildscape: null,
    mapImg:    'https://i.imgur.com/Om7SLbv.png',
    mapHoenn:  '',
  },

  {
    name:      'Ivysaur',
    wildscape: null,
    mapImg:    'https://i.imgur.com/lTmSlTx.png',
    mapHoenn:  '',
  },

  {
    name:      'Venusaur',
    wildscape: ['https://i.imgur.com/yzUdC73.png', 'https://i.imgur.com/76MDx0t.png'],
    mapImg:    'https://i.imgur.com/pdEHpQE.png',
    mapHoenn:  '',
  },

  {
    name:      'Charmander',
    wildscape: null,
    mapImg:    null,
    mapHoenn:  '',
  },

  {
    name:      'Charmeleon',
    wildscape: null,
    mapImg:    'https://i.imgur.com/FJYXQAr.png',
    mapHoenn:  '',
  },

  {
    name:      'Charizard',
    wildscape: 'https://i.imgur.com/MgVse3l.png',
    mapImg:    'https://i.imgur.com/MgVse3l.png',
    mapHoenn:  '',
  },

  {
    name:      'Squirtle',
    wildscape: null,
    mapImg:    'https://i.imgur.com/Vvov5hV.png',
    mapHoenn:  '',
  },

  {
    name:      'Wartortle',
    wildscape: null,
    mapImg:    'https://i.imgur.com/LYno9AW.png',
    mapHoenn:  '',
  },

  {
    name:      'Blastoise',
    wildscape: 'https://i.imgur.com/Jvj4TIY.png',
    mapImg:    'https://i.imgur.com/PySFtTh.png',
    mapHoenn:  '',
  },

  {
    name:      'Caterpie',
    wildscape: null,
    mapImg:    'https://i.imgur.com/sSa0QJ2.png',
    mapHoenn:  '',
  },

  {
    name:      'Metapod',
    wildscape: null,
    mapImg:    'https://i.imgur.com/bLp0m77.png',
    mapHoenn:  '',
  },

  {
    name:      'Butterfree',
    wildscape: null,
    mapImg:    'https://i.imgur.com/piplZ26.png',
    mapHoenn:  '',
  },

  {
    name:      'Weedle',
    wildscape: null,
    mapImg:    'https://i.imgur.com/kYRAYgE.png',
    mapHoenn:  '',
  },

  {
    name:      'Kakuna',
    wildscape: null,
    mapImg:    'https://i.imgur.com/jwJznHD.png',
    mapHoenn:  '',
  },

  {
    name:      'Beedrill',
    wildscape: null,
    mapImg:    'https://i.imgur.com/jwJznHD.png',
    mapHoenn:  '',
  },

  {
    name:      'Pidgey',
    wildscape: null,
    mapImg:    'https://i.imgur.com/n8tZrrJ.png',
    mapHoenn:  '',
  },

  {
    name:      'Pidgeotto',
    wildscape: null,
    mapImg:    'https://i.imgur.com/nthnSmG.png',
    mapHoenn:  '',
  },

  {
    name:      'Pidgeot',
    wildscape: 'https://i.imgur.com/L0NNeJj.png',
    mapImg:    'https://i.imgur.com/m5zyeSn.png',
    mapHoenn:  '',
  },

  {
    name:      'Rattata',
    wildscape: null,
    mapImg:    'https://i.imgur.com/y2FoQTX.png',
    mapHoenn:  '',
  },

  {
    name:      'Raticate',
    wildscape: null,
    mapImg:    'https://i.imgur.com/y2FoQTX.png',
    mapHoenn:  '',
  },

  {
    name:      'Spearow',
    wildscape: null,
    mapImg:    'https://i.imgur.com/n8tZrrJ.png',
    mapHoenn:  '',
  },

  {
    name:      'Fearow',
    wildscape: null,
    mapImg:    'https://i.imgur.com/bdD4t18.png',
    mapHoenn:  '',
  },

  {
    name:      'Ekans',
    wildscape: null,
    mapImg:    'hhttps://i.imgur.com/bDprezr.png',
    mapHoenn:  '',
  },

  {
    name:      'Arbok',
    wildscape: null,
    mapImg:    'https://i.imgur.com/3KSucR0.png',
    mapHoenn:  '',
  },

  {
    name:      'Pikachu',
    wildscape: null,
    mapImg:    'https://i.imgur.com/JHXS7jg.png',
    mapHoenn:  '',
  },

  {
    name:      'Raichu',
    wildscape: 'https://i.imgur.com/wEe4dQB.png',
    mapImg:    null,
    mapHoenn:  '',
  },

  {
    name:      'Sandshrew',
    wildscape: null,
    mapImg:    'https://i.imgur.com/UZ0eRhi.png',
    mapHoenn:  '',
  },

  {
    name:      'Sandslash',
    wildscape: 'https://i.imgur.com/Lv3CS0F.png',
    mapImg:    null,
    mapHoenn:  '',
  },

  {
    name:      'Nidoran-F',
    wildscape: null,
    mapImg:    'https://i.imgur.com/YC18UHo.png',
    mapHoenn:  '',
  },

  {
    name:      'Nidorina',
    wildscape: null,
    mapImg:    'https://i.imgur.com/NTdsMGV.png',
    mapHoenn:  '',
  },

  {
    name:      'Nidoqueen',
    wildscape: 'https://i.imgur.com/uySw1BD.png',
    mapImg:    null,
    mapHoenn:  '',
  },

  {
    name:      'Nidoran-M',
    wildscape: null,
    mapImg:    'https://i.imgur.com/YC18UHo.png',
    mapHoenn:  '',
  },

  {
    name:      'Nidorino',
    wildscape: null,
    mapImg:    'https://i.imgur.com/NTdsMGV.png',
    mapHoenn:  '',
  },

  {
    name:      'Nidoking',
    wildscape: 'https://i.imgur.com/Wj0B8i7.png',
    mapImg:    null,
    mapHoenn:  '',
  },

  {
    name:      'Clefairy',
    wildscape: null,
    mapImg:    'https://i.imgur.com/ERYJ7Vr.png',
    mapHoenn:  '',
  },

  {
    name:      'Clefable',
    wildscape: 'https://i.imgur.com/RT2yY0z.png',
    mapImg:    null,
    mapHoenn:  '',
  },

  {
    name:      'Vulpix',
    wildscape: null,
    mapImg:    'https://i.imgur.com/tPDUCSO.png',
    mapHoenn:  '',
  },

  {
    name:      'Ninetales',
    wildscape: 'https://i.imgur.com/vnq7rMk.png',
    mapImg:    'https://i.imgur.com/crARV7L.png',
    mapHoenn:  '',
  },

  {
    name:      'Jigglypuff',
    wildscape: null,
    mapImg:    'https://i.imgur.com/ERYJ7Vr.png',
    mapHoenn:  '',
  },

  {
    name:      'Wigglytuff',
    wildscape: 'https://i.imgur.com/4IS1PU0.png',
    mapImg:    'https://i.imgur.com/kKYP7re.png',
    mapHoenn:  '',
  },

  {
    name:      'Zubat',
    wildscape: null,
    mapImg:    'https://i.imgur.com/u49XwY4.png',
    mapHoenn:  '',
  },

  {
    name:      'Golbat',
    wildscape: null,
    mapImg:    'https://i.imgur.com/486smt3.png',
    mapHoenn:  '',
  },

  {
    name:      'Oddish',
    wildscape: null,
    mapImg:    'https://i.imgur.com/486smt3.png',
    mapHoenn:  '',
  },

  {
    name:      'Gloom',
    wildscape: null,
    mapImg:    'https://i.imgur.com/I4c1UNc.png',
    mapHoenn:  '',
  },

  {
    name:      'Vileplume',
    wildscape: null,
    mapImg:    'https://i.imgur.com/4IiYJ3B.png',
    mapHoenn:  '',
  },

  {
    name:      'Paras',
    wildscape: null,
    mapImg:    'https://i.imgur.com/8d0seII.png',
    mapHoenn:  '',
  },

  {
    name:      'Parasect',
    wildscape: null,
    mapImg:    'https://i.imgur.com/8d0seII.png',
    mapHoenn:  '',
  },

  {
    name:      'Venonat',
    wildscape: null,
    mapImg:    'https://i.imgur.com/5LI5mWU.png',
    mapHoenn:  '',
  },

  {
    name:      'Venomoth',
    wildscape: 'https://i.imgur.com/jepBRHo.png',
    mapImg:    'https://i.imgur.com/SFgJ8uA.png',
    mapHoenn:  '',
  },

  {
    name:      'Diglett',
    wildscape: null,
    mapImg:    null,
    mapHoenn:  '',
  },

  {
    name:      'Dugtrio',
    wildscape: null,
    mapImg:    null,
    mapHoenn:  '',
  },

  {
    name:      'Meowth',
    wildscape: null,
    mapImg:    'https://i.imgur.com/i80MsQ7.png',
    mapHoenn:  '',
  },

  {
    name:      'Persian',
    wildscape: null,
    mapImg:    'https://i.imgur.com/yAtxowA.png',
    mapHoenn:  '',
  },

  {
    name:      'Psyduck',
    wildscape: null,
    mapImg:    'https://i.imgur.com/RJrC2sS.png',
    mapHoenn:  '',
  },

  {
    name:      'Mankey',
    wildscape: null,
    mapImg:    'https://i.imgur.com/nEqwCKt.png',
    mapHoenn:  '',
  },

  {
    name:      'Primeape',
    wildscape: null,
    mapImg:    'https://i.imgur.com/nEqwCKt.png',
    mapHoenn:  '',
  },

  {
    name:      'Growlithe',
    wildscape: null,
    mapImg:    'https://i.imgur.com/OziulcD.png',
    mapHoenn:  '',
  },

  {
    name:      'Arcanine',
    wildscape: ['https://i.imgur.com/0eShDZu.png', 'https://i.imgur.com/xS1DZIb.png'],
    mapImg:    'https://i.imgur.com/4QSUNUa.png',
    mapHoenn:  '',
  },

  {
    name:      'Poliwag',
    wildscape: null,
    mapImg:    null,
    mapHoenn:  '',
  },

  {
    name:      'Poliwhirl',
    wildscape: null,
    mapImg:    null,
    mapHoenn:  '',
  },

  {
    name:      'Poliwrath',
    wildscape: 'https://i.imgur.com/OQHyJP2.png',
    mapImg:    null,
    mapHoenn:  '',
  },

  {
    name:      'Abra',
    wildscape: null,
    mapImg:    'https://i.imgur.com/Ojw4oz2.png',
    mapHoenn:  '',
  },

  {
    name:      'Kadabra',
    wildscape: null,
    mapImg:    'https://imgur.com/a/G7qjSsO',
    mapHoenn:  '',
  },

  {
    name:      'Alakazam',
    wildscape: 'https://imgur.com/a/OEmv8zV',
    mapImg:    'https://imgur.com/a/n2TiM6f',
    mapHoenn:  '',
  },

  {
    name:      'Machop',
    wildscape: null,
    mapImg:    'https://imgur.com/a/C6BDrQk',
    mapHoenn:  '',
  },

  {
    name:      'Machoke',
    wildscape: null,
    mapImg:    'https://imgur.com/a/C6BDrQk',
    mapHoenn:  '',
  },

  {
    name:      'Machamp',
    wildscape: 'https://imgur.com/a/yB63tms',
    mapImg:    null,
    mapHoenn:  '',
  },

  {
    name:      'Bellsprout',
    wildscape: null,
    mapImg:    'https://imgur.com/a/MnFL6no',
    mapHoenn:  '',
  },

  {
    name:      'Weepinbell',
    wildscape: null,
    mapImg:    'https://imgur.com/a/Xw7aLDs',
    mapHoenn:  '',
  },

  {
    name:      'Victreebel',
    wildscape: null,
    mapImg:    'https://imgur.com/a/aL0tt9a',
    mapHoenn:  '',
  },

  {
    name:      'Tentacool',
    wildscape: null,
    mapImg:    'https://imgur.com/a/UadRpGw',
    mapHoenn:  '',
  },

  {
    name:      'Tentacruel',
    wildscape: 'https://imgur.com/a/1MIh0TT',
    mapImg:    'https://imgur.com/a/1MIh0TT',
    mapHoenn:  '',
  },

  {
    name:      'Geodude',
    wildscape: null,
    mapImg:    'https://imgur.com/a/lhJ17iJ',
    mapHoenn:  '',
  },

  {
    name:      'Graveler',
    wildscape: null,
    mapImg:    'https://imgur.com/a/SHzJxH4',
    mapHoenn:  '',
  },

  {
    name:      'Golem',
    wildscape: 'https://imgur.com/a/rg5qYI4',
    mapImg:    'https://imgur.com/a/1JOCaQq',
    mapHoenn:  '',
  },

  {
    name:      'Ponyta',
    wildscape: null,
    mapImg:    'https://imgur.com/a/Wj6MnzA',
    mapHoenn:  '',
  },

  {
    name:      'Rapidash',
    wildscape: 'https://imgur.com/a/lwqRvJB',
    mapImg:    'https://imgur.com/a/wtXPt06',
    mapHoenn:  '',
  },

  {
    name:      'Slowpoke',
    wildscape: null,
    mapImg:    null,
    mapHoenn:  '',
  },

  {
    name:      'Slowbro',
    wildscape: null,
    mapImg:    null,
    mapHoenn:  '',
  },

  {
    name:      'Magnemite',
    wildscape: null,
    mapImg:    'https://imgur.com/a/ZNQjOvj',
    mapHoenn:  '',
  },

  {
    name:      'Magneton',
    wildscape: 'https://imgur.com/a/magneton-wildscape-fbJrvin',
    mapImg:    'https://imgur.com/a/ZNQjOvj',
    mapHoenn:  '',
  },

  {
    name:      '',
    wildscape: 'https://imgur.com/a/mZdWvFw',
    mapImg:    null,
    mapHoenn:  '',
  },

  {
    name:      'Doduo',
    wildscape: null,
    mapImg:    null,
    mapHoenn:  '',
  },

  {
    name:      'Dodrio',
    wildscape: 'https://imgur.com/a/mZdWvFw',
    mapImg:    null,
    mapHoenn:  '',
  },

  {
    name:      'Seel',
    wildscape: null,
    mapImg:    'https://imgur.com/a/0FU7pxA',
    mapHoenn:  '',
  },

  {
    name:      'Dewgong',
    wildscape: 'https://imgur.com/a/AWD6nTs',
    mapImg:    'https://imgur.com/a/6S3V66E',
    mapHoenn:  '',
  },

  {
    name:      'Grimer',
    wildscape: null,
    mapImg:    'https://imgur.com/a/vgGrrfT',
    mapHoenn:  '',
  },

  {
    name:      'Muk',
    wildscape: 'https://imgur.com/a/vgGrrfT',
    mapImg:    'https://imgur.com/a/vgGrrfT',
    mapHoenn:  '',
  },

  {
    name:      'Shellder',
    wildscape: null,
    mapImg:    'https://imgur.com/a/mHLB6sh',
    mapHoenn:  '',
  },

  {
    name:      'Cloyster',
    wildscape: 'https://imgur.com/a/JxKX8lv',
    mapImg:    null,
    mapHoenn:  '',
  },

  {
    name:      'Gastly',
    wildscape: null,
    mapImg:    'https://imgur.com/a/9zmYETV',
    mapHoenn:  '',
  },

  {
    name:      'Haunter',
    wildscape: null,
    mapImg:    'https://imgur.com/a/WeJwwK9',
    mapHoenn:  '',
  },

  {
    name:      'Gengar',
    wildscape: 'https://imgur.com/a/8auiFkj',
    mapImg:    null,
    mapHoenn:  '',
  },

  {
    name:      'Onix',
    wildscape: null,
    mapImg:    'https://imgur.com/a/XRtE7Ns',
    mapHoenn:  '',
  },

  {
    name:      'Drowzee',
    wildscape: null,
    mapImg:    'https://imgur.com/a/H8LgV6N',
    mapHoenn:  '',
  },

  {
    name:      'Hypno',
    wildscape: null,
    mapImg:    'https://imgur.com/a/c500gBU',
    mapHoenn:  '',
  },

  {
    name:      'Krabby',
    wildscape: null,
    mapImg:    null,
    mapHoenn:  '',
  },

  {
    name:      'Kingler',
    wildscape: null,
    mapImg:    'https://imgur.com/a/RJTIGC2',
    mapHoenn:  '',
  },

  {
    name:      'Voltorb',
    wildscape: null,
    mapImg:    'https://imgur.com/a/ZNQjOvj',
    mapHoenn:  '',
  },

  {
    name:      'Electrode',
    wildscape: null,
    mapImg:    'https://imgur.com/a/ZNQjOvj',
    mapHoenn:  '',
  },

  {
    name:      'Exeggcute',
    wildscape: null,
    mapImg:    null,
    mapHoenn:  '',
  },

  {
    name:      'Exeggutor',
    wildscape: 'https://imgur.com/a/Jh715JE',
    mapImg:    'https://imgur.com/a/exeggutor-oelxrIL',
    mapHoenn:  '',
  },

  {
    name:      'Cubone',
    wildscape: null,
    mapImg:    'https://imgur.com/a/Q6i4UqM',
    mapHoenn:  '',
  },

  {
    name:      'Marowak',
    wildscape: 'https://imgur.com/a/AYaHOY2',
    mapImg:    'https://imgur.com/a/VrqZwDG',
    mapHoenn:  '',
  },

  {
    name:      'Hitmonlee',
    wildscape: 'https://imgur.com/a/pjIUv00',
    mapImg:    null,
    mapHoenn:  '',
  },

  {
    name:      'Hitmonchan',
    wildscape: 'https://imgur.com/a/pjIUv00',
    mapImg:    null,
    mapHoenn:  '',
  },

  {
    name:      'Lickitung',
    wildscape: null,
    mapImg:    null,
    mapHoenn:  '',
  },

  {
    name:      'Koffing',
    wildscape: null,
    mapImg:    'https://imgur.com/a/vgGrrfT',
    mapHoenn:  '',
  },

  {
    name:      'Weezing',
    wildscape: null,
    mapImg:    'https://imgur.com/a/vgGrrfT',
    mapHoenn:  '',
  },

  {
    name:      'Rhyhorn',
    wildscape: null,
    mapImg:    'https://imgur.com/a/cPbYaoO',
    mapHoenn:  '',
  },

  {
    name:      'Rhydon',
    wildscape: 'https://imgur.com/a/rhydon-wildscape-P6cK6PD',
    mapImg:    'https://imgur.com/a/sROG59a',
    mapHoenn:  '',
  },

  {
    name:      'Chansey',
    wildscape: null,
    mapImg:    'https://imgur.com/a/njzmTdU',
    mapHoenn:  '',
  },

  {
    name:      'Tangela',
    wildscape: 'https://imgur.com/a/dtwFHj6',
    mapImg:    'https://imgur.com/a/lZyOqys',
    mapHoenn:  '',
  },

  {
    name:      'Kangaskhan',
    wildscape: 'https://imgur.com/a/j21SPSA',
    mapImg:    null,
    mapHoenn:  '',
  },

  {
    name:      'Horsea',
    wildscape: null,
    mapImg:    'https://imgur.com/a/vl4bFGw',
    mapHoenn:  '',
  },

  {
    name:      'Seadra',
    wildscape: null,
    mapImg:    'https://imgur.com/a/SBsknJ7',
    mapHoenn:  '',
  },

  {
    name:      'Goldeen',
    wildscape: null,
    mapImg:    'https://imgur.com/a/0ZHbtgY',
    mapHoenn:  '',
  },

  {
    name:      'Seaking',
    wildscape: null,
    mapImg:    'https://imgur.com/a/kd1pFE9',
    mapHoenn:  '',
  },

  {
    name:      'Staryu',
    wildscape: null,
    mapImg:    'https://imgur.com/a/mNdE7Lo',
    mapHoenn:  '',
  },

  {
    name:      'Starmie',
    wildscape: 'https://imgur.com/a/ZaL8AAc',
    mapImg:    'https://imgur.com/a/YOVObyR',
    mapHoenn:  '',
  },

  {
    name:      'Mr. Mime',
    wildscape: 'https://imgur.com/a/bluz6Tm',
    mapImg:    'https://imgur.com/a/lyn32FNm',
    mapHoenn:  '',
  },

  {
    name:      'Scyther',
    wildscape: 'https://imgur.com/a/df36NrE',
    mapImg:    'https://imgur.com/a/j21SPSA',
    mapHoenn:  '',
  },

  {
    name:      'Jynx',
    wildscape: 'https://imgur.com/a/3LppiO7',
    mapImg:    null,
    mapHoenn:  '',
  },

  {
    name:      'Electabuzz',
    wildscape: 'https://imgur.com/a/cIP3jSD',
    mapImg:    'https://imgur.com/a/lx2xnEu',
    mapHoenn:  '',
  },

  {
    name:      'Magmar',
    wildscape: 'https://imgur.com/a/TykewxH',
    mapImg:    null,
    mapHoenn:  '',
  },

  {
    name:      'Pinsir',
    wildscape: 'https://imgur.com/a/T3rOBjE',
    mapImg:    'https://imgur.com/a/Q0Pn5Tv',
    mapHoenn:  '',
  },

  {
    name:      'Tauros',
    wildscape: 'https://imgur.com/a/j21SPSA',
    mapImg:    null,
    mapHoenn:  '',
  },

  {
    name:      'Magikarp',
    wildscape: null,
    mapImg:    'https://imgur.com/a/kMnqXdd',
    mapHoenn:  '',
  },

  {
    name:      'Gyarados',
    wildscape: 'https://imgur.com/a/mfds9di',
    mapImg:    null,
    mapHoenn:  '',
  },

  {
    name:      'Lapras',
    wildscape: 'https://imgur.com/a/ca4NIMA',
    mapImg:    'https://imgur.com/a/gB97GTZ',
    mapHoenn:  '',
  },

  {
    name:      'Eevee',
    wildscape: null,
    mapImg:    'https://imgur.com/a/dJnqJtS',
    mapHoenn:  '',
  },

  {
    name:      'Vaporeon',
    wildscape: 'https://imgur.com/a/RI7U1mv',
    mapImg:    'https://imgur.com/a/rzkzhzF',
    mapHoenn:  '',
  },

  {
    name:      'Jolteon',
    wildscape: 'https://imgur.com/a/cIP3jSD',
    mapImg:    null,
    mapHoenn:  '',
  },

  {
    name:      'Flareon',
    wildscape: 'https://imgur.com/a/0QTUhoj',
    mapImg:    null,
    mapHoenn:  '',
  },

  {
    name:      'Omanyte',
    wildscape: null,
    mapImg:    'https://imgur.com/a/lrEa6jJ',
    mapHoenn:  '',
  },

  {
    name:      'Omastar',
    wildscape: null,
    mapImg:    'https://imgur.com/a/lrEa6jJ',
    mapHoenn:  '',
  },

  {
    name:      'Kabuto',
    wildscape: null,
    mapImg:    'https://imgur.com/a/hGRDfmM',
    mapHoenn:  '',
  },

  {
    name:      'Kabutops',
    wildscape: null,
    mapImg:    'https://imgur.com/a/hGRDfmM',
    mapHoenn:  '',
  },

  {
    name:      'Snorlax',
    wildscape: 'https://imgur.com/a/j21SPSA',
    mapImg:    'https://imgur.com/a/gFsPWgx',
    mapHoenn:  '',
  },

  {
    name:      'Dratini',
    wildscape: null,
    mapImg:    null,
    mapHoenn:  '',
  },

  {
    name:      'Dragonair',
    wildscape: 'https://imgur.com/a/P4wh1Pv',
    mapImg:    null,
    mapHoenn:  '',
  },

  {
    name:      'Dragonite',
    wildscape: 'https://imgur.com/a/eJHK8SE',
    mapImg:    'https://imgur.com/a/U3QIuQB',
    mapHoenn:  '',
  },

  // ── Gen 2 ────────────────────────────────────────────────────────
  {
    name:      'Chikorita',
    wildscape: null,
    mapImg:    'https://imgur.com/a/lNejCDG',
    mapHoenn:  '',
  },

  {
    name:      'Bayleef',
    wildscape: null,
    mapImg:    'https://imgur.com/a/FQ8roQ4',
    mapHoenn:  '',
  },

  {
    name:      'Meganium',
    wildscape: 'https://imgur.com/a/uw0XICj',
    mapImg:    'https://imgur.com/a/iHrZsw8',
    mapHoenn:  '',
  },

  {
    name:      'Cyndaquil',
    wildscape: null,
    mapImg:    'https://imgur.com/a/PjJgh5m',
    mapHoenn:  '',
  },

  {
    name:      'Quilava',
    wildscape: null,
    mapImg:    'https://imgur.com/a/PjJgh5m',
    mapHoenn:  '',
  },

  {
    name:      'Typhlosion',
    wildscape: 'https://imgur.com/a/nmnNuO5',
    mapImg:    'https://imgur.com/a/yhVaW4Z',
    mapHoenn:  '',
  },

  {
    name:      'Totodile',
    wildscape: null,
    mapImg:    'https://imgur.com/a/Oaet1M6',
    mapHoenn:  '',
  },

  {
    name:      'Croconaw',
    wildscape: null,
    mapImg:    'https://imgur.com/a/Pc6sqFF',
    mapHoenn:  '',
  },

  {
    name:      'Feraligatr',
    wildscape: 'https://imgur.com/a/H98mIzg',
    mapImg:    'https://imgur.com/a/wpVvk3n',
    mapHoenn:  '',
  },

  {
    name:      'Sentret',
    wildscape: null,
    mapImg:    'https://imgur.com/a/ScBW2W0',
    mapHoenn:  '',
  },

  {
    name:      'Furret',
    wildscape: null,
    mapImg:    'https://imgur.com/a/9Tbj4NB',
    mapHoenn:  '',
  },

  {
    name:      'Hoothoot',
    wildscape: null,
    mapImg:    'https://imgur.com/a/xxiIVMq',
    mapHoenn:  '',
  },

  {
    name:      'Noctowl',
    wildscape: null,
    mapImg:    'https://imgur.com/a/k0zFzjl',
    mapHoenn:  '',
  },

  {
    name:      'Ledyba',
    wildscape: null,
    mapImg:    'https://imgur.com/a/h0IZeRQ',
    mapHoenn:  '',
  },

  {
    name:      'Ledian',
    wildscape: null,
    mapImg:    null,
    mapHoenn:  '',
  },

  {
    name:      'Spinarak',
    wildscape: null,
    mapImg:    null,
    mapHoenn:  '',
  },

  {
    name:      'Ariados',
    wildscape: null,
    mapImg:    null,
    mapHoenn:  '',
  },

  {
    name:      'Crobat',
    wildscape: 'https://imgur.com/a/DgtNeZR',
    mapImg:    'https://imgur.com/a/kAVI10S',
    mapHoenn:  '',
  },

  {
    name:      'Chinchou',
    wildscape: null,
    mapImg:    'https://imgur.com/a/h2WnRle',
    mapHoenn:  '',
  },

  {
    name:      'Lanturn',
    wildscape: null,
    mapImg:    'https://imgur.com/a/h2WnRle',
    mapHoenn:  '',
  },

  {
    name:      'Pichu',
    wildscape: null,
    mapImg:    'https://imgur.com/a/owJDq0n',
    mapHoenn:  '',
  },

  {
    name:      'Cleffa',
    wildscape: null,
    mapImg:    'https://imgur.com/a/wFWndAk',
    mapHoenn:  '',
  },

  {
    name:      'Igglybuff',
    wildscape: null,
    mapImg:    null,
    mapHoenn:  '',
  },

  {
    name:      'Togepi',
    wildscape: null,
    mapImg:    'https://imgur.com/a/4Gfcwjm',
    mapHoenn:  '',
  },

  {
    name:      'Togetic',
    wildscape: null,
    mapImg:    'https://imgur.com/a/4Gfcwjm',
    mapHoenn:  '',
  },

  {
    name:      'Natu',
    wildscape: null,
    mapImg:    null,
    mapHoenn:  '',
  },

  {
    name:      'Xatu',
    wildscape: 'https://imgur.com/a/46mYVO7',
    mapImg:    'https://imgur.com/a/yVLhMR7',
    mapHoenn:  '',
  },

  {
    name:      'Mareep',
    wildscape: null,
    mapImg:    null,
    mapHoenn:  '',
  },

  {
    name:      'Flaaffy',
    wildscape: null,
    mapImg:    null,
    mapHoenn:  '',
  },

  {
    name:      'Ampharos',
    wildscape: 'https://imgur.com/a/O7GKc00',
    mapImg:    null,
    mapHoenn:  '',
  },

  {
    name:      'Bellossom',
    wildscape: null,
    mapImg:    null,
    mapHoenn:  '',
  },

  {
    name:      'Marill',
    wildscape: null,
    mapImg:    'https://imgur.com/a/3YGU4BO',
    mapHoenn:  '',
  },

  {
    name:      'Azumarill',
    wildscape: null,
    mapImg:    'https://imgur.com/a/3YGU4BO',
    mapHoenn:  '',
  },

  {
    name:      'Politoed',
    wildscape: 'https://imgur.com/a/zMl0ekj',
    mapImg:    'https://imgur.com/a/zMl0ekj',
    mapHoenn:  '',
  },

  {
    name:      'Hoppip',
    wildscape: null,
    mapImg:    'https://imgur.com/a/xTyMEaj',
    mapHoenn:  '',
  },

  {
    name:      'Skiploom',
    wildscape: null,
    mapImg:    'https://imgur.com/a/ourpstD',
    mapHoenn:  '',
  },

  {
    name:      'Jumpluff',
    wildscape: null,
    mapImg:    'https://imgur.com/a/zyv2Y81',
    mapHoenn:  '',
  },

  {
    name:      'Aipom',
    wildscape: null,
    mapImg:    null,
    mapHoenn:  '',
  },

  {
    name:      'Sunkern',
    wildscape: null,
    mapImg:    null,
    mapHoenn:  '',
  },

  {
    name:      'Sunflora',
    wildscape: null,
    mapImg:    'https://imgur.com/a/EpRy5tT',
    mapHoenn:  '',
  },

  {
    name:      'Yanma',
    wildscape: null,
    mapImg:    'https://imgur.com/a/0GZB0Pc',
    mapHoenn:  '',
  },

  {
    name:      'Wooper',
    wildscape: null,
    mapImg:    'https://imgur.com/a/zU19ndv',
    mapHoenn:  '',
  },

  {
    name:      'Quagsire',
    wildscape: null,
    mapImg:    'https://imgur.com/a/RYNQ8I0',
    mapHoenn:  '',
  },

  {
    name:      'Espeon',
    wildscape: 'https://imgur.com/a/CkBSqXN',
    mapImg:    null,
    mapHoenn:  '',
  },

  {
    name:      'Umbreon',
    wildscape: 'https://imgur.com/a/CkBSqXN',
    mapImg:    null,
    mapHoenn:  '',
  },

  {
    name:      'Murkrow',
    wildscape: null,
    mapImg:    'https://imgur.com/a/jYvUp9I',
    mapHoenn:  '',
  },

  {
    name:      'Slowking',
    wildscape: 'https://imgur.com/a/XUZFbv9',
    mapImg:    'https://imgur.com/a/XUZFbv9',
    mapHoenn:  '',
  },

  {
    name:      'Misdreavus',
    wildscape: 'https://imgur.com/a/xfYPzTw',
    mapImg:    null,
    mapHoenn:  '',
  },

  {
    name:      'Wobbuffet',
    wildscape: 'https://imgur.com/a/ZlGOsvk',
    mapImg:    'https://imgur.com/a/l7MbVV5',
    mapHoenn:  '',
  },

  {
    name:      'Girafarig',
    wildscape: 'https://imgur.com/a/6m4rkdL',
    mapImg:    'https://imgur.com/a/ZlGOsvk',
    mapHoenn:  '',
  },

  {
    name:      'Pineco',
    wildscape: null,
    mapImg:    'https://imgur.com/a/AgaCXsX',
    mapHoenn:  '',
  },

  {
    name:      'Forretress',
    wildscape: null,
    mapImg:    'https://imgur.com/a/X4CH3uc',
    mapHoenn:  '',
  },

  {
    name:      'Dunsparce',
    wildscape: null,
    mapImg:    null,
    mapHoenn:  '',
  },

  {
    name:      'Gligar',
    wildscape: null,
    mapImg:    'https://imgur.com/a/wljXV9h',
    mapHoenn:  '',
  },

  {
    name:      'Steelix',
    wildscape: 'https://imgur.com/a/GWp5vC7',
    mapImg:    'https://imgur.com/a/HDUZnBJ',
    mapHoenn:  '',
  },

  {
    name:      'Snubbull',
    wildscape: null,
    mapImg:    'https://imgur.com/a/i2zVgop',
    mapHoenn:  '',
  },

  {
    name:      'Granbull',
    wildscape: 'https://imgur.com/a/ubd3F1A',
    mapImg:    'https://imgur.com/a/6k6J7No',
    mapHoenn:  '',
  },

  {
    name:      'Qwilfish',
    wildscape: null,
    mapImg:    'https://imgur.com/a/fmnPze7',
    mapHoenn:  '',
  },

  {
    name:      'Scizor',
    wildscape: 'https://imgur.com/a/TXJL5sM',
    mapImg:    null,
    mapHoenn:  '',
  },

  {
    name:      'Shuckle',
    wildscape: null,
    mapImg:    'https://imgur.com/a/jom11IM',
    mapHoenn:  '',
  },

  {
    name:      'Heracross',
    wildscape: 'https://imgur.com/a/Cpi5yCV',
    mapImg:    'https://imgur.com/a/zRWr3Ry',
    mapHoenn:  '',
  },

  {
    name:      'Sneasel',
    wildscape: null,
    mapImg:    null,
    mapHoenn:  '',
  },

  {
    name:      'Teddiursa',
    wildscape: null,
    mapImg:    'https://imgur.com/a/K1wNTv6',
    mapHoenn:  '',
  },

  {
    name:      'Ursaring',
    wildscape: 'https://imgur.com/a/nBXkwSw',
    mapImg:    'https://imgur.com/a/K1wNTv6',
    mapHoenn:  '',
  },

  {
    name:      'Slugma',
    wildscape: null,
    mapImg:    'https://imgur.com/a/PjJgh5m',
    mapHoenn:  '',
  },

  {
    name:      'Magcargo',
    wildscape: 'https://imgur.com/a/PjJgh5m',
    mapImg:    'https://imgur.com/a/FSCg92Z',
    mapHoenn:  '',
  },

  {
    name:      'Swinub',
    wildscape: null,
    mapImg:    null,
    mapHoenn:  '',
  },

  {
    name:      'Piloswine',
    wildscape: 'https://imgur.com/a/IGWY0Xf',
    mapImg:    'https://imgur.com/a/VfulNAF',
    mapHoenn:  '',
  },

  {
    name:      'Corsola',
    wildscape: null,
    mapImg:    'https://imgur.com/a/SBsknJ7',
    mapHoenn:  '',
  },

  {
    name:      'Remoraid',
    wildscape: null,
    mapImg:    'https://imgur.com/a/SBsknJ7',
    mapHoenn:  '',
  },

  {
    name:      'Octillery',
    wildscape: null,
    mapImg:    'https://imgur.com/a/SBsknJ7',
    mapHoenn:  '',
  },

  {
    name:      'Delibird',
    wildscape: null,
    mapImg:    'https://imgur.com/a/EDtI5vP',
    mapHoenn:  '',
  },

  {
    name:      'Mantine',
    wildscape: 'https://imgur.com/a/H98mIzg',
    mapImg:    'https://imgur.com/a/SBsknJ7',
    mapHoenn:  '',
  },

  {
    name:      'Skarmory',
    wildscape: 'https://imgur.com/a/otQbKEE',
    mapImg:    null,
    mapHoenn:  '',
  },

  {
    name:      'Houndour',
    wildscape: null,
    mapImg:    'https://imgur.com/a/PjJgh5m',
    mapHoenn:  '',
  },

  {
    name:      'Houndoom',
    wildscape: 'https://imgur.com/a/kUQvKbL',
    mapImg:    'https://imgur.com/a/MjvZQ35',
    mapHoenn:  '',
  },

  {
    name:      'Kingdra',
    wildscape: 'https://imgur.com/a/W6HZI3X',
    mapImg:    null,
    mapHoenn:  '',
  },

  {
    name:      'Phanpy',
    wildscape: null,
    mapImg:    null,
    mapHoenn:  '',
  },

  {
    name:      'Donphan',
    wildscape: null,
    mapImg:    null,
    mapHoenn:  '',
  },

  {
    name:      'Stantler',
    wildscape: null,
    mapImg:    null,
    mapHoenn:  '',
  },

  {
    name:      'Smeargle',
    wildscape: 'https://imgur.com/a/vlWgMyH',
    mapImg:    null,
    mapHoenn:  '',
  },

  {
    name:      'Tyrogue',
    wildscape: null,
    mapImg:    null,
    mapHoenn:  '',
  },

  {
    name:      'Hitmontop',
    wildscape: 'https://imgur.com/a/30cn4iq',
    mapImg:    null,
    mapHoenn:  '',
  },

  {
    name:      'Smoochum',
    wildscape: null,
    mapImg:    null,
    mapHoenn:  '',
  },

  {
    name:      'Elekid',
    wildscape: null,
    mapImg:    null,
    mapHoenn:  '',
  },

  {
    name:      'Magby',
    wildscape: null,
    mapImg:    'https://imgur.com/a/kShgmOK',
    mapHoenn:  '',
  },

  {
    name:      'Miltank',
    wildscape: 'https://imgur.com/a/doQnA6i',
    mapImg:    'https://imgur.com/a/xxiIVMq',
    mapHoenn:  '',
  },

  {
    name:      'Larvitar',
    wildscape: null,
    mapImg:    'https://imgur.com/a/SJntAUa',
    mapHoenn:  '',
  },

  {
    name:      'Pupitar',
    wildscape: 'https://imgur.com/a/SJntAUa',
    mapImg:    'https://imgur.com/a/SJntAUa',
    mapHoenn:  '',
  },

  {
    name:      'Tyranitar',
    wildscape: 'https://imgur.com/a/oEyaCY3',
    mapImg:    null,
    mapHoenn:  '',
  },

  // ── Gen 3 ────────────────────────────────────────────────────────
  {
    name:      'Treecko',
    wildscape: null,
    mapImg:    'https://imgur.com/a/QwRNjsJ',
    mapHoenn:  '',
  },

  {
    name:      'Grovyle',
    wildscape: null,
    mapImg:    'https://imgur.com/a/plu4yw9',
    mapHoenn:  '',
  },

  {
    name:      'Sceptile',
    wildscape: null,
    mapImg:    'https://imgur.com/a/0NfZ1UB',
    mapHoenn:  '',
  },

  {
    name:      'Torchic',
    wildscape: null,
    mapImg:    'https://imgur.com/a/H8ebHUD',
    mapHoenn:  '',
  },

  {
    name:      'Combusken',
    wildscape: null,
    mapImg:    'https://imgur.com/a/WaCvBxT',
    mapHoenn:  '',
  },

  {
    name:      'Blaziken',
    wildscape: null,
    mapImg:    'https://imgur.com/a/Z1bIUfu',
    mapHoenn:  '',
  },

  {
    name:      'Mudkip',
    wildscape: null,
    mapImg:    'https://imgur.com/a/sZjLUro',
    mapHoenn:  '',
  },

  {
    name:      'Marshtomp',
    wildscape: null,
    mapImg:    'https://imgur.com/a/7NmIjrk',
    mapHoenn:  '',
  },

  {
    name:      'Swampert',
    wildscape: null,
    mapImg:    'https://imgur.com/a/ZZR9q3t',
    mapHoenn:  '',
  },

  {
    name:      'Poochyena',
    wildscape: null,
    mapImg:    'https://imgur.com/a/AV1brbq',
    mapHoenn:  '',
  },

  {
    name:      'Mightyena',
    wildscape: null,
    mapImg:    'https://imgur.com/a/TtFAFI8',
    mapHoenn:  '',
  },

  {
    name:      'Zigzagoon',
    wildscape: null,
    mapImg:    'https://imgur.com/a/WBUCnKo',
    mapHoenn:  '',
  },

  {
    name:      'Linoone',
    wildscape: null,
    mapImg:    'https://imgur.com/a/OZ3NIfX',
    mapHoenn:  '',
  },

  {
    name:      'Wurmple',
    wildscape: null,
    mapImg:    'https://imgur.com/a/EPQWSoP',
    mapHoenn:  '',
  },

  {
    name:      'Silcoon',
    wildscape: null,
    mapImg:    'https://imgur.com/a/EPQWSoP',
    mapHoenn:  '',
  },

  {
    name:      'Beautifly',
    wildscape: null,
    mapImg:    'https://imgur.com/a/vePSZZs',
    mapHoenn:  '',
  },

  {
    name:      'Cascoon',
    wildscape: null,
    mapImg:    'https://imgur.com/a/EPQWSoP',
    mapHoenn:  '',
  },

  {
    name:      'Dustox',
    wildscape: null,
    mapImg:    'https://imgur.com/a/aa8JVeg',
    mapHoenn:  '',
  },

  {
    name:      'Taillow',
    wildscape: null,
    mapImg:    'https://imgur.com/a/PywbkCI',
    mapHoenn:  '',
  },

  {
    name:      'Swellow',
    wildscape: null,
    mapImg:    'https://imgur.com/a/zWjp1is',
    mapHoenn:  '',
  },

  {
    name:      'Ralts',
    wildscape: null,
    mapImg:    'https://imgur.com/a/HeG92xQ',
    mapHoenn:  '',
  },

  {
    name:      'Kirlia',
    wildscape: null,
    mapImg:    'https://imgur.com/a/Duh5van',
    mapHoenn:  '',
  },

  {
    name:      'Gardevoir',
    wildscape: null,
    mapImg:    'https://imgur.com/a/Duh5van',
    mapHoenn:  '',
  },

  {
    name:      'Masquerain',
    wildscape: null,
    mapImg:    'https://imgur.com/a/A6mD163',
    mapHoenn:  '',
  },

  {
    name:      'Breloom',
    wildscape: null,
    mapImg:    'https://imgur.com/a/xkbltkt',
    mapHoenn:  '',
  },

  {
    name:      'Slakoth',
    wildscape: null,
    mapImg:    'https://imgur.com/a/ISjWYSS',
    mapHoenn:  '',
  },

  {
    name:      'Vigoroth',
    wildscape: null,
    mapImg:    'https://imgur.com/a/zBv5poV',
    mapHoenn:  '',
  },

  {
    name:      'Slaking',
    wildscape: null,
    mapImg:    'https://imgur.com/a/JFAXd2m',
    mapHoenn:  '',
  },

  {
    name:      'Nincada',
    wildscape: null,
    mapImg:    'https://imgur.com/a/lbHpkKV',
    mapHoenn:  '',
  },

  {
    name:      'Ninjask',
    wildscape: null,
    mapImg:    'https://imgur.com/a/J42Cek5',
    mapHoenn:  '',
  },

  {
    name:      'Shedinja',
    wildscape: null,
    mapImg:    'https://imgur.com/a/LUgy00h',
    mapHoenn:  '',
  },

  {
    name:      'Whismur',
    wildscape: null,
    mapImg:    'https://imgur.com/a/UOLx5iS',
    mapHoenn:  '',
  },

  {
    name:      'Loudred',
    wildscape: null,
    mapImg:    'https://imgur.com/a/9hx1oWG',
    mapHoenn:  '',
  },

  {
    name:      'Exploud',
    wildscape: null,
    mapImg:    'https://imgur.com/a/WTFRBwz',
    mapHoenn:  '',
  },

  {
    name:      'Makuhita',
    wildscape: null,
    mapImg:    'https://imgur.com/a/aTDa0zK',
    mapHoenn:  '',
  },

  {
    name:      'Hariyama',
    wildscape: null,
    mapImg:    '',
    mapHoenn:  'https://i.imgur.com/NWOf0iE.png',
  },

  {
    name:      'Azurill',
    wildscape: null,
    mapImg:    'https://imgur.com/a/GKSI8P8',
    mapHoenn:  '',
  },

  {
    name:      'Nosepass',
    wildscape: null,
    mapImg:    'https://imgur.com/a/idVWM4R',
    mapHoenn:  '',
  },

  {
    name:      'Skitty',
    wildscape: null,
    mapImg:    'https://imgur.com/a/HXpaVFd',
    mapHoenn:  '',
  },

  {
    name:      'Delcatty',
    wildscape: null,
    mapImg:    'https://imgur.com/a/PC3fNSZ',
    mapHoenn:  '',
  },

  {
    name:      'Sableye',
    wildscape: null,
    mapImg:    'https://imgur.com/a/cI3PbPr',
    mapHoenn:  '',
  },

  {
    name:      'Mawile',
    wildscape: null,
    mapImg:    'https://imgur.com/a/odlnvRR',
    mapHoenn:  '',
  },

  {
    name:      'Aron',
    wildscape: null,
    mapImg:    'https://imgur.com/a/dsmbUWE',
    mapHoenn:  '',
  },

  {
    name:      'Lairon',
    wildscape: null,
    mapImg:    'https://imgur.com/a/6drUal7',
    mapHoenn:  '',
  },

  {
    name:      'Aggron',
    wildscape: null,
    mapImg:    'https://imgur.com/a/cJndpSb',
    mapHoenn:  '',
  },

  {
    name:      'Meditite',
    wildscape: null,
    mapImg:    'https://imgur.com/a/0irrv1r',
    mapHoenn:  '',
  },

  {
    name:      'Medicham',
    wildscape: null,
    mapImg:    'https://imgur.com/a/0irrv1r',
    mapHoenn:  '',
  },

  {
    name:      'Volbeat',
    wildscape: null,
    mapImg:    'https://imgur.com/a/WCp8TTD',
    mapHoenn:  '',
  },

  {
    name:      'Illumise',
    wildscape: null,
    mapImg:    'https://imgur.com/a/WCp8TTD',
    mapHoenn:  '',
  },

  {
    name:      'Carvanha',
    wildscape: null,
    mapImg:    'https://imgur.com/a/waSih15',
    mapHoenn:  '',
  },

  {
    name:      'Numel',
    wildscape: null,
    mapImg:    'https://imgur.com/a/oweq0Ji',
    mapHoenn:  '',
  },

  {
    name:      'Camerupt',
    wildscape: null,
    mapImg:    'https://imgur.com/a/a8pfzjH',
    mapHoenn:  '',
  },

  {
    name:      'Torkoal',
    wildscape: null,
    mapImg:    'https://imgur.com/a/KBxrXSg',
    mapHoenn:  '',
  },

  {
    name:      'Spoink',
    wildscape: null,
    mapImg:    'https://imgur.com/a/TGgvFue',
    mapHoenn:  '',
  },

  {
    name:      'Grumpig',
    wildscape: null,
    mapImg:    'https://imgur.com/a/sL7iPRj',
    mapHoenn:  '',
  },

  {
    name:      'Trapinch',
    wildscape: null,
    mapImg:    'https://imgur.com/a/jDK1dA0',
    mapHoenn:  '',
  },

  {
    name:      'Seviper',
    wildscape: null,
    mapImg:    'https://imgur.com/a/l3lliRe',
    mapHoenn:  '',
  },

  {
    name:      'Altaria',
    wildscape: null,
    mapImg:    'https://imgur.com/a/4BU3DIw',
    mapHoenn:  '',
  },

  {
    name:      'Glalie',
    wildscape: null,
    mapImg:    'https://imgur.com/a/zeleMhU',
    mapHoenn:  '',
  },

  // ── Wildscape Especiais ───────────────────────────────────────────
  {
    name:      'Florges',
    wildscape: 'https://imgur.com/a/dHnsWqn',
    mapImg:    null,
    mapHoenn:  '',
  },

  {
    name:      'Mimikyu',
    wildscape: 'https://imgur.com/a/tBNDQGq',
    mapImg:    null,
    mapHoenn:  '',
  },

  {
    name:      'Toxicroak',
    wildscape: 'https://imgur.com/a/voSoRee',
    mapImg:    null,
    mapHoenn:  '',
  },

  {
    name:      'Torterra',
    wildscape: 'https://imgur.com/a/OSpmhX3',
    mapImg:    null,
    mapHoenn:  '',
  },

  {
    name:      'Luxray',
    wildscape: 'https://imgur.com/a/L0bj8Vd',
    mapImg:    null,
    mapHoenn:  '',
  },

  {
    name:      'Tangrowth',
    wildscape: 'https://imgur.com/a/6PD5gEv',
    mapImg:    null,
    mapHoenn:  '',
  },

  {
    name:      'Dusknoir',
    wildscape: 'https://imgur.com/a/DMCBxm0',
    mapImg:    null,
    mapHoenn:  '',
  },

];

// ── Tipagem dos Pokémon ──────────────────────────────────────────────
var POKEMON_TYPE_MAP = {
  "Bulbasaur":["grass","poison"],"Ivysaur":["grass","poison"],"Venusaur":["grass","poison"],
  "Charmander":["fire"],"Charmeleon":["fire"],"Charizard":["fire","flying"],
  "Squirtle":["water"],"Wartortle":["water"],"Blastoise":["water"],
  "Caterpie":["bug"],"Metapod":["bug"],"Butterfree":["bug","flying"],
  "Weedle":["bug","poison"],"Kakuna":["bug","poison"],"Beedrill":["bug","poison"],
  "Pidgey":["normal","flying"],"Pidgeotto":["normal","flying"],"Pidgeot":["normal","flying"],
  "Rattata":["normal"],"Raticate":["normal"],
  "Spearow":["normal","flying"],"Fearow":["normal","flying"],
  "Ekans":["poison"],"Arbok":["poison"],
  "Pikachu":["electric"],"Raichu":["electric"],
  "Sandshrew":["ground"],"Sandslash":["ground"],
  "Nidoran-F":["poison"],"Nidorina":["poison"],"Nidoqueen":["poison","ground"],
  "Nidoran-M":["poison"],"Nidorino":["poison"],"Nidoking":["poison","ground"],
  "Clefairy":["fairy"],"Clefable":["fairy"],
  "Vulpix":["fire"],"Ninetales":["fire"],
  "Jigglypuff":["normal","fairy"],"Wigglytuff":["normal","fairy"],
  "Zubat":["poison","flying"],"Golbat":["poison","flying"],
  "Oddish":["grass","poison"],"Gloom":["grass","poison"],"Vileplume":["grass","poison"],
  "Paras":["bug","grass"],"Parasect":["bug","grass"],
  "Venonat":["bug","poison"],"Venomoth":["bug","poison"],
  "Diglett":["ground"],"Dugtrio":["ground"],
  "Meowth":["normal"],"Persian":["normal"],
  "Psyduck":["water"],"Golduck":["water"],
  "Mankey":["fighting"],"Primeape":["fighting"],
  "Growlithe":["fire"],"Arcanine":["fire"],
  "Poliwag":["water"],"Poliwhirl":["water"],"Poliwrath":["water","fighting"],
  "Abra":["psychic"],"Kadabra":["psychic"],"Alakazam":["psychic"],
  "Machop":["fighting"],"Machoke":["fighting"],"Machamp":["fighting"],
  "Bellsprout":["grass","poison"],"Weepinbell":["grass","poison"],"Victreebel":["grass","poison"],
  "Tentacool":["water","poison"],"Tentacruel":["water","poison"],
  "Geodude":["rock","ground"],"Graveler":["rock","ground"],"Golem":["rock","ground"],
  "Ponyta":["fire"],"Rapidash":["fire"],
  "Slowpoke":["water","psychic"],"Slowbro":["water","psychic"],
  "Magnemite":["electric","steel"],"Magneton":["electric","steel"],
  "Farfetch'd":["normal","flying"],
  "Doduo":["normal","flying"],"Dodrio":["normal","flying"],
  "Seel":["water"],"Dewgong":["water","ice"],
  "Grimer":["poison"],"Muk":["poison"],
  "Shellder":["water"],"Cloyster":["water","ice"],
  "Gastly":["ghost","poison"],"Haunter":["ghost","poison"],"Gengar":["ghost","poison"],
  "Onix":["rock","ground"],
  "Drowzee":["psychic"],"Hypno":["psychic"],
  "Krabby":["water"],"Kingler":["water"],
  "Voltorb":["electric"],"Electrode":["electric"],
  "Exeggcute":["grass","psychic"],"Exeggutor":["grass","psychic"],
  "Cubone":["ground"],"Marowak":["ground"],
  "Hitmonlee":["fighting"],"Hitmonchan":["fighting"],
  "Lickitung":["normal"],
  "Koffing":["poison"],"Weezing":["poison"],
  "Rhyhorn":["ground","rock"],"Rhydon":["ground","rock"],
  "Chansey":["normal"],
  "Tangela":["grass"],
  "Kangaskhan":["normal"],
  "Horsea":["water"],"Seadra":["water"],
  "Goldeen":["water"],"Seaking":["water"],
  "Staryu":["water"],"Starmie":["water","psychic"],
  "Mr. Mime":["psychic","fairy"],
  "Scyther":["bug","flying"],
  "Jynx":["ice","psychic"],
  "Electabuzz":["electric"],
  "Magmar":["fire"],
  "Pinsir":["bug"],
  "Tauros":["normal"],
  "Magikarp":["water"],"Gyarados":["water","flying"],
  "Lapras":["water","ice"],
  "Ditto":["normal"],
  "Eevee":["normal"],
  "Vaporeon":["water"],"Jolteon":["electric"],"Flareon":["fire"],
  "Porygon":["normal"],
  "Omanyte":["rock","water"],"Omastar":["rock","water"],
  "Kabuto":["rock","water"],"Kabutops":["rock","water"],
  "Aerodactyl":["rock","flying"],
  "Snorlax":["normal"],
  "Articuno":["ice","flying"],"Zapdos":["electric","flying"],"Moltres":["fire","flying"],
  "Dratini":["dragon"],"Dragonair":["dragon"],"Dragonite":["dragon","flying"],
  "Mewtwo":["psychic"],"Mew":["psychic"],
  "Chikorita":["grass"],"Bayleef":["grass"],"Meganium":["grass"],
  "Cyndaquil":["fire"],"Quilava":["fire"],"Typhlosion":["fire"],
  "Totodile":["water"],"Croconaw":["water"],"Feraligatr":["water"],
  "Sentret":["normal"],"Furret":["normal"],
  "Hoothoot":["normal","flying"],"Noctowl":["normal","flying"],
  "Ledyba":["bug","flying"],"Ledian":["bug","flying"],
  "Spinarak":["bug","poison"],"Ariados":["bug","poison"],
  "Crobat":["poison","flying"],
  "Chinchou":["water","electric"],"Lanturn":["water","electric"],
  "Pichu":["electric"],"Cleffa":["fairy"],"Igglybuff":["normal","fairy"],
  "Togepi":["fairy"],"Togetic":["fairy","flying"],
  "Natu":["psychic","flying"],"Xatu":["psychic","flying"],
  "Mareep":["electric"],"Flaaffy":["electric"],"Ampharos":["electric"],
  "Bellossom":["grass"],
  "Marill":["water","fairy"],"Azumarill":["water","fairy"],
  "Sudowoodo":["rock"],
  "Politoed":["water"],
  "Hoppip":["grass","flying"],"Skiploom":["grass","flying"],"Jumpluff":["grass","flying"],
  "Aipom":["normal"],
  "Sunkern":["grass"],"Sunflora":["grass"],
  "Yanma":["bug","flying"],
  "Wooper":["water","ground"],"Quagsire":["water","ground"],
  "Espeon":["psychic"],"Umbreon":["dark"],
  "Murkrow":["dark","flying"],
  "Slowking":["water","psychic"],
  "Misdreavus":["ghost"],
  "Unown":["psychic"],
  "Wobbuffet":["psychic"],
  "Girafarig":["normal","psychic"],
  "Pineco":["bug"],"Forretress":["bug","steel"],
  "Dunsparce":["normal"],
  "Gligar":["ground","flying"],
  "Steelix":["steel","ground"],
  "Snubbull":["fairy"],"Granbull":["fairy"],
  "Qwilfish":["water","poison"],
  "Scizor":["bug","steel"],
  "Shuckle":["bug","rock"],
  "Heracross":["bug","fighting"],
  "Sneasel":["dark","ice"],
  "Teddiursa":["normal"],"Ursaring":["normal"],
  "Slugma":["fire"],"Magcargo":["fire","rock"],
  "Swinub":["ice","ground"],"Piloswine":["ice","ground"],
  "Corsola":["water","rock"],
  "Remoraid":["water"],"Octillery":["water"],
  "Delibird":["ice","flying"],
  "Mantine":["water","flying"],
  "Skarmory":["steel","flying"],
  "Houndour":["dark","fire"],"Houndoom":["dark","fire"],
  "Kingdra":["water","dragon"],
  "Phanpy":["ground"],"Donphan":["ground"],
  "Porygon2":["normal"],
  "Stantler":["normal"],
  "Smeargle":["normal"],
  "Tyrogue":["fighting"],"Hitmontop":["fighting"],
  "Smoochum":["ice","psychic"],
  "Elekid":["electric"],"Magby":["fire"],
  "Miltank":["normal"],"Blissey":["normal"],
  "Raikou":["electric"],"Entei":["fire"],"Suicune":["water"],
  "Larvitar":["rock","ground"],"Pupitar":["rock","ground"],"Tyranitar":["rock","dark"],
  "Lugia":["psychic","flying"],"Ho-oh":["fire","flying"],"Celebi":["psychic","grass"],
  "Treecko":["grass"],"Grovyle":["grass"],"Sceptile":["grass"],
  "Torchic":["fire"],"Combusken":["fire","fighting"],"Blaziken":["fire","fighting"],
  "Mudkip":["water"],"Marshtomp":["water","ground"],"Swampert":["water","ground"],
  "Poochyena":["dark"],"Mightyena":["dark"],
  "Zigzagoon":["normal"],"Linoone":["normal"],
  "Wurmple":["bug"],"Silcoon":["bug"],"Beautifly":["bug","flying"],"Cascoon":["bug"],"Dustox":["bug","poison"],
  "Lotad":["water","grass"],"Lombre":["water","grass"],"Ludicolo":["water","grass"],
  "Seedot":["grass"],"Nuzleaf":["grass","dark"],"Shiftry":["grass","dark"],
  "Taillow":["normal","flying"],"Swellow":["normal","flying"],
  "Wingull":["water","flying"],"Pelipper":["water","flying"],
  "Ralts":["psychic","fairy"],"Kirlia":["psychic","fairy"],"Gardevoir":["psychic","fairy"],
  "Surskit":["bug","water"],"Masquerain":["bug","flying"],
  "Shroomish":["grass"],"Breloom":["grass","fighting"],
  "Slakoth":["normal"],"Vigoroth":["normal"],"Slaking":["normal"],
  "Nincada":["bug","ground"],"Ninjask":["bug","flying"],"Shedinja":["bug","ghost"],
  "Whismur":["normal"],"Loudred":["normal"],"Exploud":["normal"],
  "Makuhita":["fighting"],"Hariyama":["fighting"],
  "Azurill":["normal","fairy"],"Nosepass":["rock"],
  "Skitty":["normal"],"Delcatty":["normal"],
  "Sableye":["dark","ghost"],"Mawile":["steel","fairy"],
  "Aron":["steel","rock"],"Lairon":["steel","rock"],"Aggron":["steel","rock"],
  "Meditite":["fighting","psychic"],"Medicham":["fighting","psychic"],
  "Electrike":["electric"],"Manectric":["electric"],
  "Plusle":["electric"],"Minun":["electric"],
  "Volbeat":["bug"],"Illumise":["bug"],
  "Roselia":["grass","poison"],
  "Gulpin":["poison"],"Swalot":["poison"],
  "Carvanha":["water","dark"],"Sharpedo":["water","dark"],
  "Wailmer":["water"],"Wailord":["water"],
  "Numel":["fire","ground"],"Camerupt":["fire","ground"],
  "Torkoal":["fire"],
  "Spoink":["psychic"],"Grumpig":["psychic"],
  "Spinda":["normal"],
  "Trapinch":["ground"],"Vibrava":["ground","dragon"],"Flygon":["ground","dragon"],
  "Cacnea":["grass","dark"],"Cacturne":["grass","dark"],
  "Swablu":["normal","flying"],"Altaria":["dragon","flying"],
  "Zangoose":["normal"],"Seviper":["poison"],
  "Lunatone":["rock","psychic"],"Solrock":["rock","psychic"],
  "Barboach":["water","ground"],"Whiscash":["water","ground"],
  "Corphish":["water"],"Crawdaunt":["water","dark"],
  "Baltoy":["ground","psychic"],"Claydol":["ground","psychic"],
  "Lileep":["rock","grass"],"Cradily":["rock","grass"],
  "Anorith":["rock","bug"],"Armaldo":["rock","bug"],
  "Feebas":["water"],"Milotic":["water"],
  "Castform":["normal"],
  "Kecleon":["normal"],
  "Shuppet":["ghost"],"Banette":["ghost"],
  "Duskull":["ghost"],"Dusclops":["ghost"],
  "Tropius":["grass","flying"],
  "Chimecho":["psychic"],
  "Absol":["dark"],
  "Wynaut":["psychic"],
  "Snorunt":["ice"],"Glalie":["ice"],
  "Spheal":["ice","water"],"Sealeo":["ice","water"],"Walrein":["ice","water"],
  "Clamperl":["water"],"Huntail":["water"],"Gorebyss":["water"],
  "Relicanth":["water","rock"],
  "Luvdisc":["water"],
  "Bagon":["dragon"],"Shelgon":["dragon"],"Salamence":["dragon","flying"],
  "Beldum":["steel","psychic"],"Metang":["steel","psychic"],"Metagross":["steel","psychic"],
  "Regirock":["rock"],"Regice":["ice"],"Registeel":["steel"],
  "Latios":["dragon","psychic"],"Latias":["dragon","psychic"],
  "Kyogre":["water"],"Groudon":["ground"],"Rayquaza":["dragon","flying"],
  "Jirachi":["steel","psychic"],"Deoxys":["psychic"],
  "Florges":["fairy"],
  "Mimikyu":["ghost","fairy"],
  "Toxicroak":["poison","fighting"],
  "Torterra":["grass","ground"],
  "Luxray":["electric"],
  "Tangrowth":["grass"],
  "Dusknoir":["ghost"],
};

function getPokemonTypes(name) {
  var cleanName = name.replace(/^shiny\s+/i, '').trim();
  return POKEMON_TYPE_MAP[cleanName] || null;
}

function buildTypeBadgesHtml(types) {
  if (!types || !types.length) return '';
  return types.map(function(t) {
    var col = TYPE_COLORS[t] || '#888';
    return '<span class="rsp-type-badge" style="background:' + col + '22;border-color:' + col + '55;color:' + col + '">' + t.charAt(0).toUpperCase() + t.slice(1) + '</span>';
  }).join('');
}

function getPrimaryTypeColor(types) {
  if (!types || !types.length) return '#60aaff';
  return TYPE_COLORS[types[0]] || '#60aaff';
}

// ── Helpers ──────────────────────────────────────────────────────────
// ── Inject CSS (cards + modal) ────────────────────────────────────────
(function() {
  if (document.getElementById('rsp-modal-css')) return;
  var s = document.createElement('style');
  s.id = 'rsp-modal-css';
  s.textContent = `
/* ── RESPAWN CARDS ── */
#respawn-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(150px, 1fr));
  gap: 14px;
  padding: 4px 0 20px;
}
.rsp-card-v2 {
  position: relative;
  border-radius: 18px;
  border: 1.5px solid var(--rsp-card-border, rgba(255,255,255,0.10));
  background: var(--rsp-card-bg, rgba(255,255,255,0.03));
  overflow: hidden;
  cursor: pointer;
  transition: transform .22s, border-color .22s, box-shadow .22s, background .22s;
  user-select: none;
}
.rsp-card-v2::before {
  content: '';
  position: absolute;
  inset: 0;
  background: radial-gradient(ellipse at 50% -5%, var(--rsp-glow-c, rgba(100,180,255,0.08)), transparent 70%);
  pointer-events: none;
}
.rsp-card-v2:hover {
  transform: translateY(-3px);
  border-color: var(--rsp-accent, rgba(100,180,255,0.4));
  box-shadow: 0 8px 32px var(--rsp-shadow, rgba(100,180,255,0.15));
}
.rsp-sprite-wrap {
  display: flex;
  align-items: center;
  justify-content: center;
  height: 100px;
  padding: 10px 8px 4px;
  position: relative;
}
.rsp-sprite-static, .rsp-sprite-anim {
  max-width: 96px; max-height: 96px;
  object-fit: contain;
  image-rendering: pixelated;
  filter: drop-shadow(0 4px 10px var(--rsp-shadow, rgba(100,180,255,0.25)));
  transition: opacity .25s;
}
.rsp-sprite-anim { position: absolute; opacity: 0; }
.rsp-card-foot {
  padding: 6px 12px 12px;
  display: flex; flex-direction: column; gap: 5px;
}
.rsp-card-name {
  font-family: var(--font-title, 'Cinzel', serif);
  font-size: 13px; font-weight: 700;
  color: var(--rsp-accent, #fff);
  letter-spacing: 0.3px;
  white-space: nowrap; overflow: hidden; text-overflow: ellipsis;
}
.rsp-type-row { display: flex; gap: 4px; flex-wrap: wrap; }
.rsp-type-badge {
  font-family: var(--font-body, sans-serif);
  font-size: 10px; font-weight: 700;
  padding: 2px 7px; border-radius: 8px; border: 1px solid;
  letter-spacing: 0.5px; text-transform: uppercase;
}
.rsp-wildscape-dot {
  display: inline-flex; align-items: center; gap: 4px;
  font-size: 10px; color: rgba(255,255,255,0.4);
  font-family: var(--font-mono, monospace);
}
.rsp-wildscape-dot::before {
  content: ''; width: 6px; height: 6px; border-radius: 50%;
  background: #ffcc44; box-shadow: 0 0 5px #ffcc44aa; flex-shrink: 0;
}

/* ── List mode ── */
.respawn-list-mode #respawn-grid { grid-template-columns: 1fr; }
.respawn-list-mode .rsp-card-v2 {
  display: flex; flex-direction: row; align-items: center; border-radius: 14px;
}
.respawn-list-mode .rsp-sprite-wrap { width: 70px; height: 56px; flex-shrink: 0; padding: 6px; }
.respawn-list-mode .rsp-card-foot {
  flex-direction: row; align-items: center; flex: 1; gap: 10px; padding: 10px 14px 10px 0;
}
.respawn-list-mode .rsp-card-name { min-width: 120px; font-size: 14px; }

/* ── View toggle ── */
.rsp-view-toggle { display: flex; gap: 6px; margin-left: auto; }
.rsp-view-btn {
  width: 32px; height: 32px; border-radius: 8px;
  border: 1px solid rgba(255,255,255,0.12);
  background: rgba(255,255,255,0.04); color: rgba(255,255,255,0.4);
  cursor: pointer; display: flex; align-items: center; justify-content: center;
  transition: all .15s;
}
.rsp-view-btn.active, .rsp-view-btn:hover {
  border-color: rgba(100,180,255,0.4); color: #fff; background: rgba(100,180,255,0.08);
}

/* ═══════════════════════════════════════════════
   RESPAWN MODAL (estilo NPC)
═══════════════════════════════════════════════ */
#rsp-poke-modal {
  position: fixed; inset: 0; z-index: 9999;
  display: flex; align-items: center; justify-content: center;
}
.rsp-modal-backdrop {
  position: absolute; inset: 0;
  background: rgba(0,0,0,0.72);
  backdrop-filter: blur(4px);
}
.rsp-modal-panel {
  position: relative; z-index: 1;
  background: linear-gradient(160deg, #161c2b 0%, #0e1320 100%);
  border: 1.5px solid var(--rsp-m-accent, rgba(100,180,255,0.35));
  border-radius: 20px;
  width: min(480px, 92vw);
  max-height: 88vh;
  overflow-y: auto;
  box-shadow:
    0 0 60px var(--rsp-m-glow, rgba(100,180,255,0.12)),
    0 24px 64px rgba(0,0,0,0.7);
  padding: 28px 28px 24px;
  scrollbar-width: thin;
  scrollbar-color: rgba(255,255,255,0.1) transparent;
}
.rsp-modal-close {
  position: absolute; top: 14px; right: 14px;
  background: rgba(255,255,255,0.06);
  border: 1px solid rgba(255,255,255,0.12);
  color: rgba(255,255,255,0.6); border-radius: 8px;
  width: 30px; height: 30px; cursor: pointer;
  font-size: 14px; display: flex; align-items: center; justify-content: center;
  transition: all .15s;
}
.rsp-modal-close:hover { background: rgba(255,255,255,0.12); color: #fff; }

/* Header */
.rsp-modal-header {
  display: flex; align-items: center; gap: 18px; margin-bottom: 22px;
}
.rsp-modal-sprite-wrap {
  width: 80px; height: 80px;
  display: flex; align-items: center; justify-content: center;
  background: radial-gradient(circle, var(--rsp-m-glow, rgba(100,180,255,0.12)) 0%, transparent 70%);
  border-radius: 16px;
  border: 1px solid rgba(255,255,255,0.07);
  flex-shrink: 0;
  position: relative;
}
.rsp-modal-sprite {
  max-width: 72px; max-height: 72px;
  object-fit: contain; image-rendering: pixelated;
  filter: drop-shadow(0 4px 12px var(--rsp-m-glow, rgba(100,180,255,0.3)));
}
.rsp-modal-info { flex: 1; min-width: 0; }
.rsp-modal-name {
  font-family: var(--font-title, 'Cinzel', serif);
  font-size: 20px; font-weight: 800;
  color: var(--rsp-m-accent, #a8d0ff);
  letter-spacing: 0.5px; margin-bottom: 8px;
}
.rsp-modal-types { display: flex; gap: 6px; flex-wrap: wrap; }
.rsp-modal-type-chip {
  font-size: 10px; font-weight: 700; padding: 3px 9px;
  border-radius: 8px; border: 1px solid; text-transform: uppercase; letter-spacing: 0.5px;
}

/* Section label */
.rsp-modal-section {
  font-size: 11px; font-weight: 700; letter-spacing: 1px;
  text-transform: uppercase; color: rgba(255,255,255,0.35);
  margin: 18px 0 10px;
  display: flex; align-items: center; gap: 6px;
}
.rsp-modal-section::after {
  content: ''; flex: 1; height: 1px;
  background: linear-gradient(90deg, rgba(255,255,255,0.1), transparent);
}

/* Location */
.rsp-modal-location {
  display: flex; align-items: center; gap: 8px;
  padding: 10px 14px; border-radius: 10px;
  background: rgba(255,255,255,0.04);
  border: 1px solid rgba(255,255,255,0.07);
  font-size: 13px; color: rgba(255,255,255,0.75);
  font-family: var(--font-body, sans-serif);
}
.rsp-modal-loc-icon { font-size: 15px; flex-shrink: 0; }

/* ── 3 map slot buttons ── */
.rsp-map-slots { display: flex; flex-direction: column; gap: 8px; }

.rsp-map-slot {
  display: flex; align-items: center; gap: 12px;
  padding: 12px 16px; border-radius: 12px;
  border: 1.5px solid; font-family: var(--font-body, sans-serif);
  transition: all .18s; position: relative; overflow: hidden;
}
/* has map → clickable */
.rsp-map-slot.has-map {
  cursor: pointer;
}
.rsp-map-slot.has-map::before {
  content: ''; position: absolute; inset: 0;
  background: rgba(255,255,255,0.04); opacity: 0; transition: opacity .18s;
}
.rsp-map-slot.has-map:hover::before { opacity: 1; }
.rsp-map-slot.has-map:hover { transform: translateY(-1px); }

/* no map → muted */
.rsp-map-slot.no-map {
  cursor: default; opacity: 0.45;
}

/* color themes */
.rsp-map-slot.comum {
  border-color: rgba(100,180,255,0.30);
  background: rgba(100,180,255,0.05);
  color: #a8d0ff;
}
.rsp-map-slot.has-map.comum:hover {
  border-color: rgba(100,180,255,0.6);
  box-shadow: 0 4px 18px rgba(100,180,255,0.15);
}
.rsp-map-slot.hoenn {
  border-color: rgba(120,255,160,0.28);
  background: rgba(120,255,160,0.05);
  color: #86efac;
}
.rsp-map-slot.has-map.hoenn:hover {
  border-color: rgba(120,255,160,0.6);
  box-shadow: 0 4px 18px rgba(120,255,160,0.15);
}
.rsp-map-slot.wildscape {
  border-color: rgba(255,204,68,0.32);
  background: rgba(255,204,68,0.06);
  color: #ffd166;
}
.rsp-map-slot.has-map.wildscape:hover {
  border-color: rgba(255,204,68,0.65);
  box-shadow: 0 4px 18px rgba(255,204,68,0.18);
}

.rsp-map-slot-icon { font-size: 18px; flex-shrink: 0; }
.rsp-map-slot-body { flex: 1; min-width: 0; }
.rsp-map-slot-label {
  font-size: 12px; font-weight: 700; letter-spacing: 0.4px;
  text-transform: uppercase;
}
.rsp-map-slot-sub { font-size: 11px; opacity: 0.6; margin-top: 2px; }
.rsp-map-slot-arrow { font-size: 14px; opacity: 0.45; flex-shrink: 0; transition: opacity .18s; }
.rsp-map-slot.has-map:hover .rsp-map-slot-arrow { opacity: 1; }
.rsp-modal-nav {
  position: fixed;
  top: 50%;
  transform: translateY(-50%);
  width: 40px; height: 40px;
  border-radius: 50%;
  border: 1px solid rgba(255,255,255,0.2);
  background: rgba(14,19,32,0.85);
  backdrop-filter: blur(8px);
  color: rgba(255,255,255,0.75);
  display: flex; align-items: center; justify-content: center;
  cursor: pointer;
  transition: background 0.18s, border-color 0.18s, color 0.18s, box-shadow 0.18s;
  z-index: 1000;
  box-shadow: 0 2px 16px rgba(0,0,0,0.4);
}
.rsp-modal-nav:hover {
  background: rgba(30,40,70,0.95);
  border-color: var(--rsp-m-accent, rgba(100,180,255,0.5));
  color: #fff;
  box-shadow: 0 0 18px var(--rsp-m-glow, rgba(100,180,255,0.2)), 0 4px 20px rgba(0,0,0,0.5);
}
.rsp-modal-nav--prev { left: calc(50% - min(240px, 46vw) - 56px); }
.rsp-modal-nav--next { right: calc(50% - min(240px, 46vw) - 56px); }
.rsp-modal-counter {
  position: fixed;
  bottom: calc(50% - min(44vh, 340px) - 28px);
  left: 50%;
  transform: translateX(-50%);
  font-family: var(--font-mono, monospace);
  font-size: 11px;
  color: rgba(255,255,255,0.4);
  white-space: nowrap;
  pointer-events: none;
  z-index: 1000;
  letter-spacing: 1px;
}
@media (max-width: 600px) {
  .rsp-modal-nav--prev { left: 8px; }
  .rsp-modal-nav--next { right: 8px; }
}

/* Imgur Map Modal */
#rsp-imgur-map-modal {
  position: fixed; inset: 0; z-index: 99999;
  display: flex; align-items: center; justify-content: center;
}
.rsp-imgmap-backdrop {
  position: absolute; inset: 0;
  background: rgba(0,0,0,0.82);
  backdrop-filter: blur(6px);
  -webkit-backdrop-filter: blur(6px);
}
.rsp-imgmap-panel {
  position: relative; z-index: 1;
  display: flex; flex-direction: column;
  width: min(96vw, 980px);
  max-height: 92vh;
  background: #0f1117;
  border: 1px solid rgba(255,255,255,0.1);
  border-radius: 14px;
  overflow: hidden;
  box-shadow: 0 24px 80px rgba(0,0,0,0.8);
  animation: rspImgMapIn 0.22s cubic-bezier(0.34, 1.3, 0.64, 1) both;
}
@keyframes rspImgMapIn {
  from { opacity: 0; transform: scale(0.94) translateY(10px); }
  to   { opacity: 1; transform: scale(1) translateY(0); }
}
.rsp-imgmap-header {
  display: flex; align-items: center; justify-content: space-between;
  padding: 14px 20px;
  background: rgba(255,255,255,0.04);
  border-bottom: 1px solid rgba(255,255,255,0.08);
  flex-shrink: 0;
}
.rsp-imgmap-title {
  font-size: 13px; font-weight: 700; letter-spacing: 0.08em;
  text-transform: uppercase; color: rgba(255,255,255,0.85);
  font-family: var(--font-body, sans-serif);
}
.rsp-imgmap-close {
  background: rgba(255,255,255,0.08); border: 1px solid rgba(255,255,255,0.12);
  color: rgba(255,255,255,0.6); border-radius: 50%;
  width: 30px; height: 30px; cursor: pointer; font-size: 13px;
  display: flex; align-items: center; justify-content: center;
  transition: all 0.15s; flex-shrink: 0;
}
.rsp-imgmap-close:hover { background: rgba(255,80,80,0.25); color: #fff; border-color: rgba(255,80,80,0.4); }
.rsp-imgmap-body {
  flex: 1; overflow: auto; display: flex;
  align-items: center; justify-content: center;
  background: #080a0e;
  min-height: 200px;
}
.rsp-imgmap-img {
  display: block; max-width: 100%; max-height: calc(92vh - 110px);
  object-fit: contain;
  image-rendering: pixelated;
}
.rsp-imgmap-err {
  padding: 32px; color: rgba(255,255,255,0.4); font-size: 13px;
  text-align: center; font-family: var(--font-body, sans-serif);
}
.rsp-imgmap-err a { color: #f8c; }
.rsp-imgmap-footer {
  flex-shrink: 0;
  padding: 10px 20px;
  background: rgba(255,255,255,0.03);
  border-top: 1px solid rgba(255,255,255,0.07);
  display: flex; justify-content: flex-end;
}
.rsp-imgmap-open-link {
  font-size: 11px; color: rgba(255,255,255,0.35);
  text-decoration: none; letter-spacing: 0.05em;
  font-family: var(--font-body, sans-serif);
  transition: color 0.15s;
}
.rsp-imgmap-open-link:hover { color: rgba(255,255,255,0.7); }
  `;
  document.head.appendChild(s);
})();

// ── renderRespawn ────────────────────────────────────────────────────
function renderRespawn() {
  var container = document.getElementById('respawn-grid');
  if (!container) return;

  var q = ((document.getElementById('respawn-search') || {}).value || '').toLowerCase().trim();
  var filtered = RAW_RESPAWN.filter(function(p) {
    if (!q) return true;
    return p.name.toLowerCase().includes(q) || (p.location && p.location.toLowerCase().includes(q));
  });

  var countEl = document.getElementById('respawn-count-label');
  if (countEl) countEl.textContent = filtered.length + ' Pokémon';

  if (!filtered.length) {
    container.innerHTML = '<div class="wiki-empty-state"><span class="empty-icon">🗺️</span><span class="empty-label">Nenhum Pokémon encontrado.</span></div>';
    return;
  }

  container.innerHTML = filtered.map(function(poke, idx) {
    var types    = getPokemonTypes(poke.name);
    var accent   = getPrimaryTypeColor(types);
    var accentDim = accent + '33';
    var shadowCol = accent + '44';
    var sdName    = toShowdownName(poke.name);
    var staticSrc = 'https://play.pokemonshowdown.com/sprites/dex/' + sdName + '.png';
    var gen5Src   = 'https://play.pokemonshowdown.com/sprites/gen5/' + sdName + '.png';
    var typesHtml = types ? buildTypeBadgesHtml(types) : '';
    var wildDot   = (poke.wildscape && (Array.isArray(poke.wildscape) ? poke.wildscape.length : poke.wildscape)) ? '<span class="rsp-wildscape-dot">Wildscape</span>' : '';

    return '<div class="rsp-card-v2" id="rsp2-card-' + idx + '" '
      + 'style="--rsp-accent:' + accent + ';--rsp-glow-c:' + accentDim + ';--rsp-shadow:' + shadowCol + '" '
      + 'onclick="openRespawnModal(' + idx + ')">'
      + '<div class="rsp-sprite-wrap">'
      +   '<img class="rsp-sprite-static" src="' + staticSrc + '" alt="' + poke.name + '" onerror="this.src=\'' + gen5Src + '\';this.onerror=function(){this.style.opacity=\'0\'}" />'
      + '</div>'
      + '<div class="rsp-card-foot">'
      +   '<span class="rsp-card-name">' + poke.name + '</span>'
      +   (typesHtml ? '<div class="rsp-type-row">' + typesHtml + '</div>' : '')
      +   wildDot
      + '</div>'
      + '</div>';
  }).join('');

  // store filtered list for modal access
  window._rspFiltered = filtered;
}

// ── openRespawnModal ─────────────────────────────────────────────────
var _rspCurrentIdx = 0; // índice atual para navegação com setas

function navigateRespawnModal(dir) {
  var list = window._rspFiltered || RAW_RESPAWN;
  var newIdx = _rspCurrentIdx + dir;
  if (newIdx < 0) newIdx = list.length - 1;
  if (newIdx >= list.length) newIdx = 0;
  openRespawnModal(newIdx);
}

function openRespawnModal(idx) {
  _rspCurrentIdx = idx;
  var list = window._rspFiltered || RAW_RESPAWN;
  var poke = list[idx];
  if (!poke) return;

  var existing = document.getElementById('rsp-poke-modal');
  if (existing) existing.remove();

  var types    = getPokemonTypes(poke.name) || [];
  var accent   = getPrimaryTypeColor(types);
  var glowCol  = accent + '22';
  var _sdName   = toShowdownName(poke.name);
  var animSrc   = 'https://play.pokemonshowdown.com/sprites/ani/'  + _sdName + '.gif';
  var staticSrc = 'https://play.pokemonshowdown.com/sprites/dex/'  + _sdName + '.png';
  var gen5Src   = 'https://play.pokemonshowdown.com/sprites/gen5/' + _sdName + '.png';

  var typeChips = types.map(function(t) {
    var c = TYPE_COLORS[t] || '#aaa';
    return '<span class="rsp-modal-type-chip" style="background:' + c + '22;border-color:' + c + '55;color:' + c + '">' + t.charAt(0).toUpperCase() + t.slice(1) + '</span>';
  }).join('');

  // Build 3-slot map section
  var wildscapeList = poke.wildscape ? (Array.isArray(poke.wildscape) ? poke.wildscape : [poke.wildscape]) : [];

  function _makeSlot(type, icon, label, url, pokeName) {
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

  var mapBtns = '';
  mapBtns += _makeSlot('comum',    '🗺️', 'Mapa Comum',  poke.mapImg || null,         poke.name);
  mapBtns += _makeSlot('hoenn',    '🌿', 'Hoenn',        poke.mapHoenn || null,        poke.name);

  // Wildscape: one slot per entry
  if (wildscapeList.length === 0) {
    mapBtns += _makeSlot('wildscape', '⚡', 'Wildscape', null, poke.name);
  } else {
    wildscapeList.forEach(function(wsUrl, wsIdx) {
      var wsLabel = wildscapeList.length > 1 ? 'Wildscape ' + (wsIdx + 1) : 'Wildscape';
      mapBtns += _makeSlot('wildscape', '⚡', wsLabel, wsUrl, poke.name);
    });
  }

  var modal = document.createElement('div');
  modal.id = 'rsp-poke-modal';
  modal.style.setProperty('--rsp-m-accent', accent);
  modal.style.setProperty('--rsp-m-glow', glowCol);
  var _navList = window._rspFiltered || RAW_RESPAWN;
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
}

function _rspEscHandler(e) {
  if (e.key === 'Escape') closeRespawnModal();
  if (e.key === 'ArrowLeft')  navigateRespawnModal(-1);
  if (e.key === 'ArrowRight') navigateRespawnModal(1);
}

function closeRespawnModal() {
  var m = document.getElementById('rsp-poke-modal');
  if (m) m.remove();
  document.removeEventListener('keydown', _rspEscHandler);
}

// ── openImgurMapModal ────────────────────────────────────────────────
// Converts imgur album/image URLs to direct embeddable image URLs
// and shows them in a fullscreen inline modal (no external redirect)
function openImgurMapModal(url, label, pokeName) {
  var existing = document.getElementById('rsp-imgur-map-modal');
  if (existing) existing.remove();

  // Convert imgur album/page URL to direct image URL
  var directUrl = url;
  var imgurAlbumMatch = url.match(/imgur\.com\/a\/([A-Za-z0-9]+)/);
  var imgurImageMatch = url.match(/imgur\.com\/([A-Za-z0-9]+)(?:\.[a-z]+)?$/);

  if (imgurAlbumMatch) {
    directUrl = 'https://i.imgur.com/' + imgurAlbumMatch[1] + '.jpg';
  } else if (imgurImageMatch) {
    directUrl = 'https://i.imgur.com/' + imgurImageMatch[1] + '.jpg';
  }

  var overlay = document.createElement('div');
  overlay.id = 'rsp-imgur-map-modal';
  overlay.innerHTML =
    '<div class="rsp-imgmap-backdrop" onclick="closeImgurMapModal()"></div>'
    + '<div class="rsp-imgmap-panel">'
    +   '<div class="rsp-imgmap-header">'
    +     '<span class="rsp-imgmap-title">📍 Localização — ' + label + '</span>'
    +     '<button class="rsp-imgmap-close" onclick="closeImgurMapModal()">✕</button>'
    +   '</div>'
    +   '<div class="rsp-imgmap-body">'
    +     '<img class="rsp-imgmap-img" src="' + directUrl + '" alt="Mapa ' + pokeName + '" '
    +       'onerror="this.closest(\'.rsp-imgmap-body\').innerHTML=\'<div class=\\\'rsp-imgmap-err\\\'>⚠️ Não foi possível carregar. <a href=&quot;' + url + '&quot; target=_blank rel=noopener>Abrir no Imgur</a></div>\'" />'
    +   '</div>'
    +   '<div class="rsp-imgmap-footer">'
    +     '<a class="rsp-imgmap-open-link" href="' + url + '" target="_blank" rel="noopener">↗ Abrir no Imgur</a>'
    +   '</div>'
    + '</div>';

  document.body.appendChild(overlay);
  document.addEventListener('keydown', _rspImgMapEscHandler);
}

function _rspImgMapEscHandler(e) {
  if (e.key === 'Escape') closeImgurMapModal();
}

function closeImgurMapModal() {
  var m = document.getElementById('rsp-imgur-map-modal');
  if (m) m.remove();
  document.removeEventListener('keydown', _rspImgMapEscHandler);
}

// ── toggleRespawnRow (kept for compatibility, redirects to modal) ────
function toggleRespawnRow(idx) {
  openRespawnModal(idx);
}

// ── setRespawnView ───────────────────────────────────────────────────
function setRespawnView(mode) {
  var wrap = document.getElementById('respawn-grid');
  if (!wrap) return;
  var parent = wrap.parentElement;
  if (mode === 'list') {
    parent.classList.add('respawn-list-mode');
    document.getElementById('rsp-btn-list').classList.add('active');
    document.getElementById('rsp-btn-grid').classList.remove('active');
  } else {
    parent.classList.remove('respawn-list-mode');
    document.getElementById('rsp-btn-grid').classList.add('active');
    document.getElementById('rsp-btn-list').classList.remove('active');
  }
}