import { readJSON, writeJSON } from "./db.js"
import { getConfig, getNodes, getNode, getLocations, getNodeServers, getNodeAllocations, createNodeAllocation, getEgg, getServer, getAllServers, unwrapItem, pingDaemon } from "./pterodactyl.js"
import axios from "axios"
import dns from "dns"

// ─── HTTP Helper (axios, body selalu string JSON seperti cloudscraper dulu) ───
const http = axios.create({
    timeout: 30000,
    headers: {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
        Accept: "application/json"
    }
})

// Ambil pesan error yang enak dibaca dari response error Pterodactyl
function httpErrorMessage(error) {
    const errors = error?.response?.data?.errors
    if (Array.isArray(errors) && errors.length) {
        return errors.map((e) => e.detail || e.code).join("; ")
    }
    if (error?.response) {
        return `HTTP ${error.response.status}: ${error.response.statusText}`
    }
    return error?.message || String(error)
}

function toBodyString(data) {
    return typeof data === "string" ? data : JSON.stringify(data)
}

async function cfGet(url, headers = {}) {
    try {
        const response = await http.get(url, { headers })
        return { body: toBodyString(response.data), response }
    } catch (error) {
        throw new Error(httpErrorMessage(error))
    }
}

async function cfPost(url, body, headers = {}) {
    try {
        const response = await http.post(url, body, {
            headers: { "Content-Type": "application/json", ...headers },
            // body sudah berupa string JSON — kirim apa adanya
            transformRequest: [(data) => data]
        })
        return { body: toBodyString(response.data), response }
    } catch (error) {
        throw new Error(httpErrorMessage(error))
    }
}

// ─── Database File ───
const URGENT_DB = "./database/urgent.json"
const PORT_LOCK_DB = "./database/port_lock.json"

// ─── JSON Loader / Saver ───
function loadUrgent() {
    return readJSON(URGENT_DB, {
        enabled: false,
        mode: "blacklist", // "blacklist" (semua node boleh kecuali BL) | "whitelist" (hanya node WL)
        defaultNode: null,
        blacklistNodes: [],
        whitelistNodes: [],
        claimedUUIDs: {},
        ipAlias: "pvnode-4.nexhostku.com",
        ipAddress: "0.0.0.0",
        pltaUrl: "",
        pltaKey: "",
        pltcUrl: "",
        pltcKey: "",
        createdAt: null
    })
}

function loadPortLock() {
    return readJSON(PORT_LOCK_DB, {
        locks: {},
        portStatus: {}
    })
}

function saveUrgent(data) {
    writeJSON(URGENT_DB, data)
}

function savePortLock(data) {
    writeJSON(PORT_LOCK_DB, data)
}

// ─── Urgent Session Store (state claim: konfirmasi & pilih port) ───
// PENTING: state ini HARUS tinggal di lib, BUKAN di file command.
// Loader me-load command dengan query ?update= (cache-busting) sehingga
// setiap load menghasilkan INSTANCE MODUL BARU — session yang disimpan di
// modul command akan terpisah dari yang dibaca handler dan user tidak
// akan pernah "terlisten" saat memasukkan port.
const urgentSessions = new Map() // key(ownerJid) -> { key, senderNumber, step, ... }
const URGENT_SESSION_TTL = 5 * 60 * 1000 // sesi kedaluwarsa 5 menit

function normalizeJid(jid) {
    return String(jid || "").split("@")[0].split(":")[0]
}

function sessionExpired(sess) {
    return !sess || Date.now() - (sess.createdAt || 0) > URGENT_SESSION_TTL
}

export function setUrgentSession(jid, data) {
    const key = String(jid)
    urgentSessions.set(key, {
        ...data,
        key,
        owner: key,
        senderNumber: normalizeJid(key),
        createdAt: Date.now()
    })
    return urgentSessions.get(key)
}

export function findUrgentSession(jid) {
    // 1) key persis
    const direct = urgentSessions.get(String(jid))
    if (direct) {
        if (!sessionExpired(direct)) return direct
        urgentSessions.delete(String(jid))
    }

    // 2) fallback nomor (tahan varian device JID seperti 123:45@s.whatsapp.net)
    const num = normalizeJid(jid)
    for (const [key, candidate] of urgentSessions) {
        if (sessionExpired(candidate)) {
            urgentSessions.delete(key)
            continue
        }
        if (candidate.senderNumber === num) return candidate
    }
    return null
}

export function deleteUrgentSession(jid) {
    const num = normalizeJid(jid)
    let removed = false
    for (const [key, sess] of urgentSessions) {
        if (key === String(jid) || sess.senderNumber === num) {
            urgentSessions.delete(key)
            removed = true
        }
    }
    return removed
}

export function hasUrgentSession(jid) {
    return !!findUrgentSession(jid)
}

// ─── PORT ALLOCATION SYSTEM ───
// Port tersedia = allocation di node yang belum dipakai (assigned=false).
// Ini satu-satunya port yang sah dipakai server baru di Pterodactyl —
// port acak di luar allocation TIDAK akan pernah bisa dipakai.

const LOCK_DURATION = 5 * 60 * 1000

function getPortLocks() {
    return loadPortLock().locks || {}
}

function getPortStatus() {
    return loadPortLock().portStatus || {}
}

export function hasActiveLock(userJid) {
    const locks = getPortLocks()
    const lock = locks[userJid]
    if (!lock) return false
    
    if (Date.now() > lock.expiresAt) {
        releaseLock(userJid)
        return false
    }
    return true
}

export function getLockInfo(userJid) {
    return getPortLocks()[userJid] || null
}

