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
    mapImg:    'https://i.imgur.com/0oYC8Jr.png',
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
    mapImg:    'https://i.imgur.com/bDprezr.png',
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
    mapImg:    'https://i.imgur.com/Qd2dEtT.png',
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
    wildscape: 'https://i.imgur.com/0eShDZu.png',
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
    mapImg:    'https://i.imgur.com/nW6q61O.png',
    mapHoenn:  '',
  },

  {
    name:      'Alakazam',
    wildscape: 'https://i.imgur.com/pXzjPu4.png',
    mapImg:    'https://i.imgur.com/dhXxnM0.png',
    mapHoenn:  '',
  },

  {
    name:      'Machop',
    wildscape: null,
    mapImg:    'https://i.imgur.com/dMKstPd.png',
    mapHoenn:  '',
  },

  {
    name:      'Machoke',
    wildscape: null,
    mapImg:    'https://i.imgur.com/dMKstPd.png',
    mapHoenn:  '',
  },

  {
    name:      'Machamp',
    wildscape: 'https://i.imgur.com/Tp2kcuH.png',
    mapImg:    null,
    mapHoenn:  '',
  },

  {
    name:      'Bellsprout',
    wildscape: null,
    mapImg:    'https://i.imgur.com/0DouHFK.png',
    mapHoenn:  '',
  },

  {
    name:      'Weepinbell',
    wildscape: null,
    mapImg:    'https://i.imgur.com/o7HeKpq.png',
    mapHoenn:  '',
  },

  {
    name:      'Victreebel',
    wildscape: null,
    mapImg:    'https://i.imgur.com/NhqqXCK.png',
    mapHoenn:  '',
  },

  {
    name:      'Tentacool',
    wildscape: null,
    mapImg:    'https://i.imgur.com/Q0zcM52.png',
    mapHoenn:  '',
  },

  {
    name:      'Tentacruel',
    wildscape: 'https://i.imgur.com/mBytDNi.png',
    mapImg:    'https://i.imgur.com/mBytDNi.png',
    mapHoenn:  '',
  },

  {
    name:      'Geodude',
    wildscape: null,
    mapImg:    'https://i.imgur.com/d7J89SL.png',
    mapHoenn:  '',
  },

  {
    name:      'Graveler',
    wildscape: null,
    mapImg:    'https://i.imgur.com/BuHXQVL.png',
    mapHoenn:  '',
  },

  {
    name:      'Golem',
    wildscape: 'https://i.imgur.com/OQHyJP2.png',
    mapImg:    'https://i.imgur.com/F5uS2ac.png',
    mapHoenn:  '',
  },

  {
    name:      'Ponyta',
    wildscape: null,
    mapImg:    'https://i.imgur.com/eg9o3F8.png',
    mapHoenn:  '',
  },

  {
    name:      'Rapidash',
    wildscape: 'https://i.imgur.com/b8tAt30.png',
    mapImg:    'https://i.imgur.com/cKOeWbV.png',
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
    mapImg:    'https://i.imgur.com/vyr21yi.png',
    mapHoenn:  '',
  },

  {
    name:      'Magneton',
    wildscape: 'https://i.imgur.com/XqMmegQ.png',
    mapImg:    'https://i.imgur.com/vyr21yi.png',
    mapHoenn:  '',
  },

  {
    name:      "Farfetch'd",
    wildscape: 'https://i.imgur.com/L0NNeJj.png',
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
    wildscape: 'https://i.imgur.com/L0NNeJj.png',
    mapImg:    null,
    mapHoenn:  '',
  },

  {
    name:      'Seel',
    wildscape: null,
    mapImg:    'https://i.imgur.com/MLvJxQN.png',
    mapHoenn:  '',
  },

  {
    name:      'Dewgong',
    wildscape: 'https://i.imgur.com/0Zn8s3E.png',
    mapImg:    'https://i.imgur.com/p2tQP91.png',
    mapHoenn:  '',
  },

  {
    name:      'Grimer',
    wildscape: null,
    mapImg:    'https://i.imgur.com/wOs40j2.png',
    mapHoenn:  '',
  },

  {
    name:      'Muk',
    wildscape: 'https://i.imgur.com/wOs40j2.png',
    mapImg:    'https://i.imgur.com/wOs40j2.png',
    mapHoenn:  '',
  },

  {
    name:      'Shellder',
    wildscape: null,
    mapImg:    'https://i.imgur.com/WFjDQHR.png',
    mapHoenn:  '',
  },

  {
    name:      'Cloyster',
    wildscape: 'https://i.imgur.com/rzgfzKL.png',
    mapImg:    null,
    mapHoenn:  '',
  },

  {
    name:      'Gastly',
    wildscape: null,
    mapImg:    'https://i.imgur.com/B2gFc5E.png',
    mapHoenn:  '',
  },

  {
    name:      'Haunter',
    wildscape: null,
    mapImg:    'https://i.imgur.com/ZkvFQZe.png',
    mapHoenn:  '',
  },

  {
    name:      'Gengar',
    wildscape: 'https://i.imgur.com/obXJAfs.png',
    mapImg:    null,
    mapHoenn:  '',
  },

  {
    name:      'Onix',
    wildscape: null,
    mapImg:    'https://i.imgur.com/clgFi2C.png',
    mapHoenn:  '',
  },

  {
    name:      'Drowzee',
    wildscape: null,
    mapImg:    'https://i.imgur.com/XO8i9Kd.png',
    mapHoenn:  '',
  },

  {
    name:      'Hypno',
    wildscape: null,
    mapImg:    'https://i.imgur.com/Lz6oguU.png',
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
    mapImg:    'https://i.imgur.com/vS19eOr.png',
    mapHoenn:  '',
  },

  {
    name:      'Voltorb',
    wildscape: null,
    mapImg:    'https://i.imgur.com/vyr21yi.png',
    mapHoenn:  '',
  },

  {
    name:      'Electrode',
    wildscape: null,
    mapImg:    'https://i.imgur.com/vyr21yi.png',
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
    wildscape: 'https://i.imgur.com/3aNWaoz.png',
    mapImg:    'https://i.imgur.com/ovwwGKJ.png',
    mapHoenn:  '',
  },

  {
    name:      'Cubone',
    wildscape: null,
    mapImg:    'https://i.imgur.com/n7PwjRM.png',
    mapHoenn:  '',
  },

  {
    name:      'Marowak',
    wildscape: 'https://i.imgur.com/EK9em4B.png',
    mapImg:    'https://i.imgur.com/kkiwcad.png',
    mapHoenn:  '',
  },

  {
    name:      'Hitmonlee',
    wildscape: 'https://i.imgur.com/jVO5Fcj.png',
    mapImg:    null,
    mapHoenn:  '',
  },

  {
    name:      'Hitmonchan',
    wildscape: 'https://i.imgur.com/jVO5Fcj.png',
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
    mapImg:    'https://i.imgur.com/wOs40j2.png',
    mapHoenn:  '',
  },

  {
    name:      'Weezing',
    wildscape: null,
    mapImg:    'https://i.imgur.com/wOs40j2.png',
    mapHoenn:  '',
  },

  {
    name:      'Rhyhorn',
    wildscape: null,
    mapImg:    'https://i.imgur.com/khcnkF5.png',
    mapHoenn:  '',
  },

  {
    name:      'Rhydon',
    wildscape: 'https://i.imgur.com/vZ7uFtK.png',
    mapImg:    'https://i.imgur.com/d0PFQsH.png',
    mapHoenn:  '',
  },

  {
    name:      'Chansey',
    wildscape: null,
    mapImg:    'https://i.imgur.com/UGGHUHa.png',
    mapHoenn:  '',
  },

  {
    name:      'Tangela',
    wildscape: 'https://i.imgur.com/RpWGRiq.png',
    mapImg:    'https://i.imgur.com/RpWGRiq.png',
    mapHoenn:  '',
  },

  {
    name:      'Kangaskhan',
    wildscape: 'https://i.imgur.com/ivmx2oc.png',
    mapImg:    null,
    mapHoenn:  '',
  },

  {
    name:      'Horsea',
    wildscape: null,
    mapImg:    'https://i.imgur.com/5jS8tVT.png',
    mapHoenn:  '',
  },

  {
    name:      'Seadra',
    wildscape: null,
    mapImg:    'https://i.imgur.com/vm3Kv73.png',
    mapHoenn:  '',
  },

  {
    name:      'Goldeen',
    wildscape: null,
    mapImg:    'https://i.imgur.com/aGqCNVb.png',
    mapHoenn:  '',
  },

  {
    name:      'Seaking',
    wildscape: null,
    mapImg:    'https://i.imgur.com/8hxAB6u.png',
    mapHoenn:  '',
  },

  {
    name:      'Staryu',
    wildscape: null,
    mapImg:    'https://i.imgur.com/ZjaWkCr.png',
    mapHoenn:  '',
  },

  {
    name:      'Starmie',
    wildscape: 'https://i.imgur.com/yaFtIlN.png',
    mapImg:    'https://i.imgur.com/iXYN4rD.png',
    mapHoenn:  '',
  },

  {
    name:      'Mr. Mime',
    wildscape: 'https://i.imgur.com/mttircQ.png',
    mapImg:    'https://i.imgur.com/BL7EibG.png',
    mapHoenn:  '',
  },

  {
    name:      'Scyther',
    wildscape: 'https://i.imgur.com/zeOrYWE.png',
    mapImg:    'https://i.imgur.com/ivmx2oc.png',
    mapHoenn:  '',
  },

  {
    name:      'Jynx',
    wildscape: 'https://i.imgur.com/aap8VSg.png',
    mapImg:    null,
    mapHoenn:  '',
  },

  {
    name:      'Electabuzz',
    wildscape: 'https://i.imgur.com/wEe4dQB.png',
    mapImg:    'https://i.imgur.com/MdNjruZ.png',
    mapHoenn:  '',
  },

  {
    name:      'Magmar',
    wildscape: 'https://i.imgur.com/ouLwhKY.png',
    mapImg:    null,
    mapHoenn:  '',
  },

  {
    name:      'Pinsir',
    wildscape: 'https://i.imgur.com/Jz3Bj6k.png',
    mapImg:    'https://i.imgur.com/Dqjxjap.png',
    mapHoenn:  '',
  },

  {
    name:      'Tauros',
    wildscape: 'https://i.imgur.com/ivmx2oc.png',
    mapImg:    null,
    mapHoenn:  '',
  },

  {
    name:      'Magikarp',
    wildscape: null,
    mapImg:    'https://i.imgur.com/G7bRTjg.png',
    mapHoenn:  '',
  },

  {
    name:      'Gyarados',
    wildscape: 'https://i.imgur.com/M6cch0Y.png',
    mapImg:    null,
    mapHoenn:  '',
  },

  {
    name:      'Lapras',
    wildscape: 'https://i.imgur.com/AeHR1Nl.png',
    mapImg:    'https://i.imgur.com/7BYwaGX.png',
    mapHoenn:  '',
  },

  {
    name:      'Eevee',
    wildscape: null,
    mapImg:    'https://i.imgur.com/Zf1EeWW.png',
    mapHoenn:  '',
  },

  {
    name:      'Vaporeon',
    wildscape: 'https://i.imgur.com/xywmHa6.png',
    mapImg:    'https://i.imgur.com/Xnapd54.png',
    mapHoenn:  '',
  },

  {
    name:      'Jolteon',
    wildscape: 'https://i.imgur.com/wEe4dQB.png',
    mapImg:    null,
    mapHoenn:  '',
  },

  {
    name:      'Flareon',
    wildscape: 'https://i.imgur.com/YKL0vpX.png',
    mapImg:    null,
    mapHoenn:  '',
  },

  {
    name:      'Omanyte',
    wildscape: null,
    mapImg:    'https://i.imgur.com/aGkUqoK.png',
    mapHoenn:  '',
  },

  {
    name:      'Omastar',
    wildscape: null,
    mapImg:    'https://i.imgur.com/aGkUqoK.png',
    mapHoenn:  '',
  },

  {
    name:      'Kabuto',
    wildscape: null,
    mapImg:    'https://i.imgur.com/wwSSmEa.png',
    mapHoenn:  '',
  },

  {
    name:      'Kabutops',
    wildscape: null,
    mapImg:    'https://i.imgur.com/wwSSmEa.png',
    mapHoenn:  '',
  },

  {
    name:      'Snorlax',
    wildscape: 'https://i.imgur.com/ivmx2oc.png',
    mapImg:    'https://i.imgur.com/gjQunKT.png',
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
    wildscape: 'https://i.imgur.com/tObEnoL.png',
    mapImg:    null,
    mapHoenn:  '',
  },

  {
    name:      'Dragonite',
    wildscape: 'https://i.imgur.com/csaMdf2.png',
    mapImg:    'https://i.imgur.com/gOdWXko.png',
    mapHoenn:  '',
  },

  // ── Gen 2 ────────────────────────────────────────────────────────
  {
    name:      'Chikorita',
    wildscape: null,
    mapImg:    'https://i.imgur.com/iuwcuId.png',
    mapHoenn:  '',
  },

  {
    name:      'Bayleef',
    wildscape: null,
    mapImg:    'https://i.imgur.com/HHi0hT2.png',
    mapHoenn:  '',
  },

  {
    name:      'Meganium',
    wildscape: 'https://i.imgur.com/uw0XICj.png',
    mapImg:    'https://i.imgur.com/WFhAGzs.png',
    mapHoenn:  '',
  },

  {
    name:      'Cyndaquil',
    wildscape: null,
    mapImg:    'https://i.imgur.com/AOoSnb6.png',
    mapHoenn:  '',
  },

  {
    name:      'Quilava',
    wildscape: null,
    mapImg:    'https://i.imgur.com/AOoSnb6.png',
    mapHoenn:  '',
  },

  {
    name:      'Typhlosion',
    wildscape: 'https://i.imgur.com/hwCX4J3.png',
    mapImg:    'https://i.imgur.com/eFH75Ja.png',
    mapHoenn:  '',
  },

  {
    name:      'Totodile',
    wildscape: null,
    mapImg:    'https://i.imgur.com/mTQHdKK.png',
    mapHoenn:  '',
  },

  {
    name:      'Croconaw',
    wildscape: null,
    mapImg:    'https://i.imgur.com/73RxJdU.png',
    mapHoenn:  '',
  },

  {
    name:      'Feraligatr',
    wildscape: 'https://i.imgur.com/Jvj4TIY.png',
    mapImg:    'https://i.imgur.com/F6uKKMA.png',
    mapHoenn:  '',
  },

  {
    name:      'Sentret',
    wildscape: null,
    mapImg:    'https://i.imgur.com/t7G6WDZ.png',
    mapHoenn:  '',
  },

  {
    name:      'Furret',
    wildscape: null,
    mapImg:    'https://i.imgur.com/r89BniA.png',
    mapHoenn:  '',
  },

  {
    name:      'Hoothoot',
    wildscape: null,
    mapImg:    'https://i.imgur.com/bMz6dmJ.png',
    mapHoenn:  '',
  },

  {
    name:      'Noctowl',
    wildscape: null,
    mapImg:    'https://i.imgur.com/uwoWVeP.png',
    mapHoenn:  '',
  },

  {
    name:      'Ledyba',
    wildscape: null,
    mapImg:    'https://i.imgur.com/cDl7Cvf.png',
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
    wildscape: 'https://i.imgur.com/2ElPBYJ.png',
    mapImg:    'https://i.imgur.com/Xo5gTVy.png',
    mapHoenn:  '',
  },

  {
    name:      'Chinchou',
    wildscape: null,
    mapImg:    'https://i.imgur.com/MGSGZ5d.png',
    mapHoenn:  '',
  },

  {
    name:      'Lanturn',
    wildscape: null,
    mapImg:    'https://i.imgur.com/MGSGZ5d.png',
    mapHoenn:  '',
  },

  {
    name:      'Pichu',
    wildscape: null,
    mapImg:    'https://i.imgur.com/81CA5KY.png',
    mapHoenn:  '',
  },

  {
    name:      'Cleffa',
    wildscape: null,
    mapImg:    'https://i.imgur.com/Lj1SHOz.png',
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
    mapImg:    'https://i.imgur.com/ESKTXNf.png',
    mapHoenn:  '',
  },

  {
    name:      'Togetic',
    wildscape: null,
    mapImg:    'https://i.imgur.com/ESKTXNf.png',
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
    wildscape: 'https://i.imgur.com/C5eGLMe.png',
    mapImg:    'https://i.imgur.com/Jj8zXLS.png',
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
    wildscape: 'https://i.imgur.com/XaDTsZ8.png',
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
    mapImg:    'https://i.imgur.com/cAHnnnb.png',
    mapHoenn:  '',
  },

  {
    name:      'Azumarill',
    wildscape: null,
    mapImg:    'https://i.imgur.com/cAHnnnb.png',
    mapHoenn:  '',
  },

  {
    name:      'Politoed',
    wildscape: 'https://i.imgur.com/eJqljOO.png',
    mapImg:    'https://i.imgur.com/eJqljOO.png',
    mapHoenn:  '',
  },

  {
    name:      'Hoppip',
    wildscape: null,
    mapImg:    'https://i.imgur.com/kIsfd8T.png',
    mapHoenn:  '',
  },

  {
    name:      'Skiploom',
    wildscape: null,
    mapImg:    'https://i.imgur.com/e7VcznJ.png',
    mapHoenn:  '',
  },

  {
    name:      'Jumpluff',
    wildscape: null,
    mapImg:    'https://i.imgur.com/xSAOnVQ.png',
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
    mapImg:    'https://i.imgur.com/PA5SXXc.png',
    mapHoenn:  '',
  },

  {
    name:      'Yanma',
    wildscape: null,
    mapImg:    'https://i.imgur.com/HEvkYCC.png',
    mapHoenn:  '',
  },

  {
    name:      'Wooper',
    wildscape: null,
    mapImg:    'https://i.imgur.com/8Gey3ne.png',
    mapHoenn:  '',
  },

  {
    name:      'Quagsire',
    wildscape: null,
    mapImg:    'https://i.imgur.com/HZ9ZB0w.png',
    mapHoenn:  '',
  },

  {
    name:      'Espeon',
    wildscape: 'https://i.imgur.com/pgsglgg.png',
    mapImg:    null,
    mapHoenn:  '',
  },

  {
    name:      'Umbreon',
    wildscape: 'https://i.imgur.com/pgsglgg.png',
    mapImg:    null,
    mapHoenn:  '',
  },

  {
    name:      'Murkrow',
    wildscape: null,
    mapImg:    'https://i.imgur.com/JLf8mg8.png',
    mapHoenn:  '',
  },

  {
    name:      'Slowking',
    wildscape: 'https://i.imgur.com/zHZ8GUe.png',
    mapImg:    'https://i.imgur.com/zHZ8GUe.png',
    mapHoenn:  '',
  },

  {
    name:      'Misdreavus',
    wildscape: 'https://i.imgur.com/IGTob4U.png',
    mapImg:    null,
    mapHoenn:  '',
  },

  {
    name:      'Wobbuffet',
    wildscape: 'https://i.imgur.com/I0Wt5oQ.png',
    mapImg:    'https://i.imgur.com/GD7sOKS.png',
    mapHoenn:  '',
  },

  {
    name:      'Girafarig',
    wildscape: 'https://i.imgur.com/mkHmYXV.png',
    mapImg:    'https://i.imgur.com/I0Wt5oQ.png',
    mapHoenn:  '',
  },

  {
    name:      'Pineco',
    wildscape: null,
    mapImg:    'https://i.imgur.com/38NZiWE.png',
    mapHoenn:  '',
  },

  {
    name:      'Forretress',
    wildscape: null,
    mapImg:    'https://i.imgur.com/OcKEkkM.png',
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
    mapImg:    'https://i.imgur.com/dP43RNR.png',
    mapHoenn:  '',
  },

  {
    name:      'Steelix',
    wildscape: 'https://i.imgur.com/Ee5Lb2y.png',
    mapImg:    'https://i.imgur.com/p4iHuHU.png',
    mapHoenn:  '',
  },

  {
    name:      'Snubbull',
    wildscape: null,
    mapImg:    'https://i.imgur.com/6TD4mNV.png',
    mapHoenn:  '',
  },

  {
    name:      'Granbull',
    wildscape: 'https://i.imgur.com/oHFrtwC.png',
    mapImg:    'https://i.imgur.com/khRyNou.png',
    mapHoenn:  '',
  },

  {
    name:      'Qwilfish',
    wildscape: null,
    mapImg:    'https://i.imgur.com/hwNYiN1.png',
    mapHoenn:  '',
  },

  {
    name:      'Scizor',
    wildscape: 'https://i.imgur.com/meJjnkr.png',
    mapImg:    null,
    mapHoenn:  '',
  },

  {
    name:      'Shuckle',
    wildscape: null,
    mapImg:    'https://i.imgur.com/Ibo04IR.png',
    mapHoenn:  '',
  },

  {
    name:      'Heracross',
    wildscape: 'https://i.imgur.com/jKsB4LP.png',
    mapImg:    'https://i.imgur.com/un3iPRj.png',
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
    mapImg:    'https://i.imgur.com/MjMDatf.png',
    mapHoenn:  '',
  },

  {
    name:      'Ursaring',
    wildscape: 'https://i.imgur.com/c4gKvRj.png',
    mapImg:    'https://i.imgur.com/MjMDatf.png',
    mapHoenn:  '',
  },

  {
    name:      'Slugma',
    wildscape: null,
    mapImg:    'https://i.imgur.com/AOoSnb6.png',
    mapHoenn:  '',
  },

  {
    name:      'Magcargo',
    wildscape: 'https://i.imgur.com/AOoSnb6.png',
    mapImg:    'https://i.imgur.com/cWP6egL.png',
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
    wildscape: 'https://i.imgur.com/BQASEdf.png',
    mapImg:    'https://i.imgur.com/EkokGJZ.png',
    mapHoenn:  '',
  },

  {
    name:      'Corsola',
    wildscape: null,
    mapImg:    'https://i.imgur.com/vm3Kv73.png',
    mapHoenn:  '',
  },

  {
    name:      'Remoraid',
    wildscape: null,
    mapImg:    'https://i.imgur.com/vm3Kv73.png',
    mapHoenn:  '',
  },

  {
    name:      'Octillery',
    wildscape: null,
    mapImg:    'https://i.imgur.com/vm3Kv73.png',
    mapHoenn:  '',
  },

  {
    name:      'Delibird',
    wildscape: null,
    mapImg:    'https://i.imgur.com/XVa09vd.png',
    mapHoenn:  '',
  },

  {
    name:      'Mantine',
    wildscape: 'https://i.imgur.com/Jvj4TIY.png',
    mapImg:    'https://i.imgur.com/vm3Kv73.png',
    mapHoenn:  '',
  },

  {
    name:      'Skarmory',
    wildscape: 'https://i.imgur.com/GJgmkkd.png',
    mapImg:    null,
    mapHoenn:  '',
  },

  {
    name:      'Houndour',
    wildscape: null,
    mapImg:    'https://i.imgur.com/AOoSnb6.png',
    mapHoenn:  '',
  },

  {
    name:      'Houndoom',
    wildscape: 'https://i.imgur.com/NTdNuy6.png',
    mapImg:    'https://i.imgur.com/fZbDUwS.png',
    mapHoenn:  '',
  },

  {
    name:      'Kingdra',
    wildscape: 'https://i.imgur.com/6N5T37g.png',
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
    wildscape: 'https://i.imgur.com/qY9Yhel.png',
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
    wildscape: 'https://i.imgur.com/iArrZwp.png',
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
    mapImg:    'https://i.imgur.com/uSVIRVa.png',
    mapHoenn:  '',
  },

  {
    name:      'Miltank',
    wildscape: 'https://i.imgur.com/N7V1d88.png',
    mapImg:    'https://i.imgur.com/bMz6dmJ.png',
    mapHoenn:  '',
  },

  {
    name:      'Larvitar',
    wildscape: null,
    mapImg:    'https://i.imgur.com/zHkamMt.png',
    mapHoenn:  '',
  },

  {
    name:      'Pupitar',
    wildscape: 'https://i.imgur.com/zHkamMt.png',
    mapImg:    'https://i.imgur.com/zHkamMt.png',
    mapHoenn:  '',
  },

  {
    name:      'Tyranitar',
    wildscape: 'https://i.imgur.com/kb4agTa.png',
    mapImg:    null,
    mapHoenn:  '',
  },

  // ── Gen 3 ────────────────────────────────────────────────────────
  {
    name:      'Treecko',
    wildscape: null,
    mapImg:    'https://i.imgur.com/geaMP9l.png',
    mapHoenn:  '',
  },

  {
    name:      'Grovyle',
    wildscape: null,
    mapImg:    'https://i.imgur.com/7qVakrt.png',
    mapHoenn:  '',
  },

  {
    name:      'Sceptile',
    wildscape: null,
    mapImg:    'https://i.imgur.com/p3IXfpY.png',
    mapHoenn:  '',
  },

  {
    name:      'Torchic',
    wildscape: null,
    mapImg:    '',
    mapHoenn:  'https://i.imgur.com/Z2DVwYg.png',
  },

  {
    name:      'Combusken',
    wildscape: null,
    mapImg:    'https://i.imgur.com/HUFFwuT.png',
    mapHoenn:  '',
  },

  {
    name:      'Blaziken',
    wildscape: null,
    mapImg:    '',
    mapHoenn:  'https://i.imgur.com/9eIn8Qe.png',
  },

  {
    name:      'Mudkip',
    wildscape: null,
    mapImg:    'https://i.imgur.com/Cy9H5OO.png',
    mapHoenn:  '',
  },

  {
    name:      'Marshtomp',
    wildscape: null,
    mapImg:    '',
    mapHoenn:  'https://i.imgur.com/TOaxmO1.png',
  },

  {
    name:      'Swampert',
    wildscape: null,
    mapImg:    'https://i.imgur.com/CBpWuUW.png',
    mapHoenn:  '',
  },

  {
    name:      'Poochyena',
    wildscape: null,
    mapImg:    'https://i.imgur.com/pXHETK3.png',
    mapHoenn:  '',
  },

  {
    name:      'Mightyena',
    wildscape: null,
    mapImg:    '',
    mapHoenn:  'https://i.imgur.com/iyd1uOE.png',
  },

  {
    name:      'Zigzagoon',
    wildscape: null,
    mapImg:    'https://i.imgur.com/NSW8JGZ.png',
    mapHoenn:  '',
  },

  {
    name:      'Linoone',
    wildscape: null,
    mapImg:    'https://i.imgur.com/tLrKwKB.png',
    mapHoenn:  '',
  },

  {
    name:      'Wurmple',
    wildscape: null,
    mapImg:    'https://i.imgur.com/YQrHrNK.png',
    mapHoenn:  '',
  },

  {
    name:      'Silcoon',
    wildscape: null,
    mapImg:    'https://i.imgur.com/YQrHrNK.png',
    mapHoenn:  '',
  },

  {
    name:      'Beautifly',
    wildscape: null,
    mapImg:    'https://i.imgur.com/oBLAdb8.png',
    mapHoenn:  '',
  },

  {
    name:      'Cascoon',
    wildscape: null,
    mapImg:    'https://i.imgur.com/YQrHrNK.png',
    mapHoenn:  '',
  },

  {
    name:      'Dustox',
    wildscape: null,
    mapImg:    'https://i.imgur.com/UMIAme7.png',
    mapHoenn:  '',
  },

  {
    name:      'Taillow',
    wildscape: null,
    mapImg:    'https://i.imgur.com/01ygEvQ.png',
    mapHoenn:  '',
  },

  {
    name:      'Swellow',
    wildscape: null,
    mapImg:    'https://i.imgur.com/GuWPn4b.png',
    mapHoenn:  '',
  },

  {
    name:      'Ralts',
    wildscape: null,
    mapImg:    'https://i.imgur.com/gmyZ7FI.png',
    mapHoenn:  '',
  },

  {
    name:      'Kirlia',
    wildscape: null,
    mapImg:    'https://i.imgur.com/GoD2Dn8.png',
    mapHoenn:  '',
  },

  {
    name:      'Gardevoir',
    wildscape: null,
    mapImg:    'https://i.imgur.com/GoD2Dn8.png',
    mapHoenn:  '',
  },

  {
    name:      'Masquerain',
    wildscape: null,
    mapImg:    'https://i.imgur.com/EwJOuvM.png',
    mapHoenn:  '',
  },

  {
    name:      'Breloom',
    wildscape: null,
    mapImg:    '',
    mapHoenn:  'https://i.imgur.com/2FOgNWP.png',
  },

  {
    name:      'Slakoth',
    wildscape: null,
    mapImg:    'https://i.imgur.com/dki7ItY.png',
    mapHoenn:  '',
  },

  {
    name:      'Vigoroth',
    wildscape: null,
    mapImg:    'https://i.imgur.com/BkzqdKe.png',
    mapHoenn:  '',
  },

  {
    name:      'Slaking',
    wildscape: null,
    mapImg:    'https://i.imgur.com/TCOZaM0.png',
    mapHoenn:  '',
  },

  {
    name:      'Nincada',
    wildscape: null,
    mapImg:    'https://i.imgur.com/0V3Mjn4.png',
    mapHoenn:  '',
  },

  {
    name:      'Ninjask',
    wildscape: null,
    mapImg:    'https://i.imgur.com/nYiUAXB.png',
    mapHoenn:  '',
  },

  {
    name:      'Shedinja',
    wildscape: null,
    mapImg:    'https://i.imgur.com/XWOLNpg.png',
    mapHoenn:  '',
  },

  {
    name:      'Whismur',
    wildscape: null,
    mapImg:    'https://i.imgur.com/UcLNrbf.png',
    mapHoenn:  '',
  },

  {
    name:      'Loudred',
    wildscape: null,
    mapImg:    'https://i.imgur.com/xwRs7yH.png',
    mapHoenn:  '',
  },

  {
    name:      'Exploud',
    wildscape: null,
    mapImg:    'https://i.imgur.com/de1SA8u.png',
    mapHoenn:  '',
  },

  {
    name:      'Makuhita',
    wildscape: null,
    mapImg:    'https://i.imgur.com/EluIUgv.png',
    mapHoenn:  '',
  },

  {
    name:      'Hariyama',
    wildscape: null,
    mapImg:    'https://i.imgur.com/NWOf0iE.png',
    mapHoenn:  'https://i.imgur.com/NWOf0iE.png',
  },

  {
    name:      'Azurill',
    wildscape: null,
    mapImg:    'https://i.imgur.com/mLd9R8b.png',
    mapHoenn:  '',
  },

  {
    name:      'Nosepass',
    wildscape: null,
    mapImg:    'https://i.imgur.com/u4yhhIu.png',
    mapHoenn:  '',
  },

  {
    name:      'Skitty',
    wildscape: null,
    mapImg:    'https://i.imgur.com/oAjRY55.png',
    mapHoenn:  '',
  },

  {
    name:      'Delcatty',
    wildscape: null,
    mapImg:    'https://i.imgur.com/pesG6Oh.png',
    mapHoenn:  '',
  },

  {
    name:      'Sableye',
    wildscape: null,
    mapImg:    'https://i.imgur.com/p552AIe.png',
    mapHoenn:  '',
  },

  {
    name:      'Mawile',
    wildscape: null,
    mapImg:    '',
    mapHoenn:  'https://i.imgur.com/U4MtfAz.png',
  },

  {
    name:      'Aron',
    wildscape: null,
    mapImg:    'https://i.imgur.com/uoAOQYn.png',
    mapHoenn:  '',
  },

  {
    name:      'Lairon',
    wildscape: null,
    mapImg:    '',
    mapHoenn:  'https://i.imgur.com/EeUjp3S.png',
  },

  {
    name:      'Aggron',
    wildscape: null,
    mapImg:    'https://i.imgur.com/7Ktyeq8.png',
    mapHoenn:  '',
  },

  {
    name:      'Meditite',
    wildscape: null,
    mapImg:    'https://i.imgur.com/pgewtm3.png',
    mapHoenn:  '',
  },

  {
    name:      'Medicham',
    wildscape: null,
    mapImg:    'https://i.imgur.com/pgewtm3.png',
    mapHoenn:  '',
  },

  {
    name:      'Volbeat',
    wildscape: null,
    mapImg:    'https://i.imgur.com/Ouvdk3I.png',
    mapHoenn:  '',
  },

  {
    name:      'Illumise',
    wildscape: null,
    mapImg:    'https://i.imgur.com/Ouvdk3I.png',
    mapHoenn:  '',
  },

  {
    name:      'Carvanha',
    wildscape: null,
    mapImg:    'https://i.imgur.com/qbBndEP.png',
    mapHoenn:  '',
  },

  {
    name:      'Numel',
    wildscape: null,
    mapImg:    'https://i.imgur.com/QyucArI.png',
    mapHoenn:  '',
  },

  {
    name:      'Camerupt',
    wildscape: null,
    mapImg:    'https://i.imgur.com/W8kixQ8.png',
    mapHoenn:  '',
  },

  {
    name:      'Torkoal',
    wildscape: null,
    mapImg:    'https://i.imgur.com/Ee2vNS4.png',
    mapHoenn:  '',
  },

  {
    name:      'Spoink',
    wildscape: null,
    mapImg:    'https://i.imgur.com/qpSTaqI.png',
    mapHoenn:  '',
  },

  {
    name:      'Grumpig',
    wildscape: null,
    mapImg:    'https://i.imgur.com/x5guSN4.png',
    mapHoenn:  '',
  },

  {
    name:      'Trapinch',
    wildscape: null,
    mapImg:    'https://i.imgur.com/QwciAQ4.png',
    mapHoenn:  '',
  },

  {
    name:      'Seviper',
    wildscape: null,
    mapImg:    'https://i.imgur.com/r6dKYKz.png',
    mapHoenn:  '',
  },

  {
    name:      'Altaria',
    wildscape: null,
    mapImg:    'https://i.imgur.com/i7qrQJW.png',
    mapHoenn:  '',
  },

  {
    name:      'Glalie',
    wildscape: null,
    mapImg:    '',
    mapHoenn:  'https://i.imgur.com/sHFcZtn.png',
  },

  // ── Wildscape Especiais ───────────────────────────────────────────
  {
    name:      'Florges',
    wildscape: 'https://i.imgur.com/lbX6o36.png',
    mapImg:    null,
    mapHoenn:  '',
  },

  {
    name:      'Mimikyu',
    wildscape: 'https://i.imgur.com/FnFMpgS.png',
    mapImg:    null,
    mapHoenn:  '',
  },

  {
    name:      'Toxicroak',
    wildscape: 'https://i.imgur.com/9ESpquJ.png',
    mapImg:    null,
    mapHoenn:  '',
  },

  {
    name:      'Torterra',
    wildscape: 'https://i.imgur.com/2XsXmXT.png',
    mapImg:    null,
    mapHoenn:  '',
  },

  {
    name:      'Luxray',
    wildscape: 'https://i.imgur.com/RHrMVwH.png',
    mapImg:    null,
    mapHoenn:  '',
  },

  {
    name:      'Tangrowth',
    wildscape: 'https://i.imgur.com/o3AeTyV.png',
    mapImg:    null,
    mapHoenn:  '',
  },

  {
    name:      'Dusknoir',
    wildscape: 'https://i.imgur.com/dT75F62.png',
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
