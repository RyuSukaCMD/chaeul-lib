import { readJSON, writeJSON } from "./db.js"

// ═══════════════════════════════════════════════════════════
//  SISTEM RPG CHAEUL — data per-user
//  { money, bank, hp, level, xp, energy, weapon, armor,
//    inventory:{id:qty}, cd:{job,hunt,fish,daily} }
// ═══════════════════════════════════════════════════════════
const DB = "./database/rpg.json"

export const CONFIG = {
    startMoney: 250,
    baseHp: 100,
    baseEnergy: 20,
    hpPerLevel: 15,
    fishCooldown: 30 * 1000,
    jobCooldown: 60 * 1000,
    huntCooldown: 90 * 1000,
    dailyCooldown: 24 * 60 * 60 * 1000
}

// ─── Katalog Item ───
// type: weapon | armor | potion | rod | bait | fish | misc | material
export const ITEMS = {
    // Senjata (atk)
    dagger: { name: "Belati", type: "weapon", atk: 12, price: 300, emoji: "🔪" },
    sword: { name: "Pedang Besi", type: "weapon", atk: 28, price: 900, emoji: "⚔️" },
    katana: { name: "Katana", type: "weapon", atk: 45, price: 2500, emoji: "🗡️" },
    dragon: { name: "Dragon Blade", type: "weapon", atk: 75, price: 8000, emoji: "🐉" },

    // Armor (def = kurangi damage)
    leather: { name: "Armor Kulit", type: "armor", def: 8, price: 400, emoji: "🥋" },
    iron: { name: "Armor Besi", type: "armor", def: 18, price: 1200, emoji: "🛡️" },
    mythic: { name: "Armor Mythic", type: "armor", def: 35, price: 6000, emoji: "✨" },

    // Weapon lanjutan
    excalibur: { name: "Excalibur", type: "weapon", atk: 120, price: 20000, emoji: "🌟" },

    // Armor lanjutan
    dragonarmor: { name: "Dragon Armor", type: "armor", def: 55, price: 15000, emoji: "🐲" },

    // Potion (heal)
    potion: { name: "Potion", type: "potion", heal: 50, price: 120, emoji: "🧪" },
    hipotion: { name: "Hi-Potion", type: "potion", heal: 120, price: 300, emoji: "⚗️" },
    megapotion: { name: "Mega Potion", type: "potion", heal: 300, price: 700, emoji: "🍶" },
    elixir: { name: "Elixir (Full Heal)", type: "potion", heal: 99999, price: 1500, emoji: "🏺" },
    revive: { name: "Revive", type: "potion", heal: 99999, price: 2500, emoji: "💗" },

    // Pancing (rod → luck menaikkan peluang ikan langka; reel mengurangi
    // jumlah button & mempercepat waktu tunggu saat mancing)
    rod: { name: "Pancing Kayu", type: "rod", luck: 1, reel: 0, price: 0, emoji: "🎣" },
    prorod: { name: "Pancing Baja", type: "rod", luck: 1.5, reel: 1, price: 2000, emoji: "🎏" },
    goldrod: { name: "Pancing Emas", type: "rod", luck: 2.5, reel: 2, price: 8000, emoji: "🥇" },
    diamondrod: {
        name: "Pancing Berlian",
        type: "rod",
        luck: 4,
        reel: 3,
        price: 25000,
        emoji: "💎"
    },
    // Rod QUEST (tidak dijual — hanya dari quest, price null)
    guitarrod: {
        name: "Rock'in Guitar",
        type: "rod",
        luck: 5.5,
        reel: 4,
        price: null,
        emoji: "🎸",
        quest: true
    },
    nightmarerod: {
        name: "Nightmare Catcher",
        type: "rod",
        luck: 7.5,
        reel: 5,
        price: null,
        emoji: "🌙",
        quest: true
    },
    voidrod: {
        name: "Void Reaper",
        type: "rod",
        luck: 10,
        reel: 6,
        price: null,
        emoji: "🕳️",
        quest: true
    },
    hellswand: {
        name: "Hell's Wand",
        type: "rod",
        luck: 12,
        reel: 7,
        price: null,
        emoji: "🔥",
        quest: true
    },
    heavenswand: {
        name: "Heaven's Wand",
        type: "rod",
        luck: 15,
        reel: 8,
        price: null,
        emoji: "☁️",
        quest: true
    },
    infinityrod: {
        name: "Infinity Rod",
        type: "rod",
        luck: 19,
        reel: 9,
        price: null,
        emoji: "♾️",
        quest: true
    },
    exoticrod: {
        name: "Exotic Rod",
        type: "rod",
        luck: 24,
        reel: 10,
        price: null,
        emoji: "🧬",
        quest: true
    },
    charmerrod: {
        name: "Charmer Rod",
        type: "rod",
        luck: 30,
        reel: 11,
        price: null,
        emoji: "💖",
        quest: true
    },

    // Bait (dikonsumsi 1 setiap mulai memancing)
    normalbait: {
        name: "Normal Bait",
        type: "bait",
        price: 0,
        emoji: "🪱",
        rarityLuck: 1,
        mutationBoost: 1,
        newRarityBoost: 1
    },
    upgradedbait: {
        name: "Upgraded Bait",
        type: "bait",
        price: 150,
        emoji: "🪱",
        rarityLuck: 1.12,
        mutationBoost: 1.25,
        newRarityBoost: 1
    },
    goldenbait: {
        name: "Golden Bait",
        type: "bait",
        price: 450,
        emoji: "✨",
        rarityLuck: 1.3,
        mutationBoost: 1.5,
        newRarityBoost: 1.1
    },
    ancientbait: {
        name: "Ancient Bait",
        type: "bait",
        price: 1200,
        emoji: "🏺",
        rarityLuck: 1.55,
        mutationBoost: 1.9,
        newRarityBoost: 1.35
    },
    voidbait: {
        name: "Void Bait",
        type: "bait",
        price: 3500,
        emoji: "🕳️",
        rarityLuck: 1.9,
        mutationBoost: 2.5,
        newRarityBoost: 1.8
    },

    // Energy & misc
    energydrink: { name: "Minuman Energi", type: "misc", energy: 10, price: 200, emoji: "⚡" },
    energybar: { name: "Energy Bar", type: "misc", energy: 30, price: 500, emoji: "🍫" },
    baitbox: { name: "Kotak Umpan", type: "misc", price: 800, emoji: "🪱" },
    luckyclover: { name: "Lucky Clover", type: "misc", price: 3000, emoji: "🍀" },

    // Bahan quest (tidak dijual)
    holystring: {
        name: "Holy String",
        type: "material",
        price: null,
        emoji: "🎼",
        quest: true
    }
}

