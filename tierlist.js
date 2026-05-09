/* ================================================================
   tierlist.js — Módulo Tier Lista para a Wiki PokeAlliance
   Carregue APÓS app.js, wiki-nav.js e quest-modal.js:
     <script src="tierlist.js"></script>

   Também requer no index.html (antes deste script):
     1. Adicionar <div id="wiki-tab-tierlist" class="wiki-subtab-content" style="display:none">
          <div id="tierlist-root"></div>
        </div>
     2. No wiki-nav.js: adicionar entrada em MODULES e RENDERERS
        (instruções no final deste arquivo)
================================================================ */
(function () {

/* ══════════════════════════════════════════
   DADOS — extraídos da planilha
══════════════════════════════════════════ */
var TIER_DATA = [
  ["Bulbasaur","T6"],["Shiny Bulbasaur","T5"],["Ivysaur","T5"],["Shiny Ivysaur","T4"],
  ["Venusaur","T3"],["Shiny Venusaur","T1"],["Charmander","T6"],["Shiny Charmander","T5"],
  ["Charmeleon","T5"],["Shiny Charmeleon","T4"],["Charizard","T3"],["Shiny Charizard","T1"],
  ["Squirtle","T6"],["Shiny Squirtle","T5"],["Wartortle","T5"],["Shiny Wartortle","T4"],
  ["Blastoise","T3"],["Shiny Blastoise","T1"],["Caterpie","T7"],["Shiny Caterpie","T6"],
  ["Metapod","T6"],["Shiny Metapod","T5"],["Butterfree","T5"],["Shiny Butterfree","T4"],
  ["Weedle","T7"],["Shiny Weedle","T6"],["Kakuna","T6"],["Shiny Kakuna","T5"],
  ["Beedrill","T5"],["Shiny Beedrill","T4"],["Pidgey","T7"],["Shiny Pidgey","T6"],
  ["Pidgeotto","T5"],["Shiny Pidgeotto","T4"],["Pidgeot","T3"],["Shiny Pidgeot","T1"],
  ["Rattata","T7"],["Shiny Rattata","T6"],["Raticate","T5"],["Shiny Raticate","T4"],
  ["Spearow","T7"],["Shiny Spearow","T6"],["Fearow","T5"],["Shiny Fearow","T3"],
  ["Ekans","T6"],["Shiny Ekans","T5"],["Arbok","T4"],["Shiny Arbok","T3"],
  ["Pikachu","T5"],["Shiny Pikachu","T4"],["Raichu","T3"],["Shiny Raichu","T1"],
  ["Sandshrew","T6"],["Shiny Sandshrew","T5"],["Sandslash","T4"],["Shiny Sandslash","T3"],
  ["Nidoran Female","T6"],["Shiny Nidoran Female","T5"],["Nidorina","T5"],["Shiny Nidorina","T4"],
  ["Nidoqueen","T3"],["Shiny Nidoqueen","T1"],["Nidoran Male","T6"],["Shiny Nidoran Male","T5"],
  ["Nidorino","T5"],["Shiny Nidorino","T4"],["Nidoking","T3"],["Shiny Nidoking","T1"],
  ["Clefairy","T6"],["Shiny Clefairy","T5"],["Clefable","T4"],["Shiny Clefable","T3"],
  ["Vulpix","T6"],["Shiny Vulpix","T5"],["Ninetales","T3"],["Shiny Ninetales","T1"],
  ["Jigglypuff","T6"],["Shiny Jigglypuff","T5"],["Wigglytuff","T4"],["Shiny Wigglytuff","T2"],
  ["Zubat","T7"],["Shiny Zubat","T5"],["Golbat","T5"],["Shiny Golbat","T4"],
  ["Oddish","T7"],["Shiny Oddish","T6"],["Gloom","T5"],["Shiny Gloom","T4"],
  ["Vileplume","T4"],["Shiny Vileplume","T3"],["Paras","T7"],["Shiny Paras","T5"],
  ["Parasect","T5"],["Shiny Parasect","T4"],["Venonat","T6"],["Shiny Venonat","T5"],
  ["Venomoth","T4"],["Shiny Venomoth","T2"],["Diglett","T6"],["Shiny Diglett","T5"],
  ["Dugtrio","T4"],["Shiny Dugtrio","T3"],["Meowth","T6"],["Shiny Meowth","T5"],
  ["Persian","T4"],["Shiny Persian","T2"],["Psyduck","T6"],["Shiny Psyduck","T5"],
  ["Golduck","T4"],["Shiny Golduck","T3"],["Mankey","T6"],["Shiny Mankey","T5"],
  ["Primeape","T4"],["Shiny Primeape","T3"],["Growlithe","T6"],["Shiny Growlithe","T5"],
  ["Arcanine","T2"],["Shiny Arcanine","Super Rare"],["Poliwag","T6"],["Shiny Poliwag","T5"],
  ["Poliwhirl","T5"],["Shiny Poliwhirl","T4"],["Poliwrath","T3"],["Shiny Poliwrath","T1"],
  ["Abra","T6"],["Shiny Abra","T5"],["Kadabra","T5"],["Shiny Kadabra","T4"],
  ["Alakazam","T2"],["Shiny Alakazam","Legendary"],["Machop","T6"],["Shiny Machop","T5"],
  ["Machoke","T5"],["Shiny Machoke","T4"],["Machamp","T3"],["Shiny Machamp","Super Rare"],
  ["Bellsprout","T7"],["Shiny Bellsprout","T5"],["Weepinbell","T5"],["Shiny Weepinbell","T4"],
  ["Victreebel","T4"],["Shiny Victreebel","T3"],["Tentacool","T6"],["Shiny Tentacool","T5"],
  ["Tentacruel","T3"],["Shiny Tentacruel","T1"],["Geodude","T6"],["Shiny Geodude","T5"],
  ["Graveler","T5"],["Shiny Graveler","T4"],["Golem","T3"],["Shiny Golem","T1"],
  ["Ponyta","T6"],["Shiny Ponyta","T5"],["Rapidash","T3"],["Shiny Rapidash","T1"],
  ["Slowpoke","T6"],["Shiny Slowpoke","T5"],["Slowbro","T5"],["Shiny Slowbro","T4"],
  ["Magnemite","T6"],["Shiny Magnemite","T5"],["Magneton","T3"],["Shiny Magneton","T2"],
  ["Farfetch'd","T5"],["Shiny Farfetch'd","T1"],["Doduo","T6"],["Shiny Doduo","T5"],
  ["Dodrio","T4"],["Shiny Dodrio","T1"],["Seel","T6"],["Shiny Seel","T5"],
  ["Dewgong","T4"],["Shiny Dewgong","T3"],["Grimer","T6"],["Shiny Grimer","T5"],
  ["Muk","T3"],["Shiny Muk","T1"],["Shellder","T6"],["Shiny Shellder","T5"],
  ["Cloyster","T4"],["Shiny Cloyster","T3"],["Gastly","T6"],["Shiny Gastly","T5"],
  ["Haunter","T5"],["Shiny Haunter","T4"],["Gengar","T2"],["Shiny Gengar","Legendary"],
  ["Onix","T4"],["Shiny Onix","T3"],["Drowzee","T6"],["Shiny Drowzee","T5"],
  ["Hypno","T4"],["Shiny Hypno","T2"],["Krabby","T6"],["Shiny Krabby","T5"],
  ["Kingler","T4"],["Shiny Kingler","T3"],["Voltorb","T6"],["Shiny Voltorb","T5"],
  ["Electrode","T4"],["Shiny Electrode","T3"],["Exeggcute","T6"],["Shiny Exeggcute","T5"],
  ["Exeggutor","T3"],["Shiny Exeggutor","T2"],["Cubone","T6"],["Shiny Cubone","T5"],
  ["Marowak","T4"],["Shiny Marowak","T1"],["Hitmonlee","T4"],["Shiny Hitmonlee","T1"],
  ["Hitmonchan","T4"],["Shiny Hitmonchan","T1"],["Lickitung","T4"],["Shiny Lickitung","T3"],
  ["Koffing","T6"],["Shiny Koffing","T5"],["Weezing","T4"],["Shiny Weezing","T3"],
  ["Rhyhorn","T6"],["Shiny Rhyhorn","T5"],["Rhydon","T3"],["Shiny Rhydon","T2"],
  ["Chansey","T4"],["Shiny Chansey","T3"],["Tangela","T4"],["Shiny Tangela","T2"],
  ["Kangaskhan","T3"],["Shiny Kangaskhan","Super Rare"],["Horsea","T6"],["Shiny Horsea","T5"],
  ["Seadra","T5"],["Shiny Seadra","T4"],["Goldeen","T6"],["Shiny Goldeen","T5"],
  ["Seaking","T4"],["Shiny Seaking","T3"],["Staryu","T6"],["Shiny Staryu","T5"],
  ["Starmie","T4"],["Shiny Starmie","T2"],["Mr. Mime","T3"],["Shiny Mr. Mime","Super Rare"],
  ["Scyther","T3"],["Shiny Scyther","Super Rare"],["Jynx","T2"],["Shiny Jynx","T1"],
  ["Electabuzz","T2"],["Shiny Electabuzz","Legendary"],["Magmar","T2"],["Shiny Magmar","Legendary"],
  ["Pinsir","T3"],["Shiny Pinsir","Super Rare"],["Tauros","T3"],["Shiny Tauros","Super Rare"],
  ["Magikarp","T7"],["Shiny Magikarp","T6"],["Gyarados","T2"],["Shiny Gyarados","Legendary"],
  ["Lapras","T2"],["Shiny Lapras","T1"],["Ditto","T7"],["Shiny Ditto","T7"],
  ["Eevee","T6"],["Shiny Eevee","T5"],["Vaporeon","T3"],["Shiny Vaporeon","T1"],
  ["Jolteon","T3"],["Shiny Jolteon","T1"],["Flareon","T3"],["Shiny Flareon","T1"],
  ["Porygon","T5"],["Shiny Porygon","T4"],["Omanyte","T6"],["Shiny Omanyte","T5"],
  ["Omastar","T3"],["Shiny Omastar","T1"],["Kabuto","T6"],["Shiny Kabuto","T5"],
  ["Kabutops","T3"],["Shiny Kabutops","T1"],["Aerodactyl","T1"],["Shiny Aerodactyl","?"],
  ["Snorlax","T2"],["Shiny Snorlax","Legendary"],["Articuno","?"],["Shiny Articuno","?"],
  ["Zapdos","?"],["Shiny Zapdos","?"],["Moltres","?"],["Shiny Moltres","?"],
  ["Dratini","T5"],["Shiny Dratini","T4"],["Dragonair","T4"],["Shiny Dragonair","Legendary"],
  ["Dragonite","T2"],["Shiny Dragonite","Mythic"],["Mewtwo","?"],["Shiny Mewtwo","?"],
  ["Mew","?"],["Shiny Mew","?"],["Chikorita","T6"],["Shiny Chikorita","T5"],
  ["Bayleef","T5"],["Shiny Bayleef","T4"],["Meganium","T3"],["Shiny Meganium","T1"],
  ["Cyndaquil","T6"],["Shiny Cyndaquil","T5"],["Quilava","T5"],["Shiny Quilava","T4"],
  ["Typhlosion","T3"],["Shiny Typhlosion","T1"],["Totodile","T6"],["Shiny Totodile","T5"],
  ["Croconaw","T5"],["Shiny Croconaw","T4"],["Feraligatr","T3"],["Shiny Feraligatr","T1"],
  ["Sentret","T7"],["Shiny Sentret","T5"],["Furret","T4"],["Shiny Furret","T4"],
  ["Hoothoot","T7"],["Shiny Hoothoot","T5"],["Noctowl","T4"],["Shiny Noctowl","T2"],
  ["Ledyba","T6"],["Shiny Ledyba","T5"],["Ledian","T4"],["Shiny Ledian","T3"],
  ["Spinarak","T6"],["Shiny Spinarak","T5"],["Ariados","T4"],["Shiny Ariados","T3"],
  ["Crobat","T3"],["Shiny Crobat","T2"],["Chinchou","T6"],["Shiny Chinchou","T5"],
  ["Lanturn","T3"],["Shiny Lanturn","T2"],["Pichu","T6"],["Shiny Pichu","T5"],
  ["Cleffa","T7"],["Shiny Cleffa","T6"],["Igglybuff","T7"],["Shiny Igglybuff","T6"],
  ["Togepi","T6"],["Shiny Togepi","T5"],["Togetic","T4"],["Shiny Togetic","T3"],
  ["Natu","T6"],["Shiny Natu","T5"],["Xatu","T3"],["Shiny Xatu","T2"],
  ["Mareep","T6"],["Shiny Mareep","T5"],["Flaaffy","T5"],["Shiny Flaaffy","T4"],
  ["Ampharos","T3"],["Shiny Ampharos","T1"],["Bellossom","T4"],["Shiny Bellossom","T3"],
  ["Marill","T6"],["Shiny Marill","T5"],["Azumarill","T4"],["Shiny Azumarill","T3"],
  ["Sudowoodo","T2"],["Shiny Sudowoodo","T1"],["Politoed","T4"],["Shiny Politoed","T1"],
  ["Hoppip","T6"],["Shiny Hoppip","T5"],["Skiploom","T5"],["Shiny Skiploom","T4"],
  ["Jumpluff","T4"],["Shiny Jumpluff","T3"],["Aipom","T6"],["Shiny Aipom","T5"],
  ["Sunkern","T7"],["Shiny Sunkern","T5"],["Sunflora","T5"],["Shiny Sunflora","T4"],
  ["Yanma","T5"],["Shiny Yanma","T3"],["Wooper","T6"],["Shiny Wooper","T5"],
  ["Quagsire","T4"],["Shiny Quagsire","T2"],["Espeon","T4"],["Shiny Espeon","T1"],
  ["Umbreon","T4"],["Shiny Umbreon","T1"],["Murkrow","T5"],["Shiny Murkrow","T3"],
  ["Slowking","T2"],["Shiny Slowking","T1"],["Misdreavus","T3"],["Shiny Misdreavus","Super Rare"],
  ["Unown","?"],["Shiny Unown","?"],["Wobbuffet","T2"],["Shiny Wobbuffet","Super Rare"],
  ["Girafarig","T3"],["Shiny Girafarig","T2"],["Pineco","T7"],["Shiny Pineco","T5"],
  ["Forretress","T3"],["Shiny Forretress","T2"],["Dunsparce","T5"],["Shiny Dunsparce","T4"],
  ["Gligar","T5"],["Shiny Gligar","T4"],["Steelix","T2"],["Shiny Steelix","T1"],
  ["Snubbull","T6"],["Shiny Snubbull","T5"],["Granbull","T3"],["Shiny Granbull","T2"],
  ["Qwilfish","T4"],["Shiny Qwilfish","T3"],["Scizor","T2"],["Shiny Scizor","Legendary"],
  ["Shuckle","T5"],["Shiny Shuckle","T4"],["Heracross","T3"],["Shiny Heracross","T2"],
  ["Sneasel","T4"],["Shiny Sneasel","T3"],["Teddiursa","T5"],["Shiny Teddiursa","T4"],
  ["Ursaring","T2"],["Shiny Ursaring","T1"],["Slugma","T6"],["Shiny Slugma","T5"],
  ["Magcargo","T3"],["Shiny Magcargo","T1"],["Swinub","T6"],["Shiny Swinub","T5"],
  ["Piloswine","T3"],["Shiny Piloswine","T2"],["Corsola","T5"],["Shiny Corsola","T4"],
  ["Remoraid","T6"],["Shiny Remoraid","T5"],["Octillery","T4"],["Shiny Octillery","T3"],
  ["Delibird","T4"],["Shiny Delibird","T3"],["Mantine","T2"],["Shiny Mantine","T1"],
  ["Skarmory","T2"],["Shiny Skarmory","Super Rare"],["Houndour","T6"],["Shiny Houndour","T5"],
  ["Houndoom","T2"],["Shiny Houndoom","Super Rare"],["Kingdra","T2"],["Shiny Kingdra","Super Rare"],
  ["Phanpy","T6"],["Shiny Phanpy","T5"],["Donphan","T3"],["Shiny Donphan","T2"],
  ["Porygon2","T3"],["Shiny Porygon2","T2"],["Stantler","T4"],["Shiny Stantler","T2"],
  ["Smeargle","T2"],["Shiny Smeargle","T1"],["Tyrogue","T5"],["Shiny Tyrogue","T4"],
  ["Hitmontop","T4"],["Shiny Hitmontop","T1"],["Smoochum","T6"],["Shiny Smoochum","T5"],
  ["Elekid","T6"],["Shiny Elekid","T5"],["Magby","T6"],["Shiny Magby","T5"],
  ["Miltank","T3"],["Shiny Miltank","T1"],["Blissey","T2"],["Shiny Blissey","T1"],
  ["Raikou","?"],["Shiny Raikou","?"],["Entei","?"],["Shiny Entei","?"],
  ["Suicune","?"],["Shiny Suicune","?"],["Larvitar","T6"],["Shiny Larvitar","T5"],
  ["Pupitar","T4"],["Shiny Pupitar","Super Rare"],["Tyranitar","T2"],["Shiny Tyranitar","Mythic"],
  ["Lugia","?"],["Shiny Lugia","?"],["Ho-oh","?"],["Shiny Ho-oh","?"],
  ["Celebi","?"],["Shiny Celebi","?"],["Treecko","T5"],["Shiny Treecko","T4"],
  ["Grovyle","T4"],["Shiny Grovyle","T3"],["Sceptile","T2"],["Shiny Sceptile","Ultra Rare"],
  ["Torchic","T5"],["Shiny Torchic","T4"],["Combusken","T4"],["Shiny Combusken","T3"],
  ["Blaziken","T2"],["Shiny Blaziken","Ultra Rare"],["Mudkip","T5"],["Shiny Mudkip","T4"],
  ["Marshtomp","T4"],["Shiny Marshtomp","T3"],["Swampert","T2"],["Shiny Swampert","Ultra Rare"],
  ["Poochyena","T5"],["Shiny Poochyena","T4"],["Mightyena","T2"],["Shiny Mightyena","Ultra Rare"],
  ["Zigzagoon","T5"],["Shiny Zigzagoon","T4"],["Linoone","T4"],["Shiny Linoone","T2"],
  ["Wurmple","T6"],["Shiny Wurmple","T5"],["Silcoon","T6"],["Shiny Silcoon","T5"],
  ["Beautifly","T3"],["Shiny Beautifly","T1"],["Cascoon","T6"],["Shiny Cascoon","T5"],
  ["Dustox","T3"],["Shiny Dustox","T1"],["Lotad","T5"],["Shiny Lotad","T4"],
  ["Lombre","T4"],["Shiny Lombre","T3"],["Ludicolo","T2"],["Shiny Ludicolo","T1"],
  ["Seedot","T5"],["Shiny Seedot","T4"],["Nuzleaf","T2"],["Shiny Nuzleaf","T3"],
  ["Shiftry","T2"],["Shiny Shiftry","T1"],["Taillow","T5"],["Shiny Taillow","T4"],
  ["Swellow","T2"],["Shiny Swellow","Super Rare"],["Wingull","T5"],["Shiny Wingull","T4"],
  ["Pelipper","T2"],["Shiny Pelipper","T1"],["Ralts","T5"],["Shiny Ralts","T4"],
  ["Kirlia","T4"],["Shiny Kirlia","T3"],["Gardevoir","T2"],["Shiny Gardevoir","Ultra Rare"],
  ["Surskit","T5"],["Shiny Surskit","T4"],["Masquerain","T3"],["Shiny Masquerain","T1"],
  ["Breloom","T2"],["Shiny Breloom","T1"],["Slakoth","T5"],["Shiny Slakoth","T4"],
  ["Vigoroth","T4"],["Shiny Vigoroth","T3"],["Slaking","T2"],["Shiny Slaking","Mythic"],
  ["Nincada","T5"],["Shiny Nincada","T4"],["Ninjask","T2"],["Shiny Ninjask","T1"],
  ["Shedinja","T2"],["Shiny Shedinja","T1"],["Whismur","T5"],["Shiny Whismur","T4"],
  ["Loudred","T4"],["Shiny Loudred","T3"],["Exploud","T2"],["Shiny Exploud","Ultra Rare"],
  ["Makuhita","T4"],["Shiny Makuhita","T3"],["Hariyama","T2"],["Shiny Hariyama","T1"],
  ["Azurill","T4"],["Shiny Azurill","T3"],["Nosepass","T4"],["Shiny Nosepass","T3"],
  ["Skitty","T5"],["Shiny Skitty","T4"],["Delcatty","T3"],["Shiny Delcatty","T1"],
  ["Sableye","T2"],["Shiny Sableye","T1"],["Mawile","T2"],["Shiny Mawile","T1"],
  ["Aron","T5"],["Shiny Aron","T4"],["Lairon","T4"],["Shiny Lairon","T3"],
  ["Aggron","T2"],["Shiny Aggron","Super Rare"],["Meditite","T5"],["Shiny Meditite","T4"],
  ["Medicham","T2"],["Shiny Medicham","T1"],["Electrike","T5"],["Shiny Electrike","T4"],
  ["Manectric","T2"],["Shiny Manectric","Ultra Rare"],["Plusle","T4"],["Shiny Plusle","T3"],
  ["Minun","T4"],["Shiny Minun","T3"],["Volbeat","T3"],["Shiny Volbeat","T2"],
  ["Illumise","T3"],["Shiny Illumise","T2"],["Roselia","T3"],["Shiny Roselia","T1"],
  ["Gulpin","T4"],["Shiny Gulpin","T3"],["Swalot","T2"],["Shiny Swalot","Ultra Rare"],
  ["Carvanha","T4"],["Shiny Carvanha","T3"],["Sharpedo","T2"],["Shiny Sharpedo","Super Rare"],
  ["Wailmer","T4"],["Shiny Wailmer","T3"],["Wailord","T2"],["Shiny Wailord","T1"],
  ["Numel","T5"],["Shiny Numel","T4"],["Camerupt","T2"],["Shiny Camerupt","T1"],
  ["Torkoal","T2"],["Shiny Torkoal","Ultra Rare"],["Spoink","T5"],["Shiny Spoink","T4"],
  ["Grumpig","T3"],["Shiny Grumpig","T1"],["Spinda","T4"],["Shiny Spinda","T3"],
  ["Trapinch","T5"],["Shiny Trapinch","T4"],["Vibrava","T4"],["Shiny Vibrava","T3"],
  ["Flygon","T2"],["Shiny Flygon","Legendary"],["Cacnea","T5"],["Shiny Cacnea","T4"],
  ["Cacturne","T2"],["Shiny Cacturne","T1"],["Swablu","T5"],["Shiny Swablu","T4"],
  ["Altaria","T2"],["Shiny Altaria","Super Rare"],["Zangoose","T2"],["Shiny Zangoose","T1"],
  ["Seviper","T2"],["Shiny Seviper","Super Rare"],["Lunatone","T2"],["Shiny Lunatone","T1"],
  ["Solrock","T2"],["Shiny Solrock","T1"],["Barboach","T5"],["Shiny Barboach","T4"],
  ["Whiscash","T2"],["Shiny Whiscash","T1"],["Corphish","T5"],["Shiny Corphish","T4"],
  ["Crawdaunt","T2"],["Shiny Crawdaunt","T1"],["Baltoy","T5"],["Shiny Baltoy","T4"],
  ["Claydol","T2"],["Shiny Claydol","T1"],["Cradily","T2"],["Shiny Cradily","T1"],
  ["Anorith","T5"],["Shiny Anorith","T4"],["Armaldo","T2"],["Shiny Armaldo","Super Rare"],
  ["Feebas","T5"],["Shiny Feebas","T4"],["Milotic","T2"],["Shiny Milotic","Ultra Rare"],
  ["Castform","?"],["Shiny Castform","?"],["Kecleon","T3"],["Shiny Kecleon","T1"],
  ["Shuppet","T5"],["Shiny Shuppet","T4"],["Banette","T2"],["Shiny Banette","T1"],
  ["Duskull","T5"],["Shiny Duskull","T4"],["Dusclops","T2"],["Shiny Dusclops","T1"],
  ["Tropius","T2"],["Shiny Tropius","Ultra Rare"],["Chimecho","T3"],["Shiny Chimecho","T1"],
  ["Absol","T2"],["Shiny Absol","Legendary"],["Wynaut","T5"],["Shiny Wynaut","T4"],
  ["Snorunt","T5"],["Shiny Snorunt","T4"],["Glalie","T2"],["Shiny Glalie","Ultra Rare"],
  ["Spheal","T5"],["Shiny Spheal","T4"],["Sealeo","T4"],["Shiny Sealeo","T3"],
  ["Walrein","T2"],["Shiny Walrein","Super Rare"],["Clamperl","T3"],["Shiny Clamperl","T1"],
  ["Huntail","T3"],["Shiny Huntail","T1"],["Gorebyss","T3"],["Shiny Gorebyss","T1"],
  ["Relicanth","T3"],["Shiny Relicanth","T1"],["Luvdisc","T3"],["Shiny Luvdisc","T2"],
  ["Bagon","T5"],["Shiny Bagon","T4"],["Shelgon","T4"],["Shiny Shelgon","T3"],
  ["Salamence","T2"],["Shiny Salamence","Ultra Rare"],["Beldum","T5"],["Shiny Beldum","T4"],
  ["Metang","T4"],["Shiny Metang","T1"],["Metagross","T2"],["Shiny Metagross","Ultra Rare"],
  ["Regirock","?"],["Shiny Regirock","?"],["Regice","?"],["Shiny Regice","?"],
  ["Registeel","?"],["Shiny Registeel","?"],["Latios","?"],["Shiny Latios","?"],
  ["Latias","?"],["Shiny Latias","?"],["Kyogre","?"],["Shiny Kyogre","?"],
  ["Groudon","?"],["Shiny Groudon","?"],["Rayquaza","?"],["Shiny Rayquaza","?"],
  ["Jirachi","?"],["Shiny Jirachi","?"],["Deoxys","?"],["Shiny Deoxys","?"],
  ["Toxicroak","T2"],["Shiny Toxicroak","Super Rare"],["Abomasnow","T2"],
  ["Mega Abomasnow","Legendary"],["Rhyperior","T1"],["Shiny Rhyperior","Legendary"],
  ["Leafeon","T2"],["Shiny Leafeon","Legendary"],["Glaceon","T2"],["Shiny Glaceon","Legendary"],
  ["Deino","T5"],["Shiny Deino","T5"],["Zweilous","T2"],["Shiny Zweilous","T2"],
  ["Hydreigon","T2"],["Shiny Hydreigon","Super Rare"],["Flabebe","T6"],["Shiny Flabebe","T5"],
  ["Floette","T5"],["Shiny Floette","T4"],["Florges","T2"],["Shiny Florges","Super Rare"],
  ["Sylveon","T2"],["Shiny Sylveon","Legendary"],["Mimikyu","T2"],["Shiny Mimikyu","Super Rare"],

  // Pokémon base faltantes da planilha
  ["Lucario","T2"],["Shiny Lucario","Super Rare"],
  ["Garchomp","T2"],["Shiny Garchomp","Super Rare"],
  ["Infernape","T2"],["Shiny Infernape","Super Rare"],
  ["Gliscor","T2"],["Shiny Gliscor","Super Rare"],
  ["Dusknoir","T2"],["Shiny Dusknoir","Super Rare"],
  ["Gogoat","T2"],["Shiny Gogoat","Super Rare"],
  ["Yanmega","T2"],["Shiny Yanmega","Legendary"],
  ["Mismagius","T2"],["Shiny Mismagius","Ultra Rare"],
  ["Staraptor","T2"],["Shiny Staraptor","Legendary"],
  ["Conkeldurr","T2"],["Shiny Conkeldurr","Legendary"],
  ["Drapion","T2"],["Shiny Drapion","Legendary"],
  ["Gallade","T2"],["Shiny Gallade","Ultra Rare"],
  ["Rampardos","T2"],["Shiny Rampardos","Ultra Rare"],
  ["Bastiodon","T2"],["Shiny Bastiodon","Super Rare"],
  ["Vespiquen","T2"],["Shiny Vespiquen","Ultra Rare"],
  ["Electivire","T2"],["Shiny Electivire","Mythic"],
  ["Magmortar","T2"],["Shiny Magmortar","Mythic"],
  ["Sneasler","T2"],["Shiny Sneasler","Mythic"],
  ["Abomasnow","T2"],["Shiny Abomasnow","Super Rare"],

  // Mega Evoluções
  ["Mega Charizard X","Legendary"],
  ["Mega Charizard Y","Legendary"],
  ["Mega Blastoise","Legendary"],
  ["Mega Venusaur","Legendary"],
  ["Mega Pidgeot","Legendary"],
  ["Mega Alakazam","Legendary"],
  ["Mega Gengar","Legendary"],
  ["Mega Kangaskhan","Legendary"],
  ["Mega Pinsir","Legendary"],
  ["Mega Gyarados","Legendary"],
  ["Mega Aerodactyl","Legendary"],
  ["Mega Ampharos","Legendary"],
  ["Mega Scizor","Legendary"],
  ["Mega Heracross","Legendary"],
  ["Mega Houndoom","Legendary"],
  ["Mega Tyranitar","Legendary"],
  ["Mega Sceptile","Legendary"],
  ["Mega Blaziken","Legendary"],
  ["Mega Swampert","Legendary"],
  ["Mega Gardevoir","Legendary"],
  ["Mega Sableye","Legendary"],
  ["Mega Mawile","Legendary"],
  ["Mega Aggron","Legendary"],
  ["Mega Medicham","Legendary"],
  ["Mega Manectric","Legendary"],
  ["Mega Altaria","Legendary"],
  ["Mega Salamence","Legendary"],
  ["Mega Metagross","Legendary"],
  ["Mega Banette","Legendary"],
  ["Mega Absol","Legendary"],
  ["Mega Glalie","Legendary"],
  ["Mega Steelix","Legendary"],
  ["Mega Audino","Legendary"],
  ["Mega Scolipede","Legendary"],
  ["Mega Dragalge","Legendary"],
];

/* ══════════════════════════════════════════
   CONFIG DE TIERS
══════════════════════════════════════════ */
var TIER_CONFIG = {
  'Mythic':      { label: 'Mythic',      color: '#e040fb', glow: 'rgba(224,64,251,0.55)',  bg: 'rgba(224,64,251,0.10)', order: 0 },
  'Legendary':   { label: 'Legendary',   color: '#ff9800', glow: 'rgba(255,152,0,0.55)',   bg: 'rgba(255,152,0,0.10)',  order: 1 },
  'Ultra Rare':  { label: 'Ultra Rare',  color: '#00bcd4', glow: 'rgba(0,188,212,0.5)',    bg: 'rgba(0,188,212,0.09)', order: 2 },
  'Super Rare':  { label: 'Super Rare',  color: '#66bb6a', glow: 'rgba(102,187,106,0.5)',  bg: 'rgba(102,187,106,0.09)',order: 3 },
  'T1':          { label: 'T1',          color: '#f06292', glow: 'rgba(240,98,146,0.5)',   bg: 'rgba(240,98,146,0.08)', order: 4 },
  'T2':          { label: 'T2',          color: '#ff7043', glow: 'rgba(255,112,67,0.5)',   bg: 'rgba(255,112,67,0.08)', order: 5 },
  'T3':          { label: 'T3',          color: '#ffa726', glow: 'rgba(255,167,38,0.45)',  bg: 'rgba(255,167,38,0.07)', order: 6 },
  'T4':          { label: 'T4',          color: '#d4e157', glow: 'rgba(212,225,87,0.4)',   bg: 'rgba(212,225,87,0.06)', order: 7 },
  'T5':          { label: 'T5',          color: '#4dd0e1', glow: 'rgba(77,208,225,0.35)',  bg: 'rgba(77,208,225,0.06)', order: 8 },
  'T6':          { label: 'T6',          color: '#7e8db8', glow: 'rgba(126,141,184,0.3)',  bg: 'rgba(126,141,184,0.05)',order: 9 },
  'T7':          { label: 'T7',          color: '#546e7a', glow: 'rgba(84,110,122,0.25)',  bg: 'rgba(84,110,122,0.04)', order: 10 },
  '?':           { label: '?',           color: '#607d8b', glow: 'rgba(96,125,139,0.2)',   bg: 'rgba(96,125,139,0.04)', order: 11 },
};

var TIER_ORDER = ['Mythic','Legendary','Ultra Rare','Super Rare','T1','T2','T3','T4','T5','T6','T7','?'];

/* ── Estado dos filtros ─────────────────── */
var _tlState = {
  search: '',
  tiers: [],      // vazio = todos
  onlyShiny: false,
  view: 'grid',   // 'grid' | 'grouped'
};

/* ── Sprite helper ──────────────────────── */
function _tlSprite(name) {
  var isShiny = /^shiny\s+/i.test(name);
  var n = name
    .replace(/^shiny\s+/i, '')
    .replace(/['']/g, "'")
    .replace(/\u00e9|\u00e8|\u00ea/g, 'e')
    .replace(/\u00e0|\u00e2/g, 'a')
    .replace(/\u00fb/g, 'u')
    .toLowerCase()
    .trim();
  // Correções específicas
  var fixes = {
    'charmeleon': 'charmeleon',
    'charmelion': 'charmeleon',
    'nidoran female': 'nidoranf',
    'nidoran male': 'nidoranm',
    'ho-oh': 'hooh',
    'porygon-z': 'porygonz',
    'mime jr.': 'mimejr',
    'mr. mime': 'mrmime',
    'mr.mime': 'mrmime',
    "farfetch'd": 'farfetchd',
    'flabebe': 'flabebe',
    // Megas com nome fixo (incluindo X/Y sem hífen separador, padrão Showdown)
    'mega abomasnow':   'abomasnow-mega',
    'mega charizard x': 'charizard-megax',
    'mega charizard y': 'charizard-megay',
    // Megas customizados do servidor (sprites próprios via Imgur)
    'mega scolipede':   'https://i.imgur.com/stT9gDR.png',
    'mega dragalge':    'https://i.imgur.com/CTd0hxa.png',
  };
  if (fixes[n]) {
    var fixVal = fixes[n];
    // URL direta (imgur etc.) — retorna sem montar URL do Showdown
    if (fixVal.indexOf('http') === 0) {
      return { src: fixVal, fallback: fixVal };
    }
    n = fixVal;
  }
  else {
    var megaXY = n.match(/^mega\s+(.+?)\s+(x|y)$/);
    if (megaXY) n = megaXY[1].replace(/\s+/g,'') + '-mega' + megaXY[2];
    else {
      var megaBase = n.match(/^mega\s+(.+)$/);
      if (megaBase) n = megaBase[1].replace(/\s+/g,'') + '-mega';
      else n = n.replace(/\s+/g,'');
    }
  }
  var base = isShiny
    ? 'https://play.pokemonshowdown.com/sprites/dex-shiny/' + n + '.png'
    : 'https://play.pokemonshowdown.com/sprites/dex/' + n + '.png';
  return { src: base, fallback: 'https://play.pokemonshowdown.com/sprites/dex/' + n + '.png' };
}

/* ══════════════════════════════════════════
   CSS
══════════════════════════════════════════ */
(function injectCSS() {
  if (document.getElementById('tierlist-css')) return;
  var s = document.createElement('style');
  s.id = 'tierlist-css';
  s.textContent = `

/* ── Wrapper geral ── */
#tierlist-root {
  padding: 0 0 48px;
}

/* ── Topbar de filtros ── */
.tl-topbar {
  display: flex;
  align-items: center;
  gap: 10px;
  flex-wrap: wrap;
  padding: 14px 2px 16px;
}

/* Search */
.tl-search-wrap {
  display: flex;
  align-items: center;
  gap: 8px;
  background: rgba(255,255,255,0.04);
  border: 1px solid rgba(255,255,255,0.09);
  border-radius: 10px;
  padding: 0 12px;
  height: 36px;
  flex: 1;
  min-width: 160px;
  max-width: 320px;
  transition: border-color .18s, background .18s;
}
.tl-search-wrap:focus-within {
  border-color: rgba(96,170,255,0.4);
  background: rgba(96,170,255,0.04);
}
.tl-search-wrap input {
  flex: 1;
  background: none;
  border: none;
  outline: none;
  color: rgba(255,255,255,0.85);
  font-family: var(--font-body, 'Rajdhani', sans-serif);
  font-size: 13px;
  font-weight: 500;
  letter-spacing: .3px;
}
.tl-search-wrap input::placeholder { color: rgba(255,255,255,0.25); }

/* View toggle */
.tl-view-toggle {
  display: flex;
  gap: 2px;
  background: rgba(255,255,255,0.04);
  border: 1px solid rgba(255,255,255,0.08);
  border-radius: 10px;
  padding: 3px;
  flex-shrink: 0;
}
.tl-view-btn {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 30px; height: 30px;
  border-radius: 7px;
  border: none;
  background: transparent;
  color: rgba(255,255,255,0.35);
  cursor: pointer;
  transition: background .15s, color .15s;
}
.tl-view-btn.active {
  background: rgba(96,170,255,0.15);
  color: #60aaff;
}
.tl-view-btn:hover:not(.active) {
  background: rgba(255,255,255,0.06);
  color: rgba(255,255,255,0.6);
}

/* Count */
.tl-count {
  font-family: var(--font-mono, monospace);
  font-size: 11px;
  color: rgba(255,255,255,0.28);
  letter-spacing: .5px;
  white-space: nowrap;
  margin-left: auto;
}

/* ── Filtros de tier ── */
.tl-tier-filters {
  display: flex;
  align-items: center;
  gap: 6px;
  flex-wrap: wrap;
  padding: 0 2px 14px;
}

.tl-filter-label {
  font-family: var(--font-mono, monospace);
  font-size: 10px;
  font-weight: 700;
  letter-spacing: 1.5px;
  text-transform: uppercase;
  color: rgba(255,255,255,0.2);
  margin-right: 2px;
}

.tl-tier-btn {
  font-family: var(--font-mono, monospace);
  font-size: 10px;
  font-weight: 700;
  letter-spacing: .6px;
  padding: 4px 10px;
  border-radius: 20px;
  border: 1px solid;
  cursor: pointer;
  transition: background .15s, color .15s, box-shadow .15s, transform .1s;
  white-space: nowrap;
  line-height: 1;
}
.tl-tier-btn:active { transform: scale(0.94); }

/* Toggle shiny */
.tl-shiny-btn {
  font-family: var(--font-body, 'Rajdhani', sans-serif);
  font-size: 11px;
  font-weight: 700;
  letter-spacing: .5px;
  padding: 4px 12px;
  border-radius: 20px;
  border: 1px solid rgba(255,220,120,0.25);
  background: rgba(255,220,120,0.05);
  color: rgba(255,220,120,0.5);
  cursor: pointer;
  transition: all .18s;
  display: flex;
  align-items: center;
  gap: 5px;
  flex-shrink: 0;
}
.tl-shiny-btn.active {
  background: rgba(255,215,0,0.13);
  border-color: rgba(255,215,0,0.5);
  color: #ffd700;
  box-shadow: 0 0 10px rgba(255,215,0,0.2);
}

/* ── GRID VIEW ── */
.tl-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(88px, 1fr));
  gap: 8px;
}

/* Card Pokémon */
.tlc {
  position: relative;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 6px;
  padding: 10px 6px 8px;
  border-radius: 14px;
  border: 1px solid rgba(255,255,255,0.05);
  background: rgba(255,255,255,0.02);
  cursor: default;
  transition: border-color .2s, box-shadow .2s, transform .18s, background .18s;
  overflow: hidden;
  min-height: 110px;
  justify-content: center;
}
.tlc::before {
  content: '';
  position: absolute;
  top: 0; left: 0; right: 0;
  height: 2px;
  border-radius: 14px 14px 0 0;
  opacity: 0;
  transition: opacity .2s;
}
.tlc:hover {
  transform: translateY(-3px);
  z-index: 2;
}
.tlc:hover::before { opacity: 1; }

/* Sprite */
.tlc-sprite {
  width: 54px;
  height: 54px;
  object-fit: contain;
  image-rendering: pixelated;
  filter: drop-shadow(0 2px 6px rgba(0,0,0,0.5));
  flex-shrink: 0;
}
.tlc-sprite.shiny-sprite {
  filter: drop-shadow(0 2px 8px rgba(255,215,0,0.35));
}

/* Nome */
.tlc-name {
  font-family: var(--font-body, 'Rajdhani', sans-serif);
  font-size: 10.5px;
  font-weight: 700;
  color: rgba(255,255,255,0.72);
  text-align: center;
  line-height: 1.25;
  word-break: break-word;
  letter-spacing: .2px;
}
.tlc.is-shiny .tlc-name { color: rgba(255,220,120,0.85); }

/* Badge tier */
.tlc-tier {
  font-family: var(--font-mono, monospace);
  font-size: 9px;
  font-weight: 700;
  letter-spacing: .8px;
  padding: 2px 7px;
  border-radius: 20px;
  border: 1px solid;
  line-height: 1;
  flex-shrink: 0;
}

/* Estrela shiny */
.tlc-shiny-star {
  position: absolute;
  top: 5px; right: 6px;
  font-size: 9px;
  line-height: 1;
  filter: drop-shadow(0 0 4px rgba(255,215,0,0.7));
}

/* ── GROUPED VIEW ── */
.tl-grouped {
  display: flex;
  flex-direction: column;
  gap: 20px;
}

.tl-group {
  display: flex;
  flex-direction: column;
  gap: 0;
  border-radius: 16px;
  overflow: hidden;
  border: 1px solid rgba(255,255,255,0.05);
}

.tl-group-header {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 11px 18px;
  position: relative;
}
.tl-group-header::after {
  content: '';
  position: absolute;
  bottom: 0; left: 0; right: 0;
  height: 1px;
  background: rgba(255,255,255,0.05);
}

.tl-group-label {
  font-family: var(--font-title, 'Cinzel', serif);
  font-size: 12px;
  font-weight: 700;
  letter-spacing: 2px;
  text-transform: uppercase;
}

.tl-group-count {
  font-family: var(--font-mono, monospace);
  font-size: 10px;
  color: rgba(255,255,255,0.25);
  letter-spacing: .5px;
}

.tl-group-body {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(84px, 1fr));
  gap: 6px;
  padding: 12px;
  background: rgba(0,0,0,0.15);
}

/* ── Empty state ── */
.tl-empty {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 10px;
  padding: 60px 20px;
  color: rgba(255,255,255,0.18);
}
.tl-empty-icon { font-size: 40px; opacity: .5; }
.tl-empty-label {
  font-family: var(--font-body, sans-serif);
  font-size: 14px;
  letter-spacing: .4px;
}

@media (max-width: 480px) {
  .tl-grid { grid-template-columns: repeat(auto-fill, minmax(76px, 1fr)); gap: 6px; }
  .tl-group-body { grid-template-columns: repeat(auto-fill, minmax(76px, 1fr)); gap: 5px; }
  .tl-topbar { gap: 8px; }
  .tl-search-wrap { max-width: 100%; }
}
  `;
  document.head.appendChild(s);
})();

/* ══════════════════════════════════════════
   RENDER
══════════════════════════════════════════ */
function _tlCardHTML(name, tier) {
  var cfg = TIER_CONFIG[tier] || TIER_CONFIG['?'];
  var isShiny = /^shiny\s+/i.test(name);
  var sp = _tlSprite(name);
  var cardBg   = cfg.bg;
  var cardBorder = cfg.color + '22';
  var topLine  = 'linear-gradient(90deg, transparent, ' + cfg.color + '99, transparent)';

  return '<div class="tlc' + (isShiny ? ' is-shiny' : '') + '" ' +
    'style="background:' + cardBg + ';border-color:' + cardBorder + ';' +
      '--tlc-glow:' + cfg.glow + ';' +
      '--tlc-color:' + cfg.color + ';' +
    '" ' +
    'onmouseenter="this.style.boxShadow=\'0 8px 28px \'+this.style.getPropertyValue(\'--tlc-glow\');this.style.borderColor=\'' + cfg.color + '55\'" ' +
    'onmouseleave="this.style.boxShadow=\'\';this.style.borderColor=\'' + cardBorder + '\'">' +
    '<style>.tlc[data-n="' + name.replace(/"/g,'') + '"]::before{background:' + topLine + ';}</style>' +
    (isShiny ? '<span class="tlc-shiny-star">✦</span>' : '') +
    '<img class="tlc-sprite' + (isShiny ? ' shiny-sprite' : '') + '" ' +
      'src="' + sp.src + '" alt="' + name + '" loading="lazy" ' +
      'onerror="this.src=\'' + sp.fallback + '\';this.onerror=function(){this.style.opacity=\'0.2\';}" />' +
    '<div class="tlc-name">' + (isShiny ? name.replace(/^shiny\s+/i,'') : name) + '</div>' +
    '<div class="tlc-tier" style="color:' + cfg.color + ';border-color:' + cfg.color + '44;background:' + cfg.color + '11;">' + cfg.label + '</div>' +
  '</div>';
}

function _tlRenderGrid(data) {
  if (!data.length) {
    return '<div class="tl-empty"><div class="tl-empty-icon">🔍</div><div class="tl-empty-label">Nenhum Pokémon encontrado.</div></div>';
  }
  return '<div class="tl-grid">' + data.map(function(d){ return _tlCardHTML(d[0], d[1]); }).join('') + '</div>';
}

function _tlRenderGrouped(data) {
  if (!data.length) {
    return '<div class="tl-empty"><div class="tl-empty-icon">🔍</div><div class="tl-empty-label">Nenhum Pokémon encontrado.</div></div>';
  }

  /* Agrupa por tier */
  var groups = {};
  TIER_ORDER.forEach(function(t){ groups[t] = []; });
  data.forEach(function(d){
    var t = d[1];
    if (!groups[t]) groups[t] = [];
    groups[t].push(d);
  });

  return '<div class="tl-grouped">' +
    TIER_ORDER.filter(function(t){ return groups[t] && groups[t].length; }).map(function(t){
      var cfg = TIER_CONFIG[t] || TIER_CONFIG['?'];
      var items = groups[t];
      return '<div class="tl-group">' +
        '<div class="tl-group-header" style="background:' + cfg.bg + ';border-bottom:1px solid ' + cfg.color + '22;">' +
          '<div class="tl-group-label" style="color:' + cfg.color + ';text-shadow:0 0 12px ' + cfg.glow + ';">' + cfg.label + '</div>' +
          '<div class="tl-group-count">' + items.length + ' pokémon</div>' +
        '</div>' +
        '<div class="tl-group-body">' +
          items.map(function(d){ return _tlCardHTML(d[0], d[1]); }).join('') +
        '</div>' +
      '</div>';
    }).join('') +
  '</div>';
}

function _tlFilter() {
  var q = _tlState.search.toLowerCase().trim();
  var activeTiers = _tlState.tiers;
  var onlyShiny = _tlState.onlyShiny;

  return TIER_DATA.filter(function(d){
    var name = d[0], tier = d[1];
    var isShiny = /^shiny\s+/i.test(name);
    if (onlyShiny && !isShiny) return false;
    if (q && !name.toLowerCase().includes(q)) return false;
    if (activeTiers.length && activeTiers.indexOf(tier) === -1) return false;
    return true;
  });
}

function _tlUpdateCount(n, total) {
  var el = document.getElementById('tl-count');
  if (el) el.textContent = n + ' / ' + total + ' pokémon';
}

function _tlRenderContent() {
  var container = document.getElementById('tl-content');
  if (!container) return;
  var filtered = _tlFilter();
  _tlUpdateCount(filtered.length, TIER_DATA.length);
  container.innerHTML = _tlState.view === 'grouped'
    ? _tlRenderGrouped(filtered)
    : _tlRenderGrid(filtered);
}

/* ── Atualiza estado visual dos botões de tier ── */
function _tlUpdateTierBtns() {
  document.querySelectorAll('.tl-tier-btn').forEach(function(btn) {
    var t = btn.getAttribute('data-tier');
    var cfg = TIER_CONFIG[t] || TIER_CONFIG['?'];
    var active = _tlState.tiers.indexOf(t) !== -1;
    if (active) {
      btn.style.background = cfg.bg.replace('0.10','0.22').replace('0.09','0.22').replace('0.08','0.22').replace('0.07','0.22').replace('0.06','0.22').replace('0.05','0.22').replace('0.04','0.22');
      btn.style.color = cfg.color;
      btn.style.borderColor = cfg.color + '88';
      btn.style.boxShadow = '0 0 10px ' + cfg.glow;
    } else {
      btn.style.background = 'transparent';
      btn.style.color = 'rgba(255,255,255,0.28)';
      btn.style.borderColor = 'rgba(255,255,255,0.08)';
      btn.style.boxShadow = 'none';
    }
  });
}

/* ══════════════════════════════════════════
   BUILD DA UI
══════════════════════════════════════════ */
function _tlBuild() {
  var root = document.getElementById('tierlist-root');
  if (!root || root.dataset.built) return;
  root.dataset.built = '1';

  /* Tier buttons HTML */
  var tierBtnsHTML = TIER_ORDER.map(function(t) {
    var cfg = TIER_CONFIG[t];
    return '<button class="tl-tier-btn" data-tier="' + t + '" ' +
      'style="color:rgba(255,255,255,0.28);border-color:rgba(255,255,255,0.08);background:transparent;" ' +
      'onclick="window._tlToggleTier(\'' + t + '\')">' + cfg.label + '</button>';
  }).join('');

  root.innerHTML =
    /* Topbar */
    '<div class="tl-topbar">' +
      '<div class="tl-search-wrap">' +
        '<svg width="13" height="13" viewBox="0 0 14 14" fill="none"><circle cx="6" cy="6" r="4.2" stroke="rgba(255,255,255,0.3)" stroke-width="1.5"/><path d="M10 10L13 13" stroke="rgba(255,255,255,0.3)" stroke-width="1.5" stroke-linecap="round"/></svg>' +
        '<input id="tl-search" type="text" placeholder="Buscar Pokémon..." autocomplete="off" ' +
          'oninput="window._tlOnSearch(this.value)" />' +
      '</div>' +
      '<button class="tl-shiny-btn" id="tl-shiny-btn" onclick="window._tlToggleShiny()">' +
        '✦ Apenas Shiny' +
      '</button>' +
      '<div class="tl-view-toggle">' +
        '<button class="tl-view-btn active" id="tl-view-grid" title="Grid" onclick="window._tlSetView(\'grid\')">' +
          '<svg width="14" height="14" viewBox="0 0 14 14" fill="currentColor"><rect x="1" y="1" width="5" height="5" rx="1.2"/><rect x="8" y="1" width="5" height="5" rx="1.2"/><rect x="1" y="8" width="5" height="5" rx="1.2"/><rect x="8" y="8" width="5" height="5" rx="1.2"/></svg>' +
        '</button>' +
        '<button class="tl-view-btn" id="tl-view-grouped" title="Agrupado por Tier" onclick="window._tlSetView(\'grouped\')">' +
          '<svg width="14" height="14" viewBox="0 0 14 14" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round"><line x1="1" y1="3" x2="13" y2="3"/><line x1="1" y1="7" x2="13" y2="7"/><line x1="1" y1="11" x2="13" y2="11"/></svg>' +
        '</button>' +
      '</div>' +
      '<span class="tl-count" id="tl-count">— pokémon</span>' +
    '</div>' +

    /* Tier filters */
    '<div class="tl-tier-filters">' +
      '<span class="tl-filter-label">Tier</span>' +
      tierBtnsHTML +
      '<button class="tl-tier-btn" id="tl-clear-tiers" style="color:rgba(255,255,255,0.2);border-color:rgba(255,255,255,0.06);background:transparent;" onclick="window._tlClearTiers()">✕ Limpar</button>' +
    '</div>' +

    /* Content area */
    '<div id="tl-content"></div>';

  _tlRenderContent();
}

/* ══════════════════════════════════════════
   HANDLERS GLOBAIS
══════════════════════════════════════════ */
window._tlOnSearch = function(v) {
  _tlState.search = v;
  _tlRenderContent();
};

window._tlToggleTier = function(t) {
  var idx = _tlState.tiers.indexOf(t);
  if (idx === -1) _tlState.tiers.push(t);
  else _tlState.tiers.splice(idx, 1);
  _tlUpdateTierBtns();
  _tlRenderContent();
};

window._tlClearTiers = function() {
  _tlState.tiers = [];
  _tlUpdateTierBtns();
  _tlRenderContent();
};

window._tlToggleShiny = function() {
  _tlState.onlyShiny = !_tlState.onlyShiny;
  var btn = document.getElementById('tl-shiny-btn');
  if (btn) {
    btn.classList.toggle('active', _tlState.onlyShiny);
  }
  _tlRenderContent();
};

window._tlSetView = function(v) {
  _tlState.view = v;
  document.getElementById('tl-view-grid')   && document.getElementById('tl-view-grid').classList.toggle('active', v === 'grid');
  document.getElementById('tl-view-grouped') && document.getElementById('tl-view-grouped').classList.toggle('active', v === 'grouped');
  _tlRenderContent();
};

/* ══════════════════════════════════════════
   ENTRY POINT — chamado pelo wiki-nav.js
══════════════════════════════════════════ */
window.renderTierList = function() {
  _tlBuild();
};

/* ══════════════════════════════════════════
   AUTO-PATCH do wiki-nav.js em runtime
   (injeta o módulo + renderer sem editar arquivos)
══════════════════════════════════════════ */
(function patchWikiNav() {
  function tryPatch() {
    /* Espera o MODULES e RENDERERS existirem no escopo correto.
       wiki-nav.js usa IIFE, então MODULES/RENDERERS não são globais —
       mas expõe window._wnOpen. Ao invés de tentar acessar MODULES,
       fazemos o patch via MutationObserver no #wn-shell (grid de módulos). */
    var shell = document.getElementById('wn-shell');
    if (!shell) { setTimeout(tryPatch, 200); return; }

    /* Injeta card no grid do home se ainda não existe */
    var grid = shell.querySelector('.wn-grid');
    if (grid && !grid.querySelector('[onclick*="tierlist"]')) {
      var card = document.createElement('div');
      card.className = 'wn-card';
      card.style.cssText = '--wn-color:#f06292;--wn-rgb:240,98,146;--wn-glow:rgba(240,98,146,0.12)';
      card.setAttribute('onclick', "window._wnOpen('tierlist')");
      card.title = 'Tier List & Respawn';
      card.innerHTML =
        '<div class="wn-card-icon">🏆</div>' +
        '<div class="wn-card-name">Tier List & Respawn</div>' +
        '<div class="wn-card-desc">Ranking de raridade de todos os Pokémon</div>' +
        '<div class="wn-card-arrow">→</div>';
      grid.appendChild(card);
    }

    /* Patch do _wnOpen para reconhecer 'tierlist' */
    var _origOpen = window._wnOpen;
    window._wnOpen = function(id) {
      if (id === 'tierlist') {
        /* Garante que o panel existe */
        var panel = document.getElementById('wiki-tab-tierlist');
        if (!panel) {
          panel = document.createElement('div');
          panel.id = 'wiki-tab-tierlist';
          panel.className = 'wiki-subtab-content';
          panel.style.display = 'none';
          panel.innerHTML = '<div id="tierlist-root"></div>';
          document.getElementById('tab-wiki').appendChild(panel);
        }

        /* Chama o _wnOpen original com dados simulados */
        /* Primeiro preenche breadcrumb e banner manualmente */
        var bcIcon = document.getElementById('wn-bc-icon');
        var bcName = document.getElementById('wn-bc-name');
        if (bcIcon) bcIcon.innerHTML = '🏆';
        if (bcName) bcName.textContent = 'Tier List & Respawn';

        var modBanner = document.getElementById('wn-mod-banner');
        var modLine   = document.getElementById('wn-mod-line');
        if (modBanner) {
          modBanner.style.setProperty('--wn-mod-color', '#f06292');
          modBanner.style.setProperty('--wn-mod-glow', 'rgba(240,98,146,0.18)');
          var modIcon = document.getElementById('wn-mod-icon');
          var modName = document.getElementById('wn-mod-name');
          var modDesc = document.getElementById('wn-mod-desc');
          if (modIcon) modIcon.innerHTML = '🏆';
          if (modName) modName.textContent = 'Tier List & Respawn';
          if (modDesc) modDesc.textContent = 'Ranking de raridade de todos os Pokémon';
        }
        if (modLine) modLine.style.background = 'linear-gradient(90deg,#f0629255,transparent 60%)';

        /* Mostra conteúdo */
        document.getElementById('wn-home').style.display = 'none';
        var content = document.getElementById('wn-content');
        content.style.display = 'block';
        content.classList.add('visible');
        window.scrollTo({ top: 0, behavior: 'smooth' });

        /* Monta o panel no slot */
        var slot = document.getElementById('wn-slot');
        if (slot && panel) {
          document.querySelectorAll('.wiki-subtab-content.wn-visible').forEach(function(el){ el.classList.remove('wn-visible'); });
          while (slot.firstChild) slot.removeChild(slot.firstChild);
          slot.appendChild(panel);
          panel.classList.add('wn-visible');
        }

        /* Renderiza */
        window.renderTierList();
        return;
      }
      _origOpen(id);
    };

    /* Patch do _wnBack para devolver o panel */
    var _origBack = window._wnBack;
    window._wnBack = function() {
      var slot = document.getElementById('wn-slot');
      var panel = document.getElementById('wiki-tab-tierlist');
      if (slot && panel && slot.contains(panel)) {
        panel.classList.remove('wn-visible');
        document.getElementById('tab-wiki').appendChild(panel);
        while (slot.firstChild) slot.removeChild(slot.firstChild);
        document.getElementById('wn-home').style.display = 'block';
        var content = document.getElementById('wn-content');
        content.style.display = 'none';
        content.classList.remove('visible');
        window.scrollTo({ top: 0, behavior: 'smooth' });
        return;
      }
      _origBack();
    };
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', function(){ setTimeout(tryPatch, 300); });
  } else {
    setTimeout(tryPatch, 300);
  }
})();

})();

/*
================================================================
  INTEGRAÇÃO — NÃO PRECISA EDITAR wiki-nav.js NEM index.html
  Este arquivo se auto-injeta ao carregar.

  Basta adicionar no index.html, APÓS wiki-nav.js e quest-modal.js:
    <script src="tierlist.js"></script>
================================================================
*/