import { readJSON, writeJSON } from "./db.js"

// Daftar user premium disimpan sebagai array nomor (digit saja).
const DB = "./database/premium.json"

function norm(jid = "") {
    return String(jid).replace(/[^0-9]/g, "")
}

function load() {
    return readJSON(DB, [])
}

function save(data) {
    writeJSON(DB, data)
}

/** Cek apakah user premium. Owner otomatis dianggap premium. */
export function isPremium(jid) {
    const num = norm(jid)
    if (!num) return false
    if (global.owner?.some((o) => norm(o) === num)) return true
    return load().includes(num)
}

/** Tambah user premium. */
export function addPremium(jid) {
    const num = norm(jid)
    const db = load()
    if (!db.includes(num)) {
        db.push(num)
        save(db)
    }
    return num
}

/** Hapus user premium. */
export function delPremium(jid) {
    const num = norm(jid)
    const db = load()
    const next = db.filter((x) => x !== num)
    save(next)
    return db.length !== next.length
}

/** Daftar semua nomor premium. */
export function getPremiumList() {
    return load()
}

export default { isPremium, addPremium, delPremium, getPremiumList }