// Katalog ikan & mutation kini ada di lib/fish.js

function norm(jid = "") {
    return String(jid).replace(/[^0-9]/g, "")
}
function load() {
    return readJSON(DB, {})
}
function save(d) {
    writeJSON(DB, d)
}

function fresh() {
    return {
        money: CONFIG.startMoney,
        bank: 0,
        hp: CONFIG.baseHp,
        level: 1,
        xp: 0,
        energy: CONFIG.baseEnergy,
        weapon: null,
        armor: null,
        rod: "rod", // pancing yang dipakai (default kayu)
        bait: "normalbait", // umpan aktif
        inventory: { rod: 1, normalbait: 10 }, // pancing kayu + starter bait gratis
        cd: {},
        island: "fisherman", // island aktif (default starter)
        enchants: {}, // enchant per-rod: { rodId: enchantId }
        pity: {}, // pity counter per-rarity (invisible)
        favs: {}, // ikan favorit (tidak bisa dijual)
        qstat: {}, // statistik untuk quest (counter)
        quests: {}, // quest yang sudah selesai: { questId: true }
        activeQuest: null // quest yang sedang dijalankan (id) atau null
    }
}

/** Ambil / buat data player (dilengkapi field default). */
export function getPlayer(jid) {
    const db = load()
    const key = norm(jid)
    if (!db[key]) {
        db[key] = fresh()
        save(db)
    }
    const storedInventory = { ...(db[key].inventory || {}) }
    // Migrasi ringan: player lama mendapat 10 Normal Bait satu kali secara
    // virtual (setelah inventory disimpan, jumlahnya tidak akan muncul lagi).
    if (!Object.prototype.hasOwnProperty.call(storedInventory, "normalbait")) {
        storedInventory.normalbait = 10
    }

    return {
        ...fresh(),
        ...db[key],
        cd: { ...(db[key].cd || {}) },
        inventory: storedInventory,
        pity: { ...(db[key].pity || {}) },
        favs: { ...(db[key].favs || {}) },
        enchants: { ...(db[key].enchants || {}) },
        qstat: { ...(db[key].qstat || {}) },
        quests: { ...(db[key].quests || {}) }
    }
}