export function isPortLocked(port, excludeUser = null) {
    const status = getPortStatus()
    const locks = getPortLocks()
    const portStr = String(port)
    
    if (status[portStr] && status[portStr] !== excludeUser) {
        return { locked: true, by: status[portStr], reason: "sedang diproses user lain" }
    }
    
    for (const [user, lock] of Object.entries(locks)) {
        if (user === excludeUser) continue
        if (Date.now() <= lock.expiresAt && lock.port === portStr) {
            return { locked: true, by: user, reason: "sedang diproses user lain" }
        }
    }
    
    return { locked: false }
}

export function createLock(userJid, uuid, preferredPort = null) {
    const data = loadPortLock()
    
    const oldLock = data.locks[userJid]
    if (oldLock?.port) {
        delete data.portStatus[oldLock.port]
    }
    
    data.locks[userJid] = {
        uuid,
        port: preferredPort,
        createdAt: Date.now(),
        expiresAt: Date.now() + LOCK_DURATION
    }
    
    if (preferredPort) {
        data.portStatus[String(preferredPort)] = userJid
    }
    
    savePortLock(data)
    return data.locks[userJid]
}

export function updateLockPort(userJid, port) {
    const data = loadPortLock()
    const lock = data.locks[userJid]
    
    if (!lock) return null
    
    if (lock.port) {
        delete data.portStatus[lock.port]
    }
    
    lock.port = String(port)
    data.portStatus[lock.port] = userJid
    lock.expiresAt = Date.now() + LOCK_DURATION
    
    savePortLock(data)
    return lock
}

export function releaseLock(userJid) {
    const data = loadPortLock()
    const lock = data.locks[userJid]
    
    if (lock?.port) {
        delete data.portStatus[lock.port]
    }
    
    delete data.locks[userJid]
    savePortLock(data)
    return true
}

export function cleanupExpiredLocks() {
    const data = loadPortLock()
    const now = Date.now()
    
    for (const [user, lock] of Object.entries(data.locks)) {
        if (now > lock.expiresAt) {
            if (lock.port) {
                delete data.portStatus[lock.port]
            }
            delete data.locks[user]
        }
    }
    
    savePortLock(data)
}

export async function getAllocatedPorts(nodeId) {
    try {
        // getNodeAllocations() sudah mengembalikan array yang di-unwrap
        const allocations = unwrapArr(await getNodeAllocations(nodeId))

        const ports = []
        for (const alloc of allocations) {
            const assigned = alloc.assigned ?? alloc.attributes?.assigned
            const port = alloc.port ?? alloc.attributes?.port
            if (assigned && port != null) {
                ports.push(port)
            }
        }
        return ports
    } catch (error) {
        console.warn("[Urgent] Gagal ambil allocations:", error.message)
        return []
    }
}

// Helper kecil: pastikan hasil berupa array walaupun inputnya { data: [...] }
function unwrapArr(result) {
    if (Array.isArray(result)) return result
    if (result && Array.isArray(result.data)) return result.data
    return []
}

// Daftar allocation kosong (assigned=false) pada node — sumber port yang SAH.
async function getFreeAllocations(nodeId) {
    try {
        const allocations = unwrapArr(await getNodeAllocations(nodeId))
        return allocations
            .filter((a) => !(a.assigned ?? a.attributes?.assigned))
            .map((a) => ({
                id: a.id ?? a.attributes?.id,
                port: Number(a.port ?? a.attributes?.port)
            }))
            .filter((a) => Number.isFinite(a.port))
    } catch (error) {
        console.warn("[Urgent] Gagal ambil allocations:", error.message)
        return []
    }
}

// Port valid utk server baru HANYA port dari allocation yang kosong.
export async function isPortAvailable(nodeId, port) {
    const free = await getFreeAllocations(nodeId)
    return free.some((a) => a.port === Number(port))
}

export async function generateAvailablePort(nodeId, excludePorts = []) {
    const free = await getFreeAllocations(nodeId)
    const exclude = new Set(excludePorts.map(Number))

    for (const alloc of free.sort(() => Math.random() - 0.5)) {
        if (exclude.has(alloc.port)) continue
        if (isPortLocked(alloc.port).locked) continue
        return alloc.port
    }

    return null
}

export async function getAvailablePortList(nodeId, limit = 10) {
    const free = await getFreeAllocations(nodeId)
    const available = []

    for (const alloc of free) {
        if (isPortLocked(alloc.port).locked) continue
        available.push(alloc.port)
        if (available.length >= limit + 50) break
    }

    return available.sort(() => Math.random() - 0.5).slice(0, limit)
}

// ─── Status sebuah port pada node ───
//   "free"      → allocation ADA & kosong (langsung bisa dipakai)
//   "assigned"  → allocation ADA tapi sudah dipakai server lain (TOLAK)
//   "creatable" → belum ada allocation → akan DIBUAT DULU otomatis saat clone
export async function getPortState(nodeId, port) {
    const allocations = unwrapArr(await getNodeAllocations(nodeId))
    const matches = allocations
        .filter((a) => Number(a.port ?? a.attributes?.port) === Number(port))
        .map((a) => ({
            id: a.id ?? a.attributes?.id,
            assigned: !!(a.assigned ?? a.attributes?.assigned)
        }))

    if (!matches.length) return { state: "creatable", allocationId: null }
    const free = matches.find((a) => !a.assigned)
    if (free) return { state: "free", allocationId: free.id }
    return { state: "assigned", allocationId: null }
}

// Semua port yang sudah tercatat di panel untuk node tsb (assigned maupun tidak).
export async function getAllNodePorts(nodeId) {
    try {
        const allocations = unwrapArr(await getNodeAllocations(nodeId))
        return allocations
            .map((a) => Number(a.port ?? a.attributes?.port))
            .filter((p) => Number.isFinite(p))
    } catch (error) {
        console.warn("[Urgent] Gagal ambil allocations:", error.message)
        return []
    }
}

