// ============================================================
// app-wiki-rockets-types.js — extraído de app.js (refactor: quebra do monólito)
// Rockets + dados de tipo (POKE_TYPES/TYPE_CHART/TYPE_COUNTERS/POKE_TYPE_MAIN) e helpers.
// ESCOPO GLOBAL (NÃO é IIFE): preserva os mesmos globais que estavam
// em app.js. DEVE carregar logo após app.js no index.html — não reordenar.
// ============================================================
// ============================================================
// NPC's → Rockets
// Estrutura: { name, wins, pokemons: [{ name, reward }] }
// reward = nome do Pokémon shiny recompensa (buscado em POKEMONS para tag)
// ============================================================

const RAW_ROCKETS = [
  // SHADOW
  { name: 'Shadow', wins: null, pokemons: [
    { name: 'Feraligatr',       reward: 'sh Raichu'    },
    { name: 'Shiny Gengar',     reward: 'sh Sandslash' },
    { name: 'Alakazam',         reward: 'Scizor'       },
    { name: 'Shiny Crobat',     reward: 'sh Golem'     },
    { name: 'Muk',              reward: 'sh Marowak'   },
    { name: 'Houndoom',         reward: 'sh Starmie'   },
  ]},
  // FROST
  { name: 'Frost', wins: null, pokemons: [
    { name: 'Misdreavus',       reward: 'sh Persian'   },
    { name: 'Magcargo',         reward: 'sh Starmie'   },
    { name: 'Hypno',            reward: 'Scizor'       },
    { name: 'Gligar',           reward: 'sh Jynx'      },
    { name: 'Houndour',         reward: 'sh Hitmontop' },
    { name: 'Murkrow',          reward: 'sh Golem'     },
  ]},
  // THORN
  { name: 'Thorn', wins: null, pokemons: [
    { name: 'Shiny Arbok',      reward: 'sh Sandslash' },
    { name: 'Shiny Golbat',     reward: 'sh Golem'     },
    { name: 'Shiny Hypno',      reward: 'Scizor'       },
    { name: 'Shiny Haunter',    reward: 'sh Persian'   },
    { name: 'Shiny Murkrow',    reward: 'sh Jynx'      },
    { name: 'Houndoom',         reward: 'sh Starmie'   },
  ]},
  // CIPHER
  { name: 'Cipher', wins: null, pokemons: [
    { name: 'Feraligatr',       reward: 'sh Raichu'    },
    { name: 'Shiny Persian',    reward: 'sh Hitmontop' },
    { name: 'Venusaur',         reward: 'sh Pidgeot'   },
    { name: 'Electabuzz',       reward: 'sh Sandslash' },
    { name: 'Typhlosion',       reward: 'sh Starmie'   },
    { name: 'Meganium',         reward: 'sh Arcanine'  },
  ]},
  // PHOENIX
  { name: 'Phoenix', wins: null, pokemons: [
    { name: 'Charizard',        reward: 'sh Golem'     },
    { name: 'Shiny Blastoise',  reward: 'sh Venusaur'  },
    { name: 'Venusaur',         reward: 'sh Pidgeot'   },
    { name: 'Shiny Electrode',  reward: 'sh Sandslash' },
    { name: 'Shiny Magneton',   reward: 'sh Arcanine'  },
    { name: 'Blastoise',        reward: 'sh Raichu'    },
  ]},
  // SCYTHE
  { name: 'Scythe', wins: null, pokemons: [
    { name: 'Scyther',          reward: 'sh Arcanine'  },
    { name: 'Shiny Ampharos',   reward: 'sh Golem'     },
    { name: 'Shiny Raichu',     reward: 'sh Sandslash' },
    { name: 'Nidoqueen',        reward: 'sh Jynx'      },
    { name: 'Arcanine',         reward: 'sh Starmie'   },
    { name: 'Shiny Houndoom',   reward: 'sh Hitmontop' },
  ]},
  // MIRAGE
  { name: 'Mirage', wins: null, pokemons: [
    { name: 'Charizard',        reward: 'sh Golem'     },
    { name: 'Shiny Charizard',  reward: 'sh Starmie'   },
    { name: 'Venusaur',         reward: 'sh Pidgeot'   },
    { name: 'Shiny Venusaur',   reward: 'sh Arcanine'  },
    { name: 'Blastoise',        reward: 'sh Venusaur'  },
    { name: 'Shiny Blastoise',  reward: 'sh Raichu'    },
  ]},
  // ZEPHYR
  { name: 'Zephyr', wins: null, pokemons: [
    { name: 'Typhlosion',       reward: 'sh Golem'     },
    { name: 'Shiny Typhlosion', reward: 'sh Starmie'   },
    { name: 'Meganium',         reward: 'sh Pidgeot'   },
    { name: 'Shiny Meganium',   reward: 'sh Arcanine'  },
    { name: 'Feraligatr',       reward: 'sh Venusaur'  },
    { name: 'Shiny Feraligatr', reward: 'sh Raichu'    },
  ]},
  // OBSIDIAN
  { name: 'Obsidian', wins: null, pokemons: [
    { name: 'Shiny Gyarados',   reward: 'sh Raichu'    },
    { name: 'Shiny Persian',    reward: 'sh Hitmontop' },
    { name: 'Shiny Machamp',    reward: 'sh Pidgeot'   },
    { name: 'Shiny Kingdra',    reward: 'sh Clefable'  },
    { name: 'Shiny Pidgeot',    reward: 'sh Golem'     },
    { name: 'Shiny Scizor',     reward: 'sh Arcanine'  },
  ]},
  // VORTEX
  { name: 'Vortex', wins: null, pokemons: [
    { name: 'Shiny Ninetales',  reward: 'sh Starmie'   },
    { name: 'Shiny Magneton',   reward: 'sh Arcanine'  },
    { name: 'Shiny Kabutops',   reward: 'sh Venusaur'  },
    { name: 'Shiny Omastar',    reward: 'sh Raichu'    },
    { name: 'Shiny Pidgeot',    reward: 'sh Golem'     },
    { name: 'Shiny Ampharos',   reward: 'sh Sandslash' },
  ]},
  // TEMPEST
  { name: 'Tempest', wins: null, pokemons: [
    { name: 'Shiny Magmar',     reward: 'sh Starmie'   },
    { name: 'Shiny Snorlax',    reward: 'sh Hitmontop' },
    { name: 'Shiny Mime',       reward: 'Scizor'       },
    { name: 'Shiny Pupitar',    reward: 'sh Venusaur'  },
    { name: 'Shiny Umbreon',    reward: 'sh Clefable'  },
    { name: 'Shiny Misdreavus', reward: 'sh Persian'   },
  ]},
  // ECLIPSE
  { name: 'Eclipse', wins: null, pokemons: [
    { name: 'Shiny Dragonair',  reward: 'sh Clefable'  },
    { name: 'Shiny Arcanine',   reward: 'sh Starmie'   },
    { name: 'Shiny Espeon',     reward: 'sh Persian'   },
    { name: 'Shiny Pinsir',     reward: 'sh Pidgeot'   },
    { name: 'Shiny Tauros',     reward: 'sh Hitmontop' },
    { name: 'Shiny Skarmory',   reward: 'sh Arcanine'  },
  ]},
  // GIOVANNI (especial)
  { name: 'Giovanni', wins: 130, pokemons: [
    { name: 'Shiny Nidoqueen',  reward: 'sh Sandslash' },
    { name: 'Shiny Persian',    reward: 'Machamp'      },
    { name: 'Shiny Rhydon',     reward: 'sh Venusaur'  },
    { name: 'Shiny Nidoking',   reward: 'sh Jynx'      },
    { name: 'Shiny Kangaskhan', reward: 'sh Hitmontop' },
    { name: 'Shiny Dugtrio',    reward: 'Gyarados'     },
  ]},
];

