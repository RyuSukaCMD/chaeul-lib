// ═══════════════════════════════════════════════════════════
//  SISTEM ISLAND (pulau memancing)
//  Tiap island punya pool ikan sendiri (index per-island).
//  Ikan tetap punya rarity untuk menentukan bobot & harga.
// ═══════════════════════════════════════════════════════════
import { RARITY, PHASE_RARITIES } from "./fish.js"

// Emoji per rarity (dipakai untuk display ikan island).
const R_EMOJI = {
    common: "🐟",
    uncommon: "🐠",
    rare: "🐡",
    legendary: "🦈",
    mythical: "🐉",
    unreal: "🌌",
    ephemeral: "🌈",
    godly: "✨"
}

// Definisi ikan tiap island: [name, rarity, emoji?]
// (emoji opsional; default ikut rarity)
const ISLAND_FISH = {
    fisherman: [
        ["Anchovy", "common", "🐟"],
        ["Sardine", "common", "🐟"],
        ["Goldfish", "common", "🐠"],
        ["Carp", "common", "🐟"],
        ["Catfish", "common", "🐟"],
        ["Tilapia", "common", "🐟"],
        ["Bluegill", "uncommon", "🐠"],
        ["Bass", "uncommon", "🐠"],
        ["Trout", "uncommon", "🐟"],
        ["Pike", "rare", "🐡"],
        ["Golden Carp", "legendary", "🥇"],
        ["Old Pond King", "mythical", "🐉"]
    ],
    coral: [
        ["Clownfish", "common", "🐠"],
        ["Damselfish", "common", "🐠"],
        ["Wrasse", "common", "🐠"],
        ["Butterflyfish", "common", "🦋"],
        ["Angelfish", "common", "🐠"],
        ["Parrotfish", "uncommon", "🦜"],
        ["Tang", "uncommon", "🐠"],
        ["Triggerfish", "uncommon", "🐠"],
        ["Pufferfish", "uncommon", "🐡"],
        ["Lionfish", "uncommon", "🦁"],
        ["Moray Eel", "rare", "🐍"],
        ["Seahorse", "rare", "🐴"],
        ["Reef Shark", "rare", "🦈"],
        ["Napoleon Wrasse", "rare", "🐠"],
        ["Manta Ray", "legendary", "🛸"],
        ["Giant Clam", "legendary", "🐚"],
        ["Hammerhead", "legendary", "🦈"],
        ["Coral Guardian", "legendary", "🪸"],
        ["Rainbow Reef Fish", "mythical", "🌈"],
        ["Coral Dragon", "mythical", "🐉"],
        ["Abyss Angler", "mythical", "🎣"],
        ["Reef Leviathan", "unreal", "🌌"],
        ["Prismatic Ray", "unreal", "🌌"],
        ["Eternal Nautilus", "ephemeral", "🌈"],
        ["Poseidon's Pet", "godly", "✨"]
    ],
    vulcanic: [
        ["Lava Eel", "uncommon", "🌋"],
        ["Ember Fish", "uncommon", "🔥"],
        ["Magma Ray", "rare", "🔥"],
        ["Obsidian Bass", "rare", "⬛"],
        ["Cinder Shark", "legendary", "🦈"],
        ["Volcano Serpent", "mythical", "🐉"],
        ["Phoenix Koi", "unreal", "🔥"]
    ],
    sacred: [
        ["Jungle Guppy", "common", "🌿"],
        ["Mossback Fish", "common", "🌿"],
        ["Vine Eel", "common", "🐍"],
        ["Temple Carp", "uncommon", "🛕"],
        ["Jade Fish", "uncommon", "💚"],
        ["Spirit Koi", "uncommon", "🎐"],
        ["Golden Idol Fish", "rare", "🗿"],
        ["Runed Bass", "rare", "🔱"],
        ["Sacred Turtle", "rare", "🐢"],
        ["Ancient Guardian Fish", "legendary", "🛡️"],
        ["Forest Dragon", "legendary", "🐉"],
        ["Jungle Wyrm", "mythical", "🐉"],
        ["Spirit Leviathan", "unreal", "🌌"],
        ["Worldtree Fish", "ephemeral", "🌈"],
        ["Gaia's Blessing", "godly", "✨"]
    ]
}

// Metadata island.
export const ISLANDS = {
    fisherman: {
        id: "fisherman",
        name: "Fisherman Island",
        emoji: "🎣",
        desc: "Pulau pemula. Danau tenang penuh ikan air tawar.",
        unlockPrice: 0, // default / starter
        rareStoneChance: 0 // peluang drop RARE enchant stone
    },
    coral: {
        id: "coral",
        name: "Coral Reefs",
        emoji: "🪸",
        desc: "Terumbu karang berwarna-warni, banyak ikan langka.",
        unlockPrice: 5000,
        rareStoneChance: 0
    },
    vulcanic: {
        id: "vulcanic",
        name: "Vulcanic Sea",
        emoji: "🌋",
        desc: "Laut panas dekat gunung berapi. Ikan sedikit tapi bernilai.",
        unlockPrice: 15000,
        rareStoneChance: 0
    },
    sacred: {
        id: "sacred",
        name: "Sacred Jungle",
        emoji: "🌿",
        desc: "Hutan keramat. Ada peluang mendapat RARE Enchant Stone!",
        unlockPrice: 30000,
        rareStoneChance: 0.05 // 5% dapat rare enchant stone saat mancing
    }
}

