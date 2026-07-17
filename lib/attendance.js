import { readJSON, writeJSON } from "./db.js"

// ═══════════════════════════════════════════════════════════
//  SISTEM ABSEN (port dari nopal/attendance.php — aturan & waktu 100% sama)
//
//  Aturan (identik dengan web NexHost):
//   • Absen berlaku TEPAT 24 jam sejak waktu absen (bukan dari tengah malam).
//   • Hanya boleh absen 1x per hari: tidak bisa absen lagi bila last_absen_ts
//     sudah >= tengah malam WIB hari ini.
//   • Menyimpan: last_absen_ts, expires_at (=absen + 24 jam), warned.
//   • Zona waktu: Asia/Jakarta (WIB).
//
//  Kunci record = identitas user (di web = email; di bot = nomor WA).
//  Disimpan di ./database/attendance.json
// ═══════════════════════════════════════════════════════════

const DB = "./database/attendance.json"
const DAY_MS = 24 * 3600 * 1000

/** Detik → milidetik helper konsisten (kita simpan dalam MILIDETIK di JS). */
function now() {
    return Date.now()
}

/** Timestamp (ms) tengah malam WIB HARI INI. */
export function todayMidnightWIB() {
    // Ambil tanggal (Y-M-D) menurut zona Asia/Jakarta, lalu jadikan 00:00 WIB (UTC+7).
    const parts = new Intl.DateTimeFormat("en-CA", {
        timeZone: "Asia/Jakarta",
        year: "numeric",
        month: "2-digit",
        day: "2-digit"
    }).format(new Date()) // "YYYY-MM-DD"
    // 00:00 WIB = 17:00 UTC hari sebelumnya → gunakan offset +07:00.
    return new Date(`${parts}T00:00:00+07:00`).getTime()
}

/** Timestamp (ms) tengah malam WIB BESOK. */
export function nextMidnightWIB() {
    return todayMidnightWIB() + DAY_MS
}

export function getAllAttendance() {
    return readJSON(DB, {})
}

function save(data) {
    writeJSON(DB, data)
}

export function getAttendanceRecord(key) {
    const data = getAllAttendance()
    return data[String(key).toLowerCase()] || null
}

/**
 * Lakukan absen (identik do_absen_web): set last_absen_ts = sekarang,
 * expires_at = sekarang + 24 jam, warned = false.
 * @returns {number} expires_at (ms)
 */
export function doAbsen(key, meta = {}) {
    const data = getAllAttendance()
    const k = String(key).toLowerCase()
    const expiresAt = now() + DAY_MS
    data[k] = {
        key: k,
        number: meta.number || k,
        username: meta.username || "",
        chat: meta.chat || "",
        last_absen_ts: now(),
        expires_at: expiresAt,
        warned: false
    }
    save(data)
    return expiresAt
}

/**
 * Cek apakah user sudah absen HARI INI (WIB).
 * (identik: $existing['last_absen_ts'] >= today_midnight_wib_ts())
 */
export function alreadyAbsenToday(key) {
    const rec = getAttendanceRecord(key)
    if (!rec) return false
    return rec.last_absen_ts >= todayMidnightWIB()
}

/** Status absen user: { active, record, remainingMs, expiresAt }. */
export function getStatus(key) {
    const rec = getAttendanceRecord(key)
    if (!rec) return { active: false, record: null, remainingMs: 0, expiresAt: 0 }
    const remaining = rec.expires_at - now()
    return {
        active: remaining > 0,
        record: rec,
        remainingMs: Math.max(0, remaining),
        expiresAt: rec.expires_at
    }
}

/** Daftar record yang sudah expired (untuk cron/pengingat). */
export function getExpired() {
    const data = getAllAttendance()
    const t = now()
    return Object.values(data).filter((r) => t >= r.expires_at)
}

/** Tandai record sudah diperingatkan (mendekati expiry). */
export function markWarned(key) {
    const data = getAllAttendance()
    const k = String(key).toLowerCase()
    if (data[k]) {
        data[k].warned = true
        save(data)
    }
}

/** Format tanggal-jam WIB gaya nopal: "12 Jul 2026, 14:30 WIB". */
export function formatWIB(ts) {
    const p = new Intl.DateTimeFormat("id-ID", {
        timeZone: "Asia/Jakarta",
        day: "2-digit",
        month: "short",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit",
        hour12: false
    }).formatToParts(new Date(ts))
    const g = (t) => p.find((x) => x.type === t)?.value || ""
    return `${g("day")} ${g("month")} ${g("year")}, ${g("hour")}:${g("minute")} WIB`
}

/** Sisa waktu "Xj Ym" dari milidetik. */
export function formatRemaining(ms) {
    if (ms <= 0) return "0m"
    const totalMin = Math.floor(ms / 60000)
    const h = Math.floor(totalMin / 60)
    const m = totalMin % 60
    if (h > 0) return `${h}j ${m}m`
    return `${m}m`
}

export default {
    todayMidnightWIB,
    nextMidnightWIB,
    getAllAttendance,
    getAttendanceRecord,
    doAbsen,
    alreadyAbsenToday,
    getStatus,
    getExpired,
    markWarned,
    formatWIB,
    formatRemaining
}