// Helper: busca tag/tier de um Pokémon pelo nome no array POKEMONS
function getRocketRewardData(pokeName) {
  // Normaliza: "sh Raichu" → "Shiny Raichu", "sh Golem" → "Shiny Golem", etc.
  var normalized = pokeName.replace(/^sh\s+/i, 'Shiny ');
  var found = POKEMONS.find(function(p) {
    return p.name.toLowerCase() === normalized.toLowerCase();
  });
  return found || null;
}

function getShowdownSpriteRocket(name) {
  var isShiny = /^shiny\s+/i.test(name);
  var n = toShowdownName(name);
  var base = 'https://play.pokemonshowdown.com/sprites/' + (isShiny ? 'gen5-shiny/' : 'gen5/') + n + '.png';
  return base;
}

var _rocketsRendered = false;

// ── Tipos por Pokémon (Gen 1-2 relevantes para o jogo) ───────────────────────
var POKE_TYPES = {
  // Water
  'shiny feraligatr':['water'],'shiny gyarados':['water','flying'],
  'starmie':['water','psychic'],'shiny starmie':['water','psychic'],'politoad':['water'],'shiny politoad':['water'],
  'vaporeon':['water'],'shiny vaporeon':['water'],'lapras':['water','ice'],'shiny lapras':['water','ice'],
  'shiny slowking':['water','psychic'],'mantine':['water','flying'],'shiny mantine':['water','flying'],
  'qwilfish':['water','poison'],'shiny qwilfish':['water','poison'],'kingdra':['dragon','water'],'shiny kingdra':['dragon','water'],
  'magmar':['fire'],
  // Fire
  'shiny charizard':['fire','flying'],'shiny typhlosion':['fire'],
  'flareon':['fire'],'shiny flareon':['fire'],
  'rapidash':['fire'],'shiny rapidash':['fire'],'shiny magcargo':['fire','rock'],
  
  // Grass
  'shiny venusaur':['grass','poison'],'shiny meganium':['grass'],
  'exeggutor':['grass','psychic'],'shiny exeggutor':['grass','psychic'],'victreebel':['grass','poison'],'shiny victreebel':['grass','poison'],
  'vileplume':['grass','poison'],'shiny vileplume':['grass','poison'],'tangela':['grass'],'shiny tangela':['grass'],
  'bellossom':['grass'],'shiny bellossom':['grass'],'tangrowth':['grass'],'shiny tangrowth':['grass'],
  // Electric
  'raichu':['electric'],'shiny raichu':['electric'],'ampharos':['electric'],'shiny ampharos':['electric'],
  'electrode':['electric'],'shiny electrode':['electric'],'magneton':['electric','steel'],'shiny magneton':['electric','steel'],
  'jolteon':['electric'],'shiny jolteon':['electric'],'luxray':['electric'],'shiny luxray':['electric'],
  // Psychic
  'espeon':['psychic'],'shiny espeon':['psychic'],
  'xatu':['psychic','flying'],'shiny xatu':['psychic','flying'],'slowking':['water','psychic'],
  // Ghost/Dark
  'shiny gengar':['ghost','poison'],'shiny misdreavus':['ghost'],
  'haunter':['ghost','poison'],'shiny haunter':['ghost','poison'],'dusknoir':['ghost'],'shiny dusknoir':['ghost'],
  'umbreon':['dark'],'shiny umbreon':['dark'],
  // Fighting
  'machamp':['fighting'],'shiny machamp':['fighting'],'hitmonchan':['fighting'],'shiny hitmonchan':['fighting'],
  'hitmonlee':['fighting'],'shiny hitmonlee':['fighting'],'hitmontop':['fighting'],'shiny hitmontop':['fighting'],
  'primeape':['fighting'],'shiny primeape':['fighting'],'heracross':['bug','fighting'],'shiny heracross':['bug','fighting'],
  'poliwrath':['water','fighting'],'shiny poliwrath':['water','fighting'],
  // Normal/Flying
  'pidgeot':['normal','flying'],'shiny pidgeot':['normal','flying'],'fearow':['normal','flying'],'shiny fearow':['normal','flying'],
  'dodrio':['normal','flying'],'shiny dodrio':['normal','flying'],'kangaskhan':['normal'],'shiny kangaskhan':['normal'],
  'shiny muk':['poison'],
  // Ground/Rock
  'golem':['rock','ground'],'shiny golem':['rock','ground'],'marowak':['ground'],'shiny marowak':['ground'],
  'shiny nidoking':['poison','ground'],'shiny nidoqueen':['poison','ground'],
  'rhydon':['ground','rock'],'shiny rhydon':['ground','rock'],'dugtrio':['ground'],'shiny dugtrio':['ground'],
  
  // Steel/Ice
  'shiny scizor':['bug','steel'],'steelix':['steel','ground'],'shiny steelix':['steel','ground'],
  'skarmory':['steel','flying'],'shiny skarmory':['steel','flying'],'onix':['rock','ground'],'shiny onix':['rock','ground'],
  'jynx':['ice','psychic'],'shiny jynx':['ice','psychic'],'pinsir':['bug'],'shiny pinsir':['bug'],
  // Poison/Bug
  'arbok':['poison'],'shiny arbok':['poison'],'crobat':['poison','flying'],'shiny crobat':['poison','flying'],
  'ariados':['bug','poison'],'shiny ariados':['bug','poison'],'tentacruel':['water','poison'],'shiny tentacruel':['water','poison'],
  'toxicroak':['poison','fighting'],'shiny toxicroak':['poison','fighting'],
  // Dragon
  'dragonair':['dragon'],'shiny dragonair':['dragon'],
  // Others
  'tauros':['normal'],'shiny tauros':['normal'],'persian':['normal'],'shiny persian':['normal'],
  'shiny arcanine':['fire'],
  'shiny blastoise':['water'],
  'shiny murkrow':['dark','flying'],'ninetales':['fire'],'shiny ninetales':['fire'],
  // Officer pokemons previously missing
  'forretress':['bug','steel'],'shiny forretress':['bug','steel'],
  'sudowoodo':['rock'],'shiny sudowoodo':['rock'],
  'sandslash':['ground'],'shiny sandslash':['ground'],
  'donphan':['ground'],'shiny donphan':['ground'],
  'shiny scyther':['bug','flying'],
  'lanturn':['water','electric'],'shiny lanturn':['water','electric'],
  'shiny electabuzz':['electric'],
  'jumpluff':['grass','flying'],'shiny jumpluff':['grass','flying'],
  'piloswine':['ice','ground'],'shiny piloswine':['ice','ground'],
  'cloyster':['water','ice'],'shiny cloyster':['water','ice'],
  'dewgong':['water','ice'],'shiny dewgong':['water','ice'],
  'sneasel':['dark','ice'],'shiny sneasel':['dark','ice'],
  'shiny alakazam':['psychic'],
  
  'shiny houndoom':['dark','fire'],
  'tyranitar':['rock','dark'],'shiny tyranitar':['rock','dark'],
  'weezing':['poison'],'shiny weezing':['poison'],

  // Pokémons dos Rockets faltando (adicionados para corrigir fraquezas/counters no card)
  // Thorn
  'golbat':['poison','flying'],'shiny golbat':['poison','flying'],
  'shiny hypno':['psychic'],
  // Tempest
  'mr. mime':['psychic'],'shiny mr. mime':['psychic'],'shiny mime':['psychic'],
  'snorlax':['normal'],'shiny snorlax':['normal'],
  'shiny magmar':['fire'],
  'pupitar':['rock','ground'],'shiny pupitar':['rock','ground'],
  // Vortex
  'omastar':['rock','water'],'shiny omastar':['rock','water'],
  'kabutops':['rock','water'],'shiny kabutops':['rock','water'],
  // Pokémons normais (sem shiny) usados pelos Rockets
  'venusaur':['grass','poison'],'blastoise':['water'],'meganium':['grass'],
  'charizard':['fire','flying'],'feraligatr':['water'],'typhlosion':['fire'],
  'alakazam':['psychic'],'electabuzz':['electric'],'arcanine':['fire'],
  'scyther':['bug','flying'],'nidoqueen':['poison','ground'],'nidoking':['poison','ground'],
  'misdreavus':['ghost'],'magcargo':['fire','rock'],'hypno':['psychic'],
  'gligar':['ground','flying'],'murkrow':['dark','flying'],'houndour':['dark','fire'],
  'houndoom':['dark','fire'],'muk':['poison'],'gengar':['ghost','poison'],
  'scizor':['bug','steel'],'gyarados':['water','flying'],
};