export const ISLAND_ORDER = ["fisherman", "coral", "vulcanic", "sacred"]
export const DEFAULT_ISLAND = "fisherman"

// ─── Bangun katalog per-island (dengan id, price, index) ───
function buildCatalog() {
    const catalog = {}
    for (const island of ISLAND_ORDER) {
        const defs = ISLAND_FISH[island]
        catalog[island] = defs.map(([name, rarity, emoji], i) => {
            const cfg = RARITY[rarity]
            // Harga acak dalam rentang rarity (deterministik via posisi)
            const t = defs.length > 1 ? i / (defs.length - 1) : 0
            const price = Math.round(cfg.price[0] + (cfg.price[1] - cfg.price[0]) * t)
            return {
                id: `${island}_${i}`,
                name,
                rarity,
                price,
                emoji: emoji || R_EMOJI[rarity],
                island,
                index: i + 1 // index per-island (1-based)
            }
        })
    }
    return catalog
}

export const ISLAND_CATALOG = buildCatalog()

// Peta id ikan → objek ikan (semua island).
const FISH_BY_ID = {}
for (const island of ISLAND_ORDER) {
    for (const f of ISLAND_CATALOG[island]) FISH_BY_ID[f.id] = f
}

// Pool per (island, rarity) untuk random cepat.
const POOL = {}
for (const island of ISLAND_ORDER) {
    POOL[island] = {}
    for (const f of ISLAND_CATALOG[island]) {
        ;(POOL[island][f.rarity] ||= []).push(f)
    }
}

/** Daftar rarity yang benar-benar ada di sebuah island. */
export function raritiesInIsland(island) {
    return Object.keys(POOL[island] || {})
}

/** Ambil objek ikan berdasarkan id (lintas island). */
export function getFishById(id) {
    return FISH_BY_ID[id] || null
}

/** Total ikan di sebuah island. */
export function islandFishTotal(island) {
    return ISLAND_CATALOG[island]?.length || 0
}

/** Index ikan (1-based) di island-nya. */
export function fishIslandIndex(id) {
    return FISH_BY_ID[id]?.index || 0
}

/**
 * Pilih ikan acak di sebuah island dengan rarity tertentu.
 * Bila island tidak punya rarity itu, turunkan ke rarity tertinggi yang ada.
 */
export function randomIslandFish(island, rarity) {
    const pool = POOL[island] || {}
    if (pool[rarity]?.length) {
        const arr = pool[rarity]
        return arr[Math.floor(Math.random() * arr.length)]
    }
    // Fallback: cari rarity terdekat yang tersedia (turun ke bawah)
    const order = [
        "godly",
        "ephemeral",
        "unreal",
        "mythical",
        "legendary",
        "rare",
        "uncommon",
        "common"
    ]
    const startIdx = order.indexOf(rarity)
    for (let i = startIdx; i < order.length; i++) {
        if (pool[order[i]]?.length) {
            const arr = pool[order[i]]
            return arr[Math.floor(Math.random() * arr.length)]
        }
    }
    // Terakhir: rarity apa pun yang ada
    const any = Object.values(pool).flat()
    return any[Math.floor(Math.random() * any.length)] || null
}

// Rarity yang dianggap "langka" untuk keperluan pity.
const RARE_PLUS = ["rare", "legendary", "mythical", "unreal", "ephemeral", "godly"]

/**
 * Roll rarity untuk sebuah island dengan mempertimbangkan luck & PITY.
 *
 * PITY (invisible): makin banyak roll berturut tanpa dapat rare+,
 * makin besar bonus luck. Setiap 5 kegagalan menambah +0.5 luck,
 * dipuncaki agar tetap wajar.
 *
 * @param {string} island
 * @param {number} luck  pengali luck (rod × event × dll)
 * @param {number} pity  jumlah roll berturut tanpa rare+ (dari player.pity)
 * @returns {{ rarity:string, pityBonus:number }}
 */
export function rollIslandRarity(island, luck = 1, pity = 0) {
    const available = raritiesInIsland(island)
    if (!available.length) return { rarity: "common", pityBonus: 1 }

    // Bonus luck dari pity: tiap 5 gagal → +0.5, maks +4
    const pityBonus = 1 + Math.min(4, Math.floor(pity / 5) * 0.5)
    const totalLuck = luck * pityBonus

    // Susun bobot hanya untuk rarity yang ADA di island ini.
    const entries = available.map((r) => {
        let w = RARITY[r].weight
        // Luck menaikkan bobot rarity langka (rare+ & phase rarities).
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

/** Apakah rarity termasuk rare+ (untuk reset pity). */
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