// Port acak yang BELUM ada allocation-nya → pemakaiannya lewat jalur
// "buat allocation dulu baru input" (findOrCreateAllocation).
// Port di luar database panel artinya memang kosong di node (wings tidak bind).
export async function generateCreatablePort(nodeId, excludePorts = []) {
    const existing = new Set(await getAllNodePorts(nodeId))
    const exclude = new Set(excludePorts.map(Number))

    for (let attempt = 0; attempt < 150; attempt++) {
        const port = 15000 + Math.floor(Math.random() * 20000) // 15000-34999
        if (existing.has(port) || exclude.has(port)) continue
        if (isPortLocked(port).locked) continue
        return port
    }
    return null
}

// Port auto untuk user: prioritaskan allocation kosong yang sudah ada,
// kalau habis → port acak yang allocation-nya akan dibuat otomatis.
export async function pickAutoPort(nodeId, excludePorts = []) {
    const free = await generateAvailablePort(nodeId, excludePorts)
    if (free) return free
    return await generateCreatablePort(nodeId, excludePorts)
}

// ─── Urgent System Config ───

export function getUrgentConfig() {
    return loadUrgent()
}

export function isUrgentOpen() {
    return loadUrgent().enabled === true
}

export function openUrgent() {
    const data = loadUrgent()
    data.enabled = true
    data.createdAt = Date.now()
    saveUrgent(data)
    return data
}

export function closeUrgent() {
    const data = loadUrgent()
    data.enabled = false
    saveUrgent(data)
    return data
}

export function setDefaultNode(nodeId) {
    const data = loadUrgent()
    data.defaultNode = nodeId
    saveUrgent(data)
    return data
}

export function clearDefaultNode() {
    const data = loadUrgent()
    data.defaultNode = null
    saveUrgent(data)
    return data
}

// ─── IP Configuration ───

export function getIpAlias() {
    return loadUrgent().ipAlias || "pvnode-4.nexhostku.com"
}

export function getIpAddress() {
    return loadUrgent().ipAddress || "0.0.0.0"
}

export function setIpAlias(alias) {
    const data = loadUrgent()
    data.ipAlias = String(alias).trim()
    saveUrgent(data)
    return data.ipAlias
}

export function setIpAddress(ip) {
    const data = loadUrgent()
    const ipPattern = /^(\d{1,3}\.){3}\d{1,3}$|^(0\.0\.0\.0)$|^::$/i
    if (!ipPattern.test(ip)) {
        throw new Error("Format IP tidak valid. Contoh: 192.168.1.1 atau 0.0.0.0")
    }
    data.ipAddress = String(ip).trim()
    saveUrgent(data)
    return data.ipAddress
}

export function setIpConfig(alias, address) {
    const data = loadUrgent()
    const ipPattern = /^(\d{1,3}\.){3}\d{1,3}$|^(0\.0\.0\.0)$|^::$/i
    if (!ipPattern.test(address)) {
        throw new Error("Format IP tidak valid. Contoh: 192.168.1.1 atau 0.0.0.0")
    }
    data.ipAlias = String(alias).trim()
    data.ipAddress = String(address).trim()
    saveUrgent(data)
    return { ipAlias: data.ipAlias, ipAddress: data.ipAddress }
}

export function resetIpConfig() {
    const data = loadUrgent()
    data.ipAlias = "pvnode-4.nexhostku.com"
    data.ipAddress = "0.0.0.0"
    saveUrgent(data)
    return { ipAlias: data.ipAlias, ipAddress: data.ipAddress }
}

// ─── Panel URL ───

export function getPanelUrl() {
    return getConfig().url || ""
}

export function isPanelConfigured() {
    return !!(getConfig().url && getConfig().key)
}

// ─── PLTA Configuration ───

export function getPltaConfig() {
    const data = loadUrgent()
    return {
        key: data.pltaKey || "",
        url: data.pltaUrl || ""
    }
}

export function isPltaConfigured() {
    const cfg = getPltaConfig()
    return !!(cfg.key && cfg.url)
}

export function setPltaConfig(url, key) {
    const data = loadUrgent()
    
    let cleanUrl = String(url).trim()
    if (!cleanUrl.startsWith("http")) {
        cleanUrl = "https://" + cleanUrl
    }
    try {
        new URL(cleanUrl)
    } catch {
        throw new Error("Format URL PLTA tidak valid.")
    }
    
    const cleanKey = String(key).trim()
    if (!cleanKey) {
        throw new Error("PLTA Key tidak boleh kosong.")
    }
    
    data.pltaUrl = cleanUrl.replace(/\/$/, "")
    data.pltaKey = cleanKey
    saveUrgent(data)
    return { url: data.pltaUrl, key: data.pltaKey }
}

export function clearPlta() {
    const data = loadUrgent()
    data.pltaKey = ""
    data.pltaUrl = ""
    saveUrgent(data)
    return { key: "", url: "" }
}

// ─── PLTC (Client API Key) Configuration ───
// PLTC dipakai untuk endpoint /api/client (live resource server, dll).
export function getPltcConfig() {
    const data = loadUrgent()
    return {
        key: data.pltcKey || "",
        url: data.pltcUrl || ""
    }
}

export function isPltcConfigured() {
    const cfg = getPltcConfig()
    return !!(cfg.key && cfg.url)
}

