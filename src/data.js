// ============================================================
//  Knave 2e static data tables
//  Lifted straight from the chargen so the sheet stays in sync.
// ============================================================

export const ABILITIES = [
  { key: 'str', label: 'STR', desc: 'Melee & physical' },
  { key: 'dex', label: 'DEX', desc: 'Agility & stealth' },
  { key: 'con', label: 'CON', desc: 'Slots & wounds' },
  { key: 'int', label: 'INT', desc: 'Magic & cunning' },
  { key: 'wis', label: 'WIS', desc: 'Ranged & perception' },
  { key: 'cha', label: 'CHA', desc: 'Social & henchmen' }
];

export const BODY_ARMORS = [
  { id: 'head',  name: 'Head Armor',  slots: 2, dr: 1 },
  { id: 'torso', name: 'Torso Armor', slots: 2, dr: 1 },
  { id: 'limbs', name: 'Limbs Armor', slots: 2, dr: 1 }
];

export const SHIELDS = [
  { id: 'small', name: 'Small Shield', slots: 1, shieldHP: 1 },
  { id: 'large', name: 'Large Shield', slots: 2, shieldHP: 3 }
];

export const WEAPONS = [
  { id: 'dagger',     name: 'Dagger',         dmg: 'd4', slots: 1 },
  { id: 'sword',      name: 'Sword (1h)',     dmg: 'd6', slots: 1 },
  { id: 'axe',        name: 'Axe (1h)',       dmg: 'd6', slots: 1 },
  { id: 'mace',       name: 'Mace (1h)',      dmg: 'd6', slots: 1 },
  { id: 'spear',      name: 'Spear (1h)',     dmg: 'd6', slots: 1 },
  { id: 'greatsword', name: 'Greatsword (2h)',dmg: 'd8', slots: 2 },
  { id: 'battleaxe',  name: 'Battleaxe (2h)', dmg: 'd8', slots: 2 },
  { id: 'halberd',    name: 'Halberd (2h)',   dmg: 'd8', slots: 2 },
  { id: 'shortbow',   name: 'Shortbow',       dmg: 'd6', slots: 1 },
  { id: 'longbow',    name: 'Longbow (2h)',   dmg: 'd8', slots: 2 },
  { id: 'crossbow',   name: 'Crossbow (2h)',  dmg: 'd8', slots: 2 },
  { id: 'sling',      name: 'Sling',          dmg: 'd4', slots: 1 }
];

