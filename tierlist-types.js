/* ================================================================
   tierlist-types.js v2 — Tipagens nos cards + filtro por tipo
   Carregue APÓS tierlist.js no index.html:
     <script src="tierlist-types.js"></script>
================================================================ */
(function () {

/* ══════════════════════════════════════════
   MAPA DE TIPAGENS — nome base → [tipo1, tipo2?]
══════════════════════════════════════════ */
var POKEMON_TYPES = {
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
  "Tangela":["grass"],
  "Kangaskhan":["normal"],
  "Horsea":["water"],"Seadra":["water"],
  "Goldeen":["water"],"Seaking":["water"],
  "Staryu":["water"],"Starmie":["water","psychic"],
  "Mr. Mime":["psychic","fairy"],
  "Scyther":["bug","flying"],"Scizor":["bug","steel"],
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
  "Porygon":["normal"],"Porygon2":["normal"],"Porygon-Z":["normal"],
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
  "Pichu":["electric"],
  "Cleffa":["fairy"],"Igglybuff":["normal","fairy"],
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
  "Stantler":["normal"],
  "Smeargle":["normal"],
  "Tyrogue":["fighting"],
  "Smoochum":["ice","psychic"],
  "Elekid":["electric"],"Magby":["fire"],
  "Miltank":["normal"],
  "Raikou":["electric"],"Entei":["fire"],"Suicune":["water"],
  "Larvitar":["rock","ground"],"Pupitar":["rock","ground"],"Tyranitar":["rock","dark"],
  "Lugia":["psychic","flying"],"Ho-oh":["fire","flying"],"Celebi":["psychic","grass"],
  "Treecko":["grass"],"Grovyle":["grass"],"Sceptile":["grass"],
  "Torchic":["fire"],"Combusken":["fire","fighting"],"Blaziken":["fire","fighting"],
  "Mudkip":["water"],"Marshtomp":["water","ground"],"Swampert":["water","ground"],
  "Poochyena":["dark"],"Mightyena":["dark"],
  "Zigzagoon":["normal"],"Linoone":["normal"],
  "Wurmple":["bug"],"Silcoon":["bug"],"Beautifly":["bug","flying"],
  "Cascoon":["bug"],"Dustox":["bug","poison"],
  "Lotad":["water","grass"],"Lombre":["water","grass"],"Ludicolo":["water","grass"],
  "Seedot":["grass"],"Nuzleaf":["grass","dark"],"Shiftry":["grass","dark"],
  "Taillow":["normal","flying"],"Swellow":["normal","flying"],
  "Wingull":["water","flying"],"Pelipper":["water","flying"],
  "Ralts":["psychic","fairy"],"Kirlia":["psychic","fairy"],"Gardevoir":["psychic","fairy"],
  "Surskit":["bug","water"],"Masquerain":["bug","flying"],
  "Breloom":["grass","fighting"],
  "Slakoth":["normal"],"Vigoroth":["normal"],"Slaking":["normal"],
  "Nincada":["bug","ground"],"Ninjask":["bug","flying"],"Shedinja":["bug","ghost"],
  "Whismur":["normal"],"Loudred":["normal"],"Exploud":["normal"],
  "Makuhita":["fighting"],"Hariyama":["fighting"],
  "Azurill":["normal","fairy"],
  "Nosepass":["rock"],
  "Skitty":["normal"],"Delcatty":["normal"],
  "Sableye":["dark","ghost"],
  "Mawile":["steel","fairy"],
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
  "Zangoose":["normal"],
  "Seviper":["poison"],
  "Lunatone":["rock","psychic"],"Solrock":["rock","psychic"],
  "Barboach":["water","ground"],"Whiscash":["water","ground"],
  "Corphish":["water"],"Crawdaunt":["water","dark"],
  "Baltoy":["ground","psychic"],"Claydol":["ground","psychic"],
  "Cradily":["rock","grass"],
  "Anorith":["rock","bug"],"Armaldo":["rock","bug"],
  "Feebas":["water"],"Milotic":["water"],
  "Castform":["normal"],
  "Kecleon":["normal"],
  "Shuppet":["ghost"],"Banette":["ghost"],
  "Duskull":["ghost"],"Dusclops":["ghost"],"Dusknoir":["ghost"],
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
  "Latias":["dragon","psychic"],"Latios":["dragon","psychic"],
  "Kyogre":["water"],"Groudon":["ground"],"Rayquaza":["dragon","flying"],
  "Jirachi":["steel","psychic"],"Deoxys":["psychic"],
  "Toxicroak":["poison","fighting"],
  "Abomasnow":["grass","ice"],"Mega Abomasnow":["grass","ice"],
  "Rhyperior":["ground","rock"],
  "Leafeon":["grass"],"Glaceon":["ice"],
  "Deino":["dark","dragon"],"Zweilous":["dark","dragon"],"Hydreigon":["dark","dragon"],
  "Flabebe":["fairy"],"Floette":["fairy"],"Florges":["fairy"],
  "Sylveon":["fairy"],
  "Mimikyu":["ghost","fairy"],

  // Pokémon base faltantes
  "Lucario":["fighting","steel"],
  "Garchomp":["dragon","ground"],
  "Infernape":["fire","fighting"],
  "Gliscor":["ground","flying"],
  "Dusknoir":["ghost"],
  "Gogoat":["grass"],
  "Yanmega":["bug","flying"],
  "Mismagius":["ghost"],
  "Staraptor":["normal","flying"],
  "Conkeldurr":["fighting"],
  "Drapion":["poison","dark"],
  "Gallade":["psychic","fighting"],
  "Rampardos":["rock"],
  "Bastiodon":["rock","steel"],
  "Vespiquen":["bug","flying"],
  "Electivire":["electric"],
  "Magmortar":["fire"],
  "Sneasler":["poison","fighting"],

  // Mega Evoluções
  "Mega Charizard X":["fire","dragon"],
  "Mega Charizard Y":["fire","flying"],
  "Mega Blastoise":["water"],
  "Mega Venusaur":["grass","poison"],
  "Mega Pidgeot":["normal","flying"],
  "Mega Alakazam":["psychic"],
  "Mega Gengar":["ghost","poison"],
  "Mega Kangaskhan":["normal"],
  "Mega Pinsir":["bug","flying"],
  "Mega Gyarados":["water","dark"],
  "Mega Aerodactyl":["rock","flying"],
  "Mega Ampharos":["electric","dragon"],
  "Mega Scizor":["bug","steel"],
  "Mega Heracross":["bug","fighting"],
  "Mega Houndoom":["dark","fire"],
  "Mega Tyranitar":["rock","dark"],
  "Mega Sceptile":["grass","dragon"],
  "Mega Blaziken":["fire","fighting"],
  "Mega Swampert":["water","ground"],
  "Mega Gardevoir":["psychic","fairy"],
  "Mega Sableye":["dark","ghost"],
  "Mega Mawile":["steel","fairy"],
  "Mega Aggron":["steel"],
  "Mega Medicham":["fighting","psychic"],
  "Mega Manectric":["electric"],
  "Mega Altaria":["dragon","fairy"],
  "Mega Salamence":["dragon","flying"],
  "Mega Metagross":["steel","psychic"],
  "Mega Banette":["ghost"],
  "Mega Absol":["dark"],
  "Mega Glalie":["ice"],
  "Mega Steelix":["steel","ground"],
  "Mega Audino":["normal","fairy"],
  "Mega Scolipede":["bug","poison"],
  "Mega Dragalge":["poison","dragon"],
  // Megas faltantes no types
  "Mega Slowbro":["water","psychic"],
  "Mega Mewtwo X":["psychic","fighting"],
  "Mega Mewtwo Y":["psychic"],
  "Mega Rayquaza":["dragon","flying"],
  "Mega Lucario":["fighting","steel"],
  "Mega Garchomp":["dragon","ground"],
  "Mega Lopunny":["normal","fighting"],
  "Mega Latias":["dragon","psychic"],
  "Mega Latios":["dragon","psychic"],
  "Mega Kyogre":["water"],
  "Mega Groudon":["ground","fire"],
  "Mega Sharpedo":["water","dark"],
  "Mega Beedrill":["bug","poison"],
  "Mega Diancie":["rock","fairy"],
  "Mega Gallade":["psychic","fighting"],
  "Mega Abomasnow":["grass","ice"],
};

/* ══════════════════════════════════════════
   CONFIG DE CORES POR TIPO
══════════════════════════════════════════ */
var TYPE_CFG = {
  normal:   { label:'Normal',   color:'#a8a878', bg:'rgba(168,168,120,0.18)' },
  fire:     { label:'Fogo',     color:'#f08030', bg:'rgba(240,128,48,0.18)'  },
  water:    { label:'Água',     color:'#6890f0', bg:'rgba(104,144,240,0.18)' },
  grass:    { label:'Planta',   color:'#78c850', bg:'rgba(120,200,80,0.18)'  },
  electric: { label:'Elétrico', color:'#f8d030', bg:'rgba(248,208,48,0.18)'  },
  ice:      { label:'Gelo',     color:'#98d8d8', bg:'rgba(152,216,216,0.18)' },
  fighting: { label:'Lutador',  color:'#c03028', bg:'rgba(192,48,40,0.18)'   },
  poison:   { label:'Veneno',   color:'#a040a0', bg:'rgba(160,64,160,0.18)'  },
  ground:   { label:'Terra',    color:'#e0c068', bg:'rgba(224,192,104,0.18)' },
  flying:   { label:'Voador',   color:'#a890f0', bg:'rgba(168,144,240,0.18)' },
  psychic:  { label:'Psíquico', color:'#f85888', bg:'rgba(248,88,136,0.18)'  },
  bug:      { label:'Inseto',   color:'#a8b820', bg:'rgba(168,184,32,0.18)'  },
  rock:     { label:'Pedra',    color:'#b8a038', bg:'rgba(184,160,56,0.18)'  },
  ghost:    { label:'Fantasma', color:'#705898', bg:'rgba(112,88,152,0.18)'  },
  dragon:   { label:'Dragão',   color:'#7038f8', bg:'rgba(112,56,248,0.18)'  },
  dark:     { label:'Sombrio',  color:'#a07858', bg:'rgba(160,120,88,0.18)'  },
  steel:    { label:'Aço',      color:'#b8b8d0', bg:'rgba(184,184,208,0.18)' },
  fairy:    { label:'Fada',     color:'#ee99ac', bg:'rgba(238,153,172,0.18)' },
};

/* URLs das imagens dos Talents por tipo */
var TYPE_IMGS = {
  water:    'https://i.imgur.com/zpRe43i.png',
  steel:    'https://i.imgur.com/GleRjiM.png',
  rock:     'https://i.imgur.com/GvD1Mtq.png',
  psychic:  'https://i.imgur.com/ASiZi1K.png',
  poison:   'https://i.imgur.com/xfX0ReE.png',
  normal:   'https://i.imgur.com/w2ChsIe.png',
  ice:      'https://i.imgur.com/ssFz0sA.png',
  ground:   'https://i.imgur.com/JPcD2l3.png',
  fire:     'https://i.imgur.com/O8TONGE.png',
  grass:    'https://i.imgur.com/YjKxtoE.png',
  electric: 'https://i.imgur.com/Yv2WEYc.png',
  dark:     'https://i.imgur.com/7Luj4az.png',
  dragon:   'https://i.imgur.com/o7JWbaN.png',
  ghost:    'https://i.imgur.com/HuybbPn.png',
  fairy:    'https://i.imgur.com/j3HaXTh.png',
  flying:   'https://i.imgur.com/npGjQae.png',
  bug:      'https://i.imgur.com/V4IXR51.png',
  fighting: 'https://i.imgur.com/OKsJXh7.png',
};

/* ══════════════════════════════════════════
   CSS
══════════════════════════════════════════ */
(function injectCSS() {
  if (document.getElementById('tl-types-css')) return;
  var s = document.createElement('style');
  s.id = 'tl-types-css';
  s.textContent = `

/* ── Badges de tipo nos cards ── */
.tlc-types {
  display: flex;
  gap: 4px;
  justify-content: center;
  flex-wrap: wrap;
  margin-top: 2px;
  margin-bottom: 2px;
}
.tlc-type-badge {
  width: 22px;
  height: 22px;
  border-radius: 50%;
  border: 1.5px solid var(--tlc-badge-color, rgba(255,255,255,0.3));
  background: var(--tlc-badge-bg, rgba(255,255,255,0.08));
  box-shadow: 0 0 6px var(--tlc-badge-glow, rgba(255,255,255,0.1));
  display: flex;
  align-items: center;
  justify-content: center;
  overflow: hidden;
  flex-shrink: 0;
  transition: transform .15s, box-shadow .15s;
}
.tlc-type-badge:hover {
  transform: scale(1.15);
  box-shadow: 0 0 10px var(--tlc-badge-glow, rgba(255,255,255,0.2));
}
.tlc-type-badge img {
  width: 14px;
  height: 14px;
  object-fit: contain;
}

/* ── Barra de filtros de tipo ── */
.tl-type-filters-wrap {
  padding: 0 2px 14px;
}
.tl-type-filters-label {
  font-family: var(--font-mono, monospace);
  font-size: 9px;
  font-weight: 700;
  letter-spacing: 1.5px;
  text-transform: uppercase;
  color: rgba(255,255,255,0.2);
  margin-bottom: 8px;
  display: block;
}
.tl-type-filters {
  display: flex;
  align-items: center;
  gap: 6px;
  flex-wrap: wrap;
}

/* Botão "Todos" — mantém estilo pill */
.tl-type-btn[data-type="all"] {
  font-family: var(--font-mono, monospace);
  font-size: 9.5px;
  font-weight: 700;
  letter-spacing: .5px;
  text-transform: uppercase;
  padding: 5px 12px;
  border-radius: 20px;
  border: 1px solid rgba(255,255,255,0.18);
  background: rgba(255,255,255,0.06);
  color: rgba(255,255,255,0.75);
  cursor: pointer;
  transition: opacity .15s, transform .1s, box-shadow .15s;
  white-space: nowrap;
  line-height: 1;
  opacity: 0.55;
}
.tl-type-btn[data-type="all"]:hover { opacity: 0.85; }
.tl-type-btn[data-type="all"].active {
  opacity: 1;
  background: rgba(255,255,255,0.12);
  border-color: rgba(255,255,255,0.4);
  box-shadow: 0 0 10px rgba(255,255,255,0.12);
}

/* Botões de tipo — estilo círculo talent */
.tl-type-btn:not([data-type="all"]) {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 4px;
  padding: 6px 4px 5px;
  width: 52px;
  border-radius: 12px;
  border: 1.5px solid var(--tlb-color, rgba(255,255,255,0.12));
  background: rgba(0,0,0,0.2);
  cursor: pointer;
  transition: opacity .15s, transform .12s, box-shadow .15s, border-color .15s;
  opacity: 0.45;
  white-space: nowrap;
}
.tl-type-btn:not([data-type="all"]):hover {
  opacity: 0.8;
  border-color: var(--tlb-color, rgba(255,255,255,0.3));
  transform: translateY(-2px);
}
.tl-type-btn:not([data-type="all"]).active {
  opacity: 1;
  border-color: var(--tlb-color, rgba(255,255,255,0.5));
  background: color-mix(in srgb, var(--tlb-color, #60aaff) 14%, rgba(0,0,0,0.3));
  box-shadow: 0 0 14px color-mix(in srgb, var(--tlb-color, #60aaff) 30%, transparent);
  transform: translateY(-2px);
}
.tl-type-btn:active { transform: scale(0.94) !important; }

.tlb-img-wrap {
  width: 30px;
  height: 30px;
  border-radius: 50%;
  background: color-mix(in srgb, var(--tlb-color, #60aaff) 18%, #0a0e1a);
  border: 1.5px solid color-mix(in srgb, var(--tlb-color, #60aaff) 50%, transparent);
  box-shadow: 0 0 8px color-mix(in srgb, var(--tlb-color, #60aaff) 22%, transparent);
  display: flex;
  align-items: center;
  justify-content: center;
  overflow: hidden;
  flex-shrink: 0;
}
.tlb-img-wrap img {
  width: 20px;
  height: 20px;
  object-fit: contain;
}
.tlb-label {
  font-family: var(--font-mono, monospace);
  font-size: 8px;
  font-weight: 700;
  letter-spacing: .4px;
  text-transform: uppercase;
  color: var(--tlb-color, rgba(255,255,255,0.7));
  line-height: 1;
  text-align: center;
}

.tlc.type-hidden { display: none; }
`;
  document.head.appendChild(s);
})();

/* ══════════════════════════════════════════
   ESTADO
══════════════════════════════════════════ */
var _activeType = 'all';
var _observing = false;

function _baseName(name) {
  return name.replace(/^shiny\s+/i, '').trim();
}

function _getTypes(name) {
  return POKEMON_TYPES[_baseName(name)] || null;
}

/* ══════════════════════════════════════════
   INJETA BADGES NOS CARDS DO DOM
══════════════════════════════════════════ */
function injectTypeBadges() {
  var cards = document.querySelectorAll('#tl-content .tlc');
  cards.forEach(function(card) {
    if (card.querySelector('.tlc-types')) return; // já tem

    var img = card.querySelector('.tlc-sprite');
    if (!img) return;
    var name = img.getAttribute('alt') || '';
    if (!name) return;

    var types = _getTypes(name);
    if (!types || !types.length) return;

    // Grava nos data attributes para o filtro
    card.dataset.type1 = types[0];
    if (types[1]) card.dataset.type2 = types[1];

    // Cria badges
    var wrap = document.createElement('div');
    wrap.className = 'tlc-types';

    types.forEach(function(t) {
      var cfg = TYPE_CFG[t];
      var imgUrl = TYPE_IMGS[t];
      if (!cfg) return;
      var badge = document.createElement('div');
      badge.className = 'tlc-type-badge';
      badge.title = cfg.label;
      badge.style.setProperty('--tlc-badge-color', cfg.color + '88');
      badge.style.setProperty('--tlc-badge-bg', cfg.color + '18');
      badge.style.setProperty('--tlc-badge-glow', cfg.color + '33');
      if (imgUrl) {
        var img = document.createElement('img');
        img.src = imgUrl;
        img.alt = cfg.label;
        img.loading = 'lazy';
        badge.appendChild(img);
      }
      wrap.appendChild(badge);
    });

    // Insere antes do badge de tier (.tlc-tier)
    var tierEl = card.querySelector('.tlc-tier');
    if (tierEl) {
      card.insertBefore(wrap, tierEl);
    } else {
      card.appendChild(wrap);
    }
  });

  applyTypeFilter();
}

/* ══════════════════════════════════════════
   FILTRO DE TIPO
══════════════════════════════════════════ */
function applyTypeFilter() {
  var cards = document.querySelectorAll('#tl-content .tlc');
  cards.forEach(function(card) {
    if (_activeType === 'all') {
      card.classList.remove('type-hidden');
      return;
    }
    var t1 = card.dataset.type1;
    var t2 = card.dataset.type2;
    var match = (t1 === _activeType || t2 === _activeType);
    card.classList.toggle('type-hidden', !match);
  });
}

/* ══════════════════════════════════════════
   BARRA DE FILTROS DE TIPO
══════════════════════════════════════════ */
function injectTypeFilterBar() {
  var root = document.getElementById('tierlist-root');
  if (!root) return;
  if (root.querySelector('.tl-type-filters-wrap')) return;

  var tierFilters = root.querySelector('.tl-tier-filters');
  if (!tierFilters) return;

  var wrap = document.createElement('div');
  wrap.className = 'tl-type-filters-wrap';

  var label = document.createElement('span');
  label.className = 'tl-type-filters-label';
  label.textContent = 'TIPO';

  var row = document.createElement('div');
  row.className = 'tl-type-filters';

  // Todos
  var allBtn = document.createElement('button');
  allBtn.className = 'tl-type-btn active';
  allBtn.dataset.type = 'all';
  allBtn.style.cssText = 'color:rgba(255,255,255,0.75);border-color:rgba(255,255,255,0.2);background:rgba(255,255,255,0.06)';
  allBtn.textContent = 'Todos';
  row.appendChild(allBtn);

  Object.keys(TYPE_CFG).forEach(function(t) {
    var cfg = TYPE_CFG[t];
    var imgUrl = TYPE_IMGS[t];
    var btn = document.createElement('button');
    btn.className = 'tl-type-btn';
    btn.dataset.type = t;
    btn.style.setProperty('--tlb-color', cfg.color);

    var imgWrap = document.createElement('div');
    imgWrap.className = 'tlb-img-wrap';
    if (imgUrl) {
      var img = document.createElement('img');
      img.src = imgUrl;
      img.alt = cfg.label;
      img.loading = 'lazy';
      imgWrap.appendChild(img);
    }

    var lbl = document.createElement('span');
    lbl.className = 'tlb-label';
    lbl.textContent = cfg.label;

    btn.appendChild(imgWrap);
    btn.appendChild(lbl);
    row.appendChild(btn);
  });

  wrap.appendChild(label);
  wrap.appendChild(row);

  // Insere APÓS .tl-tier-filters
  tierFilters.parentNode.insertBefore(wrap, tierFilters.nextSibling);

  // Eventos dos botões
  row.querySelectorAll(".tl-type-btn").forEach(function(btn) {
    btn.addEventListener("click", function() {
      var isAlreadyActive = btn.classList.contains("active");
      row.querySelectorAll(".tl-type-btn").forEach(function(b) { b.classList.remove("active"); });
      if (isAlreadyActive && btn.dataset.type !== "all") {
        _activeType = "all";
        row.querySelector("[data-type=\"all\"]").classList.add("active");
      } else {
        btn.classList.add("active");
        _activeType = btn.dataset.type;
      }
      applyTypeFilter();
    });
  });
}

/* ══════════════════════════════════════════
   OBSERVER — reage a cada re-render do #tl-content
══════════════════════════════════════════ */
function startObserver() {
  if (_observing) return;
  var content = document.getElementById('tl-content');
  if (!content) return;
  _observing = true;

  var obs = new MutationObserver(function() {
    setTimeout(injectTypeBadges, 30);
  });
  obs.observe(content, { childList: true, subtree: false });
}

/* ══════════════════════════════════════════
   PATCH do window.renderTierList
══════════════════════════════════════════ */
var _origRender = window.renderTierList;
window.renderTierList = function() {
  // Reseta o flag para re-observar se o root foi recriado
  _observing = false;

  if (_origRender) _origRender();

  // _tlBuild popula o DOM de forma síncrona; aguarda apenas o tick
  setTimeout(function() {
    injectTypeFilterBar();
    startObserver();
    injectTypeBadges();
  }, 80);
};

/* ══════════════════════════════════════════
   INIT — caso a tier lista já esteja montada
══════════════════════════════════════════ */
function tryInit() {
  var content = document.getElementById('tl-content');
  if (content && content.children.length > 0) {
    injectTypeFilterBar();
    startObserver();
    injectTypeBadges();
  }
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', tryInit);
} else {
  tryInit();
}

})();