// Tabela completa de multiplicadores de dano por tipo atacante vs tipo defensor
// 0 = imune, 0.5 = resistente, 1 = neutro, 2 = fraco
var TYPE_CHART = {
  normal:   { fighting:2, ghost:0 },
  fire:     { fire:0.5, water:2, grass:0.5, ice:0.5, ground:2, rock:2, bug:0.5, steel:0.5, fairy:0.5 },
  water:    { fire:0.5, water:0.5, electric:2, grass:2, ice:0.5, steel:0.5 },
  electric: { electric:0.5, ground:2, flying:0.5, steel:0.5 },
  grass:    { fire:2, water:0.5, electric:0.5, grass:0.5, ice:2, poison:2, ground:0.5, flying:2, bug:2 },
  ice:      { fire:2, ice:0.5, fighting:2, rock:2, steel:2 },
  fighting: { flying:2, psychic:2, bug:0.5, rock:0.5, dark:0.5, fairy:2 },
  poison:   { fighting:0.5, poison:0.5, ground:2, bug:0.5, grass:0.5, psychic:2, fairy:0.5 },
  ground:   { water:2, electric:0, grass:2, ice:2, poison:0.5, rock:0.5 },
  flying:   { electric:2, grass:0.5, ice:2, fighting:0.5, ground:0, bug:0.5, rock:2 },
  psychic:  { fighting:0.5, psychic:0.5, bug:2, ghost:2, dark:2 },
  bug:      { fire:2, grass:0.5, fighting:0.5, ground:0.5, flying:2, rock:2 },
  rock:     { normal:0.5, fire:0.5, water:2, grass:2, fighting:2, poison:0.5, ground:2, flying:0.5, steel:2 },
  ghost:    { normal:0, fighting:0, poison:0.5, bug:0.5, ghost:2, dark:2 },
  dragon:   { fire:0.5, water:0.5, electric:0.5, grass:0.5, ice:2, dragon:2, fairy:2 },
  dark:     { fighting:2, psychic:0, bug:2, ghost:0.5, dark:0.5, fairy:2 },
  steel:    { normal:0.5, fire:2, water:0.5, electric:0.5, grass:0.5, ice:0.5, fighting:2, poison:0, ground:2, flying:0.5, psychic:0.5, bug:0.5, rock:0.5, dragon:0.5, steel:0.5, fairy:0.5 },
  fairy:    { fighting:0.5, bug:0.5, dark:0.5, poison:2, steel:2, dragon:0 },
};