export function setPltcConfig(url, key) {
    const data = loadUrgent()

    let cleanUrl = String(url).trim()
    if (!cleanUrl.startsWith("http")) {
        cleanUrl = "https://" + cleanUrl
    }
    try {
        new URL(cleanUrl)
    } catch {
        throw new Error("Format URL PLTC tidak valid.")
    }

    const cleanKey = String(key).trim()
    if (!cleanKey) {
        throw new Error("PLTC Key tidak boleh kosong.")
    }

    data.pltcUrl = cleanUrl.replace(/\/$/, "")
    data.pltcKey = cleanKey
    saveUrgent(data)
    return { url: data.pltcUrl, key: data.pltcKey }
}

export function clearPltc() {
    const data = loadUrgent()
    data.pltcKey = ""
    data.pltcUrl = ""
    saveUrgent(data)
    return { key: "", url: "" }
}

// ─── Client API Request (memakai PLTC) ───
async function clientFetch(endpoint) {
    const cfg = getPltcConfig()
    if (!cfg.url || !cfg.key) {
        throw new Error("Konfigurasi PLTC belum ada. Gunakan .setpltc untuk mengatur.")
    }

    try {
        const response = await http.get(`${cfg.url}/api/client${endpoint}`, {
            headers: {
                Authorization: `Bearer ${cfg.key}`,
                "Content-Type": "application/json",
                Accept: "application/json"
            }
        })
        return typeof response.data === "string" ? JSON.parse(response.data) : response.data
    } catch (error) {
        throw new Error(httpErrorMessage(error))
    }
}

// Live stats sebuah server via CLIENT API:
// { current_state, is_suspended, resources: { memory_bytes, cpu_absolute, disk_bytes, ... } }
export async function getServerResources(identifier) {
    const result = await clientFetch(`/servers/${identifier}/resources`)
    return unwrapItem(result)
}

// ─── PLTA User Operations ───

export async function createUserPlta(email, username, firstName, lastName, password) {
    const cfg = getPltaConfig()
    
    if (!cfg.url || !cfg.key) {
        throw new Error("Konfigurasi PLTA belum ada.")
    }

    try {
        const { body } = await cfPost(`${cfg.url}/api/application/users`, JSON.stringify({
            email,
            username,
            first_name: firstName,
            last_name: lastName,
            password
        }), {
            Authorization: `Bearer ${cfg.key}`,
            "Content-Type": "application/json",
            Accept: "application/json"
        })

        return JSON.parse(body)
    } catch (error) {
        throw new Error(`Gagal membuat user: ${error.message}`)
    }
}

export async function findUserPlta(query) {
    const cfg = getPltaConfig()
    
    if (!cfg.url || !cfg.key) {
        throw new Error("Konfigurasi PLTA belum ada.")
    }

    try {
        const { body } = await cfGet(`${cfg.url}/api/application/users?${new URLSearchParams({ search: query })}`, {
            Authorization: `Bearer ${cfg.key}`,
            Accept: "application/json"
        })

        const result = JSON.parse(body)
        if (!result.data || !Array.isArray(result.data)) {
            return null
        }

        return result.data.find(u => {
            const email = u.attributes?.email ?? u.email
            const username = u.attributes?.username ?? u.username
            return (
                email?.toLowerCase() === query.toLowerCase() ||
                username?.toLowerCase() === query.toLowerCase()
            )
        }) || null
    } catch {
        return null
    }
}

export async function getUserByIdPlta(userId) {
    const cfg = getPltaConfig()
    
    if (!cfg.url || !cfg.key) {
        throw new Error("Konfigurasi PLTA belum ada.")
    }

    try {
        const { body } = await cfGet(`${cfg.url}/api/application/users/${userId}`, {
            Authorization: `Bearer ${cfg.key}`,
            Accept: "application/json"
        })

        return JSON.parse(body)
    } catch {
        return null
    }
}

// ─── Urgent Mode (whitelist | blacklist) ───
//  • blacklist : semua node boleh dipakai, KECUALI yang ada di blacklist
//  • whitelist : HANYA node yang ada di whitelist yang boleh dipakai
export function getUrgentMode() {
    return loadUrgent().mode === "whitelist" ? "whitelist" : "blacklist"
}

export function setUrgentMode(mode) {
    const value = String(mode).toLowerCase().trim()
    if (value !== "whitelist" && value !== "blacklist") {
        throw new Error("Mode tidak valid. Gunakan: whitelist atau blacklist")
    }
    const data = loadUrgent()
    data.mode = value
    saveUrgent(data)
    return data.mode
}

// ─── Node Blacklist/Whitelist ───

export function getBlacklistNodes() {
    return loadUrgent().blacklistNodes || []
}

export function getWhitelistNodes() {
    return loadUrgent().whitelistNodes || []
}

export function blacklistNode(nodeId) {
    const data = loadUrgent()
    const id = String(nodeId)
    if (!data.blacklistNodes.includes(id)) {
        data.blacklistNodes.push(id)
        saveUrgent(data)
    }
    return data.blacklistNodes
}

export function removeBlacklistNode(nodeId) {
    const data = loadUrgent()
    const id = String(nodeId)
    data.blacklistNodes = data.blacklistNodes.filter((n) => n !== id)
    saveUrgent(data)
    return data.blacklistNodes
}

export function whitelistNode(nodeId) {
    const data = loadUrgent()
    const id = String(nodeId)
    if (!data.whitelistNodes.includes(id)) {
        data.whitelistNodes.push(id)
    }
    saveUrgent(data)
    return data.whitelistNodes
}

export function removeWhitelistNode(nodeId) {
    const data = loadUrgent()
    const id = String(nodeId)
    data.whitelistNodes = data.whitelistNodes.filter((n) => n !== id)
    saveUrgent(data)
    return data.whitelistNodes
}

export function isNodeBlacklisted(nodeId) {
    return getBlacklistNodes().includes(String(nodeId))
}

