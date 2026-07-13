// ═══════════════════════════════════════════════════════════
//  FISH CATALOG — 8 rarities, ≥50 fish each, + mutations
//  (English names, includes fictional/legendary creatures)
// ═══════════════════════════════════════════════════════════

export const RARITY = {
    common: {
        label: "Common",
        emoji: "⚪",
        weight: 4000,
        price: [20, 80],
        buttons: [1, 3],
        phases: 1
    },
    uncommon: {
        label: "Uncommon",
        emoji: "🟢",
        weight: 2200,
        price: [80, 200],
        buttons: [2, 4],
        phases: 1
    },
    rare: {
        label: "Rare",
        emoji: "🔵",
        weight: 1100,
        price: [200, 500],
        buttons: [3, 5],
        phases: 1
    },
    legendary: {
        label: "Legendary",
        emoji: "🟣",
        weight: 400,
        price: [500, 1500],
        buttons: [4, 6],
        phases: 1
    },
    mythical: {
        label: "Mythical",
        emoji: "🟠",
        weight: 120,
        price: [1500, 4000],
        buttons: [4, 7],
        phases: [2, 3]
    },
    unreal: {
        label: "Unreal",
        emoji: "🔴",
        weight: 40,
        price: [4000, 10000],
        buttons: [5, 8],
        phases: [2, 4]
    },
    ephemeral: {
        label: "Ephemeral",
        emoji: "🌈",
        weight: 12,
        price: [10000, 30000],
        buttons: [6, 9],
        phases: [3, 4]
    },
    godly: {
        label: "Godly",
        emoji: "✨",
        weight: 3,
        price: [30000, 120000],
        buttons: [7, 10],
        phases: [3, 5]
    }
}

export const RARITY_ORDER = [
    "common",
    "uncommon",
    "rare",
    "legendary",
    "mythical",
    "unreal",
    "ephemeral",
    "godly"
]

export const PHASE_RARITIES = ["mythical", "unreal", "ephemeral", "godly"]

export const MUTATIONS = [
    { id: "shiny", name: "Shiny", emoji: "✨", mult: 2, chance: 8 },
    { id: "giant", name: "Giant", emoji: "🦣", mult: 2.5, chance: 5 },
    { id: "golden", name: "Golden", emoji: "🟡", mult: 3, chance: 3 },
    { id: "ancient", name: "Ancient", emoji: "🏺", mult: 4, chance: 1.5 },
    { id: "rainbow", name: "Rainbow", emoji: "🌈", mult: 5, chance: 0.5 }
]

