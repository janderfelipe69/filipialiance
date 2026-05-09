/* ================================================================
   tierlist-popup.js — Card animado de detalhes do Pokémon
   Mostra sprite animado, tipos e efetividades de tipo
   Carregue APÓS tierlist.js e tierlist-types.js no index.html:
     <script src="tierlist-popup.js"></script>
================================================================ */
(function () {

const TYPE_CHART = {
  normal:   { weak:['fighting'],                          resist:[],                                    immune:['ghost'] },
  fire:     { weak:['water','ground','rock'],             resist:['fire','grass','ice','bug','steel','fairy'], immune:[] },
  water:    { weak:['electric','grass'],                  resist:['fire','water','ice','steel'],         immune:[] },
  grass:    { weak:['fire','ice','poison','flying','bug'],resist:['water','electric','grass','ground'],   immune:[] },
  electric: { weak:['ground'],                           resist:['electric','flying','steel'],           immune:[] },
  ice:      { weak:['fire','fighting','rock','steel'],    resist:['ice'],                                immune:[] },
  fighting: { weak:['flying','psychic','fairy'],          resist:['bug','rock','dark'],                  immune:[] },
  poison:   { weak:['ground','psychic'],                  resist:['grass','fighting','poison','bug','fairy'], immune:[] },
  ground:   { weak:['water','grass','ice'],               resist:['poison','rock'],                      immune:['electric'] },
  flying:   { weak:['electric','ice','rock'],             resist:['grass','fighting','bug'],             immune:['ground'] },
  psychic:  { weak:['bug','ghost','dark'],                resist:['fighting','psychic'],                 immune:[] },
  bug:      { weak:['fire','flying','rock'],              resist:['grass','fighting','ground'],          immune:[] },
  rock:     { weak:['water','grass','fighting','ground','steel'], resist:['normal','fire','poison','flying'], immune:[] },
  ghost:    { weak:['ghost','dark'],                      resist:['poison','bug'],                       immune:['normal','fighting'] },
  dragon:   { weak:['ice','dragon','fairy'],              resist:['fire','water','electric','grass'],    immune:[] },
  dark:     { weak:['fighting','bug','fairy'],            resist:['ghost','dark'],                       immune:['psychic'] },
  steel:    { weak:['fire','fighting','ground'],          resist:['normal','grass','ice','flying','psychic','bug','rock','dragon','steel','fairy'], immune:['poison'] },
  fairy:    { weak:['poison','steel'],                    resist:['fighting','bug','dark'],              immune:['dragon'] },
};

const TYPE_LABELS = {
  normal:'Normal', fire:'Fogo', water:'Água', grass:'Planta',
  electric:'Elétrico', ice:'Gelo', fighting:'Lutador', poison:'Veneno',
  ground:'Terra', flying:'Voador', psychic:'Psíquico', bug:'Inseto',
  rock:'Pedra', ghost:'Fantasma', dragon:'Dragão', dark:'Sombrio',
  steel:'Aço', fairy:'Fada',
};

const TYPE_COLORS = {
  normal:'#a8a878', fire:'#f08030', water:'#6890f0', grass:'#78c850',
  electric:'#f8d030', ice:'#98d8d8', fighting:'#c03028', poison:'#a040a0',
  ground:'#e0c068', flying:'#a890f0', psychic:'#f85888', bug:'#a8b820',
  rock:'#b8a038', ghost:'#705898', dragon:'#7038f8', dark:'#a07858',
  steel:'#b8b8d0', fairy:'#ee99ac',
};

const TYPE_IMGS = {
  water:'https://i.imgur.com/zpRe43i.png', steel:'https://i.imgur.com/GleRjiM.png',
  rock:'https://i.imgur.com/GvD1Mtq.png', psychic:'https://i.imgur.com/ASiZi1K.png',
  poison:'https://i.imgur.com/xfX0ReE.png', normal:'https://i.imgur.com/w2ChsIe.png',
  ice:'https://i.imgur.com/ssFz0sA.png', ground:'https://i.imgur.com/JPcD2l3.png',
  fire:'https://i.imgur.com/O8TONGE.png', grass:'https://i.imgur.com/YjKxtoE.png',
  electric:'https://i.imgur.com/Yv2WEYc.png', dark:'https://i.imgur.com/7Luj4az.png',
  dragon:'https://i.imgur.com/o7JWbaN.png', ghost:'https://i.imgur.com/HuybbPn.png',
  fairy:'https://i.imgur.com/j3HaXTh.png', flying:'https://i.imgur.com/npGjQae.png',
  bug:'https://i.imgur.com/V4IXR51.png', fighting:'https://i.imgur.com/OKsJXh7.png',
};

const POKEMON_TYPES = {
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
  "Nidoran Female":["poison"],"Nidorina":["poison"],"Nidoqueen":["poison","ground"],
  "Nidoran Male":["poison"],"Nidorino":["poison"],"Nidoking":["poison","ground"],
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
  "Hitmonlee":["fighting"],"Hitmonchan":["fighting"],"Hitmontop":["fighting"],
  "Lickitung":["normal"],
  "Koffing":["poison"],"Weezing":["poison"],
  "Rhyhorn":["ground","rock"],"Rhydon":["ground","rock"],
  "Chansey":["normal"],"Blissey":["normal"],
  "Tangela":["grass"],"Kangaskhan":["normal"],
  "Horsea":["water"],"Seadra":["water"],
  "Goldeen":["water"],"Seaking":["water"],
  "Staryu":["water"],"Starmie":["water","psychic"],
  "Mr. Mime":["psychic","fairy"],
  "Scyther":["bug","flying"],"Scizor":["bug","steel"],
  "Jynx":["ice","psychic"],"Electabuzz":["electric"],"Magmar":["fire"],
  "Pinsir":["bug"],"Tauros":["normal"],
  "Magikarp":["water"],"Gyarados":["water","flying"],
  "Lapras":["water","ice"],"Ditto":["normal"],"Eevee":["normal"],
  "Vaporeon":["water"],"Jolteon":["electric"],"Flareon":["fire"],
  "Porygon":["normal"],"Porygon2":["normal"],"Porygon-Z":["normal"],
  "Omanyte":["rock","water"],"Omastar":["rock","water"],
  "Kabuto":["rock","water"],"Kabutops":["rock","water"],
  "Aerodactyl":["rock","flying"],"Snorlax":["normal"],
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
  "Bellossom":["grass"],"Marill":["water","fairy"],"Azumarill":["water","fairy"],
  "Sudowoodo":["rock"],"Politoed":["water"],
  "Hoppip":["grass","flying"],"Skiploom":["grass","flying"],"Jumpluff":["grass","flying"],
  "Aipom":["normal"],"Sunkern":["grass"],"Sunflora":["grass"],
  "Yanma":["bug","flying"],"Wooper":["water","ground"],"Quagsire":["water","ground"],
  "Espeon":["psychic"],"Umbreon":["dark"],"Murkrow":["dark","flying"],
  "Slowking":["water","psychic"],"Misdreavus":["ghost"],"Unown":["psychic"],
  "Wobbuffet":["psychic"],"Girafarig":["normal","psychic"],
  "Pineco":["bug"],"Forretress":["bug","steel"],"Dunsparce":["normal"],
  "Gligar":["ground","flying"],"Steelix":["steel","ground"],
  "Snubbull":["fairy"],"Granbull":["fairy"],"Qwilfish":["water","poison"],
  "Shuckle":["bug","rock"],"Heracross":["bug","fighting"],"Sneasel":["dark","ice"],
  "Teddiursa":["normal"],"Ursaring":["normal"],
  "Slugma":["fire"],"Magcargo":["fire","rock"],
  "Swinub":["ice","ground"],"Piloswine":["ice","ground"],
  "Corsola":["water","rock"],"Remoraid":["water"],"Octillery":["water"],
  "Delibird":["ice","flying"],"Mantine":["water","flying"],"Skarmory":["steel","flying"],
  "Houndour":["dark","fire"],"Houndoom":["dark","fire"],"Kingdra":["water","dragon"],
  "Phanpy":["ground"],"Donphan":["ground"],"Stantler":["normal"],"Smeargle":["normal"],
  "Tyrogue":["fighting"],"Smoochum":["ice","psychic"],"Elekid":["electric"],"Magby":["fire"],
  "Miltank":["normal"],
  "Raikou":["electric"],"Entei":["fire"],"Suicune":["water"],
  "Larvitar":["rock","ground"],"Pupitar":["rock","ground"],"Tyranitar":["rock","dark"],
  "Lugia":["psychic","flying"],"Ho-oh":["fire","flying"],"Celebi":["psychic","grass"],
  "Treecko":["grass"],"Grovyle":["grass"],"Sceptile":["grass"],
  "Torchic":["fire"],"Combusken":["fire","fighting"],"Blaziken":["fire","fighting"],
  "Mudkip":["water"],"Marshtomp":["water","ground"],"Swampert":["water","ground"],
  "Poochyena":["dark"],"Mightyena":["dark"],"Zigzagoon":["normal"],"Linoone":["normal"],
  "Wurmple":["bug"],"Silcoon":["bug"],"Beautifly":["bug","flying"],
  "Cascoon":["bug"],"Dustox":["bug","poison"],
  "Lotad":["water","grass"],"Lombre":["water","grass"],"Ludicolo":["water","grass"],
  "Seedot":["grass"],"Nuzleaf":["grass","dark"],"Shiftry":["grass","dark"],
  "Taillow":["normal","flying"],"Swellow":["normal","flying"],
  "Wingull":["water","flying"],"Pelipper":["water","flying"],
  "Ralts":["psychic","fairy"],"Kirlia":["psychic","fairy"],"Gardevoir":["psychic","fairy"],
  "Surskit":["bug","water"],"Masquerain":["bug","flying"],"Breloom":["grass","fighting"],
  "Slakoth":["normal"],"Vigoroth":["normal"],"Slaking":["normal"],
  "Nincada":["bug","ground"],"Ninjask":["bug","flying"],"Shedinja":["bug","ghost"],
  "Whismur":["normal"],"Loudred":["normal"],"Exploud":["normal"],
  "Makuhita":["fighting"],"Hariyama":["fighting"],"Azurill":["normal","fairy"],
  "Nosepass":["rock"],"Skitty":["normal"],"Delcatty":["normal"],
  "Sableye":["dark","ghost"],"Mawile":["steel","fairy"],
  "Aron":["steel","rock"],"Lairon":["steel","rock"],"Aggron":["steel","rock"],
  "Meditite":["fighting","psychic"],"Medicham":["fighting","psychic"],
  "Electrike":["electric"],"Manectric":["electric"],
  "Plusle":["electric"],"Minun":["electric"],"Volbeat":["bug"],"Illumise":["bug"],
  "Roselia":["grass","poison"],"Gulpin":["poison"],"Swalot":["poison"],
  "Carvanha":["water","dark"],"Sharpedo":["water","dark"],
  "Wailmer":["water"],"Wailord":["water"],"Numel":["fire","ground"],"Camerupt":["fire","ground"],
  "Torkoal":["fire"],"Spoink":["psychic"],"Grumpig":["psychic"],"Spinda":["normal"],
  "Trapinch":["ground"],"Vibrava":["ground","dragon"],"Flygon":["ground","dragon"],
  "Cacnea":["grass","dark"],"Cacturne":["grass","dark"],
  "Swablu":["normal","flying"],"Altaria":["dragon","flying"],
  "Zangoose":["normal"],"Seviper":["poison"],
  "Lunatone":["rock","psychic"],"Solrock":["rock","psychic"],
  "Barboach":["water","ground"],"Whiscash":["water","ground"],
  "Corphish":["water"],"Crawdaunt":["water","dark"],
  "Baltoy":["ground","psychic"],"Claydol":["ground","psychic"],
  "Cradily":["rock","grass"],"Anorith":["rock","bug"],"Armaldo":["rock","bug"],
  "Feebas":["water"],"Milotic":["water"],"Castform":["normal"],"Kecleon":["normal"],
  "Shuppet":["ghost"],"Banette":["ghost"],
  "Duskull":["ghost"],"Dusclops":["ghost"],"Dusknoir":["ghost"],
  "Tropius":["grass","flying"],"Chimecho":["psychic"],"Absol":["dark"],"Wynaut":["psychic"],
  "Snorunt":["ice"],"Glalie":["ice"],
  "Spheal":["ice","water"],"Sealeo":["ice","water"],"Walrein":["ice","water"],
  "Clamperl":["water"],"Huntail":["water"],"Gorebyss":["water"],
  "Relicanth":["water","rock"],"Luvdisc":["water"],
  "Bagon":["dragon"],"Shelgon":["dragon"],"Salamence":["dragon","flying"],
  "Beldum":["steel","psychic"],"Metang":["steel","psychic"],"Metagross":["steel","psychic"],
  "Regirock":["rock"],"Regice":["ice"],"Registeel":["steel"],
  "Latias":["dragon","psychic"],"Latios":["dragon","psychic"],
  "Kyogre":["water"],"Groudon":["ground"],"Rayquaza":["dragon","flying"],
  "Jirachi":["steel","psychic"],"Deoxys":["psychic"],
  "Toxicroak":["poison","fighting"],
  "Abomasnow":["grass","ice"],"Mega Abomasnow":["grass","ice"],
  // Mega Evolutions
  "Mega Venusaur":["grass","poison"],
  "Mega Charizard X":["fire","dragon"],
  "Mega Charizard Y":["fire","flying"],
  "Mega Blastoise":["water"],
  "Mega Beedrill":["bug","poison"],
  "Mega Pidgeot":["normal","flying"],
  "Mega Alakazam":["psychic"],
  "Mega Slowbro":["water","psychic"],
  "Mega Gengar":["ghost","poison"],
  "Mega Kangaskhan":["normal"],
  "Mega Pinsir":["bug","flying"],
  "Mega Gyarados":["water","dark"],
  "Mega Aerodactyl":["rock","flying"],
  "Mega Mewtwo X":["psychic","fighting"],
  "Mega Mewtwo Y":["psychic"],
  "Mega Ampharos":["electric","dragon"],
  "Mega Steelix":["steel","ground"],
  "Mega Scizor":["bug","steel"],
  "Mega Heracross":["bug","fighting"],
  "Mega Houndoom":["dark","fire"],
  "Mega Tyranitar":["rock","dark"],
  "Mega Blaziken":["fire","fighting"],
  "Mega Gardevoir":["psychic","fairy"],
  "Mega Mawile":["steel","fairy"],
  "Mega Aggron":["steel"],
  "Mega Medicham":["fighting","psychic"],
  "Mega Manectric":["electric"],
  "Mega Sharpedo":["water","dark"],
  "Mega Camerupt":["fire","ground"],
  "Mega Altaria":["dragon","fairy"],
  "Mega Banette":["ghost"],
  "Mega Absol":["dark"],
  "Mega Glalie":["ice"],
  "Mega Salamence":["dragon","flying"],
  "Mega Metagross":["steel","psychic"],
  "Mega Latias":["dragon","psychic"],
  "Mega Latios":["dragon","psychic"],
  "Mega Kyogre":["water"],
  "Mega Groudon":["ground","fire"],
  "Mega Rayquaza":["dragon","flying"],
  "Mega Lopunny":["normal","fighting"],
  "Mega Garchomp":["dragon","ground"],
  "Mega Lucario":["fighting","steel"],
  "Mega Abomasnow":["grass","ice"],
  "Mega Gallade":["psychic","fighting"],
  "Mega Audino":["normal","fairy"],
  "Mega Diancie":["rock","fairy"],
  "Mega Sceptile":["grass","dragon"],
  "Mega Swampert":["water","ground"],
  "Mega Sableye":["dark","ghost"],
  "Mega Sharpedo":["water","dark"],
  "Mega Camerupt":["fire","ground"],
  "Rhyperior":["ground","rock"],"Leafeon":["grass"],"Glaceon":["ice"],
  "Deino":["dark","dragon"],"Zweilous":["dark","dragon"],"Hydreigon":["dark","dragon"],
  "Flabebe":["fairy"],"Floette":["fairy"],"Florges":["fairy"],
  "Sylveon":["fairy"],"Mimikyu":["ghost","fairy"],
  // Pokémon faltantes
  "Sneasler":["poison","fighting"],
  "Bastiodon":["rock","steel"],
  "Conkeldurr":["fighting"],
  "Drapion":["poison","dark"],
  "Electivire":["electric"],
  "Gallade":["psychic","fighting"],
  "Garchomp":["dragon","ground"],
  "Gliscor":["ground","flying"],
  "Gogoat":["grass"],
  "Infernape":["fire","fighting"],
  "Lucario":["fighting","steel"],
  "Magmortar":["fire"],
  "Mega Dragalge":["poison","dragon"],
  "Mega Scolipede":["bug","poison"],
  "Mismagius":["ghost"],
  "Rampardos":["rock"],
  "Staraptor":["normal","flying"],
  "Vespiquen":["bug","flying"],
  "Yanmega":["bug","flying"],
};

const TIER_CONFIG = {
  'Mythic':     { color:'#e040fb', label:'Mythic'     },
  'Legendary':  { color:'#ff9800', label:'Legendary'  },
  'Ultra Rare': { color:'#00bcd4', label:'Ultra Rare' },
  'Super Rare': { color:'#66bb6a', label:'Super Rare' },
  'T1':         { color:'#f06292', label:'T1'         },
  'T2':         { color:'#ff7043', label:'T2'         },
  'T3':         { color:'#ffa726', label:'T3'         },
  'T4':         { color:'#d4e157', label:'T4'         },
  'T5':         { color:'#4dd0e1', label:'T5'         },
  'T6':         { color:'#7e8db8', label:'T6'         },
  'T7':         { color:'#546e7a', label:'T7'         },
  '?':          { color:'#607d8b', label:'?'          },
};

function calcEffectiveness(types) {
  const mult = {};
  Object.keys(TYPE_CHART).forEach(function(atk) {
    var m = 1;
    types.forEach(function(def) {
      var chart = TYPE_CHART[def];
      if (!chart) return;
      if (chart.immune.indexOf(atk) !== -1)  m *= 0;
      else if (chart.weak.indexOf(atk) !== -1)    m *= 2;
      else if (chart.resist.indexOf(atk) !== -1)  m *= 0.5;
    });
    mult[atk] = m;
  });
  var result = { quad:[], double:[], half:[], quarter:[], immune:[] };
  Object.keys(mult).forEach(function(t) {
    var m = mult[t];
    if (m === 0)    result.immune.push(t);
    else if (m === 4)    result.quad.push(t);
    else if (m === 2)    result.double.push(t);
    else if (m === 0.5)  result.half.push(t);
    else if (m === 0.25) result.quarter.push(t);
  });
  return result;
}

function getSprites(name) {
  var isShiny = /^shiny\s+/i.test(name);
  var n = name.replace(/^shiny\s+/i,'').toLowerCase().replace(/['\u2019]/g,"'").trim();
  var fixes = {
    'nidoran female':'nidoranf','nidoran male':'nidoranm',
    'ho-oh':'hooh','porygon-z':'porygonz',
    "farfetch'd":'farfetchd','mr. mime':'mrmime',
    'flabebe':'flabebe','mime jr.':'mimejr',
    // Megas com slug específico (X/Y e formas especiais)
    'mega charizard x':'charizard-megax',
    'mega charizard y':'charizard-megay',
    'mega mewtwo x':'mewtwo-megax',
    'mega mewtwo y':'mewtwo-megay',
    'mega kyogre':'kyogre-primal',
    'mega groudon':'groudon-primal',
    // Fan-made Megas do servidor — usa forma base
    'mega scolipede':'scolipede',
    'mega dragalge':'dragalge',
  };
  var slug;
  if (n in fixes) {
    slug = fixes[n];
  } else {
    // Megas padrão: "Mega Steelix" → "steelix-mega"
    var megaMatch = n.match(/^mega\s+(.+)$/);
    if (megaMatch) {
      slug = megaMatch[1].replace(/\s+/g, '') + '-mega';
    } else {
      slug = n.replace(/\s+/g, '');
    }
  }
  var animBase  = isShiny ? 'https://play.pokemonshowdown.com/sprites/gen5ani-shiny/' : 'https://play.pokemonshowdown.com/sprites/gen5ani/';
  var staticBase = isShiny ? 'https://play.pokemonshowdown.com/sprites/dex-shiny/' : 'https://play.pokemonshowdown.com/sprites/dex/';
  return {
    animated: animBase  + slug + '.gif',
    static:   staticBase + slug + '.png',
    fallback: 'https://play.pokemonshowdown.com/sprites/dex/' + slug + '.png',
  };
}

(function injectCSS() {
  if (document.getElementById('tlpop-css')) return;
  var s = document.createElement('style');
  s.id = 'tlpop-css';
  s.textContent = [
    '#tlpop-overlay{position:fixed;inset:0;z-index:10500;background:rgba(2,5,14,.82);backdrop-filter:blur(22px);-webkit-backdrop-filter:blur(22px);display:flex;align-items:center;justify-content:center;padding:16px;opacity:0;pointer-events:none;transition:opacity .28s cubic-bezier(.16,1,.3,1)}',
    '#tlpop-overlay.open{opacity:1;pointer-events:all}',
    '#tlpop-modal{background:linear-gradient(160deg,#0c1628 0%,#070e1e 100%);border:1px solid rgba(58,140,255,.2);border-radius:24px;width:100%;max-width:560px;max-height:92vh;overflow-y:auto;overflow-x:hidden;display:flex;flex-direction:column;box-shadow:0 0 80px rgba(58,140,255,.12),0 32px 64px rgba(0,0,0,.75),inset 0 1px 0 rgba(255,255,255,.05);transform:translateY(28px) scale(.96);transition:transform .32s cubic-bezier(.16,1,.3,1);scrollbar-width:thin;scrollbar-color:rgba(58,140,255,.2) transparent;position:relative}',
    '#tlpop-modal::-webkit-scrollbar{width:4px}#tlpop-modal::-webkit-scrollbar-thumb{background:rgba(58,140,255,.2);border-radius:2px}',
    '#tlpop-overlay.open #tlpop-modal{transform:none}',
    '.tlpop-topbar{height:3px;border-radius:24px 24px 0 0;flex-shrink:0}',
    '.tlpop-hero{position:relative;overflow:hidden;display:flex;flex-direction:column;align-items:center;padding:32px 24px 26px;flex-shrink:0}',
    '.tlpop-hero-bg{position:absolute;inset:0;pointer-events:none}',
    '.tlpop-hero-silhouette{position:absolute;bottom:-10px;right:-10px;width:180px;height:180px;opacity:.04;filter:blur(2px);pointer-events:none;image-rendering:pixelated}',
    '.tlpop-close{position:absolute;top:14px;right:16px;width:32px;height:32px;border-radius:9px;border:1px solid rgba(255,255,255,.09);background:rgba(255,255,255,.04);color:rgba(255,255,255,.4);font-size:14px;cursor:pointer;display:flex;align-items:center;justify-content:center;transition:background .14s,color .14s,border-color .14s;z-index:2}',
    '.tlpop-close:hover{background:rgba(255,60,60,.15);border-color:rgba(255,60,60,.3);color:#ff6b6b}',
    '.tlpop-shiny-badge{position:absolute;top:14px;left:16px;font-size:11px;font-family:monospace;font-weight:700;letter-spacing:1px;color:#ffd700;background:rgba(255,215,0,.1);border:1px solid rgba(255,215,0,.3);border-radius:20px;padding:3px 10px;display:flex;align-items:center;gap:5px;z-index:2}',
    '.tlpop-counter{position:absolute;top:14px;left:50%;transform:translateX(-50%);font-family:monospace;font-size:10px;font-weight:700;color:rgba(255,255,255,.35);letter-spacing:1px;white-space:nowrap;z-index:2}',
    '.tlpop-counter span{color:rgba(255,255,255,.18)}',
    '.tlpop-sprite-arena{position:relative;width:130px;height:130px;display:flex;align-items:flex-end;justify-content:center;margin-bottom:6px;flex-shrink:0;z-index:1}',
    '.tlpop-sprite-shadow{position:absolute;bottom:0;left:50%;transform:translateX(-50%);width:90px;height:14px;border-radius:50%;background:radial-gradient(ellipse,rgba(0,0,0,.5) 0%,transparent 70%);pointer-events:none}',
    '.tlpop-sprite-halo{position:absolute;top:50%;left:50%;transform:translate(-50%,-50%);width:110px;height:110px;border-radius:50%;pointer-events:none;animation:tlpop-pulse 2.8s ease-in-out infinite}',
    '@keyframes tlpop-pulse{0%,100%{transform:translate(-50%,-50%) scale(1);opacity:.7}50%{transform:translate(-50%,-50%) scale(1.12);opacity:1}}',
    '.tlpop-sprite{width:110px;height:110px;object-fit:contain;image-rendering:pixelated;position:relative;z-index:2;animation:tlpop-float 3s ease-in-out infinite}',
    '@keyframes tlpop-float{0%,100%{transform:translateY(0)}50%{transform:translateY(-7px)}}',
    '.tlpop-name{font-family:"Cinzel",serif;font-size:22px;font-weight:900;color:#fff;letter-spacing:1.5px;text-align:center;margin-bottom:8px;z-index:1;position:relative}',
    '.tlpop-badges{display:flex;align-items:center;justify-content:center;gap:7px;flex-wrap:wrap;z-index:1;position:relative}',
    '.tlpop-type-badge{display:flex;align-items:center;gap:5px;padding:5px 12px 5px 8px;border-radius:20px;border:1px solid var(--tb-border,rgba(255,255,255,.15));background:var(--tb-bg,rgba(255,255,255,.06));font-family:Rajdhani,sans-serif;font-size:11px;font-weight:700;letter-spacing:.8px;color:var(--tb-color,#fff);white-space:nowrap}',
    '.tlpop-type-badge img{width:16px;height:16px;object-fit:contain}',
    '.tlpop-tier-badge{font-family:monospace;font-size:10px;font-weight:700;letter-spacing:1.5px;padding:5px 12px;border-radius:20px;border:1px solid var(--tb-border,rgba(255,255,255,.12));background:var(--tb-bg,rgba(255,255,255,.04));color:var(--tb-color,rgba(255,255,255,.5))}',
    '.tlpop-divider{height:1px;background:linear-gradient(90deg,transparent,rgba(255,255,255,.07),transparent);margin:0 24px;flex-shrink:0}',
    '.tlpop-body{padding:20px 24px 28px;display:flex;flex-direction:column;gap:20px}',
    '.tlpop-eff-title{display:flex;align-items:center;gap:9px;margin-bottom:12px}',
    '.tlpop-eff-title-icon{font-size:15px}',
    '.tlpop-eff-title-text{font-family:monospace;font-size:9.5px;font-weight:700;letter-spacing:2px;text-transform:uppercase;color:rgba(255,255,255,.28)}',
    '.tlpop-eff-title-line{flex:1;height:1px;background:linear-gradient(90deg,rgba(255,255,255,.07),transparent)}',
    '.tlpop-eff-grid{display:flex;flex-wrap:wrap;gap:6px}',
    '.tlpop-eff-badge{display:flex;align-items:center;gap:5px;padding:5px 10px 5px 7px;border-radius:20px;border:1px solid var(--eb-border,rgba(255,255,255,.1));background:var(--eb-bg,rgba(255,255,255,.04));cursor:default;transition:transform .15s,box-shadow .15s}',
    '.tlpop-eff-badge:hover{transform:translateY(-2px);box-shadow:0 4px 14px var(--eb-glow,rgba(255,255,255,.1))}',
    '.tlpop-eff-badge-img{width:18px;height:18px;object-fit:contain;flex-shrink:0}',
    '.tlpop-eff-badge-label{font-family:Rajdhani,sans-serif;font-size:11.5px;font-weight:700;color:var(--eb-color,rgba(255,255,255,.7));letter-spacing:.3px}',
    '.tlpop-eff-badge-mult{font-family:monospace;font-size:9.5px;font-weight:700;border-radius:4px;padding:1px 5px;margin-left:2px;white-space:nowrap}',
    '.tlpop-eff-empty{font-size:12px;color:rgba(255,255,255,.18);font-style:italic;padding:4px 0}',
    '.tlpop-footer{padding:14px 24px 22px;font-size:11px;color:rgba(255,255,255,.2);text-align:center;letter-spacing:.3px;border-top:1px solid rgba(255,255,255,.05);flex-shrink:0}',
    '.tlpop-loc-section{padding:0 24px 24px;display:flex;flex-direction:column;gap:8px}',
    '.tlpop-loc-divider{height:1px;background:linear-gradient(90deg,transparent,rgba(255,255,255,.07),transparent);margin:0 24px 4px}',
    '.tlpop-loc-title{display:flex;align-items:center;gap:9px;margin-bottom:4px}',
    '.tlpop-loc-title-icon{font-size:15px}',
    '.tlpop-loc-title-text{font-family:monospace;font-size:9.5px;font-weight:700;letter-spacing:2px;text-transform:uppercase;color:rgba(255,255,255,.28)}',
    '.tlpop-loc-title-line{flex:1;height:1px;background:linear-gradient(90deg,rgba(255,255,255,.07),transparent)}',
    '.tlpop-map-slot{display:flex;align-items:center;gap:10px;padding:10px 14px;border-radius:12px;border:1px solid rgba(255,255,255,.07);background:rgba(255,255,255,.03);transition:background .15s,border-color .15s}',
    '.tlpop-map-slot.has-map{cursor:pointer}.tlpop-map-slot.has-map:hover{background:rgba(255,255,255,.07);border-color:rgba(255,255,255,.15)}',
    '.tlpop-map-slot.no-map{opacity:.38;cursor:default}',
    '.tlpop-map-slot-icon{font-size:18px;flex-shrink:0;width:28px;text-align:center}',
    '.tlpop-map-slot-body{flex:1;min-width:0}',
    '.tlpop-map-slot-label{font-family:Rajdhani,sans-serif;font-size:12px;font-weight:700;color:rgba(255,255,255,.75);letter-spacing:.4px}',
    '.tlpop-map-slot-sub{font-size:10.5px;color:rgba(255,255,255,.28);margin-top:1px}',
    '.tlpop-map-slot-arrow{color:rgba(255,255,255,.3);font-size:14px;flex-shrink:0}',
    '.tlpop-map-slot.wildscape.has-map{border-color:rgba(255,220,50,.15);background:rgba(255,220,50,.04)}',
    '.tlpop-map-slot.wildscape.has-map:hover{border-color:rgba(255,220,50,.3);background:rgba(255,220,50,.08)}',
    '.tlpop-map-slot.wildscape.has-map .tlpop-map-slot-label{color:rgba(255,220,50,.85)}',
    '.tlpop-loc-no-data{font-size:12px;color:rgba(255,255,255,.18);font-style:italic;padding:4px 0}',
    '.tlpop-nav{position:absolute;top:50%;transform:translateY(-50%);z-index:10600;width:38px;height:38px;border-radius:50%;border:1px solid rgba(255,255,255,.12);background:rgba(8,15,30,.92);color:rgba(255,255,255,.5);display:flex;align-items:center;justify-content:center;cursor:pointer;transition:background .18s,color .18s,border-color .18s,transform .15s;backdrop-filter:blur(8px)}',
    '.tlpop-nav:hover{background:rgba(58,140,255,.18);border-color:rgba(58,140,255,.45);color:#60aaff;transform:translateY(-50%) scale(1.08)}',
    '.tlpop-nav:active{transform:translateY(-50%) scale(.95)}',
    '.tlpop-nav--prev{left:-52px}.tlpop-nav--next{right:-52px}',
    '@media(max-width:680px){.tlpop-nav--prev{left:-44px}.tlpop-nav--next{right:-44px}.tlpop-nav{width:32px;height:32px}}',
    '@media(max-width:560px){.tlpop-nav--prev{left:8px;top:auto;bottom:-52px;transform:none}.tlpop-nav--next{right:8px;top:auto;bottom:-52px;transform:none}.tlpop-nav:hover{transform:scale(1.08)}.tlpop-nav:active{transform:scale(.95)}#tlpop-overlay{padding-bottom:72px}}',
    '@media(max-width:520px){#tlpop-modal{border-radius:18px;max-height:95vh}.tlpop-hero{padding:28px 16px 22px}.tlpop-body{padding:16px 16px 24px}.tlpop-sprite{width:90px;height:90px}.tlpop-sprite-arena{width:110px;height:110px}.tlpop-name{font-size:18px}}',
  ].join('');
  document.head.appendChild(s);
})();

function buildOverlay() {
  if (document.getElementById('tlpop-overlay')) return;
  var div = document.createElement('div');
  div.id = 'tlpop-overlay';
  div.innerHTML = '<div id="tlpop-modal"></div>';
  document.body.appendChild(div);
  div.addEventListener('click', function(e) { if (e.target === div) tlpopClose(); });
  document.addEventListener('keydown', function(e) {
    if (e.key === 'Escape' && div.classList.contains('open')) tlpopClose();
  });
}

function typeBadgeHTML(type) {
  var c = TYPE_COLORS[type] || '#aaa';
  var img = TYPE_IMGS[type];
  var lbl = TYPE_LABELS[type] || type;
  return '<div class="tlpop-type-badge" style="--tb-color:' + c + ';--tb-border:' + c + '55;--tb-bg:' + c + '18;">' +
    (img ? '<img src="' + img + '" alt="' + lbl + '">' : '') + lbl + '</div>';
}

function buildSection(title, types, multLabel, style) {
  if (!types.length) return '';
  var parts = title.split(' ');
  var icon = parts[0];
  var titleText = parts.slice(1).join(' ');
  return '<div class="tlpop-eff-section">' +
    '<div class="tlpop-eff-title">' +
      '<span class="tlpop-eff-title-icon">' + icon + '</span>' +
      '<span class="tlpop-eff-title-text">' + titleText + '</span>' +
      '<div class="tlpop-eff-title-line"></div>' +
    '</div>' +
    '<div class="tlpop-eff-grid">' +
      types.map(function(t) {
        var c = TYPE_COLORS[t] || '#aaa';
        var img = TYPE_IMGS[t];
        var lbl = TYPE_LABELS[t] || t;
        return '<div class="tlpop-eff-badge" style="--eb-color:' + c + ';--eb-border:' + style.border + ';--eb-bg:' + style.bg + ';--eb-glow:' + c + '25;">' +
          (img ? '<img class="tlpop-eff-badge-img" src="' + img + '" alt="' + lbl + '">' : '') +
          '<span class="tlpop-eff-badge-label">' + lbl + '</span>' +
          '<span class="tlpop-eff-badge-mult" style="color:' + style.multColor + ';background:' + style.multBg + ';">' + multLabel + '</span>' +
        '</div>';
      }).join('') +
    '</div></div>';
}

function buildEffBody(eff) {
  return [
    buildSection('⚡ Fraqueza Extrema', eff.quad,   '×4', { border:'rgba(255,74,74,.4)',   bg:'rgba(255,74,74,.12)',   multColor:'#ff4a4a', multBg:'rgba(255,74,74,.2)'   }),
    buildSection('🔥 Fraqueza',         eff.double, '×2', { border:'rgba(255,159,67,.35)', bg:'rgba(255,159,67,.1)',  multColor:'#ff9f43', multBg:'rgba(255,159,67,.18)' }),
    buildSection('🛡️ Resistência',      eff.half,   '×½', { border:'rgba(77,208,225,.35)', bg:'rgba(77,208,225,.08)', multColor:'#4dd0e1', multBg:'rgba(77,208,225,.18)' }),
    buildSection('🛡️ Resistência Forte',eff.quarter,'×¼', { border:'rgba(102,229,160,.35)',bg:'rgba(102,229,160,.08)',multColor:'#66e5a0', multBg:'rgba(102,229,160,.18)'}),
    buildSection('🚫 Imunidade',        eff.immune, '×0', { border:'rgba(212,160,255,.35)',bg:'rgba(212,160,255,.08)',multColor:'#d4a0ff', multBg:'rgba(212,160,255,.18)'}),
  ].join('');
}

function buildNavButtons() {
  return '<button class="tlpop-nav tlpop-nav--prev" id="tlpop-prev" onclick="tlpopNav(-1)" title="Anterior">' +
    '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><polyline points="15 18 9 12 15 6"/></svg>' +
  '</button>' +
  '<button class="tlpop-nav tlpop-nav--next" id="tlpop-next" onclick="tlpopNav(1)" title="Próximo">' +
    '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><polyline points="9 18 15 12 9 6"/></svg>' +
  '</button>';
}

var _tlpopList  = [];
var _tlpopIndex = -1;

window.tlpopNav = function(dir) {
  if (!_tlpopList.length) return;
  _tlpopIndex = (_tlpopIndex + dir + _tlpopList.length) % _tlpopList.length;
  var p = _tlpopList[_tlpopIndex];
  _openInternal(p.name, p.tier);
};

window.tlpopOpen = function(name, tier) {
  buildOverlay();
  _tlpopList  = [];
  _tlpopIndex = -1;
  var content = document.getElementById('tl-content');
  if (content) {
    content.querySelectorAll('.tlc:not(.type-hidden)').forEach(function(card) {
      var img = card.querySelector('.tlc-sprite');
      var tierEl = card.querySelector('.tlc-tier');
      if (!img) return;
      _tlpopList.push({ name: img.getAttribute('alt') || '', tier: tierEl ? tierEl.textContent.trim() : '?' });
    });
    _tlpopIndex = _tlpopList.findIndex(function(p) { return p.name === name; });
  }
  _openInternal(name, tier);
};

/* ── Location / Respawn helpers ─────────────────────────────────────── */
function _tlpopFindRespawn(baseName) {
  if (!window.RAW_RESPAWN) return null;
  var lower = baseName.toLowerCase();
  return window.RAW_RESPAWN.find(function(r) {
    return r.name.toLowerCase() === lower;
  }) || null;
}

function _tlpopNormalizeWildscape(ws) {
  if (!ws) return [];
  if (typeof ws === 'object' && !Array.isArray(ws)) {
    var entries = [];
    if (ws.resp) entries.push({ label: 'Wildscape 1', url: ws.resp, path: null });
    if (ws.resp2) {
      entries.push({ label: 'Wildscape 2', url: ws.resp2, path: ws.path || null });
    } else if (ws.path) {
      var arr = ws.path;
      entries.push({ label: 'Wildscape 2', url: arr[arr.length - 1], path: arr.slice(0, -1) });
    }
    return entries;
  }
  if (Array.isArray(ws)) {
    return ws.map(function(url, i) {
      return { label: ws.length > 1 ? 'Wildscape ' + (i + 1) : 'Wildscape', url: url, path: null };
    });
  }
  return [{ label: 'Wildscape', url: ws, path: null }];
}

function _tlpopMakeMapSlot(cls, icon, label, url, pokeName) {
  var hasMap = !!url;
  var sub = hasMap ? 'Clique para ver o mapa' : 'Sem respawn neste local';
  var onclick = hasMap ? ' onclick="openImgurMapModal(\'' + url + '\',\'' + label + '\',\'' + pokeName + '\')"' : '';
  var arrow = hasMap ? '<span class="tlpop-map-slot-arrow">→</span>' : '';
  return '<div class="tlpop-map-slot ' + cls + ' ' + (hasMap ? 'has-map' : 'no-map') + '"' + onclick + '>'
    + '<span class="tlpop-map-slot-icon">' + icon + '</span>'
    + '<span class="tlpop-map-slot-body">'
    +   '<div class="tlpop-map-slot-label">' + label + '</div>'
    +   '<div class="tlpop-map-slot-sub">' + sub + '</div>'
    + '</span>'
    + arrow
    + '</div>';
}

function _tlpopMakeWsSlot(entry, pokeName) {
  var hasPath = !!(entry.path && entry.path.length);
  if (!hasPath) return _tlpopMakeMapSlot('wildscape', '⚡', entry.label, entry.url || null, pokeName);
  var steps = entry.path.map(function(u) { return { url: u }; });
  if (entry.url) steps.push({ url: entry.url, isDestino: true });
  var stepsJson = JSON.stringify(steps).replace(/'/g, "\\'");
  var totalGuia = entry.path.length;
  var sub = totalGuia + ' imagem' + (totalGuia !== 1 ? 'ns' : '') + ' de guia' + (entry.url ? ' + destino final' : '');
  return '<button class="tlpop-map-slot wildscape has-map" style="width:100%;text-align:left;font:inherit;cursor:pointer" onclick="openPathModalGlobal(\'' + stepsJson.replace(/"/g,'&quot;') + '\',\'' + pokeName + '\',\'' + entry.label + '\')">'
    + '<span class="tlpop-map-slot-icon">⚡</span>'
    + '<span class="tlpop-map-slot-body">'
    +   '<div class="tlpop-map-slot-label">Ver Caminho — ' + entry.label + '</div>'
    +   '<div class="tlpop-map-slot-sub">' + sub + '</div>'
    + '</span>'
    + '<span class="tlpop-map-slot-arrow">→</span>'
    + '</button>';
}

function buildLocSection(baseName) {
  var rsp = _tlpopFindRespawn(baseName);
  var html = '<div class="tlpop-loc-divider"></div>'
    + '<div class="tlpop-loc-section">'
    + '<div class="tlpop-loc-title">'
    +   '<span class="tlpop-loc-title-icon">🗺️</span>'
    +   '<span class="tlpop-loc-title-text">Localização & Mapas</span>'
    +   '<div class="tlpop-loc-title-line"></div>'
    + '</div>';

  if (!rsp) {
    html += '<div class="tlpop-loc-no-data">Localização não cadastrada para este Pokémon.</div>';
  } else {
    html += _tlpopMakeMapSlot('comum',  '🗺️', 'Mapa Comum', rsp.mapImg   || null, baseName);
    html += _tlpopMakeMapSlot('hoenn',  '🌿', 'Hoenn',      rsp.mapHoenn || null, baseName);
    var wsEntries = _tlpopNormalizeWildscape(rsp.wildscape);
    if (wsEntries.length === 0) {
      html += _tlpopMakeMapSlot('wildscape', '⚡', 'Wildscape', null, baseName);
    } else {
      wsEntries.forEach(function(e) { html += _tlpopMakeWsSlot(e, baseName); });
    }
  }

  html += '</div>';
  return html;
}

function _openInternal(name, tier) {
  buildOverlay();
  var isShiny  = /^shiny\s+/i.test(name);
  var baseName = name.replace(/^shiny\s+/i,'');
  var types    = POKEMON_TYPES[baseName] || null;
  var tc       = TIER_CONFIG[tier] || TIER_CONFIG['?'];
  var sp       = getSprites(name);
  var mainColor = tc.color;
  if (types && types[0] && TYPE_COLORS[types[0]]) mainColor = TYPE_COLORS[types[0]];
  var gradient = types && types.length === 2
    ? 'linear-gradient(90deg,transparent,' + (TYPE_COLORS[types[0]]||mainColor) + 'cc,' + (TYPE_COLORS[types[1]]||mainColor) + 'cc,transparent)'
    : 'linear-gradient(90deg,transparent,' + mainColor + 'cc,transparent)';
  var hasTypes = !!(types && types.length);
  var eff = hasTypes ? calcEffectiveness(types) : null;
  var counterHTML = _tlpopList.length > 1
    ? '<div class="tlpop-counter">' + (_tlpopIndex+1) + ' <span>/ ' + _tlpopList.length + '</span></div>'
    : '';
  var modal = document.getElementById('tlpop-modal');
  modal.innerHTML =
    buildNavButtons() +
    '<div class="tlpop-topbar" style="background:' + gradient + ';"></div>' +
    '<div class="tlpop-hero">' +
      '<div class="tlpop-hero-bg" style="background:radial-gradient(ellipse at 50% 30%,' + mainColor + '25 0%,transparent 65%);"></div>' +
      '<img class="tlpop-hero-silhouette" src="' + sp.static + '" alt="">' +
      '<button class="tlpop-close" onclick="tlpopClose()">✕</button>' +
      (isShiny ? '<div class="tlpop-shiny-badge">✦ SHINY</div>' : '') +
      counterHTML +
      '<div class="tlpop-sprite-arena">' +
        '<div class="tlpop-sprite-halo" style="background:radial-gradient(circle,' + mainColor + '22 0%,transparent 70%);"></div>' +
        '<img class="tlpop-sprite' + (isShiny ? ' shiny' : '') + '" src="' + sp.animated + '" alt="' + name + '"' +
          ' style="filter:drop-shadow(0 4px 16px ' + mainColor + '55)' + (isShiny ? ' drop-shadow(0 0 12px rgba(255,215,0,.6))' : '') + '"' +
          ' onerror="this.src=\'' + sp.static + '\';this.onerror=function(){this.src=\'' + sp.fallback + '\';this.onerror=null;}">' +
        '<div class="tlpop-sprite-shadow"></div>' +
      '</div>' +
      '<div class="tlpop-name" style="text-shadow:0 2px 18px ' + mainColor + '55;">' + baseName + '</div>' +
      '<div class="tlpop-badges">' +
        (types ? types.map(typeBadgeHTML).join('') : '') +
        '<div class="tlpop-tier-badge" style="color:' + tc.color + ';border-color:' + tc.color + '44;background:' + tc.color + '12;">' + tc.label + '</div>' +
      '</div>' +
    '</div>' +
    '<div class="tlpop-divider"></div>' +
    '<div class="tlpop-body">' +
      (hasTypes ? buildEffBody(eff) :
        '<div class="tlpop-eff-section"><div class="tlpop-eff-title"><span class="tlpop-eff-title-icon">⚡</span><span class="tlpop-eff-title-text">Efetividades</span><div class="tlpop-eff-title-line"></div></div><div class="tlpop-eff-empty">Tipagem não cadastrada para este Pokémon.</div></div>') +
    '</div>' +
    buildLocSection(baseName) +
    '<div class="tlpop-footer">Efetividades de ' + baseName + (types ? ' &nbsp;·&nbsp; ' + types.map(function(t){return TYPE_LABELS[t];}).join(' / ') : '') + '</div>';

  var prevBtn = document.getElementById('tlpop-prev');
  var nextBtn = document.getElementById('tlpop-next');
  if (prevBtn) prevBtn.style.display = _tlpopList.length > 1 ? '' : 'none';
  if (nextBtn) nextBtn.style.display = _tlpopList.length > 1 ? '' : 'none';

  document.getElementById('tlpop-overlay').classList.add('open');
}

window.tlpopClose = function() {
  var ov = document.getElementById('tlpop-overlay');
  if (ov) ov.classList.remove('open');
};

(function patchTierList() {
  function tryPatch() {
    if (typeof window.renderTierList !== 'function') { setTimeout(tryPatch, 200); return; }
    var _orig = window.renderTierList;
    window.renderTierList = function() { _orig(); setTimeout(attachListeners, 80); };
    attachListeners();
  }
  function attachListeners() {
    var content = document.getElementById('tl-content');
    if (!content) return;
    content.querySelectorAll('.tlc').forEach(function(card) {
      if (card.dataset.tlpopBound) return;
      card.dataset.tlpopBound = '1';
      card.style.cursor = 'pointer';
      card.addEventListener('click', function(e) {
        e.stopPropagation();
        var img = card.querySelector('.tlc-sprite');
        var tierEl = card.querySelector('.tlc-tier');
        if (!img) return;
        window.tlpopOpen(img.getAttribute('alt') || '', tierEl ? tierEl.textContent.trim() : '?');
      });
    });
  }
  function startObserver() {
    var content = document.getElementById('tl-content');
    if (!content) { setTimeout(startObserver, 300); return; }
    new MutationObserver(function() { setTimeout(attachListeners, 50); })
      .observe(content, { childList:true, subtree:true });
  }
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', function() { setTimeout(tryPatch,400); setTimeout(startObserver,500); });
  } else {
    setTimeout(tryPatch, 400);
    setTimeout(startObserver, 500);
  }
})();

})();