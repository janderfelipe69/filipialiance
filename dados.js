// ============================================================
// dados.js — Dados do catálogo PokeAlliance Shop
// Edite este arquivo para atualizar itens, wiki e pacotes.
// Não é necessário mexer no index.html para atualizar preços ou produtos.
// ============================================================

// ============================================================
// SEÇÃO 1 — ITENS DO CATÁLOGO (RAW)
//
// Formato: ["nome", "source", preço, "tier", "evo"]
//
// PREÇO — 3º valor:
//   1000        = 1k    |  500000    = 500k
//   1000000     = 1kk   |  1000000000 = 1kkk
//   0           = sem preço
//
// TIER — 4º valor (opcional, deixe "" para sem tag):
//   "t1"   → roxo     ◆ T1
//   "t2"   → azul     ◆◆ T2
//   "t3"   → verde    ◆◆◆ T3
//   "hard" → vermelho ☠ HARD
//   "mark" → dourado  ★ MARK
//
// EVO — 5º valor (opcional, sub-tag de evolução):
//   "evo1" → verde   EVO 1
//   "evo2" → laranja EVO 2
//   "evo3" → roxo    EVO 3  (com brilho pulsante)
//
// Exemplos:
//   ["simple fire orb", "", 350000, "t1"]
//   ["arcane dragon orb", "", 600000, "hard", "evo2"]
//   ["fire tail", "", 1000, "mark", "evo3"]
// ============================================================

const RAW = [
  // Dados migrados para Supabase (catalog_items)
  // db-bootstrap.js popula window.items[] automaticamente
];

// ============================================================
// SEÇÃO 2 — WIKI (TABELA DE DROPS)
//
// Formato: ["nome do item", "Pokémon 1", "Pokémon 2", ...]
//
// • O nome do item é só para referência — não precisa bater com o RAW
// • Coloque quantos Pokémon quiser por item
// • Nomes que começam com "Shiny " usam sprite shiny animado (GIF Pokémon Showdown)
// • Nomes normais usam sprite normal animado
//
// Exemplo:
//   ["rubber ball",   "Rattata", "Sentret"],
//   ["poison pore",   "Koffing", "Shiny Koffing"],
//   ["electric screws", "Magnemite", "Shiny Magnemite"],
// ============================================================