export function isNodeWhitelisted(nodeId) {
    const wl = getWhitelistNodes()
    if (wl.length === 0) return false
    return wl.includes(String(nodeId))
}

export function isNodeAllowed(nodeId) {
    const id = String(nodeId)
    // Mode whitelist: hanya node terdaftar yang boleh.
    if (getUrgentMode() === "whitelist") {
        return getWhitelistNodes().includes(id)
    }
    // Mode blacklist: semua boleh kecuali yang diblacklist.
    return !getBlacklistNodes().includes(id)
}

// ─── Status live seluruh node (untuk picker wl/bl & tampilan lain) ───
// Mengembalikan { nodes, status } — status[id] = { online, maintenance }.
// Node maintenance SELALU dianggap offline.
export async function getNodesWithStatus(options = {}) {
    const nodes = await getNodes()
    const entries = await Promise.all(
        nodes.map(async (node) => {
            const id = String(node.id ?? node.attributes?.id)
            const fqdn = node.fqdn ?? node.attributes?.fqdn
            const port = Number(node.daemon_listen ?? node.attributes?.daemon_listen) || 8080
            const maintenance = !!(node.maintenance_mode ?? node.attributes?.maintenance_mode)

            let online = false
            if (!maintenance && fqdn) {
                online = await pingDaemon(fqdn, port, options.timeout || 3500).catch(() => false)
            }

            return [id, { online: maintenance ? false : !!online, maintenance }]
        })
    )
    return { nodes, status: Object.fromEntries(entries) }
}

// ─── UUID Claim Tracking ───

export function getClaimedUUIDs() {
    return loadUrgent().claimedUUIDs || {}
}

export function isUUIDClaimed(uuid) {
    const claimed = getClaimedUUIDs()
    return !!claimed[String(uuid).toLowerCase()]
}

export function claimUUID(uuid, ownerJid, newServerId, extraData = {}) {
    const data = loadUrgent()
    const key = String(uuid).toLowerCase()
    if (!data.claimedUUIDs) data.claimedUUIDs = {}
    data.claimedUUIDs[key] = {
        uuid: key,
        ownerJid,
        newServerId,
        port: extraData.port || null,
        ipAlias: extraData.ipAlias || null,
        ipAddress: extraData.ipAddress || null,
        targetNode: extraData.targetNode || null,
        originalNode: extraData.originalNode || null,
        serverName: extraData.serverName || null,
        claimedAt: Date.now()
    }
    saveUrgent(data)
    return data.claimedUUIDs[key]
}

export function updateClaimUUID(uuid, extraData) {
    const data = loadUrgent()
    const key = String(uuid).toLowerCase()
    if (!data.claimedUUIDs || !data.claimedUUIDs[key]) return null
    data.claimedUUIDs[key] = { ...data.claimedUUIDs[key], ...extraData }
    saveUrgent(data)
    return data.claimedUUIDs[key]
}

export function deleteClaimUUID(uuid) {
    const data = loadUrgent()
    const key = String(uuid).toLowerCase()
    if (!data.claimedUUIDs) return false
    if (!data.claimedUUIDs[key]) return false
    delete data.claimedUUIDs[key]
    saveUrgent(data)
    return true
}

export function getClaimInfo(uuid) {
    return getClaimedUUIDs()[String(uuid).toLowerCase()] || null
}

// ─── Node Detection ───

/**
 * Cari node dari UUID server.
 * @param {string} serverUuid
 * @returns {Promise<{node: object, server: object}|null>}
 */
export async function findServerNode(serverUuid) {
    const uuid = String(serverUuid).toLowerCase()

    console.log(`[Urgent] Searching for UUID: ${uuid}`)

    const matchUuid = (s) => {
        const suuid = (s?.uuid ?? s?.attributes?.uuid)?.toLowerCase()
        const shortUuid = (s?.uuidShort ?? s?.attributes?.uuidShort)?.toLowerCase()
        return suuid === uuid || shortUuid === uuid || (uuid.length >= 8 && suuid?.startsWith(uuid))
    }

    // Method 1: Try to find via all servers endpoint
    try {
        console.log(`[Urgent] Method 1: Trying /servers endpoint...`)
        const servers = unwrapArr(await getAllServers())
        console.log(`[Urgent] Total servers from /servers: ${servers.length}`)

        for (const server of servers) {
            if (matchUuid(server)) {
                console.log(`[Urgent] Found server via /servers endpoint!`)

                // Setelah unwrap, `node` adalah integer node ID
                const nodeId = server.node?.id ?? server.node ?? server.attributes?.node?.id ?? server.attributes?.node
                if (nodeId != null) {
                    const node = await getNode(nodeId)
                    return { node, server }
                }
            }
        }
    } catch (error) {
        console.warn(`[Urgent] Method 1 failed: ${error.message}`)
    }

    // Method 2: Search through each node
    try {
        console.log(`[Urgent] Method 2: Searching through nodes...`)
        const nodeList = unwrapArr(await getNodes())
        console.log(`[Urgent] Total nodes: ${nodeList.length}`)

        for (const node of nodeList) {
            const nodeId = node.id ?? node.attributes?.id
            const nodeName = node.name ?? node.attributes?.name
            console.log(`[Urgent] Checking node: ${nodeName} (ID: ${nodeId})`)

            try {
                const servers = unwrapArr(await getNodeServers(nodeId))
                console.log(`[Urgent] Servers on node ${nodeId}: ${servers.length}`)

                const found = servers.find(matchUuid)

                if (found) {
                    console.log(`[Urgent] Found server on node ${nodeId}!`)
                    return { node, server: found }
                }
            } catch (error) {
                console.warn(`[Urgent] Failed to get servers for node ${nodeId}: ${error.message}`)
            }
        }
    } catch (error) {
        console.warn(`[Urgent] Method 2 failed: ${error.message}`)
    }

    console.log(`[Urgent] Server not found in any node`)
    return null
}