export function updatePlayer(jid, patch) {
    const db = load()
    const key = norm(jid)
    const cur = db[key] || fresh()
    db[key] = { ...cur, ...patch }
    save(db)
    return db[key]
}

// ─── Stat turunan ───
export function maxHp(p) {
    return CONFIG.baseHp + (p.level - 1) * CONFIG.hpPerLevel
}
export function maxEnergy(p) {
    return CONFIG.baseEnergy + (p.level - 1) * 2
}
export function getAtk(p) {
    const base = 5
    return base + (ITEMS[p.weapon]?.atk || 0) + Math.floor(p.level * 1.5)
}
export function getDef(p) {
    return ITEMS[p.armor]?.def || 0
}

// ─── Fishdex (koleksi ikan yang pernah ditangkap) ───
export function recordCatch(jid, fishId) {
    const p = getPlayer(jid)
    const dex = { ...(p.dex || {}) }
    const isNew = !dex[fishId]
    dex[fishId] = (dex[fishId] || 0) + 1
    const player = updatePlayer(jid, { dex })
    return { player, isNew, count: dex[fishId] }
}

// ─── Statistik quest (counter tangkapan tertentu) ───
// Key contoh: "secret@rock", "mut:ghost@legendary", "rarity:unreal", "fish:haunted_10"
export function bumpQStat(jid, key, amount = 1) {
    const p = getPlayer(jid)
    const qstat = { ...(p.qstat || {}) }
    qstat[key] = (qstat[key] || 0) + amount
    updatePlayer(jid, { qstat })
    return qstat[key]
}
export function getQStat(jid, key) {
    return getPlayer(jid).qstat?.[key] || 0
}

/** Catat statistik quest dari sebuah tangkapan. */
export function recordCatchStat(jid, { fishId, island, rarity, mutationId }) {
    bumpQStat(jid, `island:${island}`)
    bumpQStat(jid, `rarity:${rarity}`)
    bumpQStat(jid, `${rarity}@${island}`)
    bumpQStat(jid, `fish:${fishId}`)
    if (mutationId) {
        bumpQStat(jid, `mut:${mutationId}`)
        bumpQStat(jid, `mut:${mutationId}@${rarity}`)
        bumpQStat(jid, `mut:${mutationId}@${island}`)
        bumpQStat(jid, `mut:${mutationId}@${rarity}@${island}`)
    }
}

// ─── Quest selesai ───
// Quest aktif (yang sedang dijalankan)
export function getActiveQuest(jid) {
    return getPlayer(jid).activeQuest || null
}
export function setActiveQuest(jid, questId) {
    return updatePlayer(jid, { activeQuest: questId })
}

export function isQuestDone(jid, questId) {
    return !!getPlayer(jid).quests?.[questId]
}
export function markQuestDone(jid, questId) {
    const p = getPlayer(jid)
    const quests = { ...(p.quests || {}), [questId]: true }
    return updatePlayer(jid, { quests })
}
export function getDex(jid) {
    return getPlayer(jid).dex || {}
}

/**
 * Ikan TERLANGKA yang pernah ditangkap user (dari fishdex/all-time).
 * Return { fish, rarity, rank, count } atau null bila belum pernah nangkap.
 * (import island & fish di dalam agar tidak circular.)
 */
