// ═══════════════════════════════════════════════════════════
//  SISTEM ISLAND (pulau memancing)
//  Tiap island punya pool ikan sendiri (index per-island).
//  Semua island GRATIS diakses.
// ═══════════════════════════════════════════════════════════
import { RARITY } from "./fish.js"

// Emoji default per rarity.
const R_EMOJI = {
    common: "🐟",
    uncommon: "🐠",
    rare: "🐡",
    epic: "🐙",
    legendary: "🦈",
    mythical: "🐉",
    secret: "🕳️",
    ephemeral: "🌈",
    unreal: "🌌"
}

// Definisi ikan tiap island: [name, rarity, emoji?]
const ISLAND_FISH = {
    // Fisherman: Common..Mythical + Secret (tanpa ephemeral/unreal)
    fisherman: [
        ["Anchovy", "common", "🐟"],
        ["Sardine", "common", "🐟"],
        ["Goldfish", "common", "🐠"],
        ["Carp", "common", "🐟"],
        ["Catfish", "uncommon", "🐟"],
        ["Tilapia", "uncommon", "🐟"],
        ["Bluegill", "uncommon", "🐠"],
        ["Bass", "rare", "🐠"],
        ["Trout", "rare", "🐟"],
        ["Pike", "epic", "🐡"],
        ["Golden Carp", "legendary", "🥇"],
        ["Old Pond King", "mythical", "🐉"],
        ["Whisker of Legends", "secret", "🕳️"]
    ],
    // Coral Reefs: sampai Ephemeral
    coral: [
        ["Clownfish", "common", "🐠"],
        ["Damselfish", "common", "🐠"],
        ["Wrasse", "common", "🐠"],
        ["Angelfish", "uncommon", "🐠"],
        ["Butterflyfish", "uncommon", "🦋"],
        ["Parrotfish", "uncommon", "🦜"],
        ["Tang", "rare", "🐠"],
        ["Triggerfish", "rare", "🐠"],
        ["Pufferfish", "epic", "🐡"],
        ["Lionfish", "epic", "🦁"],
        ["Moray Eel", "legendary", "🐍"],
        ["Reef Shark", "legendary", "🦈"],
        ["Manta Ray", "mythical", "🛸"],
        ["Hammerhead", "mythical", "🦈"],
        ["Coral Guardian", "secret", "🪸"],
        ["Rainbow Reef Fish", "secret", "🌈"],
        ["Reef Leviathan", "ephemeral", "🌈"]
    ],
    // Vulcanic Sea: sampai Ephemeral
    vulcanic: [
        ["Ember Fish", "common", "🔥"],
        ["Cinder Minnow", "uncommon", "🔥"],
        ["Lava Eel", "rare", "🌋"],
        ["Obsidian Bass", "epic", "⬛"],
        ["Magma Ray", "legendary", "🔥"],
        ["Cinder Shark", "mythical", "🦈"],
        ["Volcano Serpent", "secret", "🐉"],
        ["Phoenix Koi", "ephemeral", "🔥"]
    ],
    // Sacred Jungle: sampai Ephemeral + 1 Unreal + tempat batu enchant
    sacred: [
        ["Jungle Guppy", "common", "🌿"],
        ["Mossback Fish", "common", "🌿"],
        ["Vine Eel", "uncommon", "🐍"],
        ["Temple Carp", "uncommon", "🛕"],
        ["Jade Fish", "rare", "💚"],
        ["Spirit Koi", "rare", "🎐"],
        ["Golden Idol Fish", "epic", "🗿"],
        ["Runed Bass", "epic", "🔱"],
        ["Sacred Turtle", "legendary", "🐢"],
        ["Forest Dragon", "legendary", "🐉"],
        ["Jungle Wyrm", "mythical", "🐉"],
        ["Ancient Guardian Fish", "secret", "🛡️"],
        ["Worldtree Fish", "ephemeral", "🌳"],
        ["Gaia's Blessing", "unreal", "🌌"]
    ],
    // Rock Island — bertema batu/logam. Punya Secret (quest Rock'in Guitar).
    rock: [
        ["Pebble Fish", "common", "🪨"],
        ["Gravel Minnow", "common", "🪨"],
        ["Stonefish", "uncommon", "🗿"],
        ["Iron Carp", "uncommon", "⚙️"],
        ["Granite Bass", "rare", "🪨"],
        ["Crystal Fish", "epic", "💎"],
        ["Geode Ray", "legendary", "💠"],
        ["Boulder Leviathan", "mythical", "🏔️"],
        ["Amplifier Fish", "secret", "🎸"],
        ["Golden Fossil Fish", "ephemeral", "🦴"]
    ],
    // Haunted Sea — banyak ghost. Punya Secret (quest Nightmare Catcher).
    haunted: [
        ["Bone Fish", "common", "🦴"],
        ["Pale Guppy", "common", "👻"],
        ["Spectral Eel", "uncommon", "👻"],
        ["Zombie Cod", "uncommon", "🧟"],
        ["Cursed Bass", "rare", "💀"],
        ["Wraith Ray", "epic", "👻"],
        ["Phantom Shark", "legendary", "🦈"],
        ["Banshee Fish", "mythical", "😱"],
        ["Nightmare Kraken", "secret", "🌑"],
        ["Soul Reaver Fish", "ephemeral", "☠️"],
        ["The Drowned King", "unreal", "👑"]
    ],
    // Sea (BARU): 32 ikan — 3 Unreal, 3 Ephemeral, 4 Secret + sisanya
    sea: [
        ["Sea Sardine", "common", "🐟"],
        ["Silver Herring", "common", "🐟"],
        ["Blue Mackerel", "common", "🐠"],
        ["Pilchard", "common", "🐟"],
        ["Sea Bream", "common", "🐠"],
        ["Cod", "uncommon", "🐟"],
        ["Haddock", "uncommon", "🐟"],
        ["Snapper", "uncommon", "🐠"],
        ["Grouper", "uncommon", "🐠"],
        ["Yellowfin Tuna", "rare", "🐟"],
        ["Barracuda", "rare", "🐟"],
        ["Swordfish", "rare", "🗡️"],
        ["Sailfish", "rare", "⛵"],
        ["Blue Marlin", "epic", "🐟"],
        ["Giant Squid", "epic", "🦑"],
        ["Sunfish", "epic", "🐡"],
        ["Oarfish", "legendary", "🐍"],
        ["Great White", "legendary", "🦈"],
        ["Giant Octopus", "legendary", "🐙"],
        ["Sperm Whale", "mythical", "🐋"],
        ["Colossal Ray", "mythical", "🛸"],
        ["Deep Angler", "mythical", "🎣"],
        ["Kraken Spawn", "secret", "🦑"],
        ["Abyssal Horror", "secret", "🕳️"],
        ["Ghost Ship Fish", "secret", "👻"],
        ["Siren's Lure", "secret", "🧜"],
        ["Leviathan", "ephemeral", "🌊"],
        ["Sea Serpent Lord", "ephemeral", "🐉"],
        ["Tidecaller", "ephemeral", "🌀"],
        ["Poseidon's Wrath", "unreal", "🔱"],
        ["World Ender Whale", "unreal", "🌌"],
        ["The Endless Deep", "unreal", "🕳️"]
    ]
}