const NAMES = {
    common: [
        "Anchovy",
        "Sardine",
        "Minnow",
        "Guppy",
        "Goldfish",
        "Carp",
        "Tilapia",
        "Catfish",
        "Bluegill",
        "Sunfish",
        "Perch",
        "Roach",
        "Rudd",
        "Dace",
        "Bream",
        "Tench",
        "Gudgeon",
        "Loach",
        "Smelt",
        "Herring Fry",
        "Mackerel Fry",
        "Sprat",
        "Whitebait",
        "Silverside",
        "Mudfish",
        "Mullet",
        "Killifish",
        "Molly",
        "Platy",
        "Zebrafish",
        "Neon Tetra",
        "Danio",
        "Barb",
        "Rasbora",
        "Betta",
        "Goby",
        "Blenny",
        "Pipefish",
        "Stickleback",
        "Pumpkinseed",
        "Crappie",
        "Shiner",
        "Chub",
        "Fathead",
        "Bullhead",
        "Common Eel",
        "Sand Dab",
        "Baby Snapper",
        "Pinfish",
        "Grunt",
        "Croaker"
    ],
    uncommon: [
        "Sea Bass",
        "Snapper",
        "Grouper",
        "Rabbitfish",
        "Trevally",
        "Mackerel",
        "Threadfin",
        "Pompano",
        "Barramundi",
        "Parrotfish",
        "Emperor",
        "Coral Trout",
        "Jobfish",
        "Fusilier",
        "Queenfish",
        "Needlefish",
        "Milkfish",
        "Catfish Sea",
        "Sheepshead",
        "Cobia Juvenile",
        "Amberjack Juv",
        "Yellowtail Scad",
        "Bigeye Scad",
        "Rainbow Runner",
        "Barracuda Juv",
        "John Dory",
        "Red Snapper",
        "Golden Snapper",
        "Mangrove Jack",
        "Spanish Flag",
        "Sweetlips",
        "Cardinalfish",
        "Ponyfish",
        "Wolf Herring",
        "Garfish",
        "Halfbeak",
        "Ladyfish",
        "Tarpon Juv",
        "Silver Perch",
        "Golden Perch",
        "Murray Cod Juv",
        "Sea Trout",
        "Flounder",
        "Sole",
        "Turbot",
        "Plaice",
        "Weakfish",
        "Drum",
        "Kingfish Juv",
        "Rockfish",
        "Lingcod"
    ],
    rare: [
        "Marlin",
        "Yellowfin Tuna",
        "Sailfish",
        "Dorado",
        "Wahoo",
        "Mahi-Mahi",
        "Giant Trevally",
        "Amberjack",
        "Cobia",
        "Bigeye Tuna",
        "Kingfish",
        "Snook",
        "Tarpon",
        "Permit",
        "Roosterfish",
        "Yellowtail",
        "Giant Grouper",
        "Napoleon Wrasse",
        "Humphead",
        "Eagle Ray",
        "Reef Shark",
        "Blacktip Shark",
        "Whitetip Shark",
        "Manta Ray Juv",
        "Moray Eel",
        "Queensland Grouper",
        "Batik Coral Trout",
        "Ruby Snapper",
        "Albacore",
        "Skipjack King",
        "Bonito",
        "Swordfish Juv",
        "Opah Juv",
        "Lampuki",
        "Sailfin",
        "Blue Marlin Juv",
        "Black Marlin Juv",
        "Arowana",
        "Golden Arowana",
        "Peacock Bass",
        "Giant Snakehead",
        "Featherback",
        "Wallago",
        "Redtail Catfish",
        "Tiger Fish",
        "Golden Mahseer",
        "Nile Perch",
        "Muskie",
        "Sturgeon",
        "Paddlefish"
    ],
    legendary: [
        "Blue Marlin",
        "Black Marlin",
        "Swordfish",
        "Opah",
        "Bluefin Tuna",
        "Tiger Shark",
        "Bull Shark",
        "Mako Shark",
        "Manta Ray",
        "Coelacanth",
        "Oarfish",
        "Beluga Sturgeon",
        "Arapaima",
        "Alligator Gar",
        "Wels Catfish",
        "Mekong Giant Catfish",
        "Goliath Tigerfish",
        "Piraiba",
        "Sea Dragon",
        "Giant Sunfish",
        "Mola Mola",
        "Hammerhead Shark",
        "Giant Nurse Shark",
        "Electric Ray",
        "King Electric Eel",
        "Anglerfish",
        "Viperfish",
        "Gulper Eel",
        "Fangtooth",
        "Dragonfish",
        "Barreleye",
        "Frilled Shark",
        "Megamouth",
        "Goblin Shark",
        "Giant Lanternfish",
        "King Stonefish",
        "King Lionfish",
        "Giant Napoleon",
        "Bumphead King",
        "Humphead Wrasse",
        "Potato Cod",
        "Giant Barb",
        "Siamese Carp",
        "King Nile Perch",
        "Taimen",
        "White Sturgeon",
        "Colossal Squid",
        "Greenland Shark",
        "Basking Shark",
        "Whale Shark"
    ],
    mythical: [
        "Megalodon",
        "Baby Leviathan",
        "Young Kraken",
        "Sea Hydra",
        "Abyssal Serpent",
        "Ancient Water Dragon",
        "Sea Phoenix",
        "Ocean Behemoth",
        "Charybdis Spawn",
        "Scylla",
        "Sea Spirit Fish",
        "Moonlit Koi",
        "Sunset Serpent",
        "Aurora Fish",
        "Nightmist Fish",
        "Shooting Star Fish",
        "Storm Fish",
        "Eclipse Fish",
        "Eternal Wave Fish",
        "Deep Trench Fish",
        "Silver Dragon Fish",
        "Emerald Dragon Fish",
        "Sapphire Dragon Fish",
        "Ruby Dragon Fish",
        "Whirlpool Fish",
        "Typhoon Fish",
        "Thunder Fish",
        "Sea Lightning",
        "Frost Mist Fish",
        "Sea Flame Fish",
        "Ancient Reef Guardian",
        "Black Pearl Fish",
        "Giant Clam Beast",
        "Ancient Coral Beast",
        "Ocean Secret",
        "Fisherman's Legend",
        "Trench Warden",
        "Sea Queen Fish",
        "Ocean King Fish",
        "Shadow Water Fish",
        "Phantom Fish",
        "Crystal Fin",
        "Prism Tail",
        "Moon Eye Fish",
        "Sea Ember",
        "Full Moon Fish",
        "Night Crescent Fish",
        "Dawn Fish",
        "Eternal Dusk Fish",
        "Horizon Fish",
        "Nessie"
    ],
    unreal: [
        "Ocean Titan",
        "Grand Leviathan",
        "Ancient Kraken",
        "Eternal Sea Dragon",
        "Mystic Sea Wolf",
        "Dimension Fish",
        "Void Fish",
        "Interspace Fish",
        "Quantum Fish",
        "Paradox Fish",
        "Mirage Fish",
        "Illusion Fish",
        "Dream Fish",
        "Cosmic Shadow Fish",
        "Nebula Fish",
        "Galaxy Fish",
        "Black Hole Fish",
        "Supernova Fish",
        "Meteor Fish",
        "Comet Fish",
        "Pulsar Fish",
        "Quasar Fish",
        "Dark Matter Fish",
        "Dark Energy Fish",
        "Singularity Fish",
        "Time Fish",
        "Space Fish",
        "Aether Fish",
        "Plasma Fish",
        "Antimatter Fish",
        "Cosmic Prism Fish",
        "Spectrum Fish",
        "Frequency Fish",
        "Ancient Wave Fish",
        "Resonance Fish",
        "Eternal Echo Fish",
        "Vortex Fish",
        "Cosmic Whirl Fish",
        "Horizon Beast",
        "Reality Edge Fish",
        "Mortal Fish",
        "Universe Fish",
        "Star Core Fish",
        "Zenith Fish",
        "Nadir Fish",
        "Astral Fish",
        "Ethereal Fish",
        "Transcendent Fish",
        "Infinity Fish",
        "Absolute Fish"
    ],
    ephemeral: [
        "Fleeting Fish",
        "Eternal Mortal Fish",
        "Frozen Time Fish",
        "Final Second Fish",
        "Frozen Moment Fish",
        "Glimpse Fish",
        "Momentary Shadow",
        "Light Trail Fish",
        "Last Breath Fish",
        "Morning Dew Fish",
        "Zero Point Fish",
        "Timelimit Fish",
        "Time Corridor Fish",
        "Fifth Dimension Fish",
        "Perfect Illusion",
        "Ocean Dream Fish",
        "Grand Mirage Fish",
        "Cracked Mirror Fish",
        "Reality Shard",
        "Soul Fragment Fish",
        "Ancient Spirit Fish",
        "Ocean Wraith",
        "Sea Soul Fish",
        "Pure Aether Fish",
        "Eternal Light Fish",
        "Pure Darkness Fish",
        "Hollow Fish",
        "Silent Fish",
        "Hush Fish",
        "Nothingness Fish",
        "Eternity Fish",
        "Emptiness Fish",
        "Final Edge Fish",
        "Gate Fish",
        "Portal Fish",
        "Threshold Fish",
        "Fleeting Glow Fish",
        "False Dawn Fish",
        "False Dusk Fish",
        "Dead Star Fish",
        "Blast Remnant Fish",
        "Cosmic Dust Fish",
        "Universe Breath Fish",
        "Time Pulse Fish",
        "Reality Pulse Fish",
        "Aether Tremor Fish",
        "Void Whisper Fish",
        "Eternal Gale Fish",
        "Vanishing Fish",
        "Perish Fish"
    ],
    godly: [
        "Sea God",
        "Young Poseidon",
        "Neptune Fish",
        "Triton Fish",
        "Ocean Deity",
        "The Creator Fish",
        "Alpha Omega Fish",
        "Divine Eternity Fish",
        "Divine Light Fish",
        "Destiny Fish",
        "Fate Fish",
        "Cosmic Will Fish",
        "Life Source Fish",
        "Genesis Fish",
        "Apocalypse Fish",
        "Ocean Throne Fish",
        "Ocean Crown Fish",
        "Codex Fish",
        "Word Fish",
        "Ocean Verse Fish",
        "Holy Ocean Spirit",
        "First Light Fish",
        "Primordial Dark Fish",
        "Big Bang Fish",
        "Creation Fish",
        "Doomsday Fish",
        "Resurrection Fish",
        "Heaven Fish",
        "Nirvana Fish",
        "Celestial Fish",
        "Thunder God Fish",
        "Storm God Fish",
        "Wave God Fish",
        "Trench God Fish",
        "Moon Goddess Fish",
        "Sun God Fish",
        "Star God Fish",
        "Cosmos God Fish",
        "Time God Fish",
        "Space God Fish",
        "Fate God Fish",
        "Life God Fish",
        "Death God Fish",
        "King of Gods Fish",
        "Divine Decree Fish",
        "Absolute Power Fish",
        "The Almighty Fish",
        "Infinite Fish",
        "Apex of All Fish",
        "Omnipotent Fish"
    ]
}