/**
 * Ambil detail server dari UUID.
 * @param {string} serverUuid
 * @returns {Promise<object|null>}
 */
export async function getServerByUUID(serverUuid) {
    const uuid = String(serverUuid).toLowerCase()

    const matchUuid = (s) => {
        const suuid = (s?.uuid ?? s?.attributes?.uuid)?.toLowerCase()
        const shortUuid = (s?.uuidShort ?? s?.attributes?.uuidShort)?.toLowerCase()
        return suuid === uuid || shortUuid === uuid || (uuid.length >= 8 && suuid?.startsWith(uuid))
    }

    // Try via all servers endpoint first
    try {
        const servers = unwrapArr(await getAllServers())
        const found = servers.find(matchUuid)
        if (found) return found
    } catch {}

    // Try through nodes
    const nodeList = unwrapArr(await getNodes())

    for (const node of nodeList) {
        try {
            const nodeId = node.id ?? node.attributes?.id
            const servers = unwrapArr(await getNodeServers(nodeId))

            const found = servers.find(matchUuid)
            if (found) return found
        } catch {
            continue
        }
    }

    return null
}

// ─── Server Creation (Clone to Another Node with Same Owner) ───

// Key environment yang diisi OTOMATIS oleh Pterodactyl (dari allocation,
// UUID, lokasi, dst). Jangan ikut dikirim saat create — nanti konflik.
const AUTO_ENV_KEYS = new Set([
    "STARTUP",
    "P_SERVER_UUID",
    "P_SERVER_LOCATION",
    "P_SERVER_ALLOCATION_LIMIT",
    "P_SERVER_IP",
    "P_SERVER_PORT",
    "P_SERVER_MAIN_PORT",
    "SERVER_IP",
    "SERVER_PORT",
    "SERVER_MEMORY",
    "SERVER_DISK",
    "HOME",
    "USER"
])

// ─── URUTAN ALLOCATION: cari → kalau belum ada BUAT DULU baru dipakai ───
//  1) Allocation port ini ADA & kosong           → langsung pakai id-nya.
//  2) Port ADA tapi semua sudah dipakai server   → tolak, suruh pilih port lain.
//  3) Port BELUM ADA di node                     → buat allocation BARU dulu
//     (POST /nodes/{id}/allocations), baru pakai id hasil buatnya.
async function findOrCreateAllocation(targetNodeId, port, { ipAlias, ipAddress } = {}) {
    const allocations = unwrapArr(await getNodeAllocations(targetNodeId)).map((a) => ({
        id: a.id ?? a.attributes?.id,
        ip: a.ip ?? a.attributes?.ip,
        port: Number(a.port ?? a.attributes?.port),
        assigned: !!(a.assigned ?? a.attributes?.assigned)
    }))

    const wanted = allocations.filter((a) => a.port === Number(port))

    // (1) langsung pakai allocation kosong
    const free = wanted.find((a) => !a.assigned)
    if (free) {
        console.log(`[Urgent] Allocation port ${port} sudah ada & kosong (ID: ${free.id})`)
        return { allocationId: free.id, created: false }
    }

    // (2) port ada tapi semua dipakai server lain → tidak bisa diduplikat
    if (wanted.length) {
        throw new Error(`Port ${port} sudah dipakai server lain di node target — pilih port lain.`)
    }

    // (3) belum ada → BUAT allocation baru DULU.
    //     Urutan IP calon:
    //     a) IP yang paling banyak dipakai allocation lain di node ini
    //        (konsisten "sama persis seperti server sebelumnya" di node itu)
    //     b) IP dari konfigurasi urgent (bila owner set selain 0.0.0.0)
    //     c) Hasil resolve DNS FQDN node
    //     d) 0.0.0.0 (wildcard) — fallback terakhir
    const ipCounts = {}
    for (const a of allocations) {
        if (a.ip) ipCounts[a.ip] = (ipCounts[a.ip] || 0) + 1
    }
    let allocIp = Object.keys(ipCounts).sort((x, y) => ipCounts[y] - ipCounts[x])[0] || null

    if (!allocIp && ipAddress && ipAddress !== "0.0.0.0" && ipAddress !== "::") {
        allocIp = ipAddress
    }

    if (!allocIp) {
        try {
            const nodeInfo = await getNode(targetNodeId)
            const fqdn = nodeInfo?.fqdn ?? nodeInfo?.attributes?.fqdn
            if (fqdn) {
                const { address } = await dns.promises.lookup(fqdn)
                allocIp = address
            }
        } catch (error) {
            console.warn(`[Urgent] Gagal resolve IP node ${targetNodeId}: ${error.message}`)
        }
    }

    if (!allocIp) allocIp = "0.0.0.0"

    console.log(`[Urgent] Port ${port} belum ada → BUAT allocation baru ${allocIp}:${port}${ipAlias ? ` (alias: ${ipAlias})` : ""}`)

    let created
    try {
        created = await createNodeAllocation(targetNodeId, {
            ip: allocIp,
            ports: [port],
            alias: ipAlias || undefined
        })
    } catch (error) {
        throw new Error(
            `Gagal menyiapkan allocation untuk port ${port}: ${error.message}` +
                (/unauthorized|forbidden|403/i.test(error.message)
                    ? "\n\n💡 Error 403 saat buat allocation = API key (PLTA) bersifat *Read-only*. Buat key Read & Write lalu set ulang dengan .setpterodactyl"
                    : "")
        )
    }

    const match = created.find((a) => Number(a.port ?? a.attributes?.port) === Number(port))
    const newId = match ? (match.id ?? match.attributes?.id) : null
    if (!newId) {
        throw new Error(`Allocation untuk port ${port} gagal dibuat (response panel tidak berisi id allocation).`)
    }

    console.log(`[Urgent] Allocation baru dibuat: ID ${newId} (${allocIp}:${port})`)
    return { allocationId: newId, created: true, ip: allocIp }
}

