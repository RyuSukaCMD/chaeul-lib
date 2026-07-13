import { readJSON, writeJSON } from "./db.js"

// Database catatan klaim daily (kunci = nomor, value = tanggal klaim terakhir).
const DB = "./database/daily.json"

// Jumlah coin (token) per klaim daily.
export const DAILY_REWARD = 30

function load() {
    return readJSON(DB, {})
}

function save(data) {
    writeJSON(DB, data)
}

function norm(jid = "") {
    return String(jid).replace(/[^0-9]/g, "")
}

/** Kunci tanggal lokal (YYYY-MM-DD) untuk reset tengah malam. */
function todayKey() {
    const d = new Date()
    return `${d.getFullYear()}-${d.getMonth() + 1}-${d.getDate()}`
}

/** Apakah user sudah klaim daily hari ini? */
export function claimedToday(jid) {
    const db = load()
    return db[norm(jid)] === todayKey()
}

/** Menandai user sudah klaim daily hari ini. */
export function markClaimed(jid) {
    const db = load()
    db[norm(jid)] = todayKey()
    save(db)
}

/** Sisa waktu (ms) hingga reset berikutnya (tengah malam). */
export function msUntilReset() {
    const now = new Date()
    const next = new Date(now)
    next.setHours(24, 0, 0, 0)
    return next.getTime() - now.getTime()
}

export default { DAILY_REWARD, claimedToday, markClaimed, msUntilReset }