export async function getRarestCatch(jid) {
    const dex = getDex(jid)
    const ids = Object.keys(dex)
    if (!ids.length) return null
    const { getFishById } = await import("./island.js")
    const { RARITY_ORDER } = await import("./fish.js")
    const rank = (r) => {
        const i = RARITY_ORDER.indexOf(r)
        return i < 0 ? 0 : i
    }
    let best = null
    for (const id of ids) {
        const fish = getFishById(id)
        if (!fish) continue
        const rr = rank(fish.rarity)
        if (!best || rr > best.rank) {
            best = { fish, rarity: fish.rarity, rank: rr, count: dex[id] || 1 }
        }
    }
    return best
}

// ─── Rod (pancing) ───
export function getRod(p) {
    return ITEMS[p.rod] && ITEMS[p.rod].type === "rod" ? p.rod : "rod"
}
export function rodLuck(p) {
    return ITEMS[getRod(p)]?.luck || 1
}
export function rodReel(p) {
    return ITEMS[getRod(p)]?.reel || 0
}

// ─── Bait / umpan ───
export function getBait(jid) {
    const p = getPlayer(jid)
    const inv = p.inventory || {}
    const selected = ITEMS[p.bait]?.type === "bait" ? p.bait : "normalbait"
    const id = (inv[selected] || 0) > 0 ? selected : (inv.normalbait || 0) > 0 ? "normalbait" : null
    return id ? { id, ...ITEMS[id], qty: inv[id] || 0, selected: id === selected } : null
}

export function setBait(jid, baitId) {
    const p = getPlayer(jid)
    if (ITEMS[baitId]?.type !== "bait" || !(p.inventory?.[baitId] > 0)) return false
    updatePlayer(jid, { bait: baitId })
    return true
}

export function consumeBait(jid, baitId = null) {
    const bait = baitId || getBait(jid)?.id
    if (!bait || !removeItem(jid, bait, 1)) return false
    // Kalau bait aktif habis, pemancingan berikutnya otomatis memakai Normal Bait.
    const p = getPlayer(jid)
    if (!(p.inventory?.[p.bait] > 0) && (p.inventory?.normalbait || 0) > 0)
        updatePlayer(jid, { bait: "normalbait" })
    return true
}

// ─── Island (pulau baru terbuka bertahap) ───
export function getIsland(jid) {
    return getPlayer(jid).island || "fisherman"
}
export function setIsland(jid, island) {
    return updatePlayer(jid, { island })
}

// ─── Enchant (per-rod) ───
// Disimpan di player.enchants = { "<rodId>": "<enchantId>" }.
// getEnchantId() = enchant pada rod yang SEDANG dipakai (untuk buff mancing).
export function getEnchantOf(jid, rodId) {
    return getPlayer(jid).enchants?.[rodId] || null
}
export function getEnchantId(jid) {
    const p = getPlayer(jid)
    return p.enchants?.[getRod(p)] || null
}
export function setEnchantOf(jid, rodId, enchantId) {
    const p = getPlayer(jid)
    const enchants = { ...(p.enchants || {}) }
    if (enchantId) enchants[rodId] = enchantId
    else delete enchants[rodId]
    return updatePlayer(jid, { enchants })
}

// ─── Favorite ikan (biar tidak kejual) ───
// Disimpan sebagai set id ikan (tanpa suffix mutation) → { "<fishId>": true }
export function getFavs(jid) {
    return getPlayer(jid).favs || {}
}
export function isFav(jid, fishId) {
    return !!getPlayer(jid).favs?.[fishId]
}
export function addFav(jid, fishId) {
    const p = getPlayer(jid)
    const favs = { ...(p.favs || {}) }
    favs[fishId] = true
    updatePlayer(jid, { favs })
    return true
}
export function removeFav(jid, fishId) {
    const p = getPlayer(jid)
    const favs = { ...(p.favs || {}) }
    if (!favs[fishId]) return false
    delete favs[fishId]
    updatePlayer(jid, { favs })
    return true
}

// ─── Pity (invisible) — counter per rarity ───
export function getPity(jid, key) {
    return getPlayer(jid).pity?.[key] || 0
}
export function bumpPity(jid, key, amount = 1) {
    const p = getPlayer(jid)
    const pity = { ...(p.pity || {}) }
    pity[key] = (pity[key] || 0) + amount
    updatePlayer(jid, { pity })
    return pity[key]
}
export function resetPity(jid, key) {
    const p = getPlayer(jid)
    const pity = { ...(p.pity || {}) }
    pity[key] = 0
    updatePlayer(jid, { pity })
}

