import { readJSON, writeJSON } from "./db.js"

// ═══════════════════════════════════════════════════════════
//  PC LOG & CALL LOG — catat nomor user ke file.
//
//  • database/pclog.json   → semua nomor yang chat private ke bot
//    { users: { "<num>": { num, jid, name, first, last, count } } }
//
//  • database/calllog.json → semua panggilan masuk
//    { callers: { "<num>": { num, jid, first, last, count, blocked } },
//      recent:  [ { num, jid, at, action, isVideo } ] (maks 300) }
// ═══════════════════════════════════════════════════════════

const PC_DB = "./database/pclog.json"
const CALL_DB = "./database/calllog.json"
const MAX_RECENT = 300

function numOf(jid) {
    return String(jid || "").split("@")[0].split(":")[0]
}

/** Catat private chat dari user (dipanggil tiap pesan PC masuk). */
export function logPrivateChat(jid, name = "") {
    const num = numOf(jid)
    if (!num) return

    const db = readJSON(PC_DB, { users: {} })
    db.users ||= {}

    const now = Date.now()
    const prev = db.users[num] || {}

    db.users[num] = {
        num,
        jid: String(jid),
        name: name || prev.name || "",
        first: prev.first || now,
        last: now,
        count: (prev.count || 0) + 1
    }

    writeJSON(PC_DB, db)
    return db.users[num]
}

/** Catat panggilan masuk + aksi yang diambil bot. */
export function logCall(jid, { action = "observed", isVideo = false } = {}) {
    const num = numOf(jid)
    if (!num) return

    const db = readJSON(CALL_DB, { callers: {}, recent: [] })
    db.callers ||= {}
    db.recent ||= []

    const now = Date.now()
    const prev = db.callers[num] || {}

    db.callers[num] = {
        num,
        jid: String(jid),
        first: prev.first || now,
        last: now,
        count: (prev.count || 0) + 1,
        blocked: action.includes("block") ? true : !!prev.blocked
    }

    db.recent.push({ num, jid: String(jid), at: now, action, isVideo: !!isVideo })
    if (db.recent.length > MAX_RECENT) db.recent = db.recent.slice(-MAX_RECENT)

    writeJSON(CALL_DB, db)
    return db.callers[num]
}

export function getPcLog() {
    const db = readJSON(PC_DB, { users: {} })
    return Object.values(db.users || {}).sort((a, b) => (b.last || 0) - (a.last || 0))
}

export function getCallLog() {
    return readJSON(CALL_DB, { callers: {}, recent: [] })
}

export default { logPrivateChat, logCall, getPcLog, getCallLog }
