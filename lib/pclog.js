import { readJSON, writeJSON } from "./db.js"
import { toIntl, toDisplay, toJid, detectCountry } from "./phone.js"

// ═══════════════════════════════════════════════════════════
//  PC LOG & CALL LOG — catat nomor user ke file.
//
//  Nomor SELALU disimpan dalam format internasional berkode negara
//  ("62812xxxx" + tampilan "+62812xxxx"), bukan angka mentah/@lid.
//
//  • database/pclog.json
//    { users: { "<intl>": { num, display, country, jid, name,
//                           first, last, count, blocked } },
//      recent: [ { num, display, at, name, action } ] }
//
//  • database/calllog.json
//    { callers: { "<intl>": { num, display, country, jid,
//                             first, last, count, blocked } },
//      recent:  [ { num, display, at, action, isVideo } ] }
//
//  "recent" hanya menyimpan kejadian TERBARU (maks 300) sehingga
//  owner bisa melihat chat/panggilan paling akhir dengan cepat.
// ═══════════════════════════════════════════════════════════

const PC_DB = "./database/pclog.json"
const CALL_DB = "./database/calllog.json"
const MAX_RECENT = 300

function baseEntry(jid, prev = {}) {
    const num = toIntl(jid)
    const { label } = detectCountry(num)
    return {
        num,
        display: toDisplay(num),
        country: label,
        jid: toJid(num) || String(jid),
        first: prev.first || Date.now(),
        last: Date.now()
    }
}

/**
 * Catat private chat dari user.
 * @param {string} jid   JID pengirim
 * @param {string} name  pushName
 * @param {object} opt   { action: "logged" | "blocked" | "ignored" }
 * @returns entri user (atau null bila nomor tidak valid)
 */
export function logPrivateChat(jid, name = "", opt = {}) {
    const num = toIntl(jid)
    if (!num) return null

    const db = readJSON(PC_DB, { users: {}, recent: [] })
    db.users ||= {}
    db.recent ||= []

    const prev = db.users[num] || {}
    const action = opt.action || "logged"

    db.users[num] = {
        ...baseEntry(jid, prev),
        name: name || prev.name || "",
        count: (prev.count || 0) + 1,
        blocked: action === "blocked" ? true : !!prev.blocked,
        lastAction: action
    }

    // Kejadian TERBARU di posisi paling akhir.
    db.recent.push({
        num,
        display: toDisplay(num),
        name: name || "",
        at: Date.now(),
        action
    })
    if (db.recent.length > MAX_RECENT) db.recent = db.recent.slice(-MAX_RECENT)

    writeJSON(PC_DB, db)
    return db.users[num]
}

/** Tandai sebuah nomor sudah diblokir (dipanggil setelah block sukses). */
export function markPcBlocked(jid) {
    const num = toIntl(jid)
    if (!num) return null

    const db = readJSON(PC_DB, { users: {}, recent: [] })
    db.users ||= {}
    if (!db.users[num]) db.users[num] = { ...baseEntry(jid), name: "", count: 0 }

    db.users[num].blocked = true
    db.users[num].blockedAt = Date.now()
    db.users[num].lastAction = "blocked"

    writeJSON(PC_DB, db)
    return db.users[num]
}

/** Catat panggilan masuk + aksi yang diambil bot. */
export function logCall(jid, { action = "observed", isVideo = false } = {}) {
    const num = toIntl(jid)
    if (!num) return null

    const db = readJSON(CALL_DB, { callers: {}, recent: [] })
    db.callers ||= {}
    db.recent ||= []

    const prev = db.callers[num] || {}

    db.callers[num] = {
        ...baseEntry(jid, prev),
        count: (prev.count || 0) + 1,
        blocked: action.includes("block") ? true : !!prev.blocked,
        lastAction: action
    }

    db.recent.push({
        num,
        display: toDisplay(num),
        at: Date.now(),
        action,
        isVideo: !!isVideo
    })
    if (db.recent.length > MAX_RECENT) db.recent = db.recent.slice(-MAX_RECENT)

    writeJSON(CALL_DB, db)
    return db.callers[num]
}

export function getPcLog() {
    const db = readJSON(PC_DB, { users: {}, recent: [] })
    return Object.values(db.users || {}).sort((a, b) => (b.last || 0) - (a.last || 0))
}

/** Private chat TERBARU lebih dulu. */
export function getRecentPc(limit = 20) {
    const db = readJSON(PC_DB, { users: {}, recent: [] })
    return [...(db.recent || [])].reverse().slice(0, limit)
}

export function getCallLog() {
    return readJSON(CALL_DB, { callers: {}, recent: [] })
}

/** Panggilan TERBARU lebih dulu. */
export function getRecentCalls(limit = 20) {
    const db = getCallLog()
    return [...(db.recent || [])].reverse().slice(0, limit)
}

export default {
    logPrivateChat,
    markPcBlocked,
    logCall,
    getPcLog,
    getRecentPc,
    getCallLog,
    getRecentCalls
}
