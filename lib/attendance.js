import { readJSON, writeJSON } from "./db.js"
import { listAbsenWarnGroups } from "./absenwarn.js"
import { enqueue } from "./batchNotify.js"

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

// ═══════════════════════════════════════════════════════════
//  PENGINGAT ABSEN OTOMATIS (cron) — hanya untuk grup whitelist.
//  Anggota grup whitelist yang absennya SUDAH HABIS atau AKAN HABIS
//  dalam <= WARN_BEFORE_MS akan di-tag. Beberapa orang yang perlu
//  diingatkan pada waktu berdekatan digabung jadi 1 pesan (batching).
// ═══════════════════════════════════════════════════════════
const WARN_BEFORE_MS = 60 * 60 * 1000 // ingatkan bila sisa <= 1 jam (atau sudah habis)
const CHECK_INTERVAL = 5 * 60 * 1000 // cek tiap 5 menit
const BATCH_WINDOW = 10 * 1000 // gabung yang berdekatan dalam 10 detik

let reminderTimer = null

/** Ambil nomor (digit) dari sebuah JID/objek peserta. */
function jidNumber(x) {
    const s = String(x?.phoneNumber || x?.id || x || "")
    return s.split("@")[0].split(":")[0].replace(/[^0-9]/g, "")
}

/** Satu putaran pengecekan pengingat. */
export async function runAbsenReminderOnce(sock) {
    const groups = listAbsenWarnGroups()
    if (!groups.length) return

    const data = getAllAttendance()
    // Index record berdasarkan NOMOR (biar cocok dgn anggota grup).
    const byNumber = new Map()
    for (const rec of Object.values(data)) {
        const num = jidNumber(rec.number || rec.key)
        if (num) byNumber.set(num, rec)
    }

    const t = now()

    for (const chat of groups) {
        let meta
        try {
            meta = await sock.groupMetadata(chat)
        } catch {
            continue // grup tak terjangkau (bot mungkin sudah keluar)
        }
        const parts = meta?.participants || []

        for (const p of parts) {
            const num = jidNumber(p)
            if (!num) continue
            const rec = byNumber.get(num)
            if (!rec) continue // belum pernah absen → biarkan (bukan target reminder)

            const remaining = rec.expires_at - t
            const expiringSoon = remaining <= WARN_BEFORE_MS // termasuk sudah habis (<=0)
            if (!expiringSoon) continue
            if (rec.warned) continue // sudah diingatkan → jangan spam

            // Tandai warned lebih dulu (idempotent walau batch di-flush nanti).
            markWarned(rec.number || rec.key)

            const jid = p.id || `${num}@s.whatsapp.net`
            enqueue({
                sock,
                chat,
                type: "absenwarn",
                jid,
                data: { number: num, remaining, expired: remaining <= 0, expiresAt: rec.expires_at },
                window: BATCH_WINDOW,
                render: renderAbsenWarn
            })
        }
    }
}

// Susun 1 pesan tag banyak orang untuk pengingat absen.
async function renderAbsenWarn(items, { sock, chat }) {
    const uniq = []
    const seen = new Set()
    for (const it of items) {
        if (!it.jid || seen.has(it.jid)) continue
        seen.add(it.jid)
        uniq.push(it)
    }
    if (!uniq.length) return

    const mentions = uniq.map((it) => it.jid)
    const tags = uniq.map((it) => `@${it.number}`).join(" ")
    const expiredCount = uniq.filter((it) => it.expired).length
    const soonCount = uniq.length - expiredCount

    const lines = [
        `⏰ *PENGINGAT ABSEN*`,
        ``,
        tags,
        ``
    ]
    if (expiredCount && soonCount) {
        lines.push(`Absen kalian ada yang *sudah habis* & ada yang *hampir habis*.`)
    } else if (expiredCount) {
        lines.push(`Absen kalian *sudah habis*. Segera absen lagi biar tetap aman!`)
    } else {
        lines.push(`Absen kalian *sebentar lagi habis*. Yuk absen ulang!`)
    }
    lines.push(``)
    lines.push(`Ketik *${global.prefix || "."}absen* untuk absen sekarang.`)

    try {
        await sock.sendMessage(chat, { text: lines.join("\n"), mentions })
    } catch (e) {
        console.error("[ABSEN-WARN]", e?.message || e)
    }
}

/** Mulai loop pengingat (dipanggil di index.js setelah bot connect). */
export function startAbsenReminder(sock) {
    if (reminderTimer) clearInterval(reminderTimer)
    reminderTimer = setInterval(() => {
        runAbsenReminderOnce(sock).catch(() => {})
    }, CHECK_INTERVAL)
    if (reminderTimer.unref) reminderTimer.unref()
    // jalankan sekali di awal (delay kecil biar metadata siap)
    setTimeout(() => runAbsenReminderOnce(sock).catch(() => {}), 15000)
}
export function stopAbsenReminder() {
    if (reminderTimer) clearInterval(reminderTimer)
    reminderTimer = null
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
    formatRemaining,
    runAbsenReminderOnce,
    startAbsenReminder,
    stopAbsenReminder
}
