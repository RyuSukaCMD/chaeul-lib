import axios from "axios"
import { readJSON, writeJSON } from "./db.js"

// ═══════════════════════════════════════════════════════════
//  SISTEM LISENSI (sisi BOT)
//  - Bot butuh lisensi valid untuk berjalan.
//  - Verifikasi & heartbeat ke website (global.license.apiUrl).
//  - Heartbeat tiap 2-6 jam (interval acak, diberi server).
//  - Owner lisensi otomatis ditambahkan ke global.owner (fitur owner).
//  - Sinkron daftar user & grup ke website.
//
//  Konfigurasi (config.js):
//    global.license = {
//      key: process.env.CHAEUL_LICENSE || "",
//      apiUrl: "https://web-kamu.com",   // base URL website
//      syncToken: process.env.SYNC_TOKEN || "",
//      enable: true
//    }
// ═══════════════════════════════════════════════════════════

const CACHE = "./database/license.json" // simpan status terakhir (offline grace)
const GRACE_MS = 24 * 3600000 // toleransi offline 24 jam bila web tak terjangkau

let heartbeatTimer = null

function cfg() {
    return global.license || {}
}
function base() {
    return (cfg().apiUrl || "").replace(/\/+$/, "")
}
function loadCache() {
    return readJSON(CACHE, { lastValid: 0, license: null })
}
function saveCache(data) {
    writeJSON(CACHE, data)
}

/**
 * Verifikasi lisensi ke website. Mengembalikan { valid, license, reason, offline }.
 * Bila web tak terjangkau tapi masih dalam masa grace → tetap valid (offline).
 */
export async function verifyOnce(meta = {}) {
    const c = cfg()
    if (c.enable === false) return { valid: true, license: null, reason: "license disabled" }
    if (!c.key) return { valid: false, reason: "Lisensi belum diatur (global.license.key kosong)." }
    if (!base()) return { valid: false, reason: "URL website lisensi belum diatur." }

    try {
        const { data } = await axios.post(
            `${base()}/api/license/verify`,
            { key: c.key, groupJid: meta.groupJid, version: global.version },
            { timeout: 20000 }
        )
        if (data?.valid) {
            saveCache({ lastValid: Date.now(), license: data.license })
            return { valid: true, license: data.license, nextHeartbeat: data.nextHeartbeat }
        }
        // Web menjawab tapi lisensi tidak valid → tegas ditolak.
        return { valid: false, reason: data?.reason || "Lisensi tidak valid." }
    } catch (e) {
        // Web tak terjangkau → cek grace period dari cache.
        const cache = loadCache()
        if (cache.lastValid && Date.now() - cache.lastValid < GRACE_MS) {
            return { valid: true, license: cache.license, offline: true }
        }
        return {
            valid: false,
            reason: "Tidak dapat menghubungi server lisensi & masa tenggang habis.",
            offline: true
        }
    }
}

/** Terapkan efek lisensi: tambahkan owner lisensi ke global.owner. */
export function applyLicense(license) {
    if (!license) return
    if (license.ownerNumber) {
        const num = String(license.ownerNumber).replace(/[^0-9]/g, "")
        global.owner = global.owner || []
        if (num && !global.owner.some((o) => String(o).replace(/[^0-9]/g, "") === num)) {
            global.owner.push(num)
        }
    }
    global.licenseInfo = license
}

/** Mulai heartbeat berkala (2-6 jam). Auto-shutdown bila lisensi dicabut. */
export function startHeartbeat(sock, onInvalid) {
    stopHeartbeat()
    const schedule = (ms) => {
        heartbeatTimer = setTimeout(async () => {
            const res = await verifyOnce()
            if (res.valid) {
                applyLicense(res.license)
                await syncToWeb(sock).catch(() => {})
            } else if (!res.offline) {
                // Ditolak tegas oleh server → panggil handler (mis. matikan bot).
                if (typeof onInvalid === "function") onInvalid(res.reason)
            }
            const next = res.nextHeartbeat || (2 + Math.random() * 4) * 3600000
            schedule(next)
        }, ms)
        if (heartbeatTimer.unref) heartbeatTimer.unref()
    }
    // Heartbeat pertama 2-6 jam dari sekarang.
    schedule((2 + Math.random() * 4) * 3600000)
}

export function stopHeartbeat() {
    if (heartbeatTimer) clearTimeout(heartbeatTimer)
    heartbeatTimer = null
}

/**
 * Sinkron daftar user terdaftar & grup ter-register ke website.
 * Dipanggil saat start & tiap heartbeat.
 */
export async function syncToWeb() {
    const c = cfg()
    if (!base() || !c.syncToken) return
    try {
        const { getAllUsers } = await import("./register.js")
        const gm = await import("./groupmanage.js")

        const users = (getAllUsers() || []).map((u) => ({
            number: String(u.number || "").replace(/[^0-9]/g, ""),
            name: u.name || "User",
            joinedAt: u.joinedAt || null
        }))

        // Grup ter-register + tipe (public/private) dari groupmanage bila ada
        const registered = gm.listRegisteredGroups ? gm.listRegisteredGroups() : []
        const groups = registered.map((jid) => ({
            jid,
            name: (global.groupNames && global.groupNames[jid]) || "Grup",
            type: global.licenseInfo?.plan || "private",
            members: null,
            registeredAt: Date.now()
        }))

        await axios.post(
            `${base()}/api/sync/all`,
            { users, groups },
            { headers: { "x-sync-token": c.syncToken }, timeout: 20000 }
        )
    } catch {
        // diam saja bila gagal (tidak kritis)
    }
}

export default {
    verifyOnce,
    applyLicense,
    startHeartbeat,
    stopHeartbeat,
    syncToWeb
}
