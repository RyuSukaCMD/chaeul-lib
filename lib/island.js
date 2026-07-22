// ═══════════════════════════════════════════════════════════
//  SISTEM ISLAND (pulau memancing)
//  Tiap island punya pool ikan sendiri (index per-island).
//  Island lama tetap kompatibel; island baru dibuka bertahap.
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
    unreal: "🌌",
    abnormal: "🧬",
    extinct: "🦴"
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
    ],
    // Hell's Gate — gerbang neraka, tempat rarity baru mulai muncul.
    hells_gate: [
        ["Hellfire Guppy", "common", "🔥"],
        ["Ash Minnow", "common", "🌫️"],
        ["Cinder Eel", "uncommon", "🔥"],
        ["Demon Carp", "uncommon", "😈"],
        ["Brimstone Bass", "rare", "🟡"],
        ["Inferno Pike", "rare", "🌋"],
        ["Lava Ray", "epic", "🌋"],
        ["Cerberus Koi", "epic", "🐕‍🦺"],
        ["Infernal Shark", "legendary", "🦈"],
        ["Hades Marlin", "legendary", "⚔️"],
        ["Underworld Serpent", "mythical", "🐍"],
        ["Sin Kraken", "secret", "🦑"],
        ["Hell's Warden", "secret", "👹"],
        ["Devil's Crown", "ephemeral", "👑"],
        ["Hell Gatekeeper", "unreal", "🚪"],
        ["Malformed Angler", "abnormal", "🧬"]
    ],
    // Heaven's Gate — laut suci dengan ikan bercahaya.
    heavens_gate: [
        ["Cloud Minnow", "common", "☁️"],
        ["Halo Guppy", "common", "😇"],
        ["Featherfish", "uncommon", "🪶"],
        ["Cherub Carp", "uncommon", "👼"],
        ["Aurora Bass", "rare", "🌌"],
        ["Celestial Eel", "rare", "✨"],
        ["Seraph Ray", "epic", "😇"],
        ["Sunbeam Koi", "epic", "☀️"],
        ["Angel Shark", "legendary", "🪽"],
        ["Astral Marlin", "legendary", "🌟"],
        ["Heavenly Dragonfish", "mythical", "🐉"],
        ["Throne Leviathan", "secret", "👑"],
        ["Seraphim Whale", "secret", "🐋"],
        ["Eternal Rainbow Ray", "ephemeral", "🌈"],
        ["God's Firstborn", "unreal", "⚜️"],
        ["Divine Anomaly", "abnormal", "🧬"]
    ],
    // Ancient Sea — laut purba, habitat makhluk yang seharusnya sudah punah.
    ancient_sea: [
        ["Primitive Minnow", "common", "🐟"],
        ["Fossil Guppy", "common", "🦴"],
        ["Trilobite Fish", "uncommon", "🪨"],
        ["Ancient Carp", "uncommon", "🏺"],
        ["Saber Bass", "rare", "🦷"],
        ["Mosasaur Eel", "rare", "🦎"],
        ["Plesiosaur Ray", "epic", "🌊"],
        ["Megalodon Fry", "epic", "🦈"],
        ["Titanoboa Fish", "legendary", "🐍"],
        ["Primeval Shark", "legendary", "🦈"],
        ["Elder Kraken", "mythical", "🦑"],
        ["Fossilized Leviathan", "secret", "🦴"],
        ["Chronos Whale", "secret", "⌛"],
        ["First Sea Serpent", "ephemeral", "🐉"],
        ["Extinct Megalodon", "abnormal", "🦈"],
        ["The Last Ancient", "extinct", "🦴"]
    ],
    // Dimensional Rift — ikan dari ruang yang rusak dan tidak stabil.
    dimensional_rift: [
        ["Rift Sprat", "common", "🌀"],
        ["Echo Guppy", "common", "🔊"],
        ["Folded Eel", "uncommon", "〰️"],
        ["Phase Carp", "uncommon", "🫥"],
        ["Paradox Bass", "rare", "♾️"],
        ["Portal Pike", "rare", "🌀"],
        ["Quantum Ray", "epic", "⚛️"],
        ["Fracture Squid", "epic", "🦑"],
        ["Rift Shark", "legendary", "🦈"],
        ["Timeline Marlin", "legendary", "⏳"],
        ["Dimension Serpent", "mythical", "🐍"],
        ["Null Kraken", "secret", "⬛"],
        ["Reality Eater", "secret", "👁️"],
        ["Infinite Leviathan", "ephemeral", "♾️"],
        ["Glitched Deity Fish", "abnormal", "👾"],
        ["The Unhappened", "extinct", "❔"]
    ],
    // Nebula Gateway — puncak progression, ikan kosmik dari luar semesta.
    nebula_gateway: [
        ["Stardust Minnow", "common", "✨"],
        ["Comet Guppy", "common", "☄️"],
        ["Cosmic Eel", "uncommon", "🌌"],
        ["Moon Carp", "uncommon", "🌙"],
        ["Solar Bass", "rare", "☀️"],
        ["Meteor Pike", "rare", "☄️"],
        ["Galaxy Ray", "epic", "🌌"],
        ["Supernova Squid", "epic", "💥"],
        ["Starforged Shark", "legendary", "🦈"],
        ["Quasar Marlin", "legendary", "⚡"],
        ["Nebula Dragon", "mythical", "🐉"],
        ["Black Hole Kraken", "secret", "🕳️"],
        ["Cosmic World Eater", "secret", "🌑"],
        ["Universal Leviathan", "ephemeral", "🌊"],
        ["Astral Abomination", "abnormal", "🧬"],
        ["Extinct Universe", "extinct", "🦴"],
        ["The Last Star", "extinct", "🌟"]
    ]
}

