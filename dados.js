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

  // ── MARK — 6 coins ────────────────────────────────
  ["band aid","",6,"mark",""],
  ["bottle of poison","",6,"mark",""],
  ["bug gosme","",6,"mark",""],
  ["dark gem","",6,"mark",""],
  ["dragon scale","",6,"mark",""],
  ["earth ball","",6,"mark",""],
  ["enchanted gem","",6,"mark",""],
  ["essence of fire","",6,"mark",""],
  ["fairy essence","",6,"mark",""],
  ["ghost essence","",6,"mark",""],
  ["piece of steel","",6,"mark",""],
  ["rubber ball","",6,"mark",""],
  ["screw","",6,"mark",""],
  ["seed","",6,"mark",""],
  ["small stone","",6,"mark",""],
  ["snowball","",6,"mark",""],
  ["straw","",6,"mark",""],
  ["water gem","",6,"mark",""],

  // ── MARK — 180 coins ──────────────────────────────
  ["baby egg shell","",180,"mark",""],
  ["bird crest","",180,"mark",""],
  ["caterpie antenna","",180,"mark",""],
  ["chicory","",180,"mark",""],
  ["cyndaquil nose","",180,"mark",""],
  ["flower stem","",180,"mark",""],
  ["frog tail","",180,"mark",""],
  ["leaf","",180,"mark",""],
  ["leaves","",180,"mark",""],
  ["magikarp fin","",180,"mark",""],
  ["mouse tail","",180,"mark",""],
  ["mushroom","",180,"mark",""],
  ["pointy leaf","",180,"mark",""],
  ["poison sting","",180,"mark",""],
  ["sun leaves","",180,"mark",""],
  ["totodile tail","",180,"mark",""],

  // ── MARK — 240 coins ──────────────────────────────
  ["alphabetic eye","",240,"mark",""],
  ["bird wing","https://i.imgur.com/RQHZZ4c.png",240,"mark",""],
  ["crab claw","",240,"mark",""],
  ["doduo fur","",240,"mark",""],
  ["electric screws","Magnemite",240,"mark",""],
  ["exeggcute seed","",240,"mark",""],
  ["furry hair","",240,"mark",""],
  ["furry tail","",240,"mark",""],
  ["ghost bottle","",240,"mark",""],
  ["goldeen tail","",240,"mark",""],
  ["horsea tail","",240,"mark",""],
  ["locksmith of shell","",240,"mark",""],
  ["piece of cocoon","Metapod",240,"mark",""],
  ["pineco shell","",240,"mark",""],
  ["poison pore","Koffing",240,"mark",""],
  ["psychic vest","Abra",240,"mark",""],
  ["remains of voltorb","",240,"mark",""],
  ["slowpoke tail","",240,"mark",""],
  ["small handfull of stones","",240,"mark",""],
  ["small purple ear","",240,"mark",""],
  ["snake tail","",240,"mark",""],
  ["stinky gosme","",240,"mark",""],
  ["teardrop orb","",240,"mark",""],
  ["tentacle","",240,"mark",""],

  // ── MARK — 270 coins ──────────────────────────────
  ["seel tail","Seel",270,"mark",""],

  // ── MARK — 300 coins ──────────────────────────────
  ["bat wing","",300,"mark",""],
  ["ladybug wings","",300,"mark",""],
  ["magma ears","",300,"mark",""],
  ["mankey tail","",300,"mark",""],
  ["rock fist","",300,"mark",""],
  ["small blue ear","",300,"mark",""],
  ["small blue fin","",300,"mark",""],
  ["spider legs","",300,"mark",""],
  ["yellow cocoon","Kakuna",300,"mark",""],

  // ── MARK — 480 coins ──────────────────────────────
  ["armadillo tail","",480,"mark",""],
  ["back bone","",480,"mark",""],
  ["bug antenna","",480,"mark",""],
  ["bulb","",480,"mark",""],
  ["cubone skull","",480,"mark",""],
  ["dome shell","",480,"mark",""],
  ["duck beak","",480,"mark",""],
  ["fire hair","",480,"mark",""],
  ["magenta gill","",480,"mark",""],
  ["owl antennas","",480,"mark",""],
  ["small pink ears","",480,"mark",""],
  ["squirtle hull","",480,"mark",""],
  ["yellow sheep wool","",480,"mark",""],

  // ── MARK — 540 coins ──────────────────────────────
  ["bird tail","https://i.imgur.com/mZY9D1t.png",540,"mark",""],
  ["canine tail","Vulpix",540,"mark",""],
  ["fighter hawk","",540,"mark",""],
  ["fire tail","",540,"mark",""],
  ["helix shell","",540,"mark",""],
  ["luck medallion","",540,"mark",""],
  ["pichu ears","",540,"mark",""],
  ["small elephant ear","",540,"mark",""],
  ["small topknot","",540,"mark",""],
  ["star core","",540,"mark",""],
  ["yellow crown","",540,"mark",""],

  // ── MARK — 840 coins ──────────────────────────────
  ["baby hair","",840,"mark",""],
  ["butterfree wing","Butterfree",840,"mark",""],
  ["dog fur","Growlithe",840,"mark",""],
  ["hardrock shell","",840,"mark",""],
  ["larvitar tail","",840,"mark",""],
  ["magma topknot","",840,"mark",""],
  ["natu wing","",840,"mark",""],
  ["purple nido ear","",840,"mark",""],
  ["rat ear","",840,"mark",""],
  ["snubull ear","Snubbull",840,"mark",""],
  ["sunflower","",840,"mark",""],
  ["weepinbell leaves","",840,"mark",""],

  // ── MARK — 936 coins ──────────────────────────────
  ["bee sting","",936,"mark",""],
  ["blue nido ear","",936,"mark",""],
  ["dratini ear","Dratini",936,"mark",""],
  ["drowzee trunk","Drowzee",936,"mark",""],
  ["dunsparce wings","",936,"mark",""],
  ["moon pendant","",936,"mark",""],
  ["plug ears","",936,"mark",""],
  ["poison bulb","",936,"mark",""],
  ["small box gloves","",936,"mark",""],
  ["yellow flower","",936,"mark",""],

  // ── MARK — 1.2k coins ─────────────────────────────
  ["big bug gosme","",1200,"mark",""],
  ["big enchanted gem","",1200,"mark",""],
  ["big leaf","",1200,"mark",""],
  ["big poison bottle","",1200,"mark",""],
  ["big stone","",1200,"mark",""],
  ["channeled fairy essence","",1200,"mark",""],
  ["compressed fire","",1200,"mark",""],
  ["compressed ghost essence","",1200,"mark",""],
  ["compressed steel","",1200,"mark",""],
  ["compressed straw","",1200,"mark",""],
  ["crocodile hair","Croconaw",1200,"mark",""],
  ["electric sphere","",1200,"mark",""],
  ["ghost claw","",1200,"mark",""],
  ["giant dragon scale","",1200,"mark",""],
  ["injection","",1200,"mark",""],
  ["ledian wings","",1200,"mark",""],
  ["moon topknot","",1200,"mark",""],
  ["pile of seeds","",1200,"mark",""],
  ["psychic spoon","Kadabra",1200,"mark",""],
  ["remains of electrode","",1200,"mark",""],
  ["rock forehead","",1200,"mark",""],
  ["seaking tail","",1200,"mark",""],
  ["shuckle shell","",1200,"mark",""],
  ["soft wool","Flaaffy",1200,"mark",""],
  ["solid dark gem","",1200,"mark",""],
  ["solid earth piece","",1200,"mark",""],
  ["solid ice cube","",1200,"mark",""],
  ["solid rubber ball","",1200,"mark",""],
  ["solid water gem","",1200,"mark",""],
  ["vampire wing","",1200,"mark",""],
  ["wartortle ear","Wartortle",1200,"mark",""],

  // ── MARK — 1.26k coins ────────────────────────────
  ["aipom paw","",1260,"mark",""],
  ["arachnid legs","",1260,"mark",""],
  ["bat claw","",1260,"mark",""],
  ["cobra tail","Arbok",1260,"mark",""],
  ["fighter underwear","",1260,"mark",""],
  ["furret tail","",1260,"mark",""],
  ["handful of stones","",1260,"mark",""],
  ["lizard tail","",1260,"mark",""],
  ["microphone","",1260,"mark",""],
  ["mystic flower","",1260,"mark",""],
  ["quilava fur","Quilava",1260,"mark",""],

  // ── MARK — 1.32k coins ────────────────────────────
  ["red guillotine","",1320,"mark",""],
  ["seadra fin","",1320,"mark",""],
  ["virtual head","",1320,"mark",""],

  // ── MARK — 1.38k coins ────────────────────────────
  ["big mushroom","",1380,"mark",""],
  ["bone","",1380,"",""],
  ["bull tail","Tauros",1380,"mark",""],
  ["dandelion","",1380,"mark",""],
  ["dodrio feather","Dodrio",1380,"mark",""],
  ["electric rat tail","Pikachu",1380,"mark",""],
  ["farfetch'd wing","",1380,"mark",""],
  ["gift tail","",1380,"mark",""],
  ["hypnosis pendant","",1380,"mark",""],
  ["iron bracelet","",1380,"mark",""],
  ["mosquito tail","",1380,"mark",""],
  ["moth wing","",1380,"mark",""],
  ["onix tail","",1380,"mark",""],
  ["piece of corsola","",1380,"mark",""],
  ["pointy beak","",1380,"mark",""],
  ["poison petal","",1380,"mark",""],
  ["puffer tail","",1380,"mark",""],
  ["reindeer horns","",1380,"mark",""],
  ["slowbro shell","",1380,"mark",""],
  ["small red flower","",1380,"mark",""],
  ["sneasel feather","",1380,"mark",""],
  ["toxic scale","Weezing",1380,"mark",""],
  ["vine hair","Tangela",1380,"mark",""],
  ["wool ball","",1380,"mark",""],
  ["yellow beak","Murkrow",1380,"mark",""],

  // ── MARK — 1.44k coins ────────────────────────────
  ["amphibian tail","",1440,"mark",""],
  ["big tongue","",1440,"mark",""],
  ["dewgong tail","Dewgong",1440,"mark",""],
  ["dragonair tail","Dragonair",1440,"mark",""],
  ["kick machine","",1440,"mark",""],
  ["martial arts tail","",1440,"mark",""],
  ["owl crest","",1440,"mark",""],

  // ── MARK — 1.5k coins ─────────────────────────────
  ["fist bandages","",1500,"mark",""],
  ["lucky egg","",1500,"mark",""],
  ["pieces of shell","Cloyster",1500,"mark",""],
  ["punching machine","Hitmonchan",1500,"mark",""],
  ["rock plate","",1500,"mark",""],

  // ── MARK — 1.68k coins ────────────────────────────
  ["armadillo claw","",1680,"mark",""],
  ["frog topknot","",1680,"mark",""],
  ["red tentacle","",1680,"mark",""],
  ["victreebell tail","",1680,"mark",""],

  // ── MARK — 1.74k coins ────────────────────────────
  ["duck paw","Golduck",1740,"mark",""],
  ["mimic clothes","",1740,"mark",""],

  // ── MARK — 1.92k coins ────────────────────────────
  ["granbull ear","",1920,"mark",""],

  // ── MARK — 2.16k coins ────────────────────────────
  ["aquatic tail","",2160,"mark",""],
  ["big fist gloves","",2160,"mark",""],
  ["big petal","",2160,"mark",""],
  ["blaze tail","",2160,"mark",""],
  ["cow tail","",2160,"mark",""],
  ["cute ears","",2160,"mark",""],
  ["dark ears","",2160,"mark",""],
  ["dimensional cube","",2160,"mark",""],
  ["electric ear","Raichu",2160,"mark",""],
  ["electric fish tail","",2160,"mark",""],
  ["fox tail","",2160,"mark",""],
  ["giant ruby","Tentacruel",2160,"mark",""],
  ["horn drill","",2160,"mark",""],
  ["ice tusks","",2160,"mark",""],
  ["king ear","",2160,"mark",""],
  ["magnet","https://i.imgur.com/CBo9fUR.png",2160,"mark",""],
  ["red hair","Feraligatr",2160,"mark",""],
  ["red petal","Venusaur",2160,"mark",""],
  ["star jewel","Starmie",2160,"mark",""],
  ["water cannon","Blastoise",2160,"mark",""],
  ["xatu wing","Xatu",2160,"mark",""],

  // ── MARK — 2.22k coins ────────────────────────────
  ["belt of champion","",2220,"mark",""],
  ["big crest","",2220,"mark",""],
  ["dainty wing","",2220,"mark",""],
  ["electric collar","Jolteon",2220,"mark",""],
  ["electric sheep tail","",2220,"mark",""],
  ["elephant foot","",2220,"mark",""],
  ["fire wing","",2220,"mark",""],
  ["giant bat wing","",2220,"mark",""],
  ["giraffe antenna","Girafarig",2220,"mark",""],
  ["gray scythe","",2220,"mark",""],
  ["kangaskhan ear","",2220,"mark",""],
  ["magma shell","",2220,"mark",""],
  ["pink wings","",2220,"mark",""],
  ["psychic ears","",2220,"mark",""],
  ["psychic wig","Jynx",2220,"mark",""],
  ["queen ear","Nidoqueen",2220,"mark",""],
  ["smeargle tail","",2220,"mark",""],
  ["spike shell","",2220,"mark",""],
  ["stinky hand","Muk",2220,"mark",""],
  ["stone rocks","Golem",2220,"mark",""],
  ["typhlosion fur","",2220,"mark",""],
  ["wigglytuff ear","",2220,"mark",""],

  // ── MARK — 2.4k coins ─────────────────────────────
  ["bear claw","",2400,"mark",""],

  // ── MARK — 2.82k coins ────────────────────────────
  ["blue ray tail","",2820,"mark",""],
  ["coconut leaves","Exeggutor",2820,"mark",""],
  ["dark canine horns","",2820,"mark",""],
  ["forretress shell","",2820,"mark",""],
  ["magma foot","",2820,"mark",""],
  ["miss traces","",2820,"mark",""],
  ["nurse's fur","",2820,"mark",""],
  ["psychic moustache","Alakazam",2820,"mark",""],
  ["scizor claw","",2820,"mark",""],
  ["tyranitar tail","Tyranitar",2820,"mark",""],

  // ── MARK — 2.88k coins ────────────────────────────
  ["fire hoof","",2880,"mark",""],
  ["giant piece of fur","",2880,"mark",""],
  ["gyarados tail","",2880,"mark",""],
  ["pinsir horn","",2880,"mark",""],
  ["ptera wing","",2880,"mark",""],
  ["scythe","",2880,"mark",""],

  // ── MARK — 2.94k coins ────────────────────────────
  ["branch of stones","",2940,"mark",""],
  ["bug horn","",2940,"mark",""],
  ["dragonite tail","Dragonite",2940,"mark",""],
  ["ectoplasm","Gengar",2940,"mark",""],
  ["electric tail","",2940,"mark",""],
  ["gaia hands","",2940,"mark",""],
  ["leaf tail","",2940,"mark",""],
  ["luxray ear","",2940,"mark",""],
  ["mystic petal","",2940,"mark",""],
  ["piece of rock","",2940,"mark",""],
  ["pink fairy bow","",2940,"mark",""],
  ["poison bladder","",2940,"mark",""],
  ["sea dragon fin","",2940,"mark",""],
  ["shadow tail","",2940,"mark",""],
  ["slowking necklace","",2940,"mark",""],
  ["snorlax paw","",2940,"mark",""],
  ["steel wing","Skarmory",2940,"mark",""],
  ["steelix tail","Steelix",2940,"mark",""],
  ["two-eyed black tail","Wobbuffet",2940,"mark",""],
  ["yellow mimikyu head","",2940,"mark",""],

  // ── MARK — 3k coins ───────────────────────────────
  ["lapras fin","",3000,"mark",""],
  ["hardened horn","",3000,"mark",""],

  // ── MARK — 3.9k coins ─────────────────────────────
  ["macho brace","",3900,"mark",""],
  ["power belt","",3900,"mark",""],
  ["power bracer","",3900,"mark",""],

  // ── STONES — 10k coins ────────────────────────────
  ["cocoon stone","https://i.imgur.com/uMyCnBn.png",10000,"",""],
  ["earth stone","https://i.imgur.com/qEsbPOw.png",10000,"",""],
  ["enigma stone","https://i.imgur.com/p1csjCu.png",10000,"",""],
  ["fire stone","https://i.imgur.com/C7fIrj4.png",10000,"",""],
  ["heart stone","https://i.imgur.com/s4daG8O.png",10000,"",""],
  ["ice stone","https://i.imgur.com/KCxKLwO.png",10000,"",""],
  ["leaf stone","https://i.imgur.com/5ZJAr9N.png",10000,"",""],
  ["rock stone","https://i.imgur.com/Zhxk2rh.png",10000,"",""],
  ["thunder stone","https://i.imgur.com/qk0I92Y.png",10000,"",""],
  ["venom stone","https://i.imgur.com/4TltADd.png",10000,"",""],
  ["water stone","https://i.imgur.com/F0oPvtP.png",10000,"",""],

  // ── CRYSTAL STONE — 50k coins ─────────────────────
  ["crystal stone","https://i.imgur.com/Mq3MD9U.png",50000,"",""],

  // ── EVO 1 — 350k coins ────────────────────────────
  ["armadillo red tail","",350000,"t5","evo1"],
  ["black tail","",350000,"t5","evo1"],
  ["blond hawk","",350000,"t5","evo1"],
  ["blue canine tail","",350000,"t5","evo1"],
  ["blue hair","",350000,"t5","evo1"],
  ["blue mouse tail","",350000,"t6","evo1"],
  ["blue psychic vest","",350000,"t5","evo1"],
  ["blue screws","",350000,"t5","evo1"],
  ["blue seel tail","",350000,"t5","evo 1"],
  ["blue shell","",350000,"t5","evo1"],
  ["brown bulb","",350000,"t5","evo1"],
  ["carmine wing","Shiny Spearow",350000,"","evo1"],
  ["contagious pore","Shiny Koffing",350000,"t5","evo1"],
  ["disgusting gosme","Shiny Grimer",350000,"t5","evo1"],
  ["golden shell","",350000,"t4","evo1"],
  ["gray frog tail","",350000,"t5","evo1"],
  ["gray snake tail","",350000,"t5","evo1"],
  ["green ghost bottle","",350000,"t5","evo1"],
  ["green remains","",350000,"t3","evo1"],
  ["loud microphone","",350000,"t5","evo1"],
  ["orange trunk","Shiny Drowzee",350000,"t5","evo1"],
  ["punk ear","Shiny Snubbull",350000,"t5","evo1"],
  ["purple chicory","Shiny Chikorita",350000,"t5","evo1"],
  ["purple fist","Shiny Geodude",350000,"t5","evo1"],
  ["shiny dragon ears","",350000,"t4","evo1"],
  ["simple bug orb","",350000,"","evo1"],
  ["simple dark orb","",350000,"","evo1"],
  ["simple dragon orb","",350000,"","evo1"],
  ["simple electric orb","",350000,"","evo1"],
  ["simple fairy orb","",350000,"","evo1"],
  ["simple fighting orb","",350000,"","evo1"],
  ["simple fire orb","",350000,"","evo1"],
  ["simple flying orb","",350000,"",""],
  ["simple ghost orb","",350000,"","evo1"],
  ["simple grass orb","",350000,"","evo1"],
  ["simple ground orb","https://i.imgur.com/lsYFPoW.png",350000,"","evo1"],
  ["simple ice orb","",350000,"","evo1"],
  ["simple metal orb","",350000,"","evo1"],
  ["simple normal orb","",350000,"","evo1"],
  ["simple poison orb","",350000,"","evo1"],
  ["simple psychic orb","",350000,"","evo1"],
  ["simple rock orb","https://i.imgur.com/B7tt4xZ.png",350000,"","evo1"],
  ["simple water orb","",350000,"","evo1"],
  ["small yellow stones","",350000,"t5","evo1"],
  ["smoked bones","",350000,"t5","evo1"],
  ["sparkle antenna","Shiny Caterpie",350000,"t6","evo1"],
  ["white monkey tail","Shiny Mankey",350000,"t5","evo1"],
  ["white tail","",350000,"t5","evo1"],
  ["yellow bird crest","Shiny Pidgey",350000,"","evo1"],
  ["yellow sting","Shiny Weedle",350000,"t6","evo1"],

  // ── EVO 2 — 600k coins ────────────────────────────
  ["arcane bug orb","",600000,"","evo2"],
  ["arcane dark orb","",600000,"","evo2"],
  ["arcane dragon orb","",600000,"","evo2"],
  ["arcane electric orb","https://i.imgur.com/tKUiavc.png",600000,"","evo2"],
  ["arcane fairy orb","",600000,"","evo2"],
  ["arcane fighting orb","",600000,"","evo2"],
  ["arcane fire orb","",600000,"","evo2"],
  ["arcane flying orb","",600000,"","evo2"],
  ["arcane ghost orb","",600000,"","evo2"],
  ["arcane grass orb","",600000,"","evo2"],
  ["arcane ground orb","",600000,"","evo2"],
  ["arcane ice orb","",600000,"","evo2"],
  ["arcane metal orb","",600000,"","evo2"],
  ["arcane normal orb","",600000,"","evo2"],
  ["arcane poison orb","",600000,"","evo2"],
  ["arcane psychic orb","",600000,"","evo2"],
  ["arcane rock orb","",600000,"","evo2"],
  ["arcane water orb","",600000,"","evo2"],
  ["aurora crown","",600000,"mark",""],
  ["black lizard tail","",600000,"t4","evo2"],
  ["blaze fur","",600000,"t5","evo2"],
  ["blue mohawk","",600000,"t4","evo2"],
  ["champion underwear","Shiny Machoke",600000,"t4","evo2"],
  ["cyan ear","Shiny Wartortle",600000,"t4","evo2"],
  ["dark claw","Shiny Haunter",600000,"t4","evo2"],
  ["electric feather","",600000,"mark",""],
  ["electric rat tail (shiny)","Shiny Pikachu",600000,"t4","evo2"],
  ["electric soft wool","",600000,"t4","evo2"],
  ["enchanted spoon","",600000,"t4","evo2"],
  ["flame feather","",600000,"mark",""],
  ["ice feather","",600000,"mark",""],
  ["purple big leaf","Shiny Bayleef",600000,"t4","evo2"],
  ["purple leaf","Shiny Ivysaur",600000,"t4","evo2"],
  ["purple moon topknot","Shiny Clefairy",600000,"t5","evo2"],
  ["purple stone forehead","",600000,"t4","evo2"],
  ["red cocoon","Shiny Kakuna",600000,"t5","evo2"],
  ["red piece of cocoon","",600000,"t5","evo2"],
  ["thunder tiger emblem","",600000,"mark",""],
  ["two-colored tail","Shiny Pidgeotto",600000,"t4","evo2"],
  ["volcano lion star","",600000,"mark",""],

  // ── MYTHIC ORBS — 4kk coins (HARD) ────────────────
  ["mythic bug orb","",4000000,"hard","evo3"],
  ["mythic dark orb","",4000000,"hard","evo3"],
  ["mythic electric orb","",4000000,"hard","evo3"],
  ["mythic fighting orb","",4000000,"hard","evo3"],
  ["mythic fire orb","",4000000,"hard","evo3"],
  ["mythic flying orb","",4000000,"hard","evo3"],
  ["mythic ghost orb","",4000000,"hard","evo3"],
  ["mythic grass orb","",4000000,"hard","evo3"],
  ["mythic ground orb","",4000000,"hard","evo3"],
  ["mythic ice orb","",4000000,"hard","evo3"],
  ["mythic normal orb","",4000000,"hard","evo3"],
  ["mythic poison orb","",4000000,"hard","evo3"],
  ["mythic psychic orb","",4000000,"hard","evo3"],
  ["mythic rock orb","",4000000,"hard","evo3"],
  ["mythic water orb","",4000000,"hard","evo3"],

  // ── MYTHIC ORBS — 9kk coins (HARD) ────────────────
  ["mythic dragon orb","",9000000,"hard","evo3"],
  ["mythic fairy orb","",9000000,"hard","evo3"],
  ["mythic metal orb","",9000000,"hard","evo3"],

  // ── T2/T3 — 10kk coins ────────────────────────────
  ["big green piece","",10000000,"t3","evo2"],
  ["cyan feather","Shiny Sneasel",10000000,"t3","evo1"],
  ["dark beak","Shiny Murkrow",10000000,"t3","evo1"],
  ["gold tail","Shiny Onix",10000000,"t3","evo1"],
  ["metal bracelet","",10000000,"t3","evo2"],
  ["pink dainty wing","Shiny Togetic",10000000,"t3","evo2"],
  ["poisoned fish tail","Shiny Qwilfish",10000000,"t3","evo1"],
  ["purple egg","Shiny Chansey",10000000,"t3","evo2"],
  ["rainbow gift tail","Shiny Delibird",10000000,"t3","evo1"],
  ["big cute ear","",10000000,"t2","evo3"],
  ["blue coconut leaves","",10000000,"t2","evo2"],
  ["blue wings","",10000000,"t2","evo3"],
  ["golden drill","",10000000,"t2","evo2"],
  ["malfunctioning core","",10000000,"t2","evo2"],
  ["pink bug horn","Shiny Heracross",10000000,"t2","evo1"],
  ["psychic wings","Shiny Xatu",10000000,"t2","evo2"],
  ["shiny bat wing","",10000000,"t2","evo3"],
  ["strong magnet","Shiny Magneton",10000000,"t2","evo2"],
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
  ["bird crest", "Pidgey"],
  ["caterpie antenna"],
  ["chicory"],
  ["cyndaquil nose"],
  ["flower stem"],
  ["frog tail", "Poliwag"],
  ["leaf"],
  ["leaves"],
  ["magikarp fin", "Magikarp"],
  ["mouse tail", "Ratata"],
  ["mushroom"],
  ["pointy leaf"],
  ["poison sting"],
  ["sun leaves"],
  ["totodile tail"],

  // --- MARK (240) ---
  ["alphabetic eye"],
  ["bird wing", "Spearow"],
  ["crab claw"],
  ["doduo fur"],
  ["electric screws", "Magnemite"],
  ["exeggcute seed"],
  ["furry hair"],
  ["furry tail"],
  ["ghost bottle"],
  ["goldeen tail"],
  ["horsea tail", "Horsea"],
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
  ["small blue fin", "Remoraid"],
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
  ["fire hair", "Ponyta"],
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
  ["crocodile hair", "Croconaw"],
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
  ["wartortle ear", "Wartortle"],

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
  ["star jewel", "Starmie"],
  ["water cannon"],
  ["xatu wing"],
  ["magnet", "Magneton"],

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
  ["pink wings", "Clafable"],
  ["psychic ears"],
  ["psychic wig"],
  ["queen ear"],
  ["smeargle tail"],
  ["spike shell"],
  ["stinky hand"],
  ["stone rocks"],
  ["typhlosion fur"],
  ["wigglytuff ear", "Wigglituff"],

  // --- MARK (2400-2880) ---
  ["bear claw", "Ursaring"],
  ["blue ray tail"],
  ["coconut leaves"],
  ["dark canine horns"],
  ["forretress shell", "Forretress"],
  ["magma foot"],
  ["miss traces"],
  ["nurse's fur"],
  ["psychic moustache"],
  ["scizor claw"],
  ["tyranitar tail"],
  ["fire hoof", "Rapidash"],
  ["giant piece of fur", "Arcanine"],
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
  ["snorlax paw", "Snorlax"],
  ["steel wing", "Skarmory"],
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
  ["blue hair", "Shiny Ponyta"],
  ["blue mouse tail"],
  ["blue psychic vest"],
  ["blue screws", "Shiny Magnemite"],
  ["blue seel tail"],
  ["blue shell"],
  ["brown bulb"],
  ["carmine wing", "Shiny Spearow"],
  ["contagious pore"],
  ["disgusting gosme"],
  ["golden shell"],
  ["gray frog tail", "Shiny Poliwag"],
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
  ["white tail", "Shiny Horsea"],
  ["yellow bird crest", "Shiny Pidgey"],
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
  ["simple metal orb", "Shiny Magnemite"],
  ["simple normal orb"],
  ["simple poison orb"],
  ["simple psychic orb"],
  ["simple rock orb"],
  ["simple water orb", "Shiny Goldeen", "Shiny Horsea", "Shiny Krabby", "Shiny Magikarp", "Shiny Poliwag", "Shiny Psyduck", "Shiny Remoraid", "Shiny Staryu", "shiny Squirtle", "Shiny Tentacool", "Shiny Totodile", "Shiny Seel", "Shiny Shellder"],

  // --- T4/T5 EVO2 ---
  ["aurora crown"],
  ["black lizard tail"],
  ["blaze fur"],
  ["blue mohawk", "Shiny Croconaw"],
  ["champion underwear"],
  ["cyan ear", "Shiny Wartortle"],
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
  ["big cute ear", "Shiny Wigglytuff"],
  ["blue coconut leaves"],
  ["blue wings", "Shiny Clafable"],
  ["golden drill"],
  ["malfunctioning core", "Shiny Starmie"],
  ["pink bug horn"],
  ["psychic wings"],
  ["shiny bat wing"],
  ["strong magnet", "Shiny Magneton"],

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