export const CAREERS = [
  {id:1,name:"Acolyte",items:["candlestick","censer","incense"]},
  {id:2,name:"Acrobat",items:["flash powder","balls","lamp oil"]},
  {id:3,name:"Actor",items:["wig","makeup","costume"]},
  {id:4,name:"Alchemist",items:["acid","mortar/pestle","6 vials"]},
  {id:5,name:"Antiquarian",items:["old coin","flag","lore book"]},
  {id:6,name:"Arcanist",items:["spell book","arcane robes","chalk"]},
  {id:7,name:"Architect",items:["plumb line","level","ruler"]},
  {id:8,name:"Assassin",items:["crossbow","garrote","soft boots"]},
  {id:9,name:"Astrologer",items:["star charts","almanac","telescope"]},
  {id:10,name:"Baker",items:["rolling pin","flour bag","lard block"]},
  {id:11,name:"Bandit",items:["mask","manacles","caltrops"]},
  {id:12,name:"Barber",items:["scissors","hair oil","straight razor"]},
  {id:13,name:"Beast Tamer",items:["whip","gloves","leash"]},
  {id:14,name:"Beekeeper",items:["honey","mask","smoke bomb"]},
  {id:15,name:"Blacksmith",items:["hammer","bellows","tongs"]},
  {id:16,name:"Boatman",items:["10’ pole","instrument","paddle"]},
  {id:17,name:"Bookbinder",items:["sewing kit","glue","quill/ink"]},
  {id:18,name:"Brewer",items:["mash paddle","beer keg","hops"]},
  {id:19,name:"Burglar",items:["lockpicks","grappling hook","rope"]},
  {id:20,name:"Butcher",items:["cleaver","meat hook","bacon"]},
  {id:21,name:"Candlemaker",items:["10 candles","lamp oil","wax"]},
  {id:22,name:"Carpenter",items:["hammer","saw","box of nails"]},
  {id:23,name:"Charlatan",items:["costume","fake elixir","degree"]},
  {id:24,name:"Cobbler",items:["leather roll","fancy shoes","tacks"]},
  {id:25,name:"Coachman",items:["whip","lockbox","oilskin coat"]},
  {id:26,name:"Cook",items:["frying pan","salt","olive oil"]},
  {id:27,name:"Courier",items:["oilskin bag","local map","lantern"]},
  {id:28,name:"Courtier",items:["perfume","wig","fan"]},
  {id:29,name:"Cultist",items:["dagger","ritual robes","amulet"]},
  {id:30,name:"Cutpurse",items:["knife","caltrops","sack"]},
  {id:31,name:"Dyer",items:["10’ pole","dyes","soap"]},
  {id:32,name:"Explorer",items:["sextant","spyglass","crampons"]},
  {id:33,name:"Falconer",items:["bird cage","gloves","whistle"]},
  {id:34,name:"Fence",items:["short sword","file","sealing wax"]},
  {id:35,name:"Fisherman",items:["spear","net","fishing tackle"]},
  {id:36,name:"Folklorist",items:["prophecy","bones","scales"]},
  {id:37,name:"Gambler",items:["rapier","card deck","dice"]},
  {id:38,name:"Gamekeeper",items:["sling","horn","rope ladder"]},
  {id:39,name:"Gardener",items:["sickle","shovel","shears"]},
  {id:40,name:"Grave Robber",items:["saw","crowbar","pulleys"]},
  {id:41,name:"Gravedigger",items:["shovel","pickaxe","bucket"]},
  {id:42,name:"Groom",items:["oats","horse brush","blanket"]},
  {id:43,name:"Guard",items:["halberd","livery","horn"]},
  {id:44,name:"Headsman",items:["axe","hood","garrote"]},
  {id:45,name:"Herbalist",items:["herbs","sickle","herb manual"]},
  {id:46,name:"Hermit",items:["staff","fungi","basket"]},
  {id:47,name:"Hunter",items:["tent","bearskin","bear trap"]},
  {id:48,name:"Innkeeper",items:["ladle","10 candles","cauldron"]},
  {id:49,name:"Inquisitor",items:["manual","vestments","pliers"]},
  {id:50,name:"Investigator",items:["journal","manacles","vial"]},
  {id:51,name:"Jailer",items:["padlock","10’ chain","wine jug"]},
  {id:52,name:"Jester",items:["scepter","donkey head","motley"]},
  {id:53,name:"Jeweler",items:["pliers","loupe","tweezers"]},
  {id:54,name:"Knight",items:["lady’s favor","banner","signet ring"]},
  {id:55,name:"Kidnapper",items:["chloroform","manacles","hood"]},
  {id:56,name:"Lawyer",items:["fancy robe","law book","certificate"]},
  {id:57,name:"Locksmith",items:["crowbar","picks","padlock"]},
  {id:58,name:"Mason",items:["chisel","hammer","chalk"]},
  {id:59,name:"Merchant",items:["scales","strongbox","bag of spice"]},
  {id:60,name:"Miner",items:["pickaxe","lantern","pet canary"]},
  {id:61,name:"Musician",items:["3 instruments"]},
  {id:62,name:"Naturalist",items:["fossil","insect case","geode"]},
  {id:63,name:"Officer",items:["shoe polish","medal","spyglass"]},
  {id:64,name:"Oracle",items:["divining rod","incense","crystal ball"]},
  {id:65,name:"Outlaw",items:["mask","bow","20 arrows"]},
  {id:66,name:"Painter",items:["paints","brushes","canvas"]},
  {id:67,name:"Perfumer",items:["perfume","oils","mortar/pestle"]},
  {id:68,name:"Philosopher",items:["chalk","journal","quill/ink"]},
  {id:69,name:"Physician",items:["bandages","leeches","scalpel"]},
  {id:70,name:"Pilgrim",items:["holy symbol","walking stick","alms bowl"]},
  {id:71,name:"Pirate",items:["cutlass","eye patch","grog"]},
  {id:72,name:"Plague Doctor",items:["beak mask","herbs","cane"]},
  {id:73,name:"Poacher",items:["snare","sling","skinning knife"]},
  {id:74,name:"Potter",items:["clay","wheel","kiln tools"]},
  {id:75,name:"Preacher",items:["pulpit","holy book","incense"]},
  {id:76,name:"Priest",items:["holy symbol","robe","prayer book"]},
  {id:77,name:"Prospector",items:["10 iron spikes","pickaxe","pan"]},
  {id:78,name:"Puppeteer",items:["confetti","puppet","sewing kit"]},
  {id:79,name:"Rat Catcher",items:["cage","10 rat traps","sack"]},
  {id:80,name:"Saboteur",items:["air bladder","crowbar","bomb"]},
  {id:81,name:"Sailor",items:["beeswax","pullies","spyglass"]},
  {id:82,name:"Scout",items:["signal flags","black grease","dice"]},
  {id:83,name:"Scribe",items:["lamp oil","quill/ink","sealing wax"]},
  {id:84,name:"Sculptor",items:["chisel","clay","calipers"]},
  {id:85,name:"Servant",items:["sponge","silverware","poker"]},
  {id:86,name:"Shepherd",items:["crook","instrument","sling"]},
  {id:87,name:"Shipwright",items:["drill","hammer","axe"]},
  {id:88,name:"Singer",items:["mirror","makeup","locket"]},
  {id:89,name:"Smuggler",items:["pulleys","rope","makeup"]},
  {id:90,name:"Soldier",items:["tent","card deck","shovel"]},
  {id:91,name:"Spy",items:["caltrops","poison","forged papers"]},
  {id:92,name:"Squire",items:["torch","armor polish","trumpet"]},
  {id:93,name:"Tailor",items:["sewing kit","scissors","soap"]},
  {id:94,name:"Tattooist",items:["soot pot","needles","10 candles"]},
  {id:95,name:"Thieftaker",items:["bear trap","manacles","torch"]},
  {id:96,name:"Thug",items:["poison","knife","lamp oil"]},
  {id:97,name:"Torturer",items:["drill","hourglass","10’ chain"]},
  {id:98,name:"Trapper",items:["bear trap","300’ twine","bear pelt"]},
  {id:99,name:"Watchman",items:["lantern","trumpet","spear"]},
  {id:100,name:"Woodcutter",items:["axe","firewood","50’ rope"]}
];

// Quick lookup helpers
export const careerById = (id) => CAREERS.find(c => c.id === id);
export const weaponById = (id) => WEAPONS.find(w => w.id === id);
export const armorById  = (id) => BODY_ARMORS.find(a => a.id === id);
export const shieldById = (id) => SHIELDS.find(s => s.id === id);