const EMOJI = {
    common: "🐟",
    uncommon: "🐠",
    rare: "🐡",
    legendary: "🦈",
    mythical: "🐉",
    unreal: "🌌",
    ephemeral: "🌈",
    godly: "✨"
}

function buildCatalog() {
    const list = []
    for (const rarity of RARITY_ORDER) {
        const cfg = RARITY[rarity]
        const names = NAMES[rarity]
        names.forEach((name, i) => {
            const t = names.length > 1 ? i / (names.length - 1) : 0
            const price = Math.round(cfg.price[0] + (cfg.price[1] - cfg.price[0]) * t)
            list.push({ id: `${rarity}_${i}`, name, rarity, price, emoji: EMOJI[rarity] })
        })
    }
    return list
}

export const FISH = buildCatalog()

const byRarity = {}
for (const f of FISH) (byRarity[f.rarity] ||= []).push(f)

/** Roll rarity by weight (luck boosts high rarities). */
export function rollRarity(luck = 1) {
    const entries = RARITY_ORDER.map((r) => {
        let w = RARITY[r].weight
        if (PHASE_RARITIES.includes(r)) w *= luck
        return [r, w]
    })
    const total = entries.reduce((s, [, w]) => s + w, 0)
    let roll = Math.random() * total
    for (const [r, w] of entries) {
        roll -= w
        if (roll <= 0) return r
    }
    return "common"
}

export function randomFishOf(rarity) {
    const pool = byRarity[rarity] || byRarity.common
    return pool[Math.floor(Math.random() * pool.length)]
}

export function rollMutation(bonus = 1) {
    const r = Math.random() * 100
    let acc = 0
    for (const mut of MUTATIONS) {
        acc += mut.chance * bonus
        if (r < acc) return mut
    }
    return null
}

export function fishValue(fish, mutation) {
    return mutation ? Math.round(fish.price * mutation.mult) : fish.price
}

export function fishDisplay(fish, mutation) {
    const rEmoji = RARITY[fish.rarity].emoji
    const mut = mutation ? `${mutation.emoji} ${mutation.name} ` : ""
    return `${rEmoji} ${fish.emoji} ${mut}${fish.name}`
}

export default {
    RARITY,
    RARITY_ORDER,
    PHASE_RARITIES,
    MUTATIONS,
    FISH,
    rollRarity,
    randomFishOf,
    rollMutation,
    fishValue,
    fishDisplay
}
