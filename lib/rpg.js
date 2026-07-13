import { readJSON, writeJSON } from "./db.js"

// Data RPG per-user. Struktur:
//   { "<number>": { money, hp, maxhp, level, xp, weapon, inventory:{item:qty}, lastJob } }
const DB = "./database/rpg.json"

export const MAX_HP = 100
export const JOB_COOLDOWN = 60 * 1000 // 1 menit
export const STARTER_MONEY = 100

// Katalog toko: senjata (atk), armor (def/maxhp), potion (heal)
export const SHOP = {
    // Senjata
    kayu: { name: "Pedang Kayu", type: "weapon", atk: 10, price: 150, emoji: "🗡️" },
    besi: { name: "Pedang Besi", type: "weapon", atk: 25, price: 500, emoji: "⚔️" },
    naga: { name: "Pedang Naga", type: "weapon", atk: 50, price: 2000, emoji: "🐉" },
    // Potion
    potion: { name: "Potion HP", type: "potion", heal: 50, price: 100, emoji: "🧪" },
    megapotion: { name: "Mega Potion", type: "potion", heal: 100, price: 250, emoji: "⚗️" }
}

function norm(jid = "") {
    return String(jid).replace(/[^0-9]/g, "")
}

function load() {
    return readJSON(DB, {})
}

function save(data) {
    writeJSON(DB, data)
}

/** Ambil / buat data RPG user. */
export function getPlayer(jid) {
    const db = load()
    const key = norm(jid)
    if (!db[key]) {
        db[key] = {
            money: STARTER_MONEY,
            hp: MAX_HP,
            maxhp: MAX_HP,
            level: 1,
            xp: 0,
            weapon: null,
            inventory: {},
            lastJob: 0
        }
        save(db)
    }
    // Lengkapi field yang mungkin belum ada (kompatibilitas)
    return {
        money: 0,
        hp: MAX_HP,
        maxhp: MAX_HP,
        level: 1,
        xp: 0,
        weapon: null,
        inventory: {},
        lastJob: 0,
        ...db[key]
    }
}

/** Simpan sebagian data player. */
export function updatePlayer(jid, patch) {
    const db = load()
    const key = norm(jid)
    const cur = db[key] || getPlayer(jid)
    db[key] = { ...cur, ...patch }
    save(db)
    return db[key]
}

// ─── Money ───
export function getMoney(jid) {
    return getPlayer(jid).money || 0
}

export function addMoney(jid, amount) {
    const p = getPlayer(jid)
    return updatePlayer(jid, { money: Math.max(0, (p.money || 0) + amount) }).money
}

/** Transfer money antar user (mis. hasil duel). Return true bila cukup. */
export function transferMoney(from, to, amount) {
    const pf = getPlayer(from)
    if ((pf.money || 0) < amount) return false
    addMoney(from, -amount)
    addMoney(to, amount)
    return true
}

// ─── XP / Level ───
export function addXp(jid, amount) {
    const p = getPlayer(jid)
    let xp = (p.xp || 0) + amount
    let level = p.level || 1
    let maxhp = p.maxhp || MAX_HP
    // Naik level tiap 100*level xp
    while (xp >= level * 100) {
        xp -= level * 100
        level++
        maxhp += 20
    }
    return updatePlayer(jid, { xp, level, maxhp })
}

// ─── HP ───
export function setHp(jid, hp) {
    const p = getPlayer(jid)
    return updatePlayer(jid, { hp: Math.max(0, Math.min(p.maxhp || MAX_HP, hp)) })
}

export function healFull(jid) {
    const p = getPlayer(jid)
    return updatePlayer(jid, { hp: p.maxhp || MAX_HP })
}

// ─── Inventory ───
export function addItem(jid, itemId, qty = 1) {
    const p = getPlayer(jid)
    const inv = { ...(p.inventory || {}) }
    inv[itemId] = (inv[itemId] || 0) + qty
    return updatePlayer(jid, { inventory: inv })
}

export function useItem(jid, itemId, qty = 1) {
    const p = getPlayer(jid)
    const inv = { ...(p.inventory || {}) }
    if ((inv[itemId] || 0) < qty) return false
    inv[itemId] -= qty
    if (inv[itemId] <= 0) delete inv[itemId]
    updatePlayer(jid, { inventory: inv })
    return true
}

/** Serangan senjata yang dimiliki (atk). Default tinju 5. */
export function getAtk(jid) {
    const p = getPlayer(jid)
    const w = p.weapon && SHOP[p.weapon] ? SHOP[p.weapon].atk : 5
    return w
}

export default {
    MAX_HP,
    JOB_COOLDOWN,
    STARTER_MONEY,
    SHOP,
    getPlayer,
    updatePlayer,
    getMoney,
    addMoney,
    transferMoney,
    addXp,
    setHp,
    healFull,
    addItem,
    useItem,
    getAtk
}
