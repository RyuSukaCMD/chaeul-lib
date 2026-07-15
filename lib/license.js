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

// ═══════════════════════════════════════════════════════════
//  KONFIGURASI DARI WEBSITE (per-lisensi)
//  Bot mengambil SEMUA config (nama, owner, settings, sticker,
//  tampilan, DAN kredensial API downloader/AI) dari web saat start.
//  - Hanya berhasil bila lisensi AKTIF.
//  - Bila web offline → pakai cache terakhir (database/config.json).
//  - Kredensial API TIDAK disimpan di config.js lagi → menghapus
//    sistem lisensi = bot tak dapat API = downloader & AI mati.
// ═══════════════════════════════════════════════════════════
const CFG_CACHE = "./database/config.json"

/** Ambil config dari web. Return { ok, config, offline }. */
export async function fetchBotConfig() {
    const c = cfg()
    if (!base() || !c.key || !c.syncToken) {
        return { ok: false, reason: "Konfigurasi lisensi belum lengkap." }
    }
    try {
        const { data } = await axios.post(
            `${base()}/api/config/bot`,
            { key: c.key },
            { headers: { "x-sync-token": c.syncToken }, timeout: 20000 }
        )
        if (data?.ok && data.config) {
            // simpan cache untuk fallback offline
            writeJSON(CFG_CACHE, { at: Date.now(), config: data.config })
            return { ok: true, config: data.config }
        }
        return { ok: false, reason: data?.reason || "Config ditolak server." }
    } catch (e) {
        // Web offline → coba cache (grace period sama dgn lisensi: 24 jam).
        const cache = readJSON(CFG_CACHE, null)
        if (cache?.config && cache.at && Date.now() - cache.at < GRACE_MS) {
            return { ok: true, config: cache.config, offline: true }
        }
        return { ok: false, reason: "Tidak dapat mengambil config & cache habis." }
    }
}

/**
 * Terapkan config dari web ke global.* (dipanggil di index.js saat start).
 * Menimpa nilai default. Kredensial API HANYA berasal dari sini.
 */