// ─── Money & Bank ───
export function getMoney(jid) {
    return getPlayer(jid).money || 0
}
export function addMoney(jid, amount) {
    const p = getPlayer(jid)
    return updatePlayer(jid, { money: Math.max(0, (p.money || 0) + amount) }).money
}
export function transferMoney(from, to, amount) {
    if (getMoney(from) < amount) return false
    addMoney(from, -amount)
    addMoney(to, amount)
    return true
}

// ─── XP / Level ───
export function addXp(jid, amount) {
    const p = getPlayer(jid)
    let xp = (p.xp || 0) + amount
    let level = p.level || 1
    let leveled = 0
    while (xp >= level * 120) {
        xp -= level * 120
        level++
        leveled++
    }
    const np = updatePlayer(jid, { xp, level })
    // Naik level → HP penuh
    if (leveled) updatePlayer(jid, { hp: maxHp(np) })
    return { player: getPlayer(jid), leveled }
}

// ─── HP / Energy ───
export function setHp(jid, hp) {
    const p = getPlayer(jid)
    return updatePlayer(jid, { hp: Math.max(0, Math.min(maxHp(p), hp)) })
}
export function useEnergy(jid, amount) {
    const p = getPlayer(jid)
    if ((p.energy || 0) < amount) return false
    updatePlayer(jid, { energy: p.energy - amount })
    return true
}
export function addEnergy(jid, amount) {
    const p = getPlayer(jid)
    return updatePlayer(jid, { energy: Math.min(maxEnergy(p), (p.energy || 0) + amount) }).energy
}

// ─── Inventory ───
export function addItem(jid, id, qty = 1) {
    const p = getPlayer(jid)
    const inv = { ...p.inventory }
    inv[id] = (inv[id] || 0) + qty
    return updatePlayer(jid, { inventory: inv })
}
export function removeItem(jid, id, qty = 1) {
    const p = getPlayer(jid)
    const inv = { ...p.inventory }
    if ((inv[id] || 0) < qty) return false
    inv[id] -= qty
    if (inv[id] <= 0) {
        // Simpan 0 untuk Normal Bait agar migrasi player lama tidak
        // menghidupkan kembali stok gratis setiap kali memancing.
        if (id === "normalbait") inv[id] = 0
        else delete inv[id]
    }
    updatePlayer(jid, { inventory: inv })
    return true
}

// ─── Cooldown ───
export function cdLeft(jid, key, duration) {
    const p = getPlayer(jid)
    const last = p.cd?.[key] || 0
    return Math.max(0, duration - (Date.now() - last))
}
export function setCd(jid, key) {
    const p = getPlayer(jid)
    updatePlayer(jid, { cd: { ...p.cd, [key]: Date.now() } })
}

// ─── Leaderboard ───
export function leaderboard(limit = 10) {
    const db = load()
    return Object.entries(db)
        .map(([number, d]) => ({
            number,
            total: (d.money || 0) + (d.bank || 0),
            level: d.level || 1
        }))
        .sort((a, b) => b.total - a.total)
        .slice(0, limit)
}

export default {
    CONFIG,
    ITEMS,

    getPlayer,
    updatePlayer,
    maxHp,
    maxEnergy,
    getAtk,
    getDef,
    getRod,
    rodLuck,
    rodReel,
    getBait,
    setBait,
    consumeBait,
    recordCatch,
    recordCatchStat,
    bumpQStat,
    getQStat,
    isQuestDone,
    markQuestDone,
    getActiveQuest,
    setActiveQuest,
    getDex,
    getRarestCatch,
    getIsland,
    setIsland,
    getEnchantId,
    getEnchantOf,
    setEnchantOf,
    getFavs,
    isFav,
    addFav,
    removeFav,
    getPity,
    bumpPity,
    resetPity,
    getMoney,
    addMoney,
    transferMoney,
    addXp,
    setHp,
    useEnergy,
    addEnergy,
    addItem,
    removeItem,
    cdLeft,
    setCd,
    leaderboard
}