// Metadata island — pulau lama tetap langsung tersedia; island baru terbuka bertahap.
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
    },
    hells_gate: {
        id: "hells_gate",
        name: "Hell's Gate",
        emoji: "🔥",
        desc: "Gerbang neraka. Api abadi membakar laut dan ikan di dalamnya.",
        stone: false,
        mutationBoost: 1.15,
        unlockLevel: 8,
        unlockAfter: "haunted"
    },
    heavens_gate: {
        id: "heavens_gate",
        name: "Heaven's Gate",
        emoji: "☁️",
        desc: "Gerbang surga yang dipenuhi ikan suci dan cahaya.",
        stone: false,
        mutationBoost: 1.25,
        unlockLevel: 12,
        unlockAfter: "hells_gate"
    },
    ancient_sea: {
        id: "ancient_sea",
        name: "Ancient Sea",
        emoji: "🏺",
        desc: "Laut purba tempat makhluk yang telah punah masih berenang.",
        stone: false,
        mutationBoost: 1.4,
        unlockLevel: 16,
        unlockAfter: "heavens_gate"
    },
    dimensional_rift: {
        id: "dimensional_rift",
        name: "Dimensional Rift",
        emoji: "🌀",
        desc: "Retakan dimensi yang mengacaukan ruang, waktu, dan realitas.",
        stone: false,
        mutationBoost: 1.6,
        unlockLevel: 20,
        unlockAfter: "ancient_sea"
    },
    nebula_gateway: {
        id: "nebula_gateway",
        name: "Nebula Gateway",
        emoji: "🌌",
        desc: "Gerbang menuju nebula di ujung semesta. Area puncak memancing.",
        stone: false,
        mutationBoost: 2,
        unlockLevel: 25,
        unlockAfter: "dimensional_rift"
    }
}

export const ISLAND_ORDER = [
    "fisherman",
    "coral",
    "vulcanic",
    "sacred",
    "sea",
    "rock",
    "haunted",
    "hells_gate",
    "heavens_gate",
    "ancient_sea",
    "dimensional_rift",
    "nebula_gateway"
]
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

/**
 * Cek apakah player sudah boleh masuk ke sebuah island.
 * Island lama tetap kompatibel dan selalu terbuka. Island baru memakai level
 * minimum + satu tangkapan di island sebelumnya agar progression tetap urut.
 */
export function islandUnlocked(player, island) {
    const info = ISLANDS[island]
    if (!info) return false
    if (!info.unlockLevel && !info.unlockAfter) return true
    if ((player?.level || 1) < info.unlockLevel) return false
    if (!info.unlockAfter) return true
    const previousFish = ISLAND_CATALOG[info.unlockAfter] || []
    return previousFish.some((fish) => player?.dex?.[fish.id])
}

export function islandUnlockText(player, island) {
    const info = ISLANDS[island]
    if (!info || islandUnlocked(player, island)) return "Terbuka"
    const level = info.unlockLevel ? `Level ${info.unlockLevel}` : "syarat khusus"
    const previous = info.unlockAfter ? ISLANDS[info.unlockAfter]?.name : "island sebelumnya"
    return `${level} + tangkap 1 ikan di ${previous}`
}

// Urutan rarity dari TINGGI ke RENDAH (untuk fallback).
const HIGH_TO_LOW = [
    "extinct",
    "abnormal",
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
const RARE_PLUS = [
    "rare",
    "epic",
    "legendary",
    "mythical",
    "secret",
    "ephemeral",
    "unreal",
    "abnormal",
    "extinct"
]

/**
 * Roll rarity untuk island dengan luck & PITY (invisible).
 * modifiers.newRarityBoost khusus menaikkan peluang Abnormal/Extinct.
 * @returns {{ rarity, pityBonus }}
 */
export function rollIslandRarity(island, luck = 1, pity = 0, modifiers = {}) {
    const available = raritiesInIsland(island)
    if (!available.length) return { rarity: "common", pityBonus: 1 }

    const pityBonus = 1 + Math.min(4, Math.floor(pity / 5) * 0.5)
    const totalLuck = luck * pityBonus
    const newRarityBoost = Math.max(1, modifiers.newRarityBoost || 1)

    const entries = available.map((r) => {
        let w = RARITY[r].weight
        if (RARE_PLUS.includes(r)) w *= totalLuck
        if (["abnormal", "extinct"].includes(r)) w *= newRarityBoost
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
    islandUnlocked,
    islandUnlockText,
    randomIslandFish,
    rollIslandRarity,
    isRarePlus
}
