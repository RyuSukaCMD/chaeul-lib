import { readJSON, writeJSON } from "./db.js"

// Struktur:
// {
//   settings: { "<groupJid>": { all, group, channel, sosmed, tagsw } },
//   bypass:   { "<groupJid>": { "<number>": sisaBypass } }
// }
const DB = "./database/antilink.json"

// Mode antilink yang tersedia
export const MODES = ["all", "group", "channel", "sosmed", "tagsw"]

export const MODE_LABEL = {
    all: "🔗 Semua Link",
    group: "👥 Grup WA",
    channel: "📢 Channel WA",
    sosmed: "🌐 Sosmed (TikTok/IG/FB/X)",
    tagsw: "📌 Tag Status (SW)"
}

function norm(jid = "") {
    return String(jid).replace(/[^0-9]/g, "")
}

function load() {
    return readJSON(DB, { settings: {}, bypass: {} })
}

function save(data) {
    writeJSON(DB, data)
}

/** Ambil pengaturan antilink sebuah grup (semua mode). */
export function getSettings(group) {
    const db = load()
    return {
        all: false,
        group: false,
        channel: false,
        sosmed: false,
        tagsw: false,
        ...(db.settings?.[group] || {})
    }
}

/** Set satu mode antilink ON/OFF. Mengembalikan nilai barunya. */
export function setMode(group, mode, value) {
    if (!MODES.includes(mode)) return null
    const db = load()
    if (!db.settings) db.settings = {}
    if (!db.settings[group]) db.settings[group] = {}
    db.settings[group][mode] = !!value
    save(db)
    return db.settings[group][mode]
}

/** Toggle satu mode antilink. Mengembalikan nilai barunya. */
export function toggleMode(group, mode) {
    const current = getSettings(group)[mode]
    return setMode(group, mode, !current)
}

/** Apakah mode aktif untuk grup? (all mengaktifkan semua) */
export function isModeActive(group, mode) {
    const s = getSettings(group)
    return s.all || s[mode]
}

// ─── Bypass (kuota lolos antilink per user per grup) ───

/** Ambil sisa bypass user. */
export function getBypass(group, jid) {
    const db = load()
    return db.bypass?.[group]?.[norm(jid)] || 0
}

/** Set jumlah bypass user. */
export function setBypass(group, jid, count) {
    const db = load()
    if (!db.bypass) db.bypass = {}
    if (!db.bypass[group]) db.bypass[group] = {}
    db.bypass[group][norm(jid)] = Math.max(0, Math.floor(count))
    save(db)
    return db.bypass[group][norm(jid)]
}

/** Pakai 1 bypass (dekrementasi). Mengembalikan true bila bypass dipakai. */
export function consumeBypass(group, jid) {
    const db = load()
    const num = norm(jid)
    const left = db.bypass?.[group]?.[num] || 0
    if (left <= 0) return false
    db.bypass[group][num] = left - 1
    if (db.bypass[group][num] === 0) delete db.bypass[group][num]
    save(db)
    return true
}

export default {
    MODES,
    MODE_LABEL,
    getSettings,
    setMode,
    toggleMode,
    isModeActive,
    getBypass,
    setBypass,
    consumeBypass
}