export function applyConfig(config) {
    if (!config || typeof config !== "object") return false
    if (config.botname) global.botname = config.botname
    if (config.ownername) {
        global.ownername = config.ownername
        global.name = config.ownername
        global.author = config.ownername
    }
    if (config.prefix) global.prefix = config.prefix
    if (config.footer) global.footer = config.footer
    if (config.version) global.version = config.version
    if (Array.isArray(config.owner) && config.owner.length) {
        global.owner = config.owner.map((o) => String(o).replace(/[^0-9]/g, "")).filter(Boolean)
    }
    if (config.settings && typeof config.settings === "object") {
        global.settings = { ...(global.settings || {}), ...config.settings }
    }
    if (config.sticker && typeof config.sticker === "object") {
        global.sticker = { ...(global.sticker || {}), ...config.sticker }
    }
    if (config.weatherCity) global.weatherCity = config.weatherCity
    if (typeof config.thumbnail === "string") global.thumbnail = config.thumbnail
    if (typeof config.newsletter === "string") global.newsletter = config.newsletter
    if (typeof config.link === "string") global.link = config.link
    // Kredensial API RAHASIA (downloader/AI). Titik gerbang proteksi.
    if (config.api && config.api.baseUrl) {
        global.api = { baseUrl: config.api.baseUrl, key: config.api.key || "" }
    }
    if (config.license) global.licenseInfo = { ...global.licenseInfo, ...config.license }
    return true
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

// ═══════════════════════════════════════════════════════════
//  HEARTBEAT CEPAT (tiap ~1 menit)
//  - Menandai bot ONLINE di dashboard web (real-time).
//  - Sekaligus channel perintah balik dari web: bila web menjawab
//    lisensi expired/suspended/revoked → bot broadcast ke semua grup
//    terdaftar lalu masuk mode IDLE (berhenti melayani command).
// ═══════════════════════════════════════════════════════════
let fastTimer = null
const FAST_MS = 60 * 1000 // 1 menit
let shuttingDown = false

/** Kirim 1 heartbeat cepat ke web. Return status dari server. */
export async function heartbeatOnce() {
    const c = cfg()
    if (c.enable === false) return { valid: true, status: "active" }
    if (!base() || !c.key) return { valid: false, status: "unconfigured" }

    // hitung jumlah grup & user untuk info dashboard
    let groups = 0
    let users = 0
    try {
        const gm = await import("./groupmanage.js")
        groups = (gm.listRegisteredGroups ? gm.listRegisteredGroups() : []).length
    } catch {}
    try {
        const { getAllUsers } = await import("./register.js")
        users = (getAllUsers() || []).length
    } catch {}

    try {
        const { data } = await axios.post(
            `${base()}/api/sync/heartbeat`,
            { key: c.key, version: global.version, groups, users },
            { headers: { "x-sync-token": c.syncToken }, timeout: 15000 }
        )
        return data || { valid: false, status: "error" }
    } catch {
        // Web tak terjangkau → jangan matikan bot (bergantung grace period verify).
        return { valid: true, status: "offline", offline: true }
    }
}

/**
 * Broadcast pesan lisensi expired ke SEMUA grup terdaftar, lalu idle.
 * Dipanggil sekali (idempotent via flag shuttingDown).
 */
export async function broadcastExpiredAndIdle(sock, status = "expired", onIdle) {
    if (shuttingDown) return
    shuttingDown = true

    // Susun teks sesuai status.
    const reasonText =
        status === "suspended"
            ? "ditangguhkan (suspended)"
            : status === "revoked"
              ? "dicabut (revoked)"
              : "telah berakhir (expired)"
    const text =
        `⛔ *LISENSI CHAEUL ${reasonText.toUpperCase()}*\n\n` +
        `Masa aktif bot untuk grup ini telah berakhir, sehingga bot akan berhenti melayani perintah.\n\n` +
        `Untuk mengaktifkan kembali, silakan perpanjang lisensi melalui penyedia. Terima kasih telah menggunakan *Chaeul Bot*! 🙏`

    // Kumpulkan grup terdaftar.
    let groups = []
    try {
        const gm = await import("./groupmanage.js")
        groups = gm.listRegisteredGroups ? gm.listRegisteredGroups() : []
    } catch {}

    // Broadcast berurutan dgn jeda kecil (hindari rate-limit WA).
    for (const jid of groups) {
        try {
            await sock.sendMessage(jid, { text })
            await new Promise((r) => setTimeout(r, 1500))
        } catch {}
    }

    // Beri tahu owner juga.
    try {
        const ownerJid = (global.owner?.[0] || "").replace(/[^0-9]/g, "") + "@s.whatsapp.net"
        await sock.sendMessage(ownerJid, {
            text: `⛔ Lisensi bot ${reasonText}. Broadcast ke ${groups.length} grup terkirim. Bot kini masuk mode idle.`
        })
    } catch {}

    // Hentikan seluruh loop background.
    stopHeartbeat()
    stopFastHeartbeat()
    stopSyncLoop()
    stopProvisionPoller()

    // Masuk mode idle (matikan command). Callback dari index.js.
    if (typeof onIdle === "function") {
        try {
            onIdle(status)
        } catch {}
    }
}

/**
 * Mulai loop heartbeat cepat (1 menit).
 * @param onExpired callback(status) dipanggil saat lisensi expired/suspend/revoke.
 */
let lastConfigAt = 0
export function setConfigStamp(ts) {
    lastConfigAt = Number(ts) || 0
}
export function startFastHeartbeat(sock, onExpired) {
    stopFastHeartbeat()
    const tick = async () => {
        const res = await heartbeatOnce()
        if (res && res.valid === false && !res.offline) {
            const st = res.status || "expired"
            if (["expired", "suspended", "revoked", "notfound"].includes(st)) {
                await broadcastExpiredAndIdle(sock, st, onExpired)
            }
            return
        }
        // AUTO-RELOAD CONFIG: bila config diubah lewat web (updatedAt berubah)
        // → ambil ulang & terapkan tanpa restart bot.
        if (res && res.valid && res.configUpdatedAt && res.configUpdatedAt > lastConfigAt) {
            const cfgRes = await fetchBotConfig()
            if (cfgRes.ok) {
                applyConfig(cfgRes.config)
                lastConfigAt = res.configUpdatedAt
                try {
                    const ownerJid =
                        (global.owner?.[0] || "").replace(/[^0-9]/g, "") + "@s.whatsapp.net"
                    await sock.sendMessage(ownerJid, {
                        text: "♻️ Konfigurasi bot diperbarui dari website & langsung diterapkan."
                    })
                } catch {}
            }
        }
    }
    fastTimer = setInterval(tick, FAST_MS)
    if (fastTimer.unref) fastTimer.unref()
    tick() // sekali langsung di awal (biar dashboard cepat "online")
}

export function stopFastHeartbeat() {
    if (fastTimer) clearInterval(fastTimer)
    fastTimer = null
}

/**
 * Sinkron daftar user terdaftar & grup ter-register ke website.
 * Dipanggil saat start & tiap heartbeat.
 */
// ═══════════════════════════════════════════════════════════
//  PUSH REAL-TIME (incremental) ke website
//  Dipanggil saat: user daftar, grup register, tangkapan ikan.
//  Gagal/diam bila web tak terjangkau (fire-and-forget).
// ═══════════════════════════════════════════════════════════
function canPush() {
    return !!base() && !!cfg().syncToken
}
async function push(path, body) {
    if (!canPush()) return
    try {
        await axios.post(`${base()}${path}`, body, {
            headers: { "x-sync-token": cfg().syncToken },
            timeout: 12000
        })
    } catch {}
}

/** User baru terdaftar → tampil di web (format 62857XXXX - Nama). */
export function pushUser(number, name) {
    push("/api/sync/user", { number: String(number || "").replace(/[^0-9]/g, ""), name })
}

/** Grup baru ter-register → tampil di web (nama grup saja). */
export function pushGroup(jid, name, type = "private", members = null) {
    push("/api/sync/group", { jid, name, type, members })
}

/** Broadcast tangkapan ikan → feed live + Rare Fish Log (Secret+) di web. */
export function pushFishing({ name, number, fish, rarity, value, island } = {}) {
    push("/api/sync/fishing", {
        name,
        number: String(number || "").replace(/[^0-9]/g, ""),
        fish,
        rarity,
        value,
        island
    })
}

/** Kirim snapshot leaderboard user (kekayaan & kekuatan) ke web. */
export async function syncLeaderboard() {
    if (!canPush()) return
    try {
        const { getAllUsers } = await import("./register.js")
        let rpg = null
        try {
            rpg = await import("./rpg.js")
        } catch {}
        if (!rpg) return
        const raw = (getAllUsers() || []).filter((u) =>
            String(u.number || "").replace(/[^0-9]/g, "")
        )
        const users = []
        for (const u of raw) {
            const number = String(u.number || "").replace(/[^0-9]/g, "")
            if (!number) continue
            let wealth = 0
            let power = 0
            let level = 1
            let rarest = null
            try {
                const p = rpg.getPlayer ? rpg.getPlayer(number) : null
                if (p) {
                    wealth = (p.money || 0) + (p.bank || 0)
                    power = (rpg.getAtk ? rpg.getAtk(p) : 0) + (rpg.getDef ? rpg.getDef(p) : 0)
                    level = p.level || 1
                }
                // Ikan terlangka dari FISHDEX (all-time) → leaderboard rarest.
                if (rpg.getRarestCatch) {
                    const best = await rpg.getRarestCatch(number)
                    if (best)
                        rarest = {
                            fish: best.fish.name,
                            rarity: best.rarity,
                            rank: best.rank,
                            count: best.count
                        }
                }
            } catch {}
            users.push({
                number,
                name: u.name || u.username || "User",
                wealth,
                power,
                level,
                rarest
            })
        }
        if (!users.length) return
        // Kirim per batch 50 agar payload tidak besar.
        for (let i = 0; i < users.length; i += 50) {
            await push("/api/sync/lbusers", { users: users.slice(i, i + 50) })
        }
    } catch {}
}

export async function syncToWeb(sock) {
    const c = cfg()
    if (!base() || !c.syncToken) return
    try {
        const { getAllUsers } = await import("./register.js")
        const gm = await import("./groupmanage.js")

        // User: dukung skema lama (username) & baru (name).
        const users = (getAllUsers() || []).map((u) => ({
            number: String(u.number || "").replace(/[^0-9]/g, ""),
            name: u.name || u.username || "User",
            joinedAt: u.joinedAt || u.registeredAt || null
        }))

        // Grup ter-register + ambil NAMA ASLI grup via metadata (bila sock ada).
        const registered = gm.listRegisteredGroups ? gm.listRegisteredGroups() : []
        const groups = []
        for (const jid of registered) {
            let name = (global.groupNames && global.groupNames[jid]) || "Grup"
            let members = null
            if (sock) {
                try {
                    const meta = await sock.groupMetadata(jid)
                    name = meta?.subject || name
                    members = meta?.participants?.length ?? null
                    // cache nama grup
                    global.groupNames = global.groupNames || {}
                    global.groupNames[jid] = name
                } catch {}
            }
            groups.push({
                jid,
                name,
                type: global.licenseInfo?.plan || "public",
                members,
                registeredAt: Date.now()
            })
        }

        await axios.post(
            `${base()}/api/sync/all`,
            { users, groups },
            { headers: { "x-sync-token": c.syncToken }, timeout: 20000 }
        )
    } catch {
        // diam saja bila gagal (tidak kritis)
    }
}

// Sinkron berkala (live-ish) — tiap 1 menit push snapshot penuh + leaderboard.
let syncTimer = null
export function startSyncLoop(sock) {
    if (syncTimer) clearInterval(syncTimer)
    syncTimer = setInterval(() => {
        syncToWeb(sock).catch(() => {})
        syncLeaderboard().catch(() => {})
    }, 60 * 1000)
    if (syncTimer.unref) syncTimer.unref()
    syncToWeb(sock).catch(() => {}) // sekali di awal
    syncLeaderboard().catch(() => {})
}
export function stopSyncLoop() {
    if (syncTimer) clearInterval(syncTimer)
    syncTimer = null
}

// ═══════════════════════════════════════════════════════════
//  AUTO-PROVISIONING
//  Bot mengambil job dari website (order yg disetujui), lalu:
//   1. join grup via invite link
//   2. cek jumlah member (private: maks 3 → tolak bila lebih)
//   3. laporkan hasil ke website (sukses → lisensi terbit otomatis)
// ═══════════════════════════════════════════════════════════
let provisionTimer = null

function inviteCode(link = "") {
    const m = String(link).match(/chat\.whatsapp\.com\/([A-Za-z0-9]+)/)
    return m ? m[1] : null
}

async function reportProvision(id, payload) {
    const c = cfg()
    try {
        const { data } = await axios.post(
            `${base()}/api/provision/report`,
            { id, ...payload },
            { headers: { "x-sync-token": c.syncToken }, timeout: 20000 }
        )
        return data // { ok, status, license? }
    } catch {
        return null
    }
}

/**
 * Join grup via invite code dengan aman:
 *  - retry beberapa kali (jeda) untuk error sementara.
 *  - deteksi bila bot SUDAH jadi anggota (join sebenarnya sukses walau error).
 *  - tangani account_reachout_restricted (akun bot dibatasi WhatsApp).
 * Return { ok, groupJid, reason, restricted }.
 */
async function joinGroupSafely(sock, code, knownJid = null) {
    const RETRY = 3
    let lastErr = ""
    for (let attempt = 1; attempt <= RETRY; attempt++) {
        try {
            const joined = await sock.groupAcceptInvite(code)
            if (joined) return { ok: true, groupJid: joined }
            // Kadang mengembalikan falsy walau berhasil → verifikasi via metadata.
            if (knownJid) {
                try {
                    await sock.groupMetadata(knownJid)
                    return { ok: true, groupJid: knownJid }
                } catch {}
            }
        } catch (e) {
            lastErr = e?.data || e?.message || String(e)
            const msg = String(lastErr).toLowerCase()

            // Bot mungkin SUDAH di dalam grup (409/already participant) → sukses.
            if (msg.includes("already") || msg.includes("409") || msg.includes("conflict")) {
                let jid = knownJid
                try {
                    if (!jid) {
                        const info = await sock.groupGetInviteInfo(code)
                        jid = info?.id
                    }
                    if (jid) {
                        await sock.groupMetadata(jid)
                        return { ok: true, groupJid: jid }
                    }
                } catch {}
            }

            // Akun bot dibatasi WhatsApp → tidak bisa join via link. Perlu invite manual.
            if (msg.includes("reachout") || msg.includes("restricted") || msg.includes("403")) {
                // Cek dulu: mungkin sebenarnya sudah jadi anggota.
                let jid = knownJid
                try {
                    if (!jid) {
                        const info = await sock.groupGetInviteInfo(code)
                        jid = info?.id
                    }
                    if (jid) {
                        const meta = await sock.groupMetadata(jid)
                        const botId = (sock.user?.id || "").split(":")[0]
                        const inGroup = meta?.participants?.some((p) =>
                            String(p.id || "").startsWith(botId)
                        )
                        if (inGroup) return { ok: true, groupJid: jid }
                    }
                } catch {}
                return {
                    ok: false,
                    restricted: true,
                    reason: "Akun bot dibatasi WhatsApp (account_reachout_restricted). Invite bot manual ke grup."
                }
            }
        }
        // jeda sebelum retry (2s, 4s)
        if (attempt < RETRY) await new Promise((r) => setTimeout(r, attempt * 2000))
    }
    return { ok: false, reason: "Gagal join grup: " + (lastErr || "error tidak diketahui") }
}

/** Proses semua job provisioning yang tersedia. */
export async function processProvisionJobs(sock) {
    const c = cfg()
    if (!base() || !c.syncToken) return
    let jobs = []
    try {
        const { data } = await axios.get(`${base()}/api/provision/jobs`, {
            headers: { "x-sync-token": c.syncToken },
            timeout: 20000
        })
        jobs = data?.jobs || []
    } catch {
        return
    }

    for (const job of jobs) {
        const code = inviteCode(job.groupLink)
        if (!code) {
            await reportProvision(job.id, { success: false, reason: "Link grup tidak valid." })
            continue
        }

        try {
            // Cek dulu info grup dari invite (jumlah member) bila memungkinkan
            let groupJid = null
            let groupName = null
            let members = null

            try {
                const info = await sock.groupGetInviteInfo(code)
                groupJid = info?.id || null
                groupName = info?.subject || null
                members = info?.size ?? (info?.participants ? info.participants.length : null)
            } catch {}

            // Validasi maks member (private = 3)
            if (job.maxMembers && members != null && members > job.maxMembers) {
                await reportProvision(job.id, {
                    success: false,
                    reason: `Grup punya ${members} anggota (maks ${job.maxMembers}).`,
                    groupJid,
                    groupName,
                    members
                })
                continue
            }

            // Join grup — dengan retry & fallback (atasi account_reachout_restricted)
            const joinRes = await joinGroupSafely(sock, code, groupJid)
            if (!joinRes.ok) {
                await reportProvision(job.id, {
                    success: false,
                    reason: joinRes.reason,
                    groupJid,
                    groupName,
                    members
                })
                // Beri tahu owner agar bisa invite manual bila akun bot dibatasi.
                if (joinRes.restricted) {
                    try {
                        const ownerJid =
                            (global.owner?.[0] || "").replace(/[^0-9]/g, "") + "@s.whatsapp.net"
                        await sock.sendMessage(ownerJid, {
                            text:
                                `⚠️ *Gagal auto-join grup* (order ${job.id})\n\n` +
                                `Akun bot dibatasi WhatsApp (account_reachout_restricted).\n` +
                                `Link: ${job.groupLink}\n\n` +
                                `Solusi: *invite bot manual* ke grup, nanti bot auto-register begitu masuk.`
                        })
                    } catch {}
                }
                continue
            }
            groupJid = joinRes.groupJid || groupJid

            // Ambil metadata final (nama + member)
            try {
                const meta = await sock.groupMetadata(groupJid)
                groupName = meta?.subject || groupName
                members = meta?.participants?.length ?? members
                // Cek ulang setelah join (untuk private)
                if (job.maxMembers && members != null && members > job.maxMembers) {
                    // keluar lagi bila ternyata melebihi
                    try {
                        await sock.groupLeave(groupJid)
                    } catch {}
                    await reportProvision(job.id, {
                        success: false,
                        reason: `Grup punya ${members} anggota (maks ${job.maxMembers}).`,
                        groupJid,
                        groupName,
                        members
                    })
                    continue
                }
            } catch {}

            // Daftarkan grup di sistem bot (agar command aktif)
            try {
                const gm = await import("./groupmanage.js")
                if (gm.registerGroupCmd) gm.registerGroupCmd(groupJid)
            } catch {}

            // Laporkan sukses → website terbitkan lisensi (return berisi license)
            const rep = await reportProvision(job.id, {
                success: true,
                groupJid,
                groupName,
                members,
                ownerNumber: job.contact || null
            })

            // Hitung masa aktif dari lisensi yang baru terbit.
            let masaAktif = ""
            const exp = rep?.license?.expiresAt
            if (exp) {
                const days = Math.max(0, Math.ceil((exp - Date.now()) / 86400000))
                const tgl = new Date(exp).toLocaleDateString("id-ID", {
                    day: "numeric",
                    month: "long",
                    year: "numeric"
                })
                masaAktif = `\n⏳ *Masa aktif:* ${days} hari (s/d ${tgl})`
            }

            // Sapa grup: konfirmasi grup ter-register & aktif + masa aktif.
            try {
                await sock.sendMessage(groupJid, {
                    text:
                        `✦ *Chaeul Bot Aktif!* ✦\n\n` +
                        `✅ Grup *${groupName || "ini"}* berhasil di-register & siap digunakan!${masaAktif}\n\n` +
                        `Ketik *${global.prefix}menu* untuk melihat semua fitur. Selamat menikmati! 🎉`
                })
            } catch {}
        } catch (e) {
            await reportProvision(job.id, {
                success: false,
                reason: "Gagal join grup: " + (e.message || "error")
            })
        }
    }
}

/** Kirim notifikasi (order baru / lisensi hampir habis) ke owner via DM. */
export async function processNotifications(sock) {
    const c = cfg()
    if (!base() || !c.syncToken) return
    let notifs = []
    try {
        const { data } = await axios.get(`${base()}/api/provision/notifications`, {
            headers: { "x-sync-token": c.syncToken },
            timeout: 15000
        })
        notifs = data?.notifications || []
    } catch {
        return
    }
    if (!notifs.length) return

    const ownerJid = (global.owner?.[0] || "").replace(/[^0-9]/g, "") + "@s.whatsapp.net"
    const orderIds = []
    const licenseKeys = []
    for (const n of notifs) {
        // Kirim ke OWNER (pakai ownerText bila ada, else text).
        try {
            await sock.sendMessage(ownerJid, { text: n.ownerText || n.text })
        } catch {}
        // Bila notif punya target grup (mis. lisensi hampir habis) → kirim ke grup juga.
        if (n.groupJid) {
            try {
                await sock.sendMessage(n.groupJid, { text: n.text })
            } catch {}
        }
        if (n.orderId) orderIds.push(n.orderId)
        if (n.key) licenseKeys.push(n.key)
    }
    // Ack agar tidak dikirim ulang
    try {
        await axios.post(
            `${base()}/api/provision/notifications/ack`,
            { orderIds, licenseKeys },
            { headers: { "x-sync-token": c.syncToken }, timeout: 15000 }
        )
    } catch {}
}

/** Mulai polling job provisioning + notifikasi tiap ~2 menit. */
export function startProvisionPoller(sock) {
    if (provisionTimer) clearInterval(provisionTimer)
    provisionTimer = setInterval(
        () => {
            processProvisionJobs(sock).catch(() => {})
            processNotifications(sock).catch(() => {})
        },
        2 * 60 * 1000
    )
    if (provisionTimer.unref) provisionTimer.unref()
    // Jalankan sekali di awal
    processProvisionJobs(sock).catch(() => {})
    processNotifications(sock).catch(() => {})
}

export function stopProvisionPoller() {
    if (provisionTimer) clearInterval(provisionTimer)
    provisionTimer = null
}

// ═══════════════════════════════════════════════════════════
//  AUTO-REGISTER SAAT BOT DI-INVITE MANUAL
//  Bila akun bot dibatasi (tak bisa join via link), owner invite bot manual.
//  Begitu bot MASUK grup, listener ini:
//   1. auto-register grup
//   2. laporkan ke web (klaim job provisioning yg cocok bila ada) → lisensi terbit
//   3. chat grup: sudah aktif + masa aktif
// ═══════════════════════════════════════════════════════════
export function startGroupJoinWatcher(sock) {
    sock.ev.on("group-participants.update", async (data) => {
        try {
            if (data.action !== "add") return
            const botId = (sock.user?.id || "").split(":")[0].replace(/[^0-9]/g, "")
            if (!botId) return
            // Apakah yang ditambahkan adalah BOT sendiri?
            const meAdded = (data.participants || []).some((p) => {
                const pid = String(p?.phoneNumber || p?.id || p || "").replace(/[^0-9]/g, "")
                return pid.startsWith(botId) || botId.startsWith(pid.slice(0, 10))
            })
            if (!meAdded) return

            const groupJid = data.id
            // Sudah terdaftar? jangan proses ulang.
            let already = false
            try {
                const gm = await import("./groupmanage.js")
                already = gm.isGroupRegistered ? gm.isGroupRegistered(groupJid) : false
                if (gm.registerGroupCmd) gm.registerGroupCmd(groupJid) // auto-register
            } catch {}

            // Metadata grup
            let groupName = ""
            let members = null
            try {
                const meta = await sock.groupMetadata(groupJid)
                groupName = meta?.subject || ""
                members = meta?.participants?.length ?? null
                global.groupNames = global.groupNames || {}
                global.groupNames[groupJid] = groupName
            } catch {}

            // Klaim job provisioning yang cocok (bila ada) → lisensi terbit dgn masa aktif.
            let masaAktif = ""
            try {
                if (base() && cfg().syncToken) {
                    const { data: jd } = await axios.get(`${base()}/api/provision/jobs`, {
                        headers: { "x-sync-token": cfg().syncToken },
                        timeout: 15000
                    })
                    const jobs = jd?.jobs || []
                    // Cari job yg link-nya mengarah ke grup ini (via invite info) atau job pending pertama.
                    let match = null
                    for (const job of jobs) {
                        const jc = inviteCode(job.groupLink)
                        if (!jc) continue
                        try {
                            const info = await sock.groupGetInviteInfo(jc)
                            if (info?.id === groupJid) {
                                match = job
                                break
                            }
                        } catch {}
                    }
                    if (match) {
                        const rep = await reportProvision(match.id, {
                            success: true,
                            groupJid,
                            groupName,
                            members,
                            ownerNumber: match.contact || null
                        })
                        const exp = rep?.license?.expiresAt
                        if (exp) {
                            const days = Math.max(0, Math.ceil((exp - Date.now()) / 86400000))
                            const tgl = new Date(exp).toLocaleDateString("id-ID", {
                                day: "numeric",
                                month: "long",
                                year: "numeric"
                            })
                            masaAktif = `\n⏳ *Masa aktif:* ${days} hari (s/d ${tgl})`
                        }
                    }
                }
            } catch {}

            if (already) return // sudah pernah disapa

            // Chat grup: sudah di-register & aktif + masa aktif.
            try {
                await sock.sendMessage(groupJid, {
                    text:
                        `✦ *Chaeul Bot Aktif!* ✦\n\n` +
                        `✅ Grup *${groupName || "ini"}* berhasil di-register & siap digunakan!${masaAktif}\n\n` +
                        `Ketik *${global.prefix}menu* untuk mulai. Selamat menikmati! 🎉`
                })
            } catch {}
        } catch {}
    })
}

export default {
    verifyOnce,
    fetchBotConfig,
    applyConfig,
    applyLicense,
    startHeartbeat,
    stopHeartbeat,
    heartbeatOnce,
    setConfigStamp,
    startFastHeartbeat,
    stopFastHeartbeat,
    broadcastExpiredAndIdle,
    syncToWeb,
    startSyncLoop,
    stopSyncLoop,
    pushUser,
    pushGroup,
    pushFishing,
    syncLeaderboard,
    processProvisionJobs,
    processNotifications,
    startProvisionPoller,
    stopProvisionPoller,
    startGroupJoinWatcher
}
