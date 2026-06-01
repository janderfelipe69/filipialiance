/* ================================================================
   wiki-linked-tasks.js — Linked Tasks (hunts sequenciais)
   Aba SEPARADA da Wiki. Cada task libera a proxima ao ser concluida
   (Ctrl+L no jogo). Inclui guia de COMBOS: Pokemon que aparecem em
   mais de uma task — hunte 1, progride varias.
   GERADO a partir da aba "Linked Tasks" da planilha oficial.
   Carregue APOS wiki-nav.js. Registrado em wiki-modules-ext.js (id: linkedtasks).
================================================================ */
(function (global) {
  'use strict';

  var NOTE = "Pra ver as tasks, aperta Ctrl+L no jogo. Completando uma task, libera a próxima.";

  var LINKED = [
  { qty:30, name:"Rattata", type:"Normal", hunt:"https://imgur.com/a/ZyszZOZ", kph:"" },
  { qty:30, name:"Oddish", type:"Normal", hunt:"https://imgur.com/a/2SuUURl", kph:"" },
  { qty:30, name:"Geodude", type:"Normal", hunt:"https://imgur.com/a/IhJ17iJ", kph:"" },
  { qty:60, name:"Mankey", type:"Normal", hunt:"https://imgur.com/a/4E7gOtq", kph:"" },
  { qty:60, name:"Rhyhorn", type:"Normal", hunt:"https://imgur.com/a/cPbYaoO", kph:"" },
  { qty:60, name:"Gloom", type:"Normal", hunt:"https://imgur.com/a/TaH2l6m", kph:"" },
  { qty:100, name:"Graveler", type:"Normal", hunt:"https://imgur.com/a/SHzJxH4", kph:"" },
  { qty:100, name:"Golbat", type:"Normal", hunt:"https://imgur.com/a/uvfPxaO", kph:"" },
  { qty:250, name:"Tangela", type:"Normal", hunt:"https://imgur.com/a/IZyOqys", kph:"" },
  { qty:250, name:"Marowak", type:"Normal", hunt:"https://imgur.com/a/VrqZwDG", kph:"" },
  { qty:250, name:"Electrode", type:"Normal", hunt:"https://imgur.com/a/ZNQjOvj", kph:"" },
  { qty:400, name:"Magneton", type:"Normal", hunt:"https://imgur.com/a/ZNQjOvj", kph:"" },
  { qty:500, name:"Fearow", type:"Normal", hunt:"https://imgur.com/a/NVXqWOp", kph:"" },
  { qty:800, name:"Venusaur", type:"Normal", hunt:"https://imgur.com/a/zRcrSLP", kph:"" },
  { qty:800, name:"Blastoise", type:"Normal", hunt:"https://imgur.com/a/o6O5mnt", kph:"" },
  { qty:800, name:"Charizard", type:"Normal", hunt:"https://imgur.com/a/ksXMwHN", kph:"" },
  { qty:10000, name:"Ampharos", type:"Wild", hunt:"https://imgur.com/a/O7GKc00", kph:"" },
  { qty:10000, name:"Blastoise", type:"Wild", hunt:"https://imgur.com/a/H98mIzg", kph:"" },
  { qty:10000, name:"Charizard", type:"Wild", hunt:"https://imgur.com/a/thSWZiw", kph:"" },
  { qty:10000, name:"Dodrio", type:"Wild", hunt:"https://imgur.com/a/mZdWvFw", kph:"" },
  { qty:10000, name:"Espeon", type:"Wild", hunt:"https://imgur.com/a/CkBSqXN", kph:"" },
  { qty:10000, name:"Farfetch'd", type:"Wild", hunt:"https://imgur.com/a/mZdWvFw", kph:"" },
  { qty:10000, name:"Feraligatr", type:"Wild", hunt:"https://imgur.com/a/H98mIzg", kph:"" },
  { qty:10000, name:"Flareon", type:"Wild", hunt:"https://imgur.com/a/0QTUhoj", kph:"" },
  { qty:10000, name:"Golem", type:"Wild", hunt:"https://imgur.com/a/rg5qYI4", kph:"" },
  { qty:10000, name:"Hitmonchan", type:"Wild", hunt:"https://imgur.com/a/pjIUv00", kph:"" },
  { qty:10000, name:"Hitmonlee", type:"Wild", hunt:"https://imgur.com/a/pjIUv00", kph:"" },
  { qty:10000, name:"Hitmontop", type:"Wild", hunt:"https://imgur.com/a/30cn4iq", kph:"" },
  { qty:10000, name:"Jolteon", type:"Wild", hunt:"https://imgur.com/a/clP3jSD", kph:"" },
  { qty:10000, name:"Jynx", type:"Wild", hunt:"https://imgur.com/a/3LppiO7", kph:"" },
  { qty:100, name:"Kabutops", type:"Normal", hunt:"https://imgur.com/a/hGRDfmM", kph:"" },
  { qty:10000, name:"Lapras", type:"Wild", hunt:"https://imgur.com/a/ca4NlMA", kph:"" },
  { qty:10000, name:"Magcargo", type:"Wild", hunt:"https://imgur.com/a/PjJgh5m", kph:"" },
  { qty:10000, name:"Mantine", type:"Wild", hunt:"https://imgur.com/a/H98mIzg", kph:"" },
  { qty:10000, name:"Marowak", type:"Wild", hunt:"https://imgur.com/a/AYaHOY2", kph:"" },
  { qty:10000, name:"Meganium", type:"Wild", hunt:"https://imgur.com/uw0XICj", kph:"" },
  { qty:10000, name:"Miltank", type:"Wild", hunt:"https://imgur.com/a/doQnA6i", kph:"" },
  { qty:10000, name:"Muk", type:"Wild", hunt:"https://imgur.com/a/vgGrrfT", kph:"" },
  { qty:10000, name:"Nidoking", type:"Wild", hunt:"https://imgur.com/a/HWxtEs3", kph:"" },
  { qty:10000, name:"Nidoqueen", type:"Wild", hunt:"https://imgur.com/a/lnONjUq", kph:"" },
  { qty:10000, name:"Ninetales", type:"Wild", hunt:"https://imgur.com/a/2uMZqFZ", kph:"" },
  { qty:100, name:"Omastar", type:"Normal", hunt:"https://imgur.com/a/lrEa6jJ", kph:"" },
  { qty:10000, name:"Pidgeot", type:"Wild", hunt:"https://imgur.com/a/mZdWvFw", kph:"" },
  { qty:10000, name:"Politoed", type:"Wild", hunt:"https://imgur.com/a/zMl0ekj", kph:"" },
  { qty:10000, name:"Poliwrath", type:"Wild", hunt:"https://imgur.com/a/rg5qYI4", kph:"" },
  { qty:10000, name:"Raichu", type:"Wild", hunt:"https://imgur.com/a/clP3jSD", kph:"" },
  { qty:10000, name:"Rapidash", type:"Wild", hunt:"https://imgur.com/a/lwqRvJB", kph:"" },
  { qty:10000, name:"Slowking", type:"Wild", hunt:"https://imgur.com/a/XUZFbv9", kph:"" },
  { qty:10000, name:"Steelix", type:"Wild", hunt:"https://imgur.com/a/GWp5vC7", kph:"" },
  { qty:10000, name:"Tentacruel", type:"Wild", hunt:"https://imgur.com/a/1MIh0TT", kph:"" },
  { qty:10000, name:"Typhlosion", type:"Wild", hunt:"https://imgur.com/a/nmnNuO5", kph:"" },
  { qty:10000, name:"Umbreon", type:"Wild", hunt:"https://imgur.com/a/CkBSqXN", kph:"" },
  { qty:10000, name:"Ursaring", type:"Wild", hunt:"https://imgur.com/a/nBXkwSw", kph:"" },
  { qty:10000, name:"Vaporeon", type:"Wild", hunt:"https://imgur.com/a/RI7U1mv", kph:"" },
  { qty:10000, name:"Venusaur", type:"Wild", hunt:"https://imgur.com/a/QZY9tMI", kph:"" },
  { qty:10000, name:"Misdreavus", type:"Wild", hunt:"https://imgur.com/a/xfYPzTw", kph:"" },
  { qty:10000, name:"Mr. Mime", type:"Wild", hunt:"https://imgur.com/a/bIuz6Tm", kph:"" },
  { qty:10000, name:"Pinsir", type:"Wild", hunt:"https://imgur.com/a/T3rOBjE", kph:"" },
  { qty:10000, name:"Pupitar", type:"Wild", hunt:"https://imgur.com/a/SJntAUa", kph:"" },
  { qty:10000, name:"Scyther", type:"Wild", hunt:"https://imgur.com/a/df36NrE", kph:"" },
  { qty:10000, name:"Skarmory", type:"Wild", hunt:"https://imgur.com/a/otQbKEE", kph:"" },
  { qty:10000, name:"Tauros", type:"Wild", hunt:"https://imgur.com/a/j21SPSA", kph:"" },
  { qty:10000, name:"Houndoom", type:"Wild", hunt:"https://imgur.com/a/kUQvKbL", kph:"" },
  { qty:10000, name:"Kangaskhan", type:"Wild", hunt:"https://imgur.com/a/j21SPSA", kph:"" },
  { qty:10000, name:"Kingdra", type:"Wild", hunt:"https://imgur.com/a/W6HZl3X", kph:"" },
  { qty:10000, name:"Machamp", type:"Wild", hunt:"https://imgur.com/a/yB63tms", kph:"" },
  { qty:10000, name:"Wobbuffet", type:"Wild", hunt:"https://imgur.com/a/ZlGOsvk", kph:"3700" },
  { qty:10000, name:"Dusknoir", type:"Wild", hunt:"https://imgur.com/a/DMCBxm0", kph:"2300" },
  { qty:10000, name:"Luxray", type:"Wild", hunt:"https://imgur.com/a/L0bj8Vd", kph:"2100" },
  { qty:10000, name:"Mimikyu", type:"Wild", hunt:"https://imgur.com/a/tBNDQGq", kph:"2400" },
  { qty:10000, name:"Toxicroak", type:"Wild", hunt:"https://imgur.com/a/voSoRee", kph:"2900" },
  { qty:10000, name:"Torterra", type:"Wild", hunt:"https://imgur.com/a/OSpmhX3", kph:"2600" },
  { qty:10000, name:"Tangrowth", type:"Wild", hunt:"https://imgur.com/a/6PD5gEv", kph:"2800" },
  { qty:10000, name:"Arcanine", type:"Wild", hunt:"https://imgur.com/a/NnkwV5t", kph:"2800" },
  { qty:10000, name:"Florges", type:"Wild", hunt:"https://imgur.com/a/dHnsWqn", kph:"3400" },
  { qty:10000, name:"Hydreigon", type:"Wild", hunt:"https://imgur.com/a/tkRwGdL", kph:"2600" },
  { qty:4000, name:"Walrein", type:"Hoenn", hunt:"https://imgur.com/a/MtwwL6b", kph:"1120" },
  { qty:4000, name:"Seviper", type:"Hoenn", hunt:"https://imgur.com/a/l3lliRe", kph:"1120" },
  { qty:4000, name:"Aggron", type:"Hoenn", hunt:"https://imgur.com/a/cJndpSb", kph:"1120" },
  { qty:4000, name:"Sharpedo", type:"Hoenn", hunt:"https://imgur.com/a/xEQLyNo", kph:"1400" },
  { qty:4000, name:"Armaldo", type:"Hoenn", hunt:"https://imgur.com/a/xG6MiHI", kph:"1400" },
  { qty:4000, name:"Altaria", type:"Hoenn", hunt:"https://imgur.com/a/4BU3DIw", kph:"1200" },
  { qty:4000, name:"Swellow", type:"Hoenn", hunt:"https://imgur.com/a/zWjp1is", kph:"1300" },
  { qty:4000, name:"Huntail", type:"Hoenn", hunt:"https://imgur.com/a/xi7IxsL", kph:"1400" },
  { qty:4000, name:"Breloom", type:"Hoenn", hunt:"https://imgur.com/a/xkbItkt", kph:"1140" },
  { qty:4000, name:"Claydol", type:"Hoenn", hunt:"https://imgur.com/a/FaZB45d", kph:"1400" },
  { qty:4000, name:"Hariyama", type:"Hoenn", hunt:"https://imgur.com/a/ywTJuVx", kph:"1100" },
  { qty:4000, name:"Cradily", type:"Hoenn", hunt:"https://imgur.com/a/zziX3N4", kph:"1050" },
  { qty:4000, name:"Roselia", type:"Hoenn", hunt:"https://imgur.com/a/Dv4T5af", kph:"1600" },
  { qty:4000, name:"Pelipper", type:"Hoenn", hunt:"https://imgur.com/a/9ny4RTg", kph:"1170" },
  { qty:4000, name:"Dustox", type:"Hoenn", hunt:"https://imgur.com/a/aa8JVeg", kph:"1250" },
  { qty:4000, name:"Solrock", type:"Hoenn", hunt:"https://imgur.com/a/eWSLlta", kph:"1500" },
  { qty:4000, name:"Clamperl", type:"Hoenn", hunt:"https://imgur.com/a/3by4nDT", kph:"1350" },
  { qty:4000, name:"Banette", type:"Hoenn", hunt:"https://imgur.com/a/JL6EoDR", kph:"900" },
  { qty:4000, name:"Camerupt", type:"Hoenn", hunt:"https://imgur.com/a/a8pfzjH", kph:"1250" },
  { qty:4000, name:"Castform Fire", type:"Hoenn", hunt:"https://imgur.com/a/Ts9I3R9", kph:"1150" },
  { qty:4000, name:"Castform Ice", type:"Hoenn", hunt:"https://imgur.com/a/Ts9I3R9", kph:"1300" },
  { qty:4000, name:"Castform Electric", type:"Hoenn", hunt:"https://imgur.com/a/Ts9I3R9", kph:"1090" },
  { qty:4000, name:"Kecleon", type:"Hoenn", hunt:"https://imgur.com/a/8sxx7sN", kph:"1070" },
  { qty:4000, name:"Dusclops", type:"Hoenn", hunt:"https://imgur.com/a/625I8kI", kph:"1370" },
  { qty:4000, name:"Zangoose", type:"Hoenn", hunt:"https://imgur.com/a/NfMKEg7", kph:"850" },
  { qty:4000, name:"Metang", type:"Hoenn", hunt:"https://imgur.com/a/rQJH8mB", kph:"" },
  ];

  var HUNT_MAPS = {
    "https://imgur.com/a/ZyszZOZ": "https://i.imgur.com/y2FoQTX.png",
    "https://imgur.com/a/2SuUURl": "https://i.imgur.com/Qd2dEtT.png",
    "https://imgur.com/a/IhJ17iJ": "https://i.imgur.com/d7J89SL.png",
    "https://imgur.com/a/4E7gOtq": "https://i.imgur.com/nEqwCKt.png",
    "https://imgur.com/a/cPbYaoO": "https://i.imgur.com/khcnkF5.png",
    "https://imgur.com/a/TaH2l6m": "https://i.imgur.com/I4c1UNc.png",
    "https://imgur.com/a/SHzJxH4": "https://i.imgur.com/BuHXQVL.png",
    "https://imgur.com/a/uvfPxaO": "https://i.imgur.com/486smt3.png",
    "https://imgur.com/a/IZyOqys": "https://i.imgur.com/VQPtVqm.png",
    "https://imgur.com/a/VrqZwDG": "https://i.imgur.com/kkiwcad.png",
    "https://imgur.com/a/ZNQjOvj": "https://i.imgur.com/vyr21yi.png",
    "https://imgur.com/a/NVXqWOp": "https://i.imgur.com/bdD4t18.png",
    "https://imgur.com/a/zRcrSLP": "https://i.imgur.com/pdEHpQE.png",
    "https://imgur.com/a/o6O5mnt": "https://i.imgur.com/PySFtTh.png",
    "https://imgur.com/a/ksXMwHN": "https://i.imgur.com/MgVse3l.png",
    "https://imgur.com/a/O7GKc00": "https://i.imgur.com/XaDTsZ8.png",
    "https://imgur.com/a/H98mIzg": "https://i.imgur.com/Jvj4TIY.png",
    "https://imgur.com/a/thSWZiw": "https://i.imgur.com/vSMVgvz.png",
    "https://imgur.com/a/mZdWvFw": "https://i.imgur.com/L0NNeJj.png",
    "https://imgur.com/a/CkBSqXN": "https://i.imgur.com/pgsglgg.png",
    "https://imgur.com/a/0QTUhoj": "https://i.imgur.com/YKL0vpX.png",
    "https://imgur.com/a/rg5qYI4": "https://i.imgur.com/OQHyJP2.png",
    "https://imgur.com/a/pjIUv00": "https://i.imgur.com/jVO5Fcj.png",
    "https://imgur.com/a/30cn4iq": "https://i.imgur.com/iArrZwp.png",
    "https://imgur.com/a/clP3jSD": "https://i.imgur.com/wEe4dQB.png",
    "https://imgur.com/a/3LppiO7": "https://i.imgur.com/aap8VSg.png",
    "https://imgur.com/a/hGRDfmM": "https://i.imgur.com/wwSSmEa.png",
    "https://imgur.com/a/ca4NlMA": "https://i.imgur.com/AeHR1Nl.png",
    "https://imgur.com/a/PjJgh5m": "https://i.imgur.com/AOoSnb6.png",
    "https://imgur.com/a/AYaHOY2": "https://i.imgur.com/EK9em4B.png",
    "https://imgur.com/uw0XICj": "https://i.imgur.com/uw0XICj.png",
    "https://imgur.com/a/doQnA6i": "https://i.imgur.com/N7V1d88.png",
    "https://imgur.com/a/vgGrrfT": "https://i.imgur.com/wOs40j2.png",
    "https://imgur.com/a/HWxtEs3": "https://i.imgur.com/Wj0B8i7.png",
    "https://imgur.com/a/lnONjUq": "https://i.imgur.com/uySw1BD.png",
    "https://imgur.com/a/2uMZqFZ": "https://i.imgur.com/vnq7rMk.png",
    "https://imgur.com/a/lrEa6jJ": "https://i.imgur.com/aGkUqoK.png",
    "https://imgur.com/a/zMl0ekj": "https://i.imgur.com/eJqljOO.png",
    "https://imgur.com/a/lwqRvJB": "https://i.imgur.com/b8tAt30.png",
    "https://imgur.com/a/XUZFbv9": "https://i.imgur.com/zHZ8GUe.png",
    "https://imgur.com/a/GWp5vC7": "https://i.imgur.com/Ee5Lb2y.png",
    "https://imgur.com/a/1MIh0TT": "https://i.imgur.com/mBytDNi.png",
    "https://imgur.com/a/nmnNuO5": "https://i.imgur.com/hwCX4J3.png",
    "https://imgur.com/a/nBXkwSw": "https://i.imgur.com/c4gKvRj.png",
    "https://imgur.com/a/RI7U1mv": "https://i.imgur.com/xywmHa6.png",
    "https://imgur.com/a/QZY9tMI": "https://i.imgur.com/yzUdC73.png",
    "https://imgur.com/a/xfYPzTw": "https://i.imgur.com/IGTob4U.png",
    "https://imgur.com/a/bIuz6Tm": "https://i.imgur.com/mttircQ.png",
    "https://imgur.com/a/T3rOBjE": "https://i.imgur.com/Jz3Bj6k.png",
    "https://imgur.com/a/SJntAUa": "https://i.imgur.com/zHkamMt.png",
    "https://imgur.com/a/df36NrE": "https://i.imgur.com/zeOrYWE.png",
    "https://imgur.com/a/otQbKEE": "https://i.imgur.com/GJgmkkd.png",
    "https://imgur.com/a/j21SPSA": "https://i.imgur.com/ivmx2oc.png",
    "https://imgur.com/a/kUQvKbL": "https://i.imgur.com/NTdNuy6.png",
    "https://imgur.com/a/W6HZl3X": "https://i.imgur.com/6N5T37g.png",
    "https://imgur.com/a/yB63tms": "https://i.imgur.com/Tp2kcuH.png",
    "https://imgur.com/a/ZlGOsvk": "https://i.imgur.com/I0Wt5oQ.png",
    "https://imgur.com/a/DMCBxm0": "https://i.imgur.com/dT75F62.png",
    "https://imgur.com/a/L0bj8Vd": "https://i.imgur.com/RHrMVwH.png",
    "https://imgur.com/a/tBNDQGq": "https://i.imgur.com/FnFMpgS.png",
    "https://imgur.com/a/voSoRee": "https://i.imgur.com/9ESpquJ.png",
    "https://imgur.com/a/OSpmhX3": "https://i.imgur.com/2XsXmXT.png",
    "https://imgur.com/a/6PD5gEv": "https://i.imgur.com/o3AeTyV.png",
    "https://imgur.com/a/NnkwV5t": "https://i.imgur.com/0eShDZu.png",
    "https://imgur.com/a/dHnsWqn": "https://i.imgur.com/lbX6o36.png",
    "https://imgur.com/a/tkRwGdL": "https://i.imgur.com/sgjzNsS.png",
    "https://imgur.com/a/MtwwL6b": "https://i.imgur.com/yyju2zc.png",
    "https://imgur.com/a/l3lliRe": "https://i.imgur.com/r6dKYKz.png",
    "https://imgur.com/a/cJndpSb": "https://i.imgur.com/7Ktyeq8.png",
    "https://imgur.com/a/xEQLyNo": "https://i.imgur.com/8yQmRRP.png",
    "https://imgur.com/a/xG6MiHI": "https://i.imgur.com/Cxr38px.png",
    "https://imgur.com/a/4BU3DIw": "https://i.imgur.com/i7qrQJW.png",
    "https://imgur.com/a/zWjp1is": "https://i.imgur.com/GuWPn4b.png",
    "https://imgur.com/a/xi7IxsL": "https://i.imgur.com/OGmEbAj.png",
    "https://imgur.com/a/xkbItkt": "https://i.imgur.com/2FOgNWP.png",
    "https://imgur.com/a/FaZB45d": "https://i.imgur.com/xSI3B2Q.png",
    "https://imgur.com/a/ywTJuVx": "https://i.imgur.com/NWOf0iE.png",
    "https://imgur.com/a/zziX3N4": "https://i.imgur.com/hT2FAVN.png",
    "https://imgur.com/a/Dv4T5af": "https://i.imgur.com/B40bCfu.png",
    "https://imgur.com/a/9ny4RTg": "https://i.imgur.com/lEFck31.png",
    "https://imgur.com/a/aa8JVeg": "https://i.imgur.com/UMIAme7.png",
    "https://imgur.com/a/eWSLlta": "https://i.imgur.com/mfe7GIz.png",
    "https://imgur.com/a/3by4nDT": "https://i.imgur.com/rGcOP5e.png",
    "https://imgur.com/a/JL6EoDR": "https://i.imgur.com/zJV7X8H.png",
    "https://imgur.com/a/a8pfzjH": "https://i.imgur.com/W8kixQ8.png",
    "https://imgur.com/a/Ts9I3R9": "https://i.imgur.com/eTzhMoN.png",
    "https://imgur.com/a/8sxx7sN": "https://i.imgur.com/zCleYDl.png",
    "https://imgur.com/a/625I8kI": "https://i.imgur.com/92ULApr.png",
    "https://imgur.com/a/NfMKEg7": "https://i.imgur.com/vpv14F8.png",
    "https://imgur.com/a/rQJH8mB": "https://i.imgur.com/Ahxahlz.png",
  };

  var TYPES = {
    Normal: { label: 'Normal', color: '#3a8cff', bg: 'rgba(58,140,255,.10)',  border: 'rgba(58,140,255,.28)',  glow: 'rgba(58,140,255,.16)',  icon: '🗺️', order: 0, desc: 'Hunts base — progressao inicial' },
    Wild:   { label: 'Wild',   color: '#f59e0b', bg: 'rgba(245,158,11,.10)',  border: 'rgba(245,158,11,.28)',  glow: 'rgba(245,158,11,.14)',  icon: '⚡', order: 1, desc: 'Hunts de Wildscape — 10.000 kills' },
    Hoenn:  { label: 'Hoenn',  color: '#34d399', bg: 'rgba(52,211,153,.10)',  border: 'rgba(52,211,153,.28)',  glow: 'rgba(52,211,153,.14)',  icon: '🌿', order: 2, desc: 'Hunts da regiao de Hoenn — 4.000 kills' }
  };
  var TYPE_ORDER = ['Normal', 'Wild', 'Hoenn'];

  var _q = '', _type = 'all';

  function _esc(s) {
    return String(s == null ? '' : s).replace(/[&<>"]/g, function (c) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c];
    });
  }
  function _fmtQty(n) {
    return String(n).replace(/\B(?=(\d{3})+(?!\d))/g, '.');
  }
  /* escape p/ string JS dentro de atributo onclick (apóstrofo em Farfetch'd etc.) */
  function _jsq(s) {
    return String(s == null ? '' : s).replace(/\\/g, '\\\\').replace(/'/g, "\\'");
  }

  /* Sprite animado (Showdown). Slug = nome sem 'shiny', minusculo, so alfanumerico. */
  function _sprite(name) {
    var lower = name.toLowerCase();
    var isShiny = lower.indexOf('shiny ') === 0;
    var base = lower.replace(/^shiny\s+/, '');
    var slug;
    if (base.indexOf('castform') === 0) slug = 'castform';
    else slug = base.replace(/[^a-z0-9]/g, '');
    var root = isShiny
      ? 'https://play.pokemonshowdown.com/sprites/ani-shiny/'
      : 'https://play.pokemonshowdown.com/sprites/ani/';
    return {
      src: root + slug + '.gif',
      fallback: 'https://play.pokemonshowdown.com/sprites/gen5/' + slug + '.png'
    };
  }

  /* — Normalização de espécie (remove shiny/Sh, acentos, fixes de grafia) — */
  function _norm(n) {
    n = String(n || '').toLowerCase().trim()
      .normalize('NFD').replace(/[̀-ͯ]/g, '')
      .replace(/^shiny\s+/, '').replace(/^sh\s+/, '');
    var fix = { 'salamalence': 'salamence', 'ilumise': 'illumise', 'luvdisk': 'luvdisc' };
    return (fix[n] || n).trim();
  }
  function _uniqNpcs(arr) {
    var seen = {}, out = [];
    arr.forEach(function (e) { if (e.npc && !seen[e.npc]) { seen[e.npc] = 1; out.push(e.npc); } });
    return out;
  }

  /* — Combos CROSS-SISTEMA: mesma espécie em Linked + Task NPC e/ou Hazard.
     Lê window.PA_NPC_TASKS (wiki-tasks.js) e window.RAW_HAZARD (app-wiki-npcs.js)
     em tempo de render, então independe da ordem de carga. — */
  function _crossCombos() {
    var linkedBy = {};
    LINKED.forEach(function (t) { var k = _norm(t.name); (linkedBy[k] = linkedBy[k] || []).push(t); });
    var npcBy = {};
    (global.PA_NPC_TASKS || []).forEach(function (n) {
      (n.task || []).forEach(function (e) { var k = _norm(e.name); (npcBy[k] = npcBy[k] || []).push({ npc: n.npc, qty: e.qty, name: e.name }); });
    });
    var hazBy = {};
    (global.RAW_HAZARD || []).forEach(function (h) {
      String(h.task || '').split(',').forEach(function (part) {
        var m = part.trim().match(/^(\d+)\s+Sh\s+(.+)$/i);
        if (m) { var k = _norm(m[2]); (hazBy[k] = hazBy[k] || []).push({ npc: h.npc, qty: parseInt(m[1], 10), name: 'Shiny ' + m[2].trim() }); }
      });
    });
    var out = [];
    Object.keys(linkedBy).forEach(function (k) {
      if (npcBy[k] || hazBy[k]) {
        out.push({ species: k, display: linkedBy[k][0].name, linked: linkedBy[k], npc: npcBy[k] || [], hazard: hazBy[k] || [] });
      }
    });
    out.sort(function (a, b) { return a.display.localeCompare(b.display); });
    return out;
  }
  function _comboMap() {
    var m = {}; _crossCombos().forEach(function (c) { m[c.species] = c; }); return m;
  }

  function _spriteImg(name, cls) {
    var sp = _sprite(name);
    return '<img class="' + cls + '" src="' + sp.src + '" alt="' + _esc(name) + '" loading="lazy" ' +
      'onerror="this.src=\'' + sp.fallback + '\';this.onerror=null">';
  }

  /* — Passo da timeline sequencial — */
  function _step(t, n, comboMap) {
    var cfg = TYPES[t.type] || TYPES.Normal;
    var combo = comboMap[_norm(t.name)];
    var kph = t.kph ? '<span class="lt-kph" title="Kills por hora estimado">≈ ' + _esc(_fmtQty(t.kph)) + ' kills/h</span>' : '';
    var comboTag = '';
    if (combo) {
      var sys = [];
      if (combo.npc.length) sys.push('Task NPC');
      if (combo.hazard.length) sys.push('Hazard');
      comboTag = '<span class="lt-combo-tag" title="Mesma espécie em ' + sys.join(' e ') + ' — combe tudo de uma vez" ' +
        'onclick="event.stopPropagation();LinkedTasks._combo(\'' + _jsq(_norm(t.name)) + '\')">⚡ Comba com ' + sys.join(' + ') + '</span>';
    }
    var mapImg = HUNT_MAPS[t.hunt];
    var huntBtn = mapImg
      ? '<button class="lt-hunt-btn" onclick="LinkedTasks._map(\'' + _jsq(t.name) + '\',\'' + _jsq(mapImg) + '\',\'' + _jsq(t.hunt) + '\')">📍 Ver hunt</button>'
      : (t.hunt
        ? '<a class="lt-hunt-btn" href="' + _esc(t.hunt) + '" target="_blank" rel="noopener">📍 Ver hunt</a>'
        : '<span class="lt-hunt-soon">📍 Mapa em breve</span>');
    return '<div class="lt-step' + (combo ? ' lt-step-combo' : '') + '" style="--c:' + cfg.color + ';--bg:' + cfg.bg + ';--bd:' + cfg.border + ';--glow:' + cfg.glow + '">' +
      '<div class="lt-step-rail"><span class="lt-step-num">' + n + '</span></div>' +
      '<div class="lt-step-card">' +
        '<div class="lt-step-sprite">' + _spriteImg(t.name, 'lt-sprite') +
          '<span class="lt-qty">×' + _fmtQty(t.qty) + '</span>' +
        '</div>' +
        '<div class="lt-step-info">' +
          '<div class="lt-step-name">' + _esc(t.name) + '</div>' +
          '<div class="lt-step-sub">Derrote <b>' + _fmtQty(t.qty) + '</b> · <span class="lt-type-badge">' + cfg.icon + ' ' + cfg.label + '</span> · <span class="lt-reward">🎒 Elemental Bag</span></div>' +
          ((comboTag || kph) ? '<div class="lt-step-tags">' + comboTag + kph + '</div>' : '') +
        '</div>' +
        huntBtn +
      '</div>' +
    '</div>';
  }

  /* — Seção de combos cross-sistema (Linked + Task NPC / Hazard) — */
  function _comboSection() {
    var combos = _crossCombos();
    if (!combos.length) return '';
    var cards = combos.map(function (c) {
      var chips = '<span class="lt-combo-task" style="--c:#f59e0b;--bg:rgba(245,158,11,.1);--bd:rgba(245,158,11,.32)">🔗 Linked</span>';
      if (c.npc.length) chips += '<span class="lt-combo-plus">+</span><span class="lt-combo-task" style="--c:#60aaff;--bg:rgba(96,170,255,.1);--bd:rgba(96,170,255,.32)">📋 Task NPC</span>';
      if (c.hazard.length) chips += '<span class="lt-combo-plus">+</span><span class="lt-combo-task" style="--c:#facc15;--bg:rgba(250,204,21,.1);--bd:rgba(250,204,21,.32)">⚠️ Hazard</span>';
      var where = [];
      if (c.npc.length) where.push('NPC: ' + _esc(_uniqNpcs(c.npc).join(', ')));
      if (c.hazard.length) where.push('Hazard: ' + _esc(_uniqNpcs(c.hazard).join(', ')) + ' (shiny)');
      return '<div class="lt-combo-card" onclick="LinkedTasks._combo(\'' + _jsq(c.species) + '\')" title="Ver combos de ' + _esc(c.display) + '">' +
        _spriteImg(c.display, 'lt-combo-sprite') +
        '<div class="lt-combo-info">' +
          '<div class="lt-combo-name">' + _esc(c.display) + '</div>' +
          '<div class="lt-combo-tasks">' + chips + '</div>' +
          (where.length ? '<div class="lt-xcombo-where">' + where.join(' · ') + '</div>' : '') +
        '</div>' +
      '</div>';
    }).join('');
    return '<div class="lt-combo-section">' +
      '<div class="lt-combo-header">' +
        '<span class="lt-combo-header-icon">⚡</span>' +
        '<span class="lt-combo-header-title">COMBOS COM OUTRAS TASKS (' + combos.length + ')</span>' +
        '<span class="lt-combo-header-line"></span>' +
      '</div>' +
      '<div class="lt-combo-hint">Estas espécies também aparecem em <b>Task NPC</b> e/ou <b>Hazard Tasks</b>. Hunte uma vez e progrida tudo de uma vez.</div>' +
      '<div class="lt-combo-grid">' + cards + '</div>' +
    '</div>';
  }

  function _render() {
    var grid = document.getElementById('lt-grid');
    if (!grid) return;
    var q = _q.trim().toLowerCase();
    /* numeração = posição na corrente completa (preservada mesmo filtrando) */
    var list = [];
    LINKED.forEach(function (t, i) {
      if (_type !== 'all' && t.type !== _type) return;
      if (q && t.name.toLowerCase().indexOf(q) === -1 && t.type.toLowerCase().indexOf(q) === -1) return;
      list.push({ t: t, n: i + 1 });
    });
    var countEl = document.getElementById('lt-count');
    if (countEl) countEl.textContent = list.length + ' tasks';

    var html = '';
    if (_type === 'all' && !q) html += _comboSection();

    if (!list.length) {
      grid.innerHTML = html + '<div class="lt-empty"><div class="lt-empty-icon">🔍</div><div>Nenhuma task encontrada.</div></div>';
      return;
    }
    var comboMap = _comboMap();
    html += '<div class="lt-section-head" style="--c:#9db4d4;--bd:rgba(157,180,212,.3)">' +
        '<span class="lt-section-icon">🔗</span>' +
        '<span class="lt-section-title">PROGRESSÃO SEQUENCIAL</span>' +
        '<span class="lt-section-desc">Complete uma para liberar a próxima — só 1 por vez</span>' +
        '<span class="lt-section-count" style="--bg:rgba(157,180,212,.1)">' + list.length + '</span>' +
      '</div>';
    html += '<div class="lt-track">' +
      list.map(function (o) { return _step(o.t, o.n, comboMap); }).join('') +
    '</div>';
    grid.innerHTML = html;
  }

  function _injectCSS() {
    if (document.getElementById('lt-css')) return;
    var s = document.createElement('style');
    s.id = 'lt-css';
    s.textContent = [
      '.lt-controls{display:flex;align-items:center;gap:12px;padding:16px 20px;flex-wrap:wrap;border-bottom:1px solid var(--border)}',
      '.lt-sw{display:flex;align-items:center;gap:8px;flex:1;min-width:200px;background:var(--surface2);border:1px solid var(--border);border-radius:8px;padding:8px 12px}',
      '.lt-sw input{background:none;border:none;outline:none;color:var(--text);font-family:var(--font-body);font-size:.9rem;width:100%}',
      '.lt-sw input::placeholder{color:var(--muted)}',
      '.lt-fbtn{padding:6px 14px;border-radius:20px;border:1px solid var(--border);background:transparent;color:var(--muted);font-family:var(--font-body);font-size:.8rem;cursor:pointer;transition:all .15s;white-space:nowrap}',
      '.lt-fbtn:hover{border-color:var(--border-hover);color:var(--text)}',
      '.lt-fbtn.active{background:rgba(58,140,255,.2);border-color:var(--blue);color:var(--blue-bright)}',
      '.lt-fbtn.fw.active{background:rgba(245,158,11,.14);border-color:rgba(245,158,11,.5);color:#f59e0b}',
      '.lt-fbtn.fh.active{background:rgba(52,211,153,.14);border-color:rgba(52,211,153,.5);color:#34d399}',
      '#lt-count{color:var(--muted);font-size:.82rem;white-space:nowrap;margin-left:auto}',
      '.lt-note{margin:16px 20px 0;padding:12px 16px;border-radius:12px;border:1px solid rgba(96,170,255,.2);background:rgba(96,170,255,.06);font-size:.84rem;color:var(--muted);line-height:1.5;white-space:pre-line}',
      '.lt-note b{color:var(--text)}.lt-note a{color:var(--blue-bright);text-decoration:none}',
      '.lt-intro{margin:16px 20px 0}',
      '.lt-intro-lead{font-size:.9rem;color:var(--text);line-height:1.6}',
      '.lt-intro-lead b{color:#f59e0b}',
      '.lt-bags{margin:18px 20px 0}',
      '.lt-bags-head{display:flex;align-items:center;gap:10px;margin-bottom:12px}',
      '.lt-bags-head-icon{font-size:1.1rem}',
      '.lt-bags-head-title{font-family:var(--font-title);font-size:.82rem;font-weight:700;letter-spacing:.12em;color:var(--text)}',
      '.lt-bags-head-line{flex:1;height:1px;background:linear-gradient(90deg,rgba(255,255,255,.12),transparent)}',
      '.lt-bags-grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(220px,1fr));gap:12px}',
      '.lt-bag{border-radius:14px;border:1px solid var(--bc);background:linear-gradient(160deg,var(--bbg),transparent);overflow:hidden;display:flex;flex-direction:column}',
      '.lt-bag-top{display:flex;align-items:center;gap:9px;padding:11px 14px;border-bottom:1px solid var(--bc)}',
      '.lt-bag-ic{font-size:1.2rem}',
      '.lt-bag-name{font-family:var(--font-title);font-size:.92rem;font-weight:700;letter-spacing:.5px;color:var(--bcol)}',
      '.lt-bag-body{padding:11px 14px;display:flex;flex-direction:column;gap:7px}',
      '.lt-bag-line{display:flex;gap:8px;font-size:.82rem;color:var(--text);line-height:1.4}',
      '.lt-bag-dot{color:var(--bcol);flex-shrink:0}',
      '.lt-bag-bonus{margin-top:3px;display:flex;gap:7px;align-items:flex-start;padding:8px 10px;border-radius:9px;background:rgba(255,255,255,.04);border:1px dashed var(--bc);font-size:.76rem;color:var(--muted);line-height:1.4}',
      '.lt-bag-bonus b{color:var(--bcol)}',
      '#lt-grid{padding:20px;max-width:1400px;margin:0 auto}',
      '.lt-combo-section{margin-bottom:28px;padding:16px;border-radius:16px;border:1px solid rgba(245,158,11,.28);background:linear-gradient(160deg,rgba(245,158,11,.08),rgba(245,158,11,.02))}',
      '.lt-combo-header{display:flex;align-items:center;gap:10px;margin-bottom:14px}',
      '.lt-combo-header-icon{font-size:1.1rem}',
      '.lt-combo-header-title{font-family:var(--font-title);font-size:.82rem;font-weight:700;letter-spacing:.12em;color:#f59e0b}',
      '.lt-combo-header-line{flex:1;height:1px;background:linear-gradient(90deg,rgba(245,158,11,.4),transparent)}',
      '.lt-combo-grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(240px,1fr));gap:12px}',
      '.lt-combo-card{display:flex;align-items:center;gap:12px;padding:10px 12px;border-radius:12px;border:1px solid rgba(245,158,11,.22);background:rgba(255,255,255,.03);cursor:pointer;transition:transform .14s,border-color .14s,background .14s}',
      '.lt-combo-card:hover{transform:translateY(-2px);border-color:rgba(245,158,11,.5);background:rgba(245,158,11,.06)}',
      '.lt-combo-sprite{width:52px;height:52px;object-fit:contain;image-rendering:pixelated;flex-shrink:0;filter:drop-shadow(0 2px 6px rgba(0,0,0,.5))}',
      '.lt-combo-info{min-width:0;flex:1}',
      '.lt-combo-name{font-family:var(--font-title);font-size:.92rem;font-weight:700;letter-spacing:.5px;color:var(--text);margin-bottom:5px}',
      '.lt-combo-tasks{display:flex;align-items:center;gap:5px;flex-wrap:wrap}',
      '.lt-combo-task{font-size:.68rem;font-weight:700;padding:2px 8px;border-radius:20px;color:var(--c);background:var(--bg);border:1px solid var(--bd);white-space:nowrap}',
      '.lt-combo-task b{font-family:var(--font-mono,monospace)}',
      '.lt-combo-plus{color:var(--muted);font-weight:700;font-size:.7rem}',
      '.lt-combo-hint{font-size:.8rem;color:var(--muted);line-height:1.45;margin:-2px 0 14px}.lt-combo-hint b{color:var(--text)}',
      '.lt-xcombo-where{font-size:.69rem;color:var(--muted);margin-top:5px;line-height:1.35}',
      '.lt-section{margin-bottom:30px}',
      '.lt-section-head{display:flex;align-items:center;gap:10px;padding-bottom:10px;margin-bottom:16px;border-bottom:2px solid var(--bd)}',
      '.lt-section-icon{font-size:1.15rem}',
      '.lt-section-title{font-family:var(--font-title);font-size:.88rem;font-weight:700;letter-spacing:.1em;color:var(--c)}',
      '.lt-section-desc{font-size:.74rem;color:var(--muted);flex:1}',
      '.lt-section-count{padding:3px 13px;border-radius:20px;background:var(--bg);border:1px solid var(--bd,rgba(255,255,255,.1));color:var(--c);font-size:.74rem;font-weight:700}',
      /* timeline sequencial */
      '.lt-track{display:flex;flex-direction:column}',
      '.lt-step{display:flex;gap:14px}',
      '.lt-step-rail{position:relative;width:30px;flex-shrink:0;display:flex;justify-content:center}',
      '.lt-step-rail::before{content:"";position:absolute;left:50%;top:0;bottom:0;width:2px;background:var(--bd);transform:translateX(-50%)}',
      '.lt-step:first-child .lt-step-rail::before{top:21px}',
      '.lt-step:last-child .lt-step-rail::before{height:21px;bottom:auto}',
      '.lt-step-num{position:relative;z-index:1;width:26px;height:26px;border-radius:50%;background:var(--surface2,#0c1424);border:2px solid var(--c);color:var(--c);font-family:var(--font-mono,monospace);font-size:.72rem;font-weight:800;display:flex;align-items:center;justify-content:center;margin-top:9px}',
      '.lt-step-card{flex:1;min-width:0;display:flex;align-items:center;gap:13px;margin-bottom:10px;padding:10px 14px;border-radius:13px;border:1px solid var(--bd);background:var(--surface2);transition:transform .14s,box-shadow .14s,border-color .14s}',
      '.lt-step-card:hover{transform:translateX(3px);border-color:var(--c);box-shadow:0 6px 22px var(--glow)}',
      '.lt-step-combo .lt-step-card{border-color:rgba(245,158,11,.4);background:linear-gradient(120deg,rgba(245,158,11,.06),var(--surface2))}',
      '.lt-step-combo .lt-step-num{border-color:#f59e0b;color:#f59e0b}',
      '.lt-step-sprite{position:relative;width:56px;height:56px;flex-shrink:0;display:flex;align-items:center;justify-content:center;background:rgba(0,0,0,.18);border-radius:10px}',
      '.lt-step-sprite .lt-sprite{width:46px;height:46px;object-fit:contain;image-rendering:pixelated}',
      '.lt-step-info{flex:1;min-width:0;display:flex;flex-direction:column;gap:4px}',
      '.lt-step-name{font-family:var(--font-title);font-size:.98rem;font-weight:700;letter-spacing:.5px;color:var(--text);line-height:1.1}',
      '.lt-step-sub{font-size:.78rem;color:var(--muted);line-height:1.3}.lt-step-sub b{color:var(--c)}',
      '.lt-reward{color:#f0b429;font-weight:600;white-space:nowrap}',
      '.lt-step-tags{display:flex;gap:6px;flex-wrap:wrap;margin-top:3px}',
      '.lt-step-card .lt-hunt-btn,.lt-step-card .lt-hunt-soon{margin-top:0;flex-shrink:0;white-space:nowrap}',
      '@media(max-width:560px){.lt-step-card{flex-wrap:wrap}.lt-step-card .lt-hunt-btn,.lt-step-card .lt-hunt-soon{width:100%;margin-top:8px;text-align:center}}',
      '.lt-cards{display:grid;grid-template-columns:repeat(auto-fill,minmax(220px,1fr));gap:12px}',
      '.lt-card{display:flex;gap:12px;padding:12px;border-radius:14px;border:1px solid var(--bd,rgba(255,255,255,.1));background:var(--surface2);transition:transform .14s,box-shadow .14s,border-color .14s}',
      '.lt-card:hover{transform:translateY(-3px);box-shadow:0 8px 28px var(--glow);border-color:var(--c)}',
      '.lt-card-combo{border-color:rgba(245,158,11,.4);background:linear-gradient(160deg,rgba(245,158,11,.06),var(--surface2))}',
      '.lt-card-sprite{position:relative;width:72px;height:72px;flex-shrink:0;display:flex;align-items:center;justify-content:center;background:rgba(0,0,0,.18);border-radius:11px}',
      '.lt-sprite{width:60px;height:60px;object-fit:contain;image-rendering:pixelated;filter:drop-shadow(0 2px 5px rgba(0,0,0,.5))}',
      '.lt-sprite.shiny{filter:drop-shadow(0 2px 8px rgba(255,215,0,.4))}',
      '.lt-qty{position:absolute;bottom:-6px;right:-6px;font-family:var(--font-mono,monospace);font-size:.72rem;font-weight:900;color:#fff;background:var(--c);border-radius:7px;padding:2px 7px;box-shadow:0 2px 8px rgba(0,0,0,.4)}',
      '.lt-card-body{flex:1;min-width:0;display:flex;flex-direction:column;gap:7px}',
      '.lt-card-name{font-family:var(--font-title);font-size:.95rem;font-weight:700;letter-spacing:.5px;color:var(--text);line-height:1.15}',
      '.lt-card-meta{display:flex;align-items:center;gap:6px;flex-wrap:wrap}',
      '.lt-type-badge{font-size:.68rem;font-weight:700;padding:2px 8px;border-radius:20px;color:var(--c);background:var(--bg);border:1px solid var(--bd)}',
      '.lt-combo-tag{font-size:.66rem;font-weight:700;padding:2px 8px;border-radius:20px;color:#f59e0b;background:rgba(245,158,11,.12);border:1px solid rgba(245,158,11,.35);cursor:pointer;white-space:nowrap}',
      '.lt-combo-tag:hover{background:rgba(245,158,11,.2);border-color:rgba(245,158,11,.55)}',
      '.lt-kph{font-size:.66rem;font-weight:600;padding:2px 8px;border-radius:20px;color:var(--muted);background:rgba(255,255,255,.04);border:1px solid rgba(255,255,255,.08);font-family:var(--font-mono,monospace)}',
      '.lt-hunt-btn{margin-top:auto;display:inline-block;text-align:center;padding:7px 12px;border-radius:9px;border:1px solid rgba(96,192,255,.25);background:rgba(96,192,255,.08);color:#60c0ff;font-size:.76rem;font-weight:700;letter-spacing:.4px;text-transform:uppercase;text-decoration:none;transition:all .14s;cursor:pointer;font-family:inherit}',
      '.lt-hunt-btn:hover{background:rgba(96,192,255,.18);border-color:rgba(96,192,255,.5)}',
      '.lt-hunt-soon{margin-top:auto;text-align:center;font-size:.72rem;color:var(--muted);padding:7px 0}',
      /* modal do mapa da hunt */
      '.lt-map-modal{position:fixed;inset:0;z-index:10000;display:flex;align-items:center;justify-content:center;animation:ltFade .2s ease}',
      '@keyframes ltFade{from{opacity:0}to{opacity:1}}',
      '.lt-map-backdrop{position:absolute;inset:0;background:rgba(0,0,0,.82);backdrop-filter:blur(6px);-webkit-backdrop-filter:blur(6px)}',
      '.lt-map-box{position:relative;z-index:1;width:min(1000px,95vw);max-height:92vh;display:flex;flex-direction:column;background:#0c1424;border:1px solid rgba(96,170,255,.25);border-radius:16px;overflow:hidden;box-shadow:0 24px 80px rgba(0,0,0,.7);animation:ltSlideUp .25s cubic-bezier(.16,1,.3,1)}',
      '@keyframes ltSlideUp{from{transform:translateY(26px) scale(.97);opacity:0}to{transform:none;opacity:1}}',
      '.lt-map-head{display:flex;align-items:center;justify-content:space-between;padding:13px 18px;border-bottom:1px solid rgba(96,170,255,.14);background:rgba(96,170,255,.05)}',
      '.lt-map-title{font-family:var(--font-title);font-size:.92rem;font-weight:700;letter-spacing:1px;color:#9ecbff}',
      '.lt-map-close{background:rgba(255,255,255,.06);border:1px solid rgba(255,255,255,.12);color:#fff;border-radius:8px;width:30px;height:30px;cursor:pointer;font-size:14px}',
      '.lt-map-close:hover{background:rgba(255,80,80,.18);border-color:rgba(255,80,80,.4)}',
      '.lt-map-body{flex:1;min-height:50vh;background:#070d1a;display:flex;align-items:center;justify-content:center;overflow:auto;position:relative}',
      '.lt-map-body img{max-width:100%;max-height:86vh;object-fit:contain;opacity:0;transition:opacity .3s;display:block}',
      '.lt-map-loading{position:absolute;font-size:12px;color:var(--muted);letter-spacing:1px}',
      /* modal de combo (NPC + quest + mapa) */
      '.ltc-box{max-width:680px}',
      '.ltc-body{padding:4px 18px 22px;overflow:auto}',
      '.ltc-sec{margin-top:16px}',
      '.ltc-sec-h{font-family:var(--font-title);font-size:.8rem;font-weight:700;letter-spacing:.1em;color:var(--sc,#fff);padding-bottom:8px;border-bottom:1px solid rgba(255,255,255,.08);margin-bottom:10px}',
      '.ltc-item{background:rgba(255,255,255,.03);border:1px solid rgba(255,255,255,.07);border-radius:12px;padding:12px;margin-bottom:10px}',
      '.ltc-item-head{display:flex;align-items:center;gap:8px;flex-wrap:wrap;font-size:.9rem;color:var(--text);margin-bottom:10px}',
      '.ltc-npc{display:flex;align-items:baseline;gap:10px;flex-wrap:wrap;margin-bottom:8px}',
      '.ltc-npc-name{font-family:var(--font-title);font-size:1rem;font-weight:700;letter-spacing:.5px;color:var(--text)}',
      '.ltc-npc-loc{font-size:.74rem;color:var(--muted)}',
      '.ltc-chips{display:flex;flex-wrap:wrap;gap:6px;margin-bottom:8px}',
      '.ltc-chip{font-size:.72rem;padding:3px 9px;border-radius:20px;background:rgba(255,255,255,.05);border:1px solid rgba(255,255,255,.09);color:var(--muted)}',
      '.ltc-chip-hit{background:rgba(245,158,11,.14);border-color:rgba(245,158,11,.45);color:#f7c66b;font-weight:700}',
      '.ltc-reward{font-size:.78rem;color:#f0b429;margin-bottom:8px}',
      '.ltc-item-head .ltc-reward{margin-bottom:0}',
      '.ltc-map{display:block;width:100%;border-radius:9px;border:1px solid rgba(255,255,255,.08);margin-top:4px}',
      '.ltc-nomap{font-size:.74rem;color:var(--muted);font-style:italic}',
      '.lt-empty{text-align:center;padding:56px 20px;color:var(--muted)}.lt-empty-icon{font-size:2.4rem;margin-bottom:10px}',
      '@media(max-width:600px){#lt-grid{padding:14px}.lt-cards{grid-template-columns:1fr 1fr}.lt-combo-grid{grid-template-columns:1fr}}',
      '@media(max-width:420px){.lt-cards{grid-template-columns:1fr}}'
    ].join('');
    document.head.appendChild(s);
  }

  /* — Guia das Elemental Bags (recompensas das tasks) — */
  var BAGS = [
    { icon: '🎒', name: 'Common Bag', col: '#7fd1a0', bg: 'rgba(127,209,160,.07)', bc: 'rgba(127,209,160,.22)',
      lines: ['200 itens básicos de craft do elemento da bag'], bonus: '' },
    { icon: '🎒', name: 'Rare Bag', col: '#60aaff', bg: 'rgba(96,170,255,.07)', bc: 'rgba(96,170,255,.22)',
      lines: ['50 fragmentos do elemento', '1 Common Bag do mesmo elemento'],
      bonus: 'Chance pequena de bônus: <b>Boost Stone +0 a +25</b> do elemento' },
    { icon: '🎒', name: 'Mythic Bag', col: '#e040fb', bg: 'rgba(224,64,251,.07)', bc: 'rgba(224,64,251,.22)',
      lines: ['100 fragmentos do elemento', '3 Common Bags do mesmo elemento'],
      bonus: 'Chance pequena de bônus: <b>Boost Stone +26 a +50</b> do elemento' }
  ];

  function _bagsGuide() {
    var cards = BAGS.map(function (b) {
      var lines = b.lines.map(function (l) {
        return '<div class="lt-bag-line"><span class="lt-bag-dot">▸</span><span>' + _esc(l) + '</span></div>';
      }).join('');
      var bonus = b.bonus ? '<div class="lt-bag-bonus">🎲 <span>' + b.bonus + '</span></div>' : '';
      return '<div class="lt-bag" style="--bcol:' + b.col + ';--bbg:' + b.bg + ';--bc:' + b.bc + '">' +
        '<div class="lt-bag-top"><span class="lt-bag-ic">' + b.icon + '</span><span class="lt-bag-name">' + b.name + '</span></div>' +
        '<div class="lt-bag-body">' + lines + bonus + '</div>' +
      '</div>';
    }).join('');
    return '<div class="lt-bags">' +
      '<div class="lt-bags-head"><span class="lt-bags-head-icon">🎒</span>' +
        '<span class="lt-bags-head-title">ELEMENTAL BAGS — recompensas das tasks</span>' +
        '<span class="lt-bags-head-line"></span></div>' +
      '<div class="lt-bags-grid">' + cards + '</div>' +
    '</div>';
  }

  /* — Lookups por espécie nos outros sistemas (objetos completos) — */
  function _npcTasksFor(species) {
    return (global.PA_NPC_TASKS || []).filter(function (n) {
      return (n.task || []).some(function (e) { return _norm(e.name) === species; });
    });
  }
  function _hazardFor(species) {
    return (global.RAW_HAZARD || []).filter(function (h) {
      return String(h.task || '').split(',').some(function (p) {
        var m = p.trim().match(/^\d+\s+Sh\s+(.+)$/i);
        return m && _norm(m[1]) === species;
      });
    });
  }
  function _hazParse(str) {
    return String(str || '').split(',').map(function (p) {
      var m = p.trim().match(/^(\d+)\s+Sh\s+(.+)$/i);
      return m ? { qty: m[1], name: 'Shiny ' + m[2].trim() } : { qty: '', name: p.trim() };
    });
  }

  /* — Modal de COMBO: NPC + quest completa + mapa, por espécie — */
  function _openCombo(species) {
    var combos = _crossCombos(), c = null;
    for (var i = 0; i < combos.length; i++) { if (combos[i].species === species) { c = combos[i]; break; } }
    if (!c) return;
    var ex = document.getElementById('lt-combo-modal'); if (ex) ex.remove();

    var html = '';

    /* LINKED */
    html += '<div class="ltc-sec"><div class="ltc-sec-h" style="--sc:#f59e0b">🔗 Linked Task</div>';
    c.linked.forEach(function (t) {
      var cfg = TYPES[t.type] || TYPES.Normal;
      var map = HUNT_MAPS[t.hunt];
      html += '<div class="ltc-item">' +
        '<div class="ltc-item-head"><b>Derrote ' + _fmtQty(t.qty) + ' ' + _esc(t.name) + '</b>' +
          '<span class="lt-type-badge" style="--c:' + cfg.color + ';--bg:' + cfg.bg + ';--bd:' + cfg.border + '">' + cfg.icon + ' ' + cfg.label + '</span>' +
          '<span class="ltc-reward">🎒 Elemental Bag</span></div>' +
        (map ? '<img class="ltc-map" src="' + _esc(map) + '" alt="Hunt ' + _esc(t.name) + '" loading="lazy">' : '') +
      '</div>';
    });
    html += '</div>';

    /* TASK NPC */
    var npcs = _npcTasksFor(species);
    if (npcs.length) {
      html += '<div class="ltc-sec"><div class="ltc-sec-h" style="--sc:#60aaff">📋 Task NPC</div>';
      npcs.forEach(function (n) {
        var chips = (n.task || []).map(function (e) {
          var hit = _norm(e.name) === species;
          return '<span class="ltc-chip' + (hit ? ' ltc-chip-hit' : '') + '">' + _esc(e.name) + ' ×' + e.qty + '</span>';
        }).join('');
        html += '<div class="ltc-item">' +
          '<div class="ltc-npc"><span class="ltc-npc-name">' + _esc(n.npc) + '</span>' +
            (n.loc ? '<span class="ltc-npc-loc">📍 ' + _esc(n.loc) + '</span>' : '') + '</div>' +
          '<div class="ltc-chips">' + chips + '</div>' +
          (n.reward ? '<div class="ltc-reward">🏆 ' + _esc(n.reward) + '</div>' : '') +
          (n.imgUrl ? '<img class="ltc-map" src="' + _esc(n.imgUrl) + '" alt="Local ' + _esc(n.npc) + '" loading="lazy" onerror="this.style.display=\'none\'">' : '<div class="ltc-nomap">📍 Localização em breve</div>') +
        '</div>';
      });
      html += '</div>';
    }

    /* HAZARD */
    var hazs = _hazardFor(species);
    if (hazs.length) {
      html += '<div class="ltc-sec"><div class="ltc-sec-h" style="--sc:#facc15">⚠️ Hazard Task</div>';
      hazs.forEach(function (h) {
        var chips = _hazParse(h.task).map(function (e) {
          var hit = _norm(e.name) === species;
          return '<span class="ltc-chip' + (hit ? ' ltc-chip-hit' : '') + '">' + _esc(e.name) + (e.qty ? ' ×' + e.qty : '') + '</span>';
        }).join('');
        var mapUrl = h.imgId ? 'https://i.imgur.com/' + h.imgId : '';
        html += '<div class="ltc-item">' +
          '<div class="ltc-npc"><span class="ltc-npc-name">' + _esc(h.npc) + '</span><span class="ltc-npc-loc">tasks de shiny</span></div>' +
          '<div class="ltc-chips">' + chips + '</div>' +
          (mapUrl ? '<img class="ltc-map" src="' + _esc(mapUrl) + '" alt="Local ' + _esc(h.npc) + '" loading="lazy" onerror="this.style.display=\'none\'">' : '') +
        '</div>';
      });
      html += '</div>';
    }

    var m = document.createElement('div');
    m.id = 'lt-combo-modal';
    m.className = 'lt-map-modal';
    m.innerHTML =
      '<div class="lt-map-backdrop" onclick="document.getElementById(\'lt-combo-modal\').remove()"></div>' +
      '<div class="lt-map-box ltc-box">' +
        '<div class="lt-map-head">' +
          '<span class="lt-map-title">⚡ Combos de ' + _esc(c.display) + '</span>' +
          '<button class="lt-map-close" onclick="document.getElementById(\'lt-combo-modal\').remove()">✕</button>' +
        '</div>' +
        '<div class="ltc-body">' + html + '</div>' +
      '</div>';
    document.body.appendChild(m);
    function onKey(e) { if (e.key === 'Escape') { var el = document.getElementById('lt-combo-modal'); if (el) el.remove(); document.removeEventListener('keydown', onKey); } }
    document.addEventListener('keydown', onKey);
  }

  /* — Modal do mapa da hunt (imagem direta resolvida em HUNT_MAPS) — */
  function _openMap(name, imgUrl, albumUrl) {
    var ex = document.getElementById('lt-map-modal');
    if (ex) ex.remove();
    var m = document.createElement('div');
    m.id = 'lt-map-modal';
    m.className = 'lt-map-modal';
    m.innerHTML =
      '<div class="lt-map-backdrop" onclick="document.getElementById(\'lt-map-modal\').remove()"></div>' +
      '<div class="lt-map-box">' +
        '<div class="lt-map-head">' +
          '<span class="lt-map-title">📍 Hunt — ' + _esc(name) + '</span>' +
          '<button class="lt-map-close" onclick="document.getElementById(\'lt-map-modal\').remove()">✕</button>' +
        '</div>' +
        '<div class="lt-map-body">' +
          '<div class="lt-map-loading" id="lt-map-loading">Carregando mapa…</div>' +
          '<img src="' + _esc(imgUrl) + '" alt="' + _esc(name) + '" ' +
            'onload="var l=document.getElementById(\'lt-map-loading\');if(l)l.style.display=\'none\';this.style.opacity=\'1\'" ' +
            'onerror="var l=document.getElementById(\'lt-map-loading\');if(l)l.textContent=\'Não foi possível carregar o mapa.\'">' +
        '</div>' +
      '</div>';
    document.body.appendChild(m);
    function onKey(e) { if (e.key === 'Escape') { var el = document.getElementById('lt-map-modal'); if (el) el.remove(); document.removeEventListener('keydown', onKey); } }
    document.addEventListener('keydown', onKey);
  }

  function renderLinkedTasks() {
    _injectCSS();
    var panel = document.getElementById('wiki-tab-linkedtasks');
    if (!panel) return;
    if (panel.dataset.built) { _render(); return; }
    panel.dataset.built = '1';
    var introHtml =
      '<div class="lt-intro"><div class="lt-intro-lead">As <b>Linked Tasks</b> são uma trilha contínua de hunts: cada missão pede um Pokémon e uma quantidade. ' +
      'Ao concluir, você coleta uma <b>Elemental Bag</b> (no elemento da task) — material direto pro craft de <b>Boost Stone</b> — e libera a próxima missão. ' +
      'Transforma sua rotina de hunt em progresso útil, sem depender de farm aleatório.</div></div>';
    var noteHtml = NOTE
      ? '<div class="lt-note">' + _esc(NOTE).replace(/(https?:\/\/[^\s]+)/g, '<a href="$1" target="_blank" rel="noopener">$1</a>') + '</div>'
      : '';
    panel.innerHTML =
      '<div class="lt-controls">' +
        '<div class="lt-sw">' +
          '<svg width="14" height="14" viewBox="0 0 14 14" fill="none" style="opacity:.5;flex-shrink:0"><circle cx="6" cy="6" r="4.5" stroke="white" stroke-width="1.5"/><path d="M10 10L13 13" stroke="white" stroke-width="1.5" stroke-linecap="round"/></svg>' +
          '<input id="lt-search" type="text" placeholder="Buscar Pokemon...">' +
        '</div>' +
        '<div style="display:flex;gap:6px;flex-wrap:wrap">' +
          '<button class="lt-fbtn active" onclick="LinkedTasks._filt(\'all\',this)">Todas</button>' +
          '<button class="lt-fbtn" onclick="LinkedTasks._filt(\'Normal\',this)">🗺️ Normal</button>' +
          '<button class="lt-fbtn fw" onclick="LinkedTasks._filt(\'Wild\',this)">⚡ Wild</button>' +
          '<button class="lt-fbtn fh" onclick="LinkedTasks._filt(\'Hoenn\',this)">🌿 Hoenn</button>' +
        '</div>' +
        '<span id="lt-count"></span>' +
      '</div>' +
      introHtml +
      noteHtml +
      _bagsGuide() +
      '<div id="lt-grid"></div>';
    var inp = document.getElementById('lt-search');
    if (inp) { var t; inp.addEventListener('input', function () { _q = this.value; clearTimeout(t); t = setTimeout(_render, 120); }); }
    _render();
  }

  global.LinkedTasks = {
    renderLinkedTasks: renderLinkedTasks,
    _map: _openMap,
    _combo: _openCombo,
    _filt: function (d, btn) {
      _type = d;
      var p = document.getElementById('wiki-tab-linkedtasks');
      if (p) p.querySelectorAll('.lt-fbtn').forEach(function (b) { b.classList.remove('active'); });
      if (btn) btn.classList.add('active');
      _render();
    },
    _search: function (name) {
      _q = name; _type = 'all';
      var inp = document.getElementById('lt-search');
      if (inp) inp.value = name;
      var p = document.getElementById('wiki-tab-linkedtasks');
      if (p) { p.querySelectorAll('.lt-fbtn').forEach(function (b) { b.classList.remove('active'); }); var all = p.querySelector('.lt-fbtn'); if (all) all.classList.add('active'); }
      _render();
    }
  };
  global.renderLinkedTasks = renderLinkedTasks;

}(window));