// Calcula as fraquezas reais considerando duplo tipo (resistências cancelam fraquezas)
function getPokeWeaknesses(pokeName) {
  var key = pokeName.replace(/^sh\s+/i,'shiny ').toLowerCase().trim();
  var types = POKE_TYPES[key] || [];
  if (!types.length) return [];

  var allAttackTypes = ['normal','fire','water','electric','grass','ice','fighting','poison',
                        'ground','flying','psychic','bug','rock','ghost','dragon','dark','steel','fairy'];

  var weaknesses = [];
  allAttackTypes.forEach(function(atk) {
    var mult = 1;
    types.forEach(function(def) {
      var row = TYPE_CHART[def];
      if (row && row[atk] !== undefined) mult *= row[atk];
    });
    if (mult > 1) weaknesses.push(atk);
  });
  return weaknesses;
}

// Pokémons no POKEMONS array por tipo principal (para sugerir counters)
var TYPE_COUNTERS = {
  water:    ['electric','grass'],
  fire:     ['water','rock','ground'],
  grass:    ['fire','ice','flying','bug','poison'],
  electric: ['ground'],
  psychic:  ['dark','ghost','bug'],
  ghost:    ['ghost','dark'],
  dark:     ['fighting','fairy','bug'],
  fighting: ['psychic','flying'],
  poison:   ['ground','psychic'],
  ground:   ['water','grass','ice'],
  flying:   ['electric','ice','rock'],
  rock:     ['water','grass','fighting','ground'],
  ice:      ['fire','fighting','rock','steel'],
  dragon:   ['ice','fairy','dragon'],
  steel:    ['fire','fighting','ground'],
  normal:   ['fighting'],
  bug:      ['fire','flying','rock'],
};

