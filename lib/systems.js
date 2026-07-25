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
    }
]

function load() {
    const data = readJSON(DB, { toggles: {} })
    if (!data.toggles || typeof data.toggles !== "object") data.toggles = {}
    return data
}

function save(data) {
    writeJSON(DB, data)
}

export function isKnownSystem(key) {
    return SYSTEMS.some((s) => s.key === String(key))
}

/** Sistem aktif? Default: AKTIF (kecuali pernah dimatikan). */
export function isSystemEnabled(key) {
    const toggles = load().toggles
    return toggles[String(key)] !== false
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
    getSystemStates
}