/**
 * Clone server ke node lain dengan owner yang SAMA.
 * docker_image, startup, environment, limits, dst dicopy PERSIS dari
 * server lama; field yang kosong dilengkapi dari data EGG — jadi tidak
 * ada yang ketinggalan.
 * @param {string|object} originalServer - UUID string atau server object
 * @param {string|number} targetNodeId - Node target
 * @param {number} [port] - Port spesifik (opsional; allocation dibuat otomatis bila belum ada)
 * @returns {Promise<object>}
 */
export async function cloneServer(originalServer, targetNodeId, port = null) {
    const { url, key } = getConfig()
    const config = loadUrgent()

    if (!url || !key) {
        throw new Error("Konfigurasi Pterodactyl belum ada.")
    }

    const ipAlias = config.ipAlias || "pvnode-4.nexhostku.com"
    const ipAddress = config.ipAddress || "0.0.0.0"

    let serverData;
    let serverUuid;
    
    if (typeof originalServer === "string") {
        console.log(`[Urgent] Looking up server by UUID: ${originalServer}`)
        const serverInfo = await getServerByUUID(originalServer)
        if (!serverInfo) {
            throw new Error(`Server dengan UUID "${originalServer}" tidak ditemukan.`)
        }
        
        // Handle both formats: { attributes: {...} } or flat object
        if (serverInfo.attributes) {
            serverData = serverInfo.attributes
            serverUuid = serverInfo.uuid || serverInfo.attributes.uuid
        } else {
            serverData = serverInfo
            serverUuid = serverInfo.uuid
        }
    } else {
        if (originalServer.attributes) {
            serverData = originalServer.attributes
            serverUuid = originalServer.uuid || originalServer.attributes.uuid
        } else {
            serverData = originalServer
            serverUuid = originalServer.uuid
        }
    }

    console.log(`[Urgent] Cloning server: ${serverUuid} -> Node: ${targetNodeId}, Port: ${port}`)

    // KUNCI: Ambil owner ID yang SAMA dari server asli.
    // Setelah unwrap, `user` adalah integer ID (bukan object).
    const ownerId = serverData.user?.id ?? serverData.user ?? serverData.user_id

    if (!ownerId) {
        console.error(`[Urgent] Server data:`, JSON.stringify(serverData, null, 2).substring(0, 1000))
        throw new Error("Tidak dapat menemukan owner ID dari server asli.")
    }

    console.log(`[Urgent] Using SAME owner ID: ${ownerId}`)

    const rawEnv = serverData.container?.environment || serverData.environment || {}
    const limits = serverData.limits || {}

    const nestId = Number(serverData.nest?.id ?? serverData.nest ?? rawEnv.NEST_ID) || 1
    const eggId = Number(serverData.egg?.id ?? serverData.egg ?? rawEnv.EGG_ID ?? rawEnv.EGG) || 1

    // ─── Data EGG: sumber docker_image, startup & variabel wajib ───
    // Dipakai untuk melengkapi field yang kosong di server lama,
    // jadi docker image & kawan-kawannya TIDAK ADA YANG KETINGGALAN.
    let egg = null
    let eggVars = []
    try {
        egg = await getEgg(nestId, eggId, true)
        const rel = egg?.relationships?.variables
        eggVars = Array.isArray(rel) ? rel : []
        console.log(`[Urgent] Egg #${eggId}: docker_image=${egg?.docker_image || "-"}, variabel=${eggVars.length}`)
    } catch (error) {
        console.warn(`[Urgent] Gagal ambil egg #${eggId}: ${error.message}`)
    }

    // Docker image — urutan: field server → container.image → env → egg.
    // CATATAN PENTING: Application API menaruh image di `container.image`,
    // bukan `docker_image` level atas (bug lama: field kosong → error
    // "The docker image field is required").
    const dockerImage =
        serverData.docker_image ||
        serverData.container?.image ||
        rawEnv.DOCKER_IMAGE ||
        egg?.docker_image ||
        (egg?.docker_images && typeof egg.docker_images === "object"
            ? Object.values(egg.docker_images)[0]
            : null) ||
        ""

    // Startup command: field server → container.startup_command → env → egg.
    const startup =
        serverData.startup ||
        serverData.container?.startup_command ||
        rawEnv.STARTUP ||
        egg?.startup ||
        ""

    if (!dockerImage) {
        throw new Error("Docker image server tidak diketahui (server & egg sama-sama kosong). Hubungi owner.")
    }
    if (!startup) {
        throw new Error("Startup command server tidak diketahui (server & egg sama-sama kosong). Hubungi owner.")
    }

    // ─── Environment: copy PENUH dari server lama (minus key otomatis),
    //     lalu LENGKAPI variabel egg yang belum ada pakai default egg.
    //     Dengan begini semua variabel pasti masuk — jangan ada yang ketinggalan.
    const envVars = {}
    for (const [k, v] of Object.entries(rawEnv)) {
        if (AUTO_ENV_KEYS.has(k) || k.startsWith("PTERODACTYL")) continue
        envVars[k] = v === null || v === undefined ? "" : String(v)
    }
    for (const ev of eggVars) {
        const key = ev?.env_variable ?? ev?.attributes?.env_variable
        if (!key || key in envVars) continue
        const def = ev?.default_value ?? ev?.attributes?.default_value ?? ""
        envVars[key] = def === null || def === undefined ? "" : String(def)
    }

    const numOr = (value, def) => {
        if (value === undefined || value === null || Number.isNaN(Number(value))) return def
        return Number(value)
    }

    // Limits dicopy persis dari server lama (default hanya kalau data hilang).
    const memory = numOr(limits.memory ?? rawEnv.LIMIT_MEMORY, 1024)
    const disk = numOr(limits.disk ?? rawEnv.LIMIT_DISK, 5120)
    const cpu = numOr(limits.cpu ?? rawEnv.LIMIT_CPU, 100)
    const swap = numOr(limits.swap, 0)
    const io = numOr(limits.io, 500)
    const threads = limits.threads ?? rawEnv.CPU_THREADS ?? null

    const newName = (serverData.name || "Server") + "_CLONE"

    // ─── ALLOCATION: urutan yang benar ───
    //     cari allocation kosong → bila BELUM ADA, buat BARU dulu,
    //     baru masukkan ke payload (findOrCreateAllocation menangani).
    if (port === null || port === undefined || port === "") {
        const autoPort = await pickAutoPort(targetNodeId)
        if (!autoPort) {
            throw new Error("Tidak ada port yang bisa dipakai di node target.")
        }
        port = autoPort
        console.log(`[Urgent] Auto-pick port: ${port}`)
    }

    const alloc = await findOrCreateAllocation(targetNodeId, port, { ipAlias, ipAddress })
    const allocationId = alloc.allocationId
    const allocationCreated = !!alloc.created

    // Payload LENGKAP sesuai Application API Pterodactyl.
    // PENTING: `allocation` WAJIB object { default: <allocation_id> } —
    // mengirim id mentah = error "The allocation.default field is required."
    const createPayload = {
        name: newName,
        description: `Emergency clone from ${serverUuid} (same owner)`,
        user: Number(ownerId),
        egg: eggId,
        docker_image: dockerImage,
        startup: startup,
        environment: envVars,
        skip_scripts: false,
        limits: {
            memory,
            disk,
            cpu,
            swap,
            io,
            threads
        },
        feature_limits: {
            databases: numOr(serverData.feature_limits?.databases, 0),
            allocations: numOr(serverData.feature_limits?.allocations, 1),
            backups: numOr(serverData.feature_limits?.backups, 0)
        },
        allocation: { default: allocationId },
        start_on_completion: true
    }

    console.log(`[Urgent] Creating server "${newName}" | owner=${ownerId} egg=${eggId} alloc=${allocationId} port=${port}${allocationCreated ? " (allocation BARU dibuat)" : ""}`)

    try {
        const { body } = await cfPost(`${url}/api/application/servers`, JSON.stringify(createPayload), {
            Authorization: `Bearer ${key}`,
            "Content-Type": "application/json",
            Accept: "application/json"
        })

        let result;
        try {
            result = JSON.parse(body)
        } catch {
            result = body
        }
        
        console.log(`[Urgent] Server created successfully!`)

        result._requestedPort = port
        result._allocationId = allocationId
        result._allocationCreated = allocationCreated
        result._dockerImage = dockerImage
        result._ipAlias = ipAlias
        result._ipAddress = ipAddress
        result._originalOwnerId = ownerId
        result._originalServerUuid = serverUuid

        return result
    } catch (error) {
        console.error(`[Urgent] Clone error: ${error.message}`)
        let msg = `Gagal membuat server: ${error.message}`
        // 403 khas Pterodactyl untuk API key read-only / tanpa izin tulis
        if (/unauthorized|forbidden|403/i.test(error.message)) {
            msg +=
                "\n\n💡 Error 403 (unauthorized) biasanya karena API key (PLTA) " +
                "bersifat *Read-only*. Buat key baru di Admin Area → API Credentials " +
                "dengan permission *Read & Write*, lalu set ulang dengan .setpterodactyl"
        }
        throw new Error(msg)
    }
}