// Tipo de cada Pokémon disponível no POKEMONS (para counters)
var POKE_TYPE_MAIN = {
  'shiny ampharos':'electric','shiny arbok':'poison','shiny ariados':'bug','shiny bellossom':'grass',
  'shiny blastoise':'water','shiny charizard':'fire','shiny crobat':'poison','shiny donphan':'ground',
  'shiny dugtrio':'ground','shiny exeggutor':'grass','shiny farfetch\'d':'normal',
  'shiny fearow':'normal','shiny feraligatr':'water','shiny flareon':'fire','shiny golem':'rock',
  'shiny gyarados':'water','shiny hitmonchan':'fighting','shiny hitmonlee':'fighting','shiny hitmontop':'fighting',
  'shiny jolteon':'electric','shiny jynx':'ice','shiny kingdra':'dragon','shiny lapras':'water',
  'shiny magcargo':'fire','shiny magneton':'electric','shiny mantine':'water',
  'shiny marowak':'ground','shiny meganium':'grass','shiny misdreavus':'ghost','shiny muk':'poison',
  'shiny nidoking':'poison','shiny nidoqueen':'poison','shiny ninetales':'fire','shiny onix':'rock',
  'shiny persian':'normal','shiny pidgeot':'normal','shiny politoad':'water','shiny poliwrath':'water',
  'shiny primeape':'fighting','shiny qwilfish':'water','shiny raichu':'electric','shiny rapidash':'fire',
  'shiny rhydon':'ground','shiny sandslash':'ground','shiny scizor':'steel','shiny skarmory':'steel',
  'shiny slowking':'water','shiny starmie':'water','shiny steelix':'steel','shiny tangela':'grass',
  'shiny tangrowth':'grass','shiny tentacruel':'water','shiny torterra':'grass','shiny toxicroak':'poison',
  'shiny typhlosion':'fire','shiny umbreon':'dark','shiny vaporeon':'water','shiny venusaur':'grass',
  'shiny victreebel':'grass','shiny vileplume':'grass','shiny xatu':'psychic','shiny dodrio':'normal',
  'shiny heracross':'bug','shiny arcanine':'fire','shiny kangaskhan':'normal','shiny delibird':'ice',
  'shiny dusknoir':'ghost','shiny espeon':'psychic','shiny luxray':'electric','shiny dragonair':'dragon',
  'shiny pinsir':'bug','shiny tauros':'normal','shiny electrode':'electric',
  'dusknoir':'ghost','luxray':'electric','tangrowth':'grass','torterra':'grass','shiny machamp':'fighting',
  'shiny forretress':'bug','shiny sudowoodo':'rock','shiny scyther':'bug',
};



