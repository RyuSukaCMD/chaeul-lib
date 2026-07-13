import { readJSON, writeJSON } from "./db.js"

// Mute per-grup per-user (auto-delete pesan user yg di-mute).
// Struktur:
//   { "<groupJid>": { "<number>": { expired: 0|<ts>, reason } } }
//     - expired 0 = permanen
const DB = "./database/groupmute.json"

function norm(jid = "") {
    return String(jid).replace(/[^0-9]/g, "")
}

function load() {
    return readJSON(DB, {})
}
function save(d) {
    writeJSON(DB, d)
}

/** Mute user di grup. expired 0 = permanen. */
export function muteUser(group, jid, expired = 0, reason = "-") {
    const db = load()
    const num = norm(jid)
    if (!db[group]) db[group] = {}
    db[group][num] = { expired, reason }
    save(db)
}

/** Unmute satu user. */
export function unmuteUser(group, jid) {
    const db = load()
    const num = norm(jid)
    if (db[group]?.[num]) {
        delete db[group][num]
        if (!Object.keys(db[group]).length) delete db[group]
        save(db)
        return true
    }
    return false
}

/** Hapus SEMUA mute di grup. Kembalikan jumlah yg dihapus. */
export function clearMute(group) {
    const db = load()
    const count = Object.keys(db[group] || {}).length
    if (db[group]) {
        delete db[group]
        save(db)
    }
    return count
}

/** Cek user di-mute (auto-expire bila kadaluarsa). */
export function isUserMuted(group, jid) {
    const db = load()
    const num = norm(jid)
    const data = db[group]?.[num]
    if (!data) return false
    if (data.expired && data.expired !== 0 && Date.now() >= data.expired) {
        unmuteUser(group, jid)
        return false
    }
    return true
}

/** Daftar user yg di-mute di grup: [{ number, expired, reason }]. */
export function listMute(group) {
    const db = load()
    const g = db[group] || {}
    return Object.entries(g).map(([number, v]) => ({
        number,
        expired: v.expired || 0,
        reason: v.reason || "-"
    }))
}

/** Ubah teks durasi jadi timestamp. "perm"→0, "10m/1h/1d/30s"→ts, null bila invalid. */
export function parseMuteTime(text) {
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

/** Sisa waktu mute jadi teks. */
export function formatMuteLeft(expired) {
    if (!expired || expired === 0) return "Permanen"
    const ms = expired - Date.now()
    if (ms <= 0) return "Kadaluarsa"
    const d = Math.floor(ms / 86400000)
    const h = Math.floor((ms % 86400000) / 3600000)
    const mn = Math.floor((ms % 3600000) / 60000)
    const s = Math.floor((ms % 60000) / 1000)
    const parts = []
    if (d) parts.push(`${d}h`)
    if (h) parts.push(`${h}j`)
    if (mn) parts.push(`${mn}m`)
    if (!d && !h && s) parts.push(`${s}d`)
    return parts.length ? parts.join(" ") : "< 1 menit"
}

export default {
    muteUser,
    unmuteUser,
    clearMute,
    isUserMuted,
    listMute,
    parseMuteTime,
    formatMuteLeft
}