export async function emergencyClone(serverUuid, targetNodeId, port = null) {
    return cloneServer(serverUuid, targetNodeId, port)
}

// ─── Default Export ───
export default {
    getUrgentConfig,
    isUrgentOpen,
    openUrgent,
    closeUrgent,
    getUrgentMode,
    setUrgentMode,
    setDefaultNode,
    clearDefaultNode,
    getBlacklistNodes,
    getWhitelistNodes,
    blacklistNode,
    removeBlacklistNode,
    whitelistNode,
    removeWhitelistNode,
    isNodeBlacklisted,
    isNodeWhitelisted,
    isNodeAllowed,
    getNodesWithStatus,
    getClaimedUUIDs,
    isUUIDClaimed,
    claimUUID,
    updateClaimUUID,
    deleteClaimUUID,
    getClaimInfo,
    setUrgentSession,
    findUrgentSession,
    deleteUrgentSession,
    hasUrgentSession,
    findServerNode,
    getServerByUUID,
    cloneServer,
    emergencyClone,
    getIpAlias,
    getIpAddress,
    setIpAlias,
    setIpAddress,
    setIpConfig,
    resetIpConfig,
    getPanelUrl,
    isPanelConfigured,
    getPltaConfig,
    isPltaConfigured,
    setPltaConfig,
    clearPlta,
    getPltcConfig,
    isPltcConfigured,
    setPltcConfig,
    clearPltc,
    getServerResources,
    createUserPlta,
    findUserPlta,
    getUserByIdPlta,
    hasActiveLock,
    getLockInfo,
    isPortLocked,
    createLock,
    updateLockPort,
    releaseLock,
    cleanupExpiredLocks,
    getAllocatedPorts,
    isPortAvailable,
    generateAvailablePort,
    getAvailablePortList,
    getPortState,
    getAllNodePorts,
    generateCreatablePort,
    pickAutoPort
}