const PACKAGES = [

  {
    name: "Full Speed",
    slots: [
      [["fire hair", 80], ["blue hair", 1]],
      [["fire hoof", 100], ["giant piece of fur", 100]],
      [["yellow bird crest", 1], ["carmine wing", 1]],
      [["bird wing", 5], ["bird crest", 5]],
    ]
  },
  {
    name: "Full HP",
    slots: [
      [["blue wings", 1], ["big cute ear", 1]],
      [["pink wings", 250], ["wigglytuff ear", 250]],
      [["snorlax paw", 400], ["bear claw", 400]],
      [["magikarp fin", 10], ["mouse tail", 30]],
    ]
  },
  {
    name: "Talent Water 7/8",
    slots: [
      [["frog tail", 50]],
      [["simple water orb", 5], ["white tail", 3]],
      [["arcane water orb", 3], ["cyan ear", 3], ["wartortle ear", 120]],
      [["mythic water orb", 3], ["malfunctioning core", 1], ["star jewel", 500]],
      [["horsea tail", 25], ["small blue fin", 25]],
      [["simple water orb", 5], ["gray frog tail", 3]],
      [["arcane water orb", 3], ["blue mohawk", 3], ["crocodile hair", 120]],
    ]
  },
  {
    name: "Talent Steel 7/8",
    slots: [
      [["mythic metal orb", 3], ["strong magnet", 1], ["steel wing", 500]],
      [["electric screws", 50]],
      [["simple metal orb", 5], ["blue screws", 3]],
      [["arcane metal orb", 3], ["blue screws", 10], ["magnet", 120]],
      [["electric screws", 50]],
      [["simple metal orb", 5], ["blue screws", 3]],
      [["arcane metal orb", 3], ["blue screws", 10], ["forretress shell", 120]],
    ]
  },
  {
    name: "Talent Rock 7/8",
    slots: [
      [["simple rock orb", 5], ["purple fist", 3]],
      [["arcane rock orb", 3], ["purple stone forehead", 3], ["rock forehead", 120]],
      [["mythic rock orb", 3], ["gold tail", 2], ["rock plate", 500]],
      [["rock fist", 50]],
      [["arcane rock orb", 3], ["purple stone forehead", 3], ["rock forehead", 120]],
      [["simple rock orb", 5], ["purple fist", 3]],
      [["rock fist", 50]],
    ]
  },
  {
    name: "Talent Psychic 7/8",
    slots: [
      [["drowzee trunk", 50]],
      [["simple psychic orb", 5], ["orange trunk", 3]],
      [["arcane psychic orb", 3], ["enchanted spoon", 3], ["hypnosis pendant", 120]],
      [["mythic psychic orb", 3], ["psychic wings", 1], ["giraffe antenna", 500]],
      [["simple psychic orb", 5], ["blue psychic vest", 3]],
      [["arcane psychic orb", 3], ["enchanted spoon", 3], ["hypnosis pendant", 120]],
      [["psychic vest", 50]],
    ]
  },
  {
    name: "Talent Poison 7/8",
    slots: [
      [["poison pore", 50]],
      [["simple poison orb", 5], ["contagious pore", 3]],
      [["arcane poison orb", 3], ["gray snake tail", 3], ["toxic scale", 120]],
      [["mythic poison orb", 3], ["poisoned fish tail", 1], ["king ear", 500]],
      [["simple poison orb", 5], ["disgusting gosme", 3]],
      [["arcane poison orb", 3], ["contagious pore", 3], ["cobra tail", 120]],
      [["snake tail", 50]],
    ]
  },
  {
    name: "Talent Normal 7/8",
    slots: [
      [["mouse tail", 50]],
      [["simple normal orb", 5], ["blue mouse tail", 3]],
      [["arcane normal orb", 3], ["loud microphone", 3], ["bull tail", 120]],
      [["mythic normal orb", 3], ["purple egg", 2], ["cow tail", 500]],
      [["mouse tail", 50]],
      [["simple normal orb", 5], ["blue mouse tail", 3]],
      [["arcane normal orb", 3], ["loud microphone", 3], ["bull tail", 120]],
    ]
  },
  {
    name: "Talent Ice 7/8",
    slots: [
      [["mythic ice orb", 3], ["rainbow gift tail", 1], ["psychic wig", 500]],
      [["seel tail", 50]],
      [["simple ice orb", 5], ["blue seel tail", 3]],
      [["arcane ice orb", 3], ["blue seel tail", 3], ["dewgong tail", 120]],
      [["locksmith of shell", 50]],
      [["simple ice orb", 5], ["blue shell", 3]],
      [["arcane ice orb", 3], ["blue shell", 3], ["pieces of shell", 120]],
    ]
  },
  {
    name: "Talent Ground 7/8",
    slots: [
      [["mythic ground orb", 3], ["golden drill", 1], ["elephant foot", 500]],
      [["simple ground orb", 5], ["small yellow stones", 3]],
      [["arcane ground orb", 3], ["golden shell", 3], ["bone", 120]],
      [["small handfull of stones", 50]],
      [["simple ground orb", 5], ["armadillo red tail", 3]],
      [["arcane ground orb", 3], ["golden shell", 3], ["bone", 120]],
      [["armadillo tail", 50]],
    ]
  },
  {
    name: "Talent Grass 7/8",
    slots: [
      [["leaves", 50]],
      [["simple grass orb", 5], ["purple chicory", 3]],
      [["arcane grass orb", 3], ["purple big leaf", 3], ["big leaf", 120]],
      [["mythic grass orb", 3], ["blue coconut leaves", 1], ["big petal", 500]],
      [["flower stem", 50]],
      [["simple grass orb", 5], ["brown bulb", 3]],
      [["arcane grass orb", 3], ["purple leaf", 3], ["leaf", 120]],
    ]
  },
  {
    name: "Talent Ghost 7/8",
    slots: [
      [["ghost bottle", 50]],
      [["simple ghost orb", 5], ["green ghost bottle", 3]],
      [["arcane ghost orb", 3], ["dark claw", 3], ["ghost claw", 120]],
      [["mythic ghost orb", 3], ["dark claw", 3], ["ghost claw", 120]],
      [["ghost bottle", 50]],
      [["simple ghost orb", 5], ["green ghost bottle", 3]],
      [["arcane ghost orb", 3], ["dark claw", 3], ["ghost claw", 120]],
    ]
  },
  {
    name: "Talent Flying 7/8",
    slots: [
      [["mythic flying orb", 3], ["shiny bat wing", 1], ["dodrio feather", 500]],
      [["bird crest", 50]],
      [["simple flying orb", 5], ["yellow bird crest", 3]],
      [["arcane flying orb", 3], ["two-colored tail", 3], ["bird tail", 120]],
      [["bird wing", 50]],
      [["simple flying orb", 5], ["carmine wing", 3]],
      [["arcane flying orb", 3], ["two-colored tail", 3], ["bird tail", 120]],
    ]
  },
  {
    name: "Talent Fire 7/8",
    slots: [
      [["mythic fire orb", 3], ["black lizard tail", 3], ["magma shell", 500]],
      [["simple fire orb", 5], ["blue canine tail", 3]],
      [["arcane fire orb", 3], ["black lizard tail", 3], ["lizard tail", 120]],
      [["fire tail", 25], ["canine tail", 25]],
      [["simple fire orb", 5], ["black tail", 3]],
      [["arcane fire orb", 3], ["blaze fur", 3], ["quilava fur", 120]],
      [["fire hair", 25], ["dog fur", 25]],
    ]
  },
  {
    name: "Talent Figthing 7/8",
    slots: [
      [["mythic fighting orb", 3], ["metal bracelet", 2], ["punching machine", 500]],
      [["simple fighting orb", 5], ["blond hawk", 3]],
      [["mankey tail", 50]],
      [["arcane fighting orb", 3], ["champion underwear", 3], ["fighter underwear", 120]],
      [["simple fighting orb", 5], ["white monkey tail", 3]],
      [["arcane fighting orb", 3], ["champion underwear", 3], ["fighter underwear", 120]],
      [["fighter hawk", 50]],
    ]
  },
  {
    name: "Talent Fairy 7/8",
    slots: [
      [["simple fairy orb", 5], ["punk ear", 3]],
      [["snubull ear", 50]],
      [["arcane fairy orb", 3], ["purple moon topknot", 3], ["moon topknot", 120]],
      [["mythic fairy orb", 3], ["pink dainty wing", 2], ["pink wings", 500]],
      [["simple fairy orb", 5], ["punk ear", 3]],
      [["snubull ear", 50]],
      [["arcane fairy orb", 3], ["purple moon topknot", 3], ["moon topknot", 120]],
    ]
  },
  {
    name: "Talent Electric 7/8",
    slots: [
      [["simple electric orb", 5], ["green remains", 3]],
      [["arcane electric orb", 3], ["electric soft wool", 3], ["soft wool", 120]],
      [["mythic electric orb", 3], ["big green piece", 1], ["electric sheep tail", 500]],
      [["simple electric orb", 5], ["blue screws", 3]],
      [["remains of voltorb", 25], ["electric screws", 25]],
      [["arcane electric orb", 3], ["electric rat tail (shiny)", 3], ["electric ear", 120]],
      [["electric rat tail", 50]],
    ]
  },
  {
    name: "Talent Dragon 7/8",
    slots: [
      [["simple dragon orb", 5], ["shiny dragon ears", 5]],
      [["arcane dragon orb", 3], ["shiny dragon ears", 10], ["dratini ear", 120]],
      [["mythic dragon orb", 3], ["shiny dragon ears", 3], ["dragonite tail", 500]],
      [["simple dragon orb", 5], ["shiny dragon ears", 5]],
      [["arcane dragon orb", 3], ["shiny dragon ears", 10], ["dratini ear", 120]],
      [["dratini ear", 50]],
      [["dratini ear", 50]],
    ]
  },
  {
    name: "Talent Dark 7/8",
    slots: [
      [["simple dark orb", 5], ["smoked bones", 3]],
      [["yellow beak", 50]],
      [["arcane dark orb", 3], ["dark beak", 3], ["yellow beak", 120]],
      [["mythic dark orb", 3], ["cyan feather", 2], ["tyranitar tail", 500]],
      [["simple dark orb", 5], ["smoked bones", 3]],
      [["yellow beak", 50]],
      [["arcane dark orb", 3], ["dark beak", 3], ["yellow beak", 120]],
    ]
  },
  {
    name: "Talent Bug 7/8",
    slots: [
      [["simple bug orb", 5], ["sparkle antenna", 3]],
      [["piece of cocoon", 25], ["yellow cocoon", 25]],
      [["arcane bug orb", 3], ["red piece of cocoon", 3], ["butterfree wing", 120]],
      [["mythic bug orb", 3], ["pink bug horn", 1], ["moth wing", 500]],
      [["simple bug orb", 5], ["yellow sting", 3]],
      [["bee sting", 25]],
      [["arcane bug orb", 3], ["red cocoon", 3], ["bee sting", 120]],
    ]
  },
  {
    name: "Gym Viridian",
    slots: [
      [["snorlax paw", 1500], ["bear claw", 1500], ["cow tail", 1100], ["wigglytuff ear", 450], ["pink wings", 450], ["heart stone", 1000]],
    ]
  },
  {
    name: "Gym Cinnabar",
    slots: [
      [["fire wing", 1500], ["magma foot", 1500], ["giant piece of fur", 1100], ["magma shell", 450], ["fire stone", 1000]],
    ]
  },
  {
    name: "Gym Pewter",
    slots: [
      [["stone rocks", 1500], ["horn drill", 1500], ["bone", 1100], ["steelix tail", 900], ["rock stone", 500], ["earth stone", 500]],
    ]
  },
  {
    name: "Gym Cerulean",
    slots: [
      [["lapras fin", 900], ["gyarados tail", 1100], ["aquatic tail", 1500], ["water cannon", 1500], ["water stone", 500], ["ice stone", 500]],
    ]
  },
  {
    name: "Gym Vermilion",
    slots: [
      [["electric sheep tail", 1100], ["electric tail", 1500], ["electric ear", 1500], ["electric collar", 900], ["thunder stone", 1000]],
    ]
  },
  {
    name: "Gym Celadon",
    slots: [
      [["red petal", 1500], ["big petal", 1500], ["coconut leaves", 1100], ["vine hair", 900], ["leaf stone", 500], ["cocoon stone", 500]],
    ]
  },
  {
    name: "Gym Fuchsia",
    slots: [
      [["queen ear", 1500], ["king ear", 1500], ["giant bat wing", 1100], ["stinky hand", 900], ["venom stone", 1000]],
    ]
  },
  {
    name: "Gym Saffron",
    slots: [
      [["psychic moustache", 1500], ["two-eyed black tail", 1500], ["xatu wing", 1100], ["giraffe antenna", 900], ["enigma stone", 1000]],
    ]
  },
  {
    name: "Reduces Speed Water 6/6",
    slots: [
      [["crystal stone", 25], ["water stone", 50], ["duck paw", 250], ["aquatic tail", 300], ["big fist gloves", 300], ["gyarados tail", 500], ["giant ruby", 300]],
      [["crystal stone", 50], ["water stone", 100], ["duck paw", 300], ["aquatic tail", 360], ["big fist gloves", 360], ["gyarados tail", 600], ["giant ruby", 360], ["simple water orb", 10]],
      [["crystal stone", 100], ["water stone", 200], ["duck paw", 375], ["aquatic tail", 420], ["big fist gloves", 420], ["gyarados tail", 700], ["giant ruby", 420], ["simple water orb", 20]],
      [["crystal stone", 200], ["water stone", 400], ["duck paw", 375], ["aquatic tail", 450], ["big fist gloves", 450], ["gyarados tail", 750], ["giant ruby", 450], ["arcane water orb", 5]],
      [["crystal stone", 400], ["water stone", 800], ["duck paw", 400], ["aquatic tail", 525], ["big fist gloves", 525], ["gyarados tail", 875], ["giant ruby", 525], ["arcane water orb", 20]],
      [["crystal stone", 500], ["water stone", 1000], ["duck paw", 500], ["aquatic tail", 600], ["big fist gloves", 600], ["gyarados tail", 1000], ["giant ruby", 600], ["mythic water orb", 3]],
    ]
  },
    {
    name: "Reduces Speed Ice 6/6",
    slots: [
      [["crystal stone", 25], ["ice stone", 50], ["dragonite tail", 250], ["dewgong tail", 300], ["psychic wig", 300], ["dragonair tail", 500], ["pieces of shell", 300]],
      [["crystal stone", 50], ["ice stone", 100], ["dragonite tail", 300], ["dewgong tail", 360], ["psychic wig", 360], ["dragonair tail", 600], ["pieces of shell", 360], ["simple ice orb", 10]],
      [["crystal stone", 100], ["ice stone", 200], ["dragonite tail", 375], ["dewgong tail", 420], ["psychic wig", 420], ["dragonair tail", 700], ["pieces of shell", 420], ["simple ice orb", 20]],
      [["crystal stone", 200], ["ice stone", 400], ["dragonite tail", 375], ["dewgong tail", 450], ["psychic wig", 450], ["dragonair tail", 750], ["pieces of shell", 450], ["arcane ice orb", 5]],
      [["crystal stone", 400], ["ice stone", 800], ["dragonite tail", 400], ["dewgong tail", 525], ["psychic wig", 525], ["dragonair tail", 875], ["pieces of shell", 525], ["arcane ice orb", 20]],
      [["crystal stone", 500], ["ice stone", 1000], ["dragonite tail", 500], ["dewgong tail", 600], ["psychic wig", 600], ["dragonair tail", 1000], ["pieces of shell", 600], ["mythic ice orb", 3]],
    ]
  },
      {
    name: "Reduces Speed Sand 6/6",
    slots: [
      [["heart stone", 50], ["enigma stone", 50], ["blue ray tail", 250], ["water cannon", 300], ["red hair", 300], ["sea dragon fin", 500], ["giraffe antenna", 300]],
      [["heart stone", 100], ["enigma stone", 100], ["blue ray tail", 300], ["water cannon", 360], ["red hair", 360], ["sea dragon fin", 600], ["giraffe antenna", 360], ["simple psychic orb", 10]],
      [["heart stone", 200], ["enigma stone", 200], ["blue ray tail", 375], ["water cannon", 420], ["red hair", 420], ["sea dragon fin", 700], ["giraffe antenna", 420], ["simple psychic orb", 20]],
      [["heart stone", 400], ["enigma stone", 400], ["blue ray tail", 375], ["water cannon", 450], ["red hair", 450], ["sea dragon fin", 750], ["giraffe antenna", 450], ["arcane psychic orb", 5]],
      [["heart stone", 800], ["enigma stone", 800], ["blue ray tail", 400], ["water cannon", 525], ["red hair", 525], ["sea dragon fin", 875], ["giraffe antenna", 525], ["arcane psychic orb", 20]],
      [["heart stone", 1000], ["enigma stone", 1000], ["blue ray tail", 500], ["water cannon", 600], ["red hair", 600], ["sea dragon fin", 1000], ["giraffe antenna", 600], ["mythic psychic orb", 3]],
    ]
  },
];

// ============================================================
// SEÇÃO 4 — CONFIGURAÇÕES GERAIS
// ============================================================

const KK_TO_BRL = 1.70;