const RAW_WIKI = [

  // ============================================================
  // WIKI — TABELA DE DROPS
  // Formato: ["nome do item", "Pokémon 1", "Pokémon 2", ...]
  //
  // • Nomes que começam com "Shiny " usam sprite shiny animado
  // • Nomes normais usam sprite normal animado
  // • Pode colocar quantos Pokémon quiser por item
  //
  // Exemplo:
  //   ["rubber ball", "Rattata", "Sentret", "Pidgey"],
  // ============================================================

  // --- MARK (6) ---
  ["band aid",           "Heracross", "Hitmonlee", "Hitmonchan", "Hitmontop", "Machop", "Machoke", "Machamp", "Mankey", "Mega Heracross", "Riolu", "Mega Lucario", "Primeape", "Lucario", "Shiny Heracross", "Shiny Hitmonlee", "Shiny Hitmonchan", "Shiny Hitmontop", "Toxicroak", "Shiny Toxicroak", "Shiny Primeape", "Poliwrath", "Shiny Mankey", "Shiny Poliwrath", "Shiny Riolu", "Tyrogue", "Shiny Tyrogue"], // exemplo — troque pelos Pokémon reais
  ["bottle of poison"],
  ["bug gosme"],
  ["dark gem"],
  ["dragon scale"],
  ["earth ball"],
  ["enchanted gem"],
  ["essence of fire"],
  ["fairy essence"],
  ["ghost essence"],
  ["piece of steel"],
  ["rubber ball"],
  ["screw", "Ampharos", "Chinchou", "Electabuzz", "Electrode", "Elekid", "Flaaffy", "Jolteon", "Lanturn", "Luxio", "Luxray", "Magnemite", "Magneton", "Mareep", "Mega Ampharos", "Pichu", "Pikachu", "Raichu", "Raikou", "Shinx", "Voltorb", "Shiny Ampharos", "Shiny Chinchou", "Shiny Electabuzz", "Shiny Electrode", "Shiny Elekid", "Shiny Flaaffy", "Shiny Jolteon", "Shiny Lanturn", "Shiny Luxio", "Shiny Luxray", "Shiny Magnemite", "Shiny Magneton", "Shiny Mareep", "Shiny Pichu", "Shiny Pikachu", "Shiny Raichu", "Shiny Raikou", "Shiny Shinx", "Shiny Voltorb"],
  ["seed"],
  ["small stone"],
  ["snowball"],
  ["straw"],
  ["water gem"],

  // --- MARK (180) ---
  ["baby egg shell"],
  ["bird crest", "Pidgey", 0],
  ["caterpie antenna"],
  ["chicory"],
  ["cyndaquil nose"],
  ["flower stem"],
  ["frog tail", "Poliwag", 0],
  ["leaf"],
  ["leaves"],
  ["magikarp fin", "Magikarp", 0],
  ["mouse tail", "Ratata", 0],
  ["mushroom"],
  ["pointy leaf"],
  ["poison sting"],
  ["sun leaves"],
  ["totodile tail"],

  // --- MARK (240) ---
  ["alphabetic eye"],
  ["bird wing", "Spearow", 0],
  ["crab claw"],
  ["doduo fur"],
  ["electric screws", "Magnemite", 0],
  ["exeggcute seed"],
  ["furry hair"],
  ["furry tail"],
  ["ghost bottle"],
  ["goldeen tail"],
  ["horsea tail", "Horsea", 0],
  ["locksmith of shell"],
  ["piece of cocoon"],
  ["pineco shell"],
  ["poison pore"],
  ["psychic vest"],
  ["remains of voltorb"],
  ["slowpoke tail"],
  ["small handfull of stones"],
  ["small purple ear"],
  ["snake tail"],
  ["stinky gosme"],
  ["teardrop orb"],
  ["tentacle"],

  // --- MARK (270-300) ---
  ["seel tail"],
  ["bat wing"],
  ["ladybug wings"],
  ["magma ears"],
  ["mankey tail"],
  ["rock fist"],
  ["small blue ear"],
  ["small blue fin", "Remoraid", 0],
  ["spider legs"],
  ["yellow cocoon"],

  // --- MARK (480) ---
  ["armadillo tail"],
  ["back bone"],
  ["bug antenna"],
  ["bulb"],
  ["cubone skull"],
  ["dome shell"],
  ["duck beak"],
  ["fire hair", "Ponyta", 0],
  ["magenta gill"],
  ["owl antennas"],
  ["small pink ears"],
  ["squirtle hull"],
  ["yellow sheep wool"],

  // --- MARK (540) ---
  ["bird tail"],
  ["canine tail"],
  ["fighter hawk"],
  ["fire tail"],
  ["helix shell"],
  ["luck medallion"],
  ["pichu ears"],
  ["small elephant ear"],
  ["small topknot"],
  ["star core"],
  ["yellow crown"],

  // --- MARK (840) ---
  ["baby hair"],
  ["butterfree wing"],
  ["dog fur"],
  ["hardrock shell"],
  ["larvitar tail"],
  ["magma topknot"],
  ["natu wing"],
  ["purple nido ear"],
  ["rat ear"],
  ["snubull ear"],
  ["sunflower"],
  ["weepinbell leaves"],

  // --- MARK (936) ---
  ["bee sting"],
  ["blue nido ear"],
  ["dratini ear"],
  ["drowzee trunk"],
  ["dunsparce wings"],
  ["moon pendant"],
  ["plug ears"],
  ["poison bulb"],
  ["small box gloves"],
  ["yellow flower"],

  // --- MARK (1200) ---
  ["big bug gosme"],
  ["big enchanted gem"],
  ["big leaf"],
  ["big poison bottle"],
  ["big stone"],
  ["channeled fairy essence"],
  ["compressed fire"],
  ["compressed ghost essence"],
  ["compressed steel"],
  ["compressed straw"],
  ["crocodile hair", "Croconaw", 0],
  ["electric sphere"],
  ["ghost claw"],
  ["giant dragon scale"],
  ["injection"],
  ["ledian wings"],
  ["moon topknot"],
  ["pile of seeds"],
  ["psychic spoon"],
  ["remains of electrode"],
  ["rock forehead"],
  ["seaking tail"],
  ["shuckle shell"],
  ["soft wool"],
  ["solid dark gem"],
  ["solid earth piece"],
  ["solid ice cube"],
  ["solid rubber ball"],
  ["solid water gem"],
  ["vampire wing"],
  ["wartortle ear", "Wartortle", 0],

  // --- MARK (1260) ---
  ["aipom paw"],
  ["arachnid legs"],
  ["bat claw"],
  ["cobra tail"],
  ["fighter underwear"],
  ["furret tail"],
  ["handful of stones"],
  ["lizard tail"],
  ["microphone"],
  ["mystic flower"],
  ["quilava fur"],

  // --- MARK (1320) ---
  ["red guillotine"],
  ["seadra fin"],
  ["virtual head"],

  // --- MARK (1380) ---
  ["big mushroom"],
  ["bone"],
  ["bull tail"],
  ["dandelion"],
  ["dodrio feather"],
  ["electric rat tail"],
  ["farfetch'd wing"],
  ["gift tail"],
  ["hypnosis pendant"],
  ["iron bracelet"],
  ["mosquito tail"],
  ["moth wing"],
  ["onix tail"],
  ["piece of corsola"],
  ["pointy beak"],
  ["poison petal"],
  ["puffer tail"],
  ["reindeer horns"],
  ["slowbro shell"],
  ["small red flower"],
  ["sneasel feather"],
  ["toxic scale"],
  ["vine hair"],
  ["wool ball"],
  ["yellow beak"],

  // --- MARK (1440) ---
  ["amphibian tail"],
  ["big tongue"],
  ["dewgong tail"],
  ["dragonair tail"],
  ["kick machine"],
  ["martial arts tail"],
  ["owl crest"],

  // --- MARK (1500) ---
  ["fist bandages"],
  ["lucky egg"],
  ["pieces of shell"],
  ["punching machine"],
  ["rock plate"],

  // --- MARK (1680-1920) ---
  ["armadillo claw"],
  ["frog topknot"],
  ["red tentacle"],
  ["victreebell tail"],
  ["duck paw"],
  ["mimic clothes"],
  ["granbull ear"],

  // --- MARK (2160) ---
  ["aquatic tail"],
  ["big fist gloves"],
  ["big petal"],
  ["blaze tail"],
  ["cow tail"],
  ["cute ears"],
  ["dark ears"],
  ["dimensional cube"],
  ["electric ear"],
  ["electric fish tail"],
  ["fox tail"],
  ["giant ruby"],
  ["horn drill"],
  ["ice tusks"],
  ["king ear"],
  ["red hair"],
  ["red petal"],
  ["star jewel", "Starmie", 0],
  ["water cannon"],
  ["xatu wing"],
  ["magnet", "Magneton", 0],

  // --- MARK (2220) ---
  ["belt of champion"],
  ["big crest"],
  ["dainty wing"],
  ["electric collar"],
  ["electric sheep tail"],
  ["elephant foot"],
  ["fire wing"],
  ["giant bat wing"],
  ["giraffe antenna"],
  ["gray scythe"],
  ["kangaskhan ear"],
  ["magma shell"],
  ["pink wings", "Clafable", 0],
  ["psychic ears"],
  ["psychic wig"],
  ["queen ear"],
  ["smeargle tail"],
  ["spike shell"],
  ["stinky hand"],
  ["stone rocks"],
  ["typhlosion fur"],
  ["wigglytuff ear", "Wigglituff", 0],

  // --- MARK (2400-2880) ---
  ["bear claw", "Ursaring", 0],
  ["blue ray tail"],
  ["coconut leaves"],
  ["dark canine horns"],
  ["forretress shell", "Forretress", 0],
  ["magma foot"],
  ["miss traces"],
  ["nurse's fur"],
  ["psychic moustache"],
  ["scizor claw"],
  ["tyranitar tail"],
  ["fire hoof", "Rapidash", 0],
  ["giant piece of fur", "Arcanine", 0],
  ["gyarados tail"],
  ["pinsir horn"],
  ["ptera wing"],
  ["scythe"],

  // --- MARK (2940) ---
  ["branch of stones"],
  ["bug horn"],
  ["dragonite tail"],
  ["ectoplasm"],
  ["electric tail"],
  ["gaia hands"],
  ["leaf tail"],
  ["luxray ear"],
  ["mystic petal"],
  ["piece of rock"],
  ["pink fairy bow"],
  ["poison bladder"],
  ["sea dragon fin"],
  ["shadow tail"],
  ["slowking necklace"],
  ["snorlax paw", "Snorlax", 0],
  ["steel wing", "Skarmory", 0],
  ["steelix tail"],
  ["two-eyed black tail"],
  ["yellow mimikyu head"],

  // --- MARK (3000-3900) ---
  ["lapras fin"],
  ["hardened horn"],
  ["macho brace"],
  ["power belt"],
  ["power bracer"],

  // --- STONES ---
  ["cocoon stone"],
  ["earth stone"],
  ["enigma stone"],
  ["fire stone"],
  ["heart stone"],
  ["ice stone"],
  ["leaf stone"],
  ["rock stone"],
  ["thunder stone"],
  ["venom stone"],
  ["water stone"],
  ["crystal stone"],

  // --- T3/T4/T5/T6 EVO1 ---
  ["armadillo red tail"],
  ["black tail"],
  ["blond hawk"],
  ["blue canine tail"],
  ["blue hair", "Shiny Ponyta", 0],
  ["blue mouse tail"],
  ["blue psychic vest"],
  ["blue screws", "Shiny Magnemite", 0],
  ["blue seel tail"],
  ["blue shell"],
  ["brown bulb"],
  ["carmine wing", "Shiny Spearow", 0],
  ["contagious pore"],
  ["disgusting gosme"],
  ["golden shell"],
  ["gray frog tail", "Shiny Poliwag", 0],
  ["gray snake tail"],
  ["green ghost bottle"],
  ["green remains"],
  ["loud microphone"],
  ["orange trunk"],
  ["punk ear"],
  ["purple chicory"],
  ["purple fist"],
  ["shiny dragon ears"],
  ["small yellow stones"],
  ["smoked bones"],
  ["sparkle antenna"],
  ["white monkey tail"],
  ["white tail", "Shiny Horsea", 0],
  ["yellow bird crest", "Shiny Pidgey", 0],
  ["yellow sting"],

  // --- ORBS SIMPLE ---
  ["simple bug orb", "Shiny Weedle", "Shiny Forretress", "Shiny Kakuna", "Shiny Ledyba", "Shiny Metapod", "Shiny Paras", "Shiny Pineco", "Shiny Venonat", "Shiny Caterpie", "Shiny Spinarak"],
  ["simple dark orb"],
  ["simple dragon orb"],
  ["simple electric orb"],
  ["simple fairy orb"],
  ["simple fighting orb"],
  ["simple fire orb"],
  ["simple flying orb"],
  ["simple ghost orb"],
  ["simple grass orb"],
  ["simple ground orb"],
  ["simple ice orb"],
  ["simple metal orb", "Shiny Magnemite", 0],
  ["simple normal orb"],
  ["simple poison orb"],
  ["simple psychic orb"],
  ["simple rock orb"],
  ["simple water orb", "Shiny Goldeen", "Shiny Horsea", "Shiny Krabby", "Shiny Magikarp", "Shiny Poliwag", "Shiny Psyduck", "Shiny Remoraid", "Shiny Staryu", "shiny Squirtle", "Shiny Tentacool", "Shiny Totodile", "Shiny Seel", "Shiny Shellder"],

  // --- T4/T5 EVO2 ---
  ["aurora crown"],
  ["black lizard tail"],
  ["blaze fur"],
  ["blue mohawk", "Shiny Croconaw", 0],
  ["champion underwear"],
  ["cyan ear", "Shiny Wartortle", 0],
  ["dark claw"],
  ["electric feather"],
  ["electric rat tail (shiny)"],
  ["electric soft wool"],
  ["enchanted spoon"],
  ["flame feather"],
  ["ice feather"],
  ["purple big leaf"],
  ["purple leaf"],
  ["purple moon topknot"],
  ["purple stone forehead"],
  ["red cocoon"],
  ["red piece of cocoon"],
  ["thunder tiger emblem"],
  ["two-colored tail"],
  ["volcano lion star"],

  // --- ORBS ARCANE ---
  ["arcane bug orb"],
  ["arcane dark orb"],
  ["arcane dragon orb"],
  ["arcane electric orb"],
  ["arcane fairy orb"],
  ["arcane fighting orb"],
  ["arcane fire orb"],
  ["arcane flying orb"],
  ["arcane ghost orb"],
  ["arcane grass orb"],
  ["arcane ground orb"],
  ["arcane ice orb"],
  ["arcane metal orb", "Shiny Forretress", "Shiny Magneton"],
  ["arcane normal orb"],
  ["arcane poison orb"],
  ["arcane psychic orb"],
  ["arcane rock orb"],
  ["arcane water orb", "Shiny Wartortle", "Shiny Kingler", "Shiny Croconaw", "Shiny Seadra", "Shiny Qwilfish", "Shiny Golduck", "Shiny Octillery", "Shiny Seaking", "Shiny Poliwhirl"],

  // --- T2/T3 EVO1/EVO2 ---
  ["big green piece"],
  ["cyan feather"],
  ["dark beak"],
  ["gold tail"],
  ["metal bracelet"],
  ["pink dainty wing"],
  ["poisoned fish tail"],
  ["purple egg"],
  ["rainbow gift tail"],
  ["big cute ear", "Shiny Wigglytuff", 0],
  ["blue coconut leaves"],
  ["blue wings", "Shiny Clafable", 0],
  ["golden drill"],
  ["malfunctioning core", "Shiny Starmie", 0],
  ["pink bug horn"],
  ["psychic wings"],
  ["shiny bat wing"],
  ["strong magnet", "Shiny Magneton", 0],

  // --- ORBS MYTHIC ---
  ["mythic bug orb"],
  ["mythic dark orb"],
  ["mythic dragon orb"],
  ["mythic electric orb"],
  ["mythic fairy orb"],
  ["mythic fighting orb"],
  ["mythic fire orb"],
  ["mythic flying orb"],
  ["mythic ghost orb"],
  ["mythic grass orb"],
  ["mythic ground orb"],
  ["mythic ice orb"],
  ["mythic metal orb", "Shiny Beldum", "Shiny Aron", "shiny Magneton", "Shiny Skarmory", "Shiny Lairon", "Shiny Steelix", "Shiny Scizor" ],
  ["mythic normal orb"],
  ["mythic poison orb"],
  ["mythic psychic orb"],
  ["mythic rock orb"],
  ["mythic water orb", "Shiny Blastoise", "Shiny Feraligatr", "Shiny Gyarados", "Shiny Barboach", "Shiny Carvanha", "Shiny Corphish", "Shiny Feebas", "Shiny Lombre", "Shiny Lotad", "Shiny Mudkip", "Shiny Marshtomp", "Shiny Politoed", "Shiny Wailmer", "Shiny Spheal", "Shiny Sealeo", "Shiny Mantine", "Shiny Starmie", "Shiny Surskit", "Shiny Tentacruel", "Shiny Vaporeon", "Shiny Wingull", "Shiny Luvdisc" ],
];

