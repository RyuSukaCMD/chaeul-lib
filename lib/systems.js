import { readJSON, writeJSON } from "./db.js"

// ─── System Toggles (enable/disable sistem background via .disable) ───
// Menyimpan flag ON/OFF sistem otomatis (notif weather, node warning, dst).
// Default setiap sistem = ON (aktif) bila belum pernah diubah.

const DB = "./database/systems.json"

// Katalog sistem yang bisa di-toggle. Tambah entri baru di sini bila ada
// sistem background baru yang ingin bisa dimatikan dari .disable.
export const SYSTEMS = [
    {
        key: "nodewarn",
        name: "🖥️ Node Status Warning",
        desc: "Cek seluruh node tiap 5–10 mnt & kirim notif bila status berubah (nyala/mati/maintenance)"
    },
    {
        key: "weather",
        name: "🌦️ Notifikasi Weather",
        desc: "Broadcast event cuaca mancing ke grup terdaftar (tiap 2–5 jam)"
    },
    {
        key: "absentwarn",
        name: "⚠️ Absen Warning",
        desc: "Pengingat absen hosting ke grup (tiap 5 mnt)"
    },
    {
        key: "absencron",
        name: "🧾 Absen Cron",
        desc: "Cron PHP expiry absen hosting (tiap 5 mnt)"
    },
    {
        key: "welcome",
        name: "👋 Welcome & Goodbye",
        desc: "Sambutan saat member join / pamit saat member keluar"
    }
]

function load() {
    const data = readJSON(DB, { toggles: {}, groups: {} })
    if (!data.toggles || typeof data.toggles !== "object") data.toggles = {}
    if (!data.groups || typeof data.groups !== "object") data.groups = {}
    return data
}

function save(data) {
    writeJSON(DB, data)
}

export function isKnownSystem(key) {
    return SYSTEMS.some((s) => s.key === String(key))
}

/**
 * Sistem aktif? Default: AKTIF (kecuali pernah dimatikan).
 *
 * @param {string} key  key sistem (weather, nodewarn, ...)
 * @param {string} [jid] bila diisi (grup), cek juga override PER-GRUP.
 *
 * Aturan:
 *   • override grup (bila ada) menang atas setelan global
 *   • tanpa override grup → ikut setelan global
 * Catatan: ini HANYA mengatur notifikasi/sistem background — command,
 * auto-read, auto-typing, dsb tidak terpengaruh.
 */
export function isSystemEnabled(key, jid) {
    const data = load()
    const k = String(key)

    if (jid) {
        const g = data.groups[String(jid)]
        if (g && typeof g[k] === "boolean") return g[k]
    }

    return data.toggles[k] !== false
}

/** Semua notifikasi untuk grup ini mati? (semua key di-off per grup) */
export function isGroupNotifMuted(jid) {
    if (!jid) return false
    return SYSTEMS.every((s) => !isSystemEnabled(s.key, jid))
}

/** Set override sistem untuk SATU grup. */
export function setGroupSystemEnabled(jid, key, enabled) {
    const data = load()
    const id = String(jid)
    data.groups[id] ||= {}
    data.groups[id][String(key)] = enabled === true
    save(data)
    return data.groups[id][String(key)]
}

/** Hapus override grup → kembali mengikuti setelan global. */
export function clearGroupSystem(jid, key) {
    const data = load()
    const id = String(jid)
    if (!data.groups[id]) return
    if (key) delete data.groups[id][String(key)]
    else delete data.groups[id]
    if (data.groups[id] && !Object.keys(data.groups[id]).length) delete data.groups[id]
    save(data)
}

export function toggleGroupSystem(jid, key) {
    const next = !isSystemEnabled(key, jid)
    setGroupSystemEnabled(jid, key, next)
    return next
}

/** Daftar sistem + status untuk SATU grup (termasuk info override). */
export function getGroupSystemStates(jid) {
    const data = load()
    const g = data.groups[String(jid)] || {}
    return SYSTEMS.map((s) => ({
        ...s,
        enabled: isSystemEnabled(s.key, jid),
        overridden: typeof g[s.key] === "boolean"
    }))
}

export function setSystemEnabled(key, enabled) {
    const k = String(key)
    const data = load()
    data.toggles[k] = enabled === true
    save(data)
    return data.toggles[k]
}

export function toggleSystem(key) {
    const next = !isSystemEnabled(key)
    setSystemEnabled(key, next)
    return next
}

/** Daftar semua sistem + status terkininya. */
export function getSystemStates() {
    return SYSTEMS.map((s) => ({
        ...s,
        enabled: isSystemEnabled(s.key)
    }))
}

export default {
    SYSTEMS,
    isKnownSystem,
    isSystemEnabled,
    setSystemEnabled,
    toggleSystem,
    getSystemStates,
    isGroupNotifMuted,
    setGroupSystemEnabled,
    clearGroupSystem,
    toggleGroupSystem,
    getGroupSystemStates
}
