import { readJSON, writeJSON } from "./db.js"

// ─── Premium (2 tipe + berbasis waktu) ───
// Skema baru (object):
//   { "<number>": { type: "full"|"basic", expired: 0|<timestamp> } }
//     - type "full"  : token tak terbatas + BYPASS antilink
//     - type "basic" : token tak terbatas, TAPI TETAP kena antilink
//     - expired 0    : permanen; selain itu = epoch ms kadaluarsa
//
// Skema lama (array of number) tetap didukung & otomatis dimigrasi
// menjadi premium "full" permanen.
const DB = "./database/premium.json"

function norm(jid = "") {
    return String(jid).replace(/[^0-9]/g, "")
}

// Muat + migrasi otomatis dari skema lama (array) ke skema baru (object)
function load() {
    const raw = readJSON(DB, {})
    if (Array.isArray(raw)) {
        const migrated = {}
        for (const n of raw) {
            const num = norm(n)
            if (num) migrated[num] = { type: "full", expired: 0 }
        }
        save(migrated)
        return migrated
    }
    return raw || {}
}

function save(data) {
    writeJSON(DB, data)
}

// Buang entri yang sudah kadaluarsa; kembalikan data bersih.
function clean(db) {
    let changed = false
    const now = Date.now()
    for (const num of Object.keys(db)) {
        const e = db[num]
        if (e && e.expired && e.expired !== 0 && now >= e.expired) {
            delete db[num]
            changed = true
        }
    }
    if (changed) save(db)
    return db
}

/** Ambil data premium (setelah cek kadaluarsa). null jika bukan premium. */
export function getPremium(jid) {
    const num = norm(jid)
    if (!num) return null
    const db = clean(load())
    return db[num] || null
}

/** Cek apakah user premium (tipe apa pun). Owner otomatis premium full. */
export function isPremium(jid) {
    const num = norm(jid)
    if (!num) return false
    if (global.owner?.some((o) => norm(o) === num)) return true
    return !!getPremium(num)
}

/** Tipe premium: "full" | "basic" | null. Owner = "full". */
export function getPremiumType(jid) {
    const num = norm(jid)
    if (!num) return null
    if (global.owner?.some((o) => norm(o) === num)) return "full"
    return getPremium(num)?.type || null
}

/** Premium FULL = bypass antilink. Basic TIDAK bypass. */
export function isFullPremium(jid) {
    return getPremiumType(jid) === "full"
}

/**
 * Tambah / perbarui user premium.
 * @param {string} jid
 * @param {object} [opt]
 * @param {"full"|"basic"} [opt.type="full"]
 * @param {number} [opt.expired=0]  0 = permanen, selain itu epoch ms
 */
export function addPremium(jid, opt = {}) {
    const num = norm(jid)
    if (!num) return null
    const db = load()
    db[num] = {
        type: opt.type === "basic" ? "basic" : "full",
        expired: Number.isFinite(opt.expired) ? opt.expired : 0
    }
    save(db)
    return db[num]
}

/** Hapus user premium. */
export function delPremium(jid) {
    const num = norm(jid)
    const db = load()
    if (db[num]) {
        delete db[num]
        save(db)
        return true
    }
    return false
}

/** Daftar semua premium: [{ number, type, expired }]. */
export function getPremiumList() {
    const db = clean(load())
    return Object.entries(db).map(([number, v]) => ({
        number,
        type: v?.type || "full",
        expired: v?.expired || 0
    }))
}

/**
 * Ubah teks durasi jadi timestamp kadaluarsa.
 * "perm"/"permanent" → 0 ; "7d","12h","30m","45s" → epoch ms ; null bila invalid.
 */
export function parseDuration(text) {
    if (!text) return 0
    const t = String(text).toLowerCase()
    if (t === "perm" || t === "permanent" || t === "0") return 0
    const match = t.match(/^(\d+)(s|m|h|d)$/i)
    if (!match) return null
    const value = Number(match[1])
    const unit = match[2].toLowerCase()
    const mult = { s: 1000, m: 60000, h: 3600000, d: 86400000 }
    return Date.now() + value * mult[unit]
}

/** Format sisa waktu premium jadi teks ramah. */
export function formatExpiry(expired) {
    if (!expired || expired === 0) return "Permanen"
    const ms = expired - Date.now()
    if (ms <= 0) return "Kadaluarsa"
    const d = Math.floor(ms / 86400000)
    const h = Math.floor((ms % 86400000) / 3600000)
    const m = Math.floor((ms % 3600000) / 60000)
    const parts = []
    if (d) parts.push(`${d} hari`)
    if (h) parts.push(`${h} jam`)
    if (m) parts.push(`${m} menit`)
    return parts.length ? parts.join(" ") : "< 1 menit"
}

export default {
    getPremium,
    isPremium,
    getPremiumType,
    isFullPremium,
    addPremium,
    delPremium,
    getPremiumList,
    parseDuration,
    formatExpiry
}
