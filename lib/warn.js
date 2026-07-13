import { readJSON, writeJSON } from "./db.js"

// Struktur: { "<groupJid>": { "<number>": count } }
const DB = "./database/warn.json"

// Batas warn sebelum di-kick
export const WARN_LIMIT = 3

function norm(jid = "") {
    return String(jid).replace(/[^0-9]/g, "")
}

function load() {
    return readJSON(DB, {})
}

function save(data) {
    writeJSON(DB, data)
}

/** Ambil jumlah warn user di sebuah grup. */
export function getWarn(group, jid) {
    const db = load()
    return db[group]?.[norm(jid)] || 0
}

/** Tambah warn (+amount). Mengembalikan jumlah warn terbaru. */
export function addWarn(group, jid, amount = 1) {
    const db = load()
    const num = norm(jid)
    if (!db[group]) db[group] = {}
    db[group][num] = (db[group][num] || 0) + amount
    save(db)
    return db[group][num]
}

/** Kurangi warn (-amount, minimal 0). Mengembalikan jumlah terbaru. */
export function reduceWarn(group, jid, amount = 1) {
    const db = load()
    const num = norm(jid)
    if (!db[group]) return 0
    db[group][num] = Math.max(0, (db[group][num] || 0) - amount)
    const value = db[group][num]
    if (value === 0) delete db[group][num]
    save(db)
    return value
}

/** Reset warn user di grup menjadi 0. */
export function resetWarn(group, jid) {
    const db = load()
    const num = norm(jid)
    if (db[group]?.[num] != null) {
        delete db[group][num]
        save(db)
    }
}

/** Daftar warn di sebuah grup: [{ number, count }]. */
export function listWarn(group) {
    const db = load()
    const g = db[group] || {}
    return Object.entries(g).map(([number, count]) => ({ number, count }))
}

export default { WARN_LIMIT, getWarn, addWarn, reduceWarn, resetWarn, listWarn }