function getCountersFromPOKEMONS(pokeName) {
  var weaknesses = getPokeWeaknesses(pokeName);
  if (!weaknesses.length) return [];
  var results = [];
  POKEMONS.forEach(function(p) {
    // Usa o tipo do banner (tipo que o Pokémon realmente usa no servidor)
    var pType = getTypeFromBanner(p.bannerImage);
    if (pType && weaknesses.indexOf(pType) !== -1) {
      results.push(p);
    }
  });
  // Ordena por tier: t1 > t2 > t3 > super-raro
  var tierOrder = { 't1':1,'t2':2,'t3':3,'t4':4,'t5':5,'super-raro':0,'hard':6,'mark':7 };
  results.sort(function(a,b) {
    return (tierOrder[a.tag]||9) - (tierOrder[b.tag]||9);
  });
  return results;
}

function getRocketsUsingPokemon(pokeName) {
  var norm = pokeName.toLowerCase();
  var found = [];
  RAW_ROCKETS.forEach(function(rocket) {
    rocket.pokemons.forEach(function(entry) {
      if (entry.name.toLowerCase() === norm) {
        found.push(rocket.name);
      }
    });
  });
  return found;
}

function openRocketPokeInfo(pokeName) {
  var existing = document.getElementById('rocket-poke-modal');
  if (existing) existing.remove();

  var rocketLookupKey = pokeName.replace(/^sh\s+/i,'shiny ').toLowerCase().trim();
  var counters = getCountersFromPOKEMONS(rocketLookupKey);
  var usedBy   = getRocketsUsingPokemon(pokeName);
  var weaknesses = getPokeWeaknesses(rocketLookupKey);
  var types = (POKE_TYPES[rocketLookupKey] || []);
  var spriteUrl = getShowdownSpriteRocket(pokeName);

  var TCFG = {
    't1':{'label':'T1','cls':'tier-t1'},'t2':{'label':'T2','cls':'tier-t2'},'t3':{'label':'T3','cls':'tier-t3'},
    't4':{'label':'T4','cls':'tier-t4'},'t5':{'label':'T5','cls':'tier-t5'},'hard':{'label':'HARD','cls':'tier-hard'},
    'mark':{'label':'MARK','cls':'tier-mark'},'super-raro':{'label':'SUPER RARO','cls':'tier-super-raro'},
  };

  var TYPE_COLORS_LOCAL = {
    fire:'#f97316',water:'#3b82f6',grass:'#22c55e',electric:'#eab308',psychic:'#ec4899',
    ghost:'#8b5cf6',dark:'#6b7280',fighting:'#ef4444',poison:'#a855f7',ground:'#b45309',
    flying:'#7dd3fc',rock:'#a3a3a3',ice:'#67e8f9',dragon:'#6366f1',steel:'#94a3b8',
    normal:'#d4d4d4',bug:'#84cc16',fairy:'#f9a8d4',
  };

  var typeChips = types.map(function(t) {
    var c = TYPE_COLORS_LOCAL[t] || '#aaa';
    return '<span style="background:'+c+';color:#000;font-size:10px;font-weight:700;padding:2px 8px;border-radius:4px;text-transform:uppercase;">'+t+'</span>';
  }).join(' ');

  var weakChips = weaknesses.map(function(t) {
    var c = TYPE_COLORS_LOCAL[t] || '#aaa';
    return '<span style="background:'+c+'22;border:1px solid '+c+';color:'+c+';font-size:10px;font-weight:700;padding:2px 8px;border-radius:4px;text-transform:uppercase;">'+t+'</span>';
  }).join(' ');

  var usedByHtml = usedBy.length
    ? usedBy.map(function(n){return '<span class="rpoke-rocket-tag">🚀 '+n+'</span>';}).join('')
    : '<span style="color:#666;font-size:12px">Nenhum</span>';

  var counterCards = counters.length
    ? counters.map(function(p) {
        var tc = TCFG[p.tag] ? '<span class="tier-tag '+TCFG[p.tag].cls+'">'+TCFG[p.tag].label+'</span>' : '';
        var spr = getShowdownSpriteRocket(p.name);
        var gif = p.image || '';
        var mainSrc = gif || spr;
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
        return '<div class="rpoke-counter-card">' +
          '<img src="'+mainSrc+'" alt="'+p.name+'" onerror="this.src=\''+spr+'\';this.onerror=null;" />' +
          '<div class="rpoke-counter-name">'+counterDisplayName+'</div>' +
          (counterTypeChips ? '<div style="display:flex;flex-wrap:wrap;gap:2px;justify-content:center">'+counterTypeChips+'</div>' : '') +
          '<div>'+tc+'</div>' +
        '</div>';
      }).join('')
    : '<div style="color:#666;font-size:12px;padding:8px">Nenhum counter encontrado no catálogo.</div>';

  var modal = document.createElement('div');
  modal.id = 'rocket-poke-modal';
  modal.innerHTML =
    '<div class="rpoke-backdrop" onclick="document.getElementById(\'rocket-poke-modal\').remove()"></div>' +
    '<div class="rpoke-panel">' +
      '<button class="rpoke-close" onclick="document.getElementById(\'rocket-poke-modal\').remove()">✕</button>' +
      '<div class="rpoke-header">' +
        '<img class="rpoke-main-sprite" src="'+spriteUrl+'" alt="'+pokeName+'" onerror="this.style.opacity=\'0.3\'" />' +
        '<div class="rpoke-title-block">' +
          '<div class="rpoke-poke-name">'+pokeName+'</div>' +
          '<div class="rpoke-chips">'+typeChips+'</div>' +
        '</div>' +
      '</div>' +

      '<div class="rpoke-section-label">⚔️ Fraquezas</div>' +
      '<div class="rpoke-chips-row">'+(weakChips||'<span style="color:#666;font-size:12px">Sem fraquezas conhecidas</span>')+'</div>' +

      '<div class="rpoke-section-label">🚀 Usado pelos Rockets</div>' +
      '<div class="rpoke-usedby">'+usedByHtml+'</div>' +

      '<div class="rpoke-section-label">✅ Pokémons recomendados para batalhar</div>' +
      '<div class="rpoke-counters-grid">'+counterCards+'</div>' +
    '</div>';

  document.body.appendChild(modal);
}