// ============================================================
// SEÇÃO 3 — PACOTES (PACKAGES)
//
// Formato:
//   {
//     name: "Nome do Pacote",
//     slots: [
//       [["nome do item", quantidade], ...],
//       ...
//     ]
//   }
//
// • O nome do item deve bater exatamente com o nome no RAW
// • Cada slot é um array de opções; se houver só uma opção,
//   coloque dentro de um array único
//
// Exemplo:
//   { name: "Full Character Speed", slots: [
//     [["fire hair", 80], ["blue hair", 1]],
//     [["fire hoof", 100], ["giant piece of fur", 100]],
//   ]}
// ============================================================

// Garante que PACKAGES e window.PACKAGES são o MESMO array
if (!window.PACKAGES) window.PACKAGES = [];
var PACKAGES = window.PACKAGES;
// db-bootstrap.js popula via window.PACKAGES

// ============================================================
// SEÇÃO 4 — CONFIGURAÇÕES GERAIS
// ============================================================

// KK_TO_BRL migrado para financial_config no Supabase
// db-bootstrap.js popula window.KK_TO_BRL e window.APP_CONFIG automaticamente
var KK_TO_BRL = (window.APP_CONFIG && window.APP_CONFIG.kk_to_brl) ? window.APP_CONFIG.kk_to_brl : 1.70;
// DD: sempre inteiro (Math.round) — 1 DD = R$ 0,70
var DD_TO_BRL = (window.APP_CONFIG && window.APP_CONFIG.dd_to_brl) ? window.APP_CONFIG.dd_to_brl : 0.70;
function brlToDd(brl) { return (brl && brl > 0) ? Math.round(brl / DD_TO_BRL) : 0; }
function ddToBrl(dd)  { return (dd  && dd  > 0) ? dd * DD_TO_BRL : 0; }