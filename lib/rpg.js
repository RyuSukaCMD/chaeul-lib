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
// type: weapon | armor | potion | rod | fish | misc
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

    // Potion (heal)
    potion: { name: "Potion", type: "potion", heal: 50, price: 120, emoji: "🧪" },
    hipotion: { name: "Hi-Potion", type: "potion", heal: 120, price: 300, emoji: "⚗️" },

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

    // Energy
    energydrink: { name: "Minuman Energi", type: "misc", energy: 10, price: 200, emoji: "⚡" }
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
        inventory: { rod: 1 }, // pancing kayu gratis
        cd: {},
        island: "fisherman", // island aktif (default starter)
        enchants: {}, // enchant per-rod: { rodId: enchantId }
        pity: {}, // pity counter per-rarity (invisible)
        favs: {} // ikan favorit (tidak bisa dijual)
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
    return {
        ...fresh(),
        ...db[key],
        cd: { ...(db[key].cd || {}) },
        inventory: { ...(db[key].inventory || {}) },
        pity: { ...(db[key].pity || {}) },
        favs: { ...(db[key].favs || {}) },
        enchants: { ...(db[key].enchants || {}) }
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
export function getDex(jid) {
    return getPlayer(jid).dex || {}
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

// ─── Island (semua GRATIS diakses) ───
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
    if (inv[id] <= 0) delete inv[id]
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
    recordCatch,
    getDex,
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