// Metadata island — SEMUA GRATIS.
export const ISLANDS = {
    fisherman: {
        id: "fisherman",
        name: "Fisherman Island",
        emoji: "🎣",
        desc: "Pulau pemula. Danau tenang penuh ikan air tawar.",
        stone: false
    },
    coral: {
        id: "coral",
        name: "Coral Reefs",
        emoji: "🪸",
        desc: "Terumbu karang berwarna-warni, banyak ikan langka.",
        stone: false
    },
    vulcanic: {
        id: "vulcanic",
        name: "Vulcanic Sea",
        emoji: "🌋",
        desc: "Laut panas dekat gunung berapi. Ikan bernilai tinggi.",
        stone: false
    },
    sacred: {
        id: "sacred",
        name: "Sacred Jungle",
        emoji: "🌿",
        desc: "Hutan keramat. Bisa memancing Enchant Stone di sini!",
        stone: true // Enchant Stone (Epic) bisa dipancing di sini
    },
    sea: {
        id: "sea",
        name: "Sea",
        emoji: "🌊",
        desc: "Lautan luas & dalam. Rumah para makhluk legendaris.",
        stone: false
    },
    rock: {
        id: "rock",
        name: "Rock Island",
        emoji: "🪨",
        desc: "Pulau berbatu penuh mineral. Rumah Amplifier Fish.",
        stone: false
    },
    haunted: {
        id: "haunted",
        name: "Haunted Sea",
        emoji: "👻",
        desc: "Laut angker. Mutasi Ghost jauh lebih sering muncul!",
        stone: false,
        ghostBoost: 6 // pengali chance mutasi ghost saat mancing di sini
    }
}

export const ISLAND_ORDER = ["fisherman", "coral", "vulcanic", "sacred", "sea", "rock", "haunted"]
export const DEFAULT_ISLAND = "fisherman"

// ─── Bangun katalog per-island ───
function buildCatalog() {
    const catalog = {}
    for (const island of ISLAND_ORDER) {
        const defs = ISLAND_FISH[island]
        catalog[island] = defs.map(([name, rarity, emoji], i) => {
            const cfg = RARITY[rarity]
            const t = defs.length > 1 ? i / (defs.length - 1) : 0
            const price = Math.round(cfg.price[0] + (cfg.price[1] - cfg.price[0]) * t)
            return {
                id: `${island}_${i}`,
                name,
                rarity,
                price,
                emoji: emoji || R_EMOJI[rarity],
                island,
                index: i + 1
            }
        })
    }
    return catalog
}

export const ISLAND_CATALOG = buildCatalog()

const FISH_BY_ID = {}
for (const island of ISLAND_ORDER) {
    for (const f of ISLAND_CATALOG[island]) FISH_BY_ID[f.id] = f
}

const POOL = {}
for (const island of ISLAND_ORDER) {
    POOL[island] = {}
    for (const f of ISLAND_CATALOG[island]) {
        ;(POOL[island][f.rarity] ||= []).push(f)
    }
}

export function raritiesInIsland(island) {
    return Object.keys(POOL[island] || {})
}
export function getFishById(id) {
    return FISH_BY_ID[id] || null
}
export function islandFishTotal(island) {
    return ISLAND_CATALOG[island]?.length || 0
}
export function fishIslandIndex(id) {
    return FISH_BY_ID[id]?.index || 0
}

// Urutan rarity dari TINGGI ke RENDAH (untuk fallback).
const HIGH_TO_LOW = [
    "unreal",
    "ephemeral",
    "secret",
    "mythical",
    "legendary",
    "epic",
    "rare",
    "uncommon",
    "common"
]

export function randomIslandFish(island, rarity) {
    const pool = POOL[island] || {}
    if (pool[rarity]?.length) {
        const arr = pool[rarity]
        return arr[Math.floor(Math.random() * arr.length)]
    }
    const startIdx = HIGH_TO_LOW.indexOf(rarity)
    for (let i = startIdx; i < HIGH_TO_LOW.length; i++) {
        if (pool[HIGH_TO_LOW[i]]?.length) {
            const arr = pool[HIGH_TO_LOW[i]]
            return arr[Math.floor(Math.random() * arr.length)]
        }
    }
    const any = Object.values(pool).flat()
    return any[Math.floor(Math.random() * any.length)] || null
}

// Rarity "langka" untuk pity (rare ke atas).
const RARE_PLUS = ["rare", "epic", "legendary", "mythical", "secret", "ephemeral", "unreal"]

/**
 * Roll rarity untuk island dengan luck & PITY (invisible).
 * @returns {{ rarity, pityBonus }}
 */
export function rollIslandRarity(island, luck = 1, pity = 0) {
    const available = raritiesInIsland(island)
    if (!available.length) return { rarity: "common", pityBonus: 1 }

    const pityBonus = 1 + Math.min(4, Math.floor(pity / 5) * 0.5)
    const totalLuck = luck * pityBonus

    const entries = available.map((r) => {
        let w = RARITY[r].weight
        if (RARE_PLUS.includes(r)) w *= totalLuck
        return [r, w]
    })
    const sum = entries.reduce((s, [, w]) => s + w, 0)
    let roll = Math.random() * sum
    for (const [r, w] of entries) {
        roll -= w
        if (roll <= 0) return { rarity: r, pityBonus }
    }
    return { rarity: available[0], pityBonus }
}

export function isRarePlus(rarity) {
    return RARE_PLUS.includes(rarity)
}

export default {
    ISLANDS,
    ISLAND_ORDER,
    DEFAULT_ISLAND,
    ISLAND_CATALOG,
    raritiesInIsland,
    getFishById,
    islandFishTotal,
    fishIslandIndex,
    randomIslandFish,
    rollIslandRarity,
    isRarePlus
}
