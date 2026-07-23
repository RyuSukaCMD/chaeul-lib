import { readJSON, writeJSON } from "./db.js"
import { getConfig, getNodes, getNode, getLocations, getNodeServers, getNodeAllocations, getServer } from "./pterodactyl.js"
import cloudscraper from "cloudscraper"

const { get: cfGet, post: cfPost, request: cfRequest } = cloudscraper

// ─── Database File ───
const URGENT_DB = "./database/urgent.json"
const PORT_LOCK_DB = "./database/port_lock.json"

// ─── JSON Loader / Saver ───
function loadUrgent() {
    return readJSON(URGENT_DB, {
        enabled: false,
        defaultNode: null,
        blacklistNodes: [],
        whitelistNodes: [],
        claimedUUIDs: {},
        // IP Configuration
        ipAlias: "pvnode-4.nexhostku.com",
        ipAddress: "0.0.0.0",
        // PLTA Configuration (untuk create panel/user)
        pltaUrl: "",
        pltaKey: "",
        createdAt: null
    })
}

function loadPortLock() {
    return readJSON(PORT_LOCK_DB, {
        locks: {},      // { userJid: { port, expiresAt, uuid } }
        portStatus: {}  // { port: userJid } - port yang sedang diproses
    })
}

function saveUrgent(data) {
    writeJSON(URGENT_DB, data)
}

function savePortLock(data) {
    writeJSON(PORT_LOCK_DB, data)
}

// ─── PORT ALLOCATION SYSTEM ───

const LOCK_DURATION = 5 * 60 * 1000 // 5 menit lock
const PORT_RANGE_START = 10000
const PORT_RANGE_END = 65535

/**
 * Ambil semua port lock yang aktif.
 */
function getPortLocks() {
    const data = loadPortLock()
    return data.locks || {}
}

/**
 * Ambil status port yang sedang diproses.
 */
function getPortStatus() {
    const data = loadPortLock()
    return data.portStatus || {}
}

/**
 * Cek apakah user memiliki lock aktif.
 */
export function hasActiveLock(userJid) {
    const locks = getPortLocks()
    const lock = locks[userJid]
    if (!lock) return false
    
    // Cek apakah lock sudah expired
    if (Date.now() > lock.expiresAt) {
        // Auto-release expired lock
        releaseLock(userJid)
        return false
    }
    return true
}

/**
 * Ambil info lock user.
 */
export function getLockInfo(userJid) {
    const locks = getPortLocks()
    return locks[userJid] || null
}

/**
 * Cek apakah port sedang dikunci oleh user lain.
 */
export function isPortLocked(port, excludeUser = null) {
    const status = getPortStatus()
    const locks = getPortLocks()
    const portStr = String(port)
    
    // Cek portStatus
    if (status[portStr] && status[portStr] !== excludeUser) {
        return { locked: true, by: status[portStr], reason: "sedang diproses user lain" }
    }
    
    // Cek locks (yang belum expired)
    for (const [user, lock] of Object.entries(locks)) {
        if (user === excludeUser) continue
        if (Date.now() <= lock.expiresAt && lock.port === portStr) {
            return { locked: true, by: user, reason: "sedang diproses user lain" }
        }
    }
    
    return { locked: false }
}

/**
 * Buat lock untuk user dengan port yang dipilih.
 */
export function createLock(userJid, uuid, preferredPort = null) {
    const data = loadPortLock()
    
    // Hapus lock lama jika ada
    const oldLock = data.locks[userJid]
    if (oldLock?.port) {
        delete data.portStatus[oldLock.port]
    }
    
    data.locks[userJid] = {
        uuid: uuid,
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

/**
 * Update port yang dipilih user.
 */
export function updateLockPort(userJid, port) {
    const data = loadPortLock()
    const lock = data.locks[userJid]
    
    if (!lock) return null
    
    // Hapus port lama dari status
    if (lock.port) {
        delete data.portStatus[lock.port]
    }
    
    // Update port baru
    lock.port = String(port)
    data.portStatus[lock.port] = userJid
    lock.expiresAt = Date.now() + LOCK_DURATION // Reset expiry
    
    savePortLock(data)
    return lock
}

/**
 * Release lock user.
 */
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

/**
 * Cleanup expired locks.
 */
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

/**
 * Ambil port yang sudah di-allocation di suatu node.
 */
export async function getAllocatedPorts(nodeId) {
    try {
        const allocData = await getNodeAllocations(nodeId)
        const allocations = allocData?.data || allocData || []
        
        const ports = []
        for (const alloc of allocations) {
            if (alloc.attributes?.assigned) {
                ports.push(alloc.attributes.port)
            }
        }
        return ports
    } catch (error) {
        console.warn("[Urgent] Gagal ambil allocations:", error.message)
        return []
    }
}

/**
 * Cek apakah port tersedia di node.
 */
export async function isPortAvailable(nodeId, port) {
    const allocatedPorts = await getAllocatedPorts(nodeId)
    return !allocatedPorts.includes(port)
}

/**
 * Generate port acak yang tersedia.
 */
export async function generateAvailablePort(nodeId, excludePorts = []) {
    const allocatedPorts = await getAllocatedPorts(nodeId)
    const allPorts = new Set([...allocatedPorts, ...excludePorts])
    
    // Coba cari port acak
    const maxAttempts = 100
    for (let i = 0; i < maxAttempts; i++) {
        const port = Math.floor(Math.random() * (PORT_RANGE_END - PORT_RANGE_START)) + PORT_RANGE_START
        
        // Skip ports yang sudah dialokasi atau di-exclude
        if (allPorts.has(port)) continue
        
        // Skip ports yang sedang di-lock
        const lockStatus = isPortLocked(port)
        if (lockStatus.locked) continue
        
        return port
    }
    
    // Fallback: cari port sequential dari range
    for (let port = PORT_RANGE_START; port <= PORT_RANGE_END; port++) {
        if (allPorts.has(port)) continue
        const lockStatus = isPortLocked(port)
        if (lockStatus.locked) continue
        return port
    }
    
    return null // Tidak ada port tersedia
}

/**
 * Ambil daftar port yang bisa dipilih user (yang available).
 */
export async function getAvailablePortList(nodeId, limit = 10) {
    const allocatedPorts = await getAllocatedPorts(nodeId)
    const allocatedSet = new Set(allocatedPorts)
    const status = getPortStatus()
    const locks = getPortLocks()
    const now = Date.now()
    
    // Kumpulkan port yang tidak tersedia
    const unavailable = new Set(allocatedPorts)
    for (const port of Object.keys(status)) {
        unavailable.add(parseInt(port))
    }
    for (const [user, lock] of Object.entries(locks)) {
        if (now <= lock.expiresAt && lock.port) {
            unavailable.add(parseInt(lock.port))
        }
    }
    
    const available = []
    
    for (let port = PORT_RANGE_START; port <= PORT_RANGE_END; port++) {
        if (!unavailable.has(port)) {
            available.push(port)
        }
        if (available.length >= limit + 50) break
    }
    
    // Ambil beberapa port acak dari yang tersedia
    const shuffled = available.sort(() => Math.random() - 0.5)
    return shuffled.slice(0, limit)
}

// ─── Urgent System Config ───

/** Ambil konfigurasi urgent system. */
export function getUrgentConfig() {
    return loadUrgent()
}

/** Cek apakah urgent system sudah dibuka. */
export function isUrgentOpen() {
    return loadUrgent().enabled === true
}

/** Buka urgent system. */
export function openUrgent() {
    const data = loadUrgent()
    data.enabled = true
    data.createdAt = Date.now()
    saveUrgent(data)
    return data
}

/** Tutup urgent system. */
export function closeUrgent() {
    const data = loadUrgent()
    data.enabled = false
    saveUrgent(data)
    return data
}

/** Set default node untuk emergency. */
export function setDefaultNode(nodeId) {
    const data = loadUrgent()
    data.defaultNode = nodeId
    saveUrgent(data)
    return data
}

/** Hapus default node. */
export function clearDefaultNode() {
    const data = loadUrgent()
    data.defaultNode = null
    saveUrgent(data)
    return data
}

// ─── IP Configuration ───

/** Ambil IP alias. */
export function getIpAlias() {
    const data = loadUrgent()
    return data.ipAlias || "pvnode-4.nexhostku.com"
}

/** Ambil IP address. */
export function getIpAddress() {
    const data = loadUrgent()
    return data.ipAddress || "0.0.0.0"
}

/** Set IP alias. */
export function setIpAlias(alias) {
    const data = loadUrgent()
    data.ipAlias = String(alias).trim()
    saveUrgent(data)
    return data.ipAlias
}

/** Set IP address. */
export function setIpAddress(ip) {
    const data = loadUrgent()
    // Validasi format IP
    const ipPattern = /^(\d{1,3}\.){3}\d{1,3}$|^(0\.0\.0\.0)$|^::$/i
    if (!ipPattern.test(ip)) {
        throw new Error("Format IP tidak valid. Contoh: 192.168.1.1 atau 0.0.0.0")
    }
    data.ipAddress = String(ip).trim()
    saveUrgent(data)
    return data.ipAddress
}

/** Set kedua IP alias dan address sekaligus. */
export function setIpConfig(alias, address) {
    const data = loadUrgent()
    
    // Validate IP format
    const ipPattern = /^(\d{1,3}\.){3}\d{1,3}$|^(0\.0\.0\.0)$|^::$/i
    if (!ipPattern.test(address)) {
        throw new Error("Format IP tidak valid. Contoh: 192.168.1.1 atau 0.0.0.0")
    }
    
    data.ipAlias = String(alias).trim()
    data.ipAddress = String(address).trim()
    saveUrgent(data)
    return { ipAlias: data.ipAlias, ipAddress: data.ipAddress }
}

/** Reset IP ke default. */
export function resetIpConfig() {
    const data = loadUrgent()
    data.ipAlias = "pvnode-4.nexhostku.com"
    data.ipAddress = "0.0.0.0"
    saveUrgent(data)
    return { ipAlias: data.ipAlias, ipAddress: data.ipAddress }
}

// ─── Panel URL ───

/** Ambil panel URL dari Pterodactyl config. */
export function getPanelUrl() {
    const cfg = getConfig()
    return cfg?.url || ""
}

/** Cek apakah panel URL sudah diset. */
export function isPanelConfigured() {
    return getConfig().url && getConfig().key
}

// ─── PLTA Configuration ───

/** Ambil konfigurasi PLTA. */
export function getPltaConfig() {
    const data = loadUrgent()
    return {
        key: data.pltaKey || "",
        url: data.pltaUrl || ""
    }
}

/** Cek apakah PLTA sudah dikonfigurasi. */
export function isPltaConfigured() {
    const cfg = getPltaConfig()
    return !!(cfg.key && cfg.url)
}

/** Set PLTA key dan URL. */
export function setPltaConfig(url, key) {
    const data = loadUrgent()
    
    // Validasi URL
    let cleanUrl = String(url).trim()
    if (!cleanUrl.startsWith("http")) {
        cleanUrl = "https://" + cleanUrl
    }
    try {
        new URL(cleanUrl)
    } catch {
        throw new Error("Format URL PLTA tidak valid.")
    }
    
    // Validasi key
    const cleanKey = String(key).trim()
    if (!cleanKey) {
        throw new Error("PLTA Key tidak boleh kosong.")
    }
    
    data.pltaUrl = cleanUrl.replace(/\/$/, "")
    data.pltaKey = cleanKey
    saveUrgent(data)
    return { url: data.pltaUrl, key: data.pltaKey }
}

/** Clear PLTA config. */
export function clearPlta() {
    const data = loadUrgent()
    data.pltaKey = ""
    data.pltaUrl = ""
    saveUrgent(data)
    return { key: "", url: "" }
}

// ─── Cloudflare Bypass Helper for PLTA ───

/**
 * Create user di Pterodactyl menggunakan PLTA API.
 * @param {string} email - Email user
 * @param {string} username - Username user
 * @param {string} firstName - Nama depan
 * @param {string} lastName - Nama belakang
 * @param {string} password - Password user
 * @returns {Promise<object>}
 */
export async function createUserPlta(email, username, firstName, lastName, password) {
    const cfg = getPltaConfig()
    
    if (!cfg.url || !cfg.key) {
        throw new Error("Konfigurasi PLTA belum ada. Gunakan .setplta <url> <key>.")
    }

    const response = await cfPost({
        uri: `${cfg.url}/api/application/users`,
        headers: {
            Authorization: `Bearer ${cfg.key}`,
            "Content-Type": "application/json",
            Accept: "application/json"
        },
        body: JSON.stringify({
            email: email,
            username: username,
            first_name: firstName,
            last_name: lastName,
            password: password
        })
    })

    try {
        return JSON.parse(response)
    } catch {
        return response
    }
}

/**
 * Find user by email atau username di Pterodactyl.
 * @param {string} query - Email atau username
 * @returns {Promise<object|null>}
 */
export async function findUserPlta(query) {
    const cfg = getPltaConfig()
    
    if (!cfg.url || !cfg.key) {
        throw new Error("Konfigurasi PLTA belum ada.")
    }

    const response = await cfGet({
        uri: `${cfg.url}/api/application/users?${new URLSearchParams({ search: query })}`,
        headers: {
            Authorization: `Bearer ${cfg.key}`,
            Accept: "application/json"
        }
    })

    let result;
    try {
        result = JSON.parse(response)
    } catch {
        result = response
    }

    if (!result.data || !Array.isArray(result.data)) {
        return null
    }

    const users = result.data
    
    // Cari user yang cocok
    const found = users.find(u => 
        u.attributes?.email?.toLowerCase() === query.toLowerCase() ||
        u.attributes?.username?.toLowerCase() === query.toLowerCase()
    )
    
    return found || null
}

/**
 * Get user by ID dari Pterodactyl.
 * @param {number|string} userId
 * @returns {Promise<object|null>}
 */
export async function getUserByIdPlta(userId) {
    const cfg = getPltaConfig()
    
    if (!cfg.url || !cfg.key) {
        throw new Error("Konfigurasi PLTA belum ada.")
    }

    try {
        const response = await cfGet({
            uri: `${cfg.url}/api/application/users/${userId}`,
            headers: {
                Authorization: `Bearer ${cfg.key}`,
                Accept: "application/json"
            }
        })

        try {
            return JSON.parse(response)
        } catch {
            return response
        }
    } catch {
        return null
    }
}

// ─── Node Blacklist/Whitelist ───

/** Ambil semua node blacklist. */
export function getBlacklistNodes() {
    return loadUrgent().blacklistNodes || []
}

/** Ambil semua node whitelist. */
export function getWhitelistNodes() {
    return loadUrgent().whitelistNodes || []
}

/** Blacklist sebuah node. */
export function blacklistNode(nodeId) {
    const data = loadUrgent()
    const id = String(nodeId)
    if (!data.blacklistNodes.includes(id)) {
        data.blacklistNodes.push(id)
        saveUrgent(data)
    }
    return data.blacklistNodes
}

/** Whitelist sebuah node. */
export function whitelistNode(nodeId) {
    const data = loadUrgent()
    const id = String(nodeId)
    // Hapus dari blacklist jika ada
    data.blacklistNodes = data.blacklistNodes.filter((n) => n !== id)
    // Tambah ke whitelist
    if (!data.whitelistNodes.includes(id)) {
        data.whitelistNodes.push(id)
    }
    saveUrgent(data)
    return data.whitelistNodes
}

/** Hapus dari whitelist. */
export function removeWhitelistNode(nodeId) {
    const data = loadUrgent()
    const id = String(nodeId)
    data.whitelistNodes = data.whitelistNodes.filter((n) => n !== id)
    saveUrgent(data)
    return data.whitelistNodes
}

/** Cek apakah node diblacklist. */
export function isNodeBlacklisted(nodeId) {
    return getBlacklistNodes().includes(String(nodeId))
}

/** Cek apakah node diwhitelist. */
export function isNodeWhitelisted(nodeId) {
    const wl = getWhitelistNodes()
    if (wl.length === 0) return false // Jika whitelist kosong, semua node boleh
    return wl.includes(String(nodeId))
}

/** Cek apakah node boleh digunakan untuk urgent. */
export function isNodeAllowed(nodeId) {
    const id = String(nodeId)
    // Jika ada blacklist, node tidak boleh di blacklist
    if (isNodeBlacklisted(id)) return false
    // Jika ada whitelist, node harus di whitelist
    if (!isNodeWhitelisted(id)) return false
    return true
}

// ─── UUID Claim Tracking ───

/** Ambil semua UUID yang sudah di-claim. */
export function getClaimedUUIDs() {
    return loadUrgent().claimedUUIDs || {}
}

/** Cek apakah UUID sudah di-claim. */
export function isUUIDClaimed(uuid) {
    const claimed = getClaimedUUIDs()
    return !!claimed[String(uuid).toLowerCase()]
}

/** Claim UUID dengan info lengkap. */
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

/** Update info claim UUID. */
export function updateClaimUUID(uuid, extraData) {
    const data = loadUrgent()
    const key = String(uuid).toLowerCase()
    if (!data.claimedUUIDs || !data.claimedUUIDs[key]) return null
    data.claimedUUIDs[key] = { ...data.claimedUUIDs[key], ...extraData }
    saveUrgent(data)
    return data.claimedUUIDs[key]
}

/** Hapus claim UUID (admin). */
export function deleteClaimUUID(uuid) {
    const data = loadUrgent()
    const key = String(uuid).toLowerCase()
    if (!data.claimedUUIDs) return false
    if (!data.claimedUUIDs[key]) return false
    delete data.claimedUUIDs[key]
    saveUrgent(data)
    return true
}

/** Ambil info claim dari UUID. */
export function getClaimInfo(uuid) {
    const claimed = getClaimedUUIDs()
    return claimed[String(uuid).toLowerCase()] || null
}

// ─── Node Detection ───

/**
 * Cari node dari UUID server.
 * @param {string} serverUuid
 * @returns {Promise<{node: object, server: object}|null>}
 */
export async function findServerNode(serverUuid) {
    const uuid = String(serverUuid).toLowerCase()

    // Ambil semua node
    const nodes = await getNodes()
    const nodeList = nodes?.data || nodes || []

    console.log("[Urgent] Searching for UUID:", uuid)
    console.log("[Urgent] Total nodes:", nodeList.length)

    if (nodeList.length === 0) {
        console.warn("[Urgent] No nodes found from API")
        return null
    }

    // Ambil data server untuk setiap node
    for (const node of nodeList) {
        try {
            console.log("[Urgent] Checking node:", node.name, "(ID:", node.id + ")")

            // Coba cari server di node ini
            const serversData = await getNodeServers(node.id)
            const servers = serversData?.data || serversData || []

            console.log("[Urgent] Servers on node", node.id + ":", servers.length)

            const server = servers.find(
                (s) => s.uuid?.toLowerCase() === uuid || s.uuidShort?.toLowerCase() === uuid
            )

            if (server) {
                console.log("[Urgent] Found server:", server.name || server.uuid)
                return { node, server }
            }
        } catch (error) {
            console.warn("[Urgent] Gagal cek node", node.id + ":", error.message)
            continue
        }
    }

    console.log("[Urgent] Server not found in any node")
    return null
}

/**
 * Ambil detail lengkap server dari UUID.
 * @param {string} serverUuid
 * @returns {Promise<object|null>}
 */
export async function getServerByUUID(serverUuid) {
    const uuid = String(serverUuid).toLowerCase()

    // Ambil semua node
    const nodes = await getNodes()
    const nodeList = nodes?.data || nodes || []

    for (const node of nodeList) {
        try {
            const serversData = await getNodeServers(node.id)
            const servers = serversData?.data || serversData || []

            const server = servers.find(
                (s) => s.uuid?.toLowerCase() === uuid || s.uuidShort?.toLowerCase() === uuid
            )

            if (server) {
                return server
            }
        } catch {
            continue
        }
    }

    return null
}

// ─── Server Creation (Clone to Another Node with Same Owner) ───

/**
 * Clone server ke node lain dengan owner yang SAMA.
 * Ini menduplikasi server tanpa perlu membuat user baru.
 * 
 * @param {object} originalServer - Data server asli (bisa UUID string atau object)
 * @param {string|number} targetNodeId - Node target untuk server baru
 * @param {number} [port] - Port spesifik (opsional, jika null akan auto-generate)
 * @returns {Promise<object>}
 */
export async function cloneServer(originalServer, targetNodeId, port = null) {
    const { url, key } = getConfig()
    const config = loadUrgent()

    if (!url || !key) {
        throw new Error("Konfigurasi Pterodactyl belum ada. Gunakan .setup untuk mengatur.")
    }

    // Ambil IP config
    const ipAlias = config.ipAlias || "pvnode-4.nexhostku.com"
    const ipAddress = config.ipAddress || "0.0.0.0"

    // Ambil data server asli - bisa UUID string atau object
    let serverData;
    let serverUuid;
    
    if (typeof originalServer === "string") {
        // originalServer adalah UUID, cari detail server
        console.log("[Urgent] Looking up server by UUID:", originalServer)
        const serverInfo = await getServerByUUID(originalServer)
        if (!serverInfo) {
            throw new Error(`Server dengan UUID "${originalServer}" tidak ditemukan.`)
        }
        serverData = serverInfo.attributes || serverInfo
        serverUuid = serverInfo.uuid || originalServer
    } else {
        serverData = originalServer.attributes || originalServer
        serverUuid = serverData.uuid
    }

    console.log("[Urgent] Creating server:", serverUuid, "-> Node:", targetNodeId, "Port:", port)

    // KUNCI UTAMA: Ambil owner ID yang SAMA dari server asli
    // Ini memastikan server baru dimiliki oleh user yang sama
    const ownerId = serverData.user?.id
    
    if (!ownerId) {
        throw new Error("Tidak dapat menemukan owner ID dari server asli. Pastikan data server lengkap.")
    }
    
    console.log("[Urgent] Using SAME owner ID:", ownerId)

    // Parse resource limits dari container environment
    const env = serverData.container?.environment || serverData.environment || {}
    const limits = serverData.limits || {}

    // Egg dan Nest info
    const nestId = serverData.nest?.id || env.NEST_ID || 1
    const eggId = serverData.egg?.id || env.EGG_ID || env.EGG || 1
    const locationId = serverData.location?.id || env.LOCATION_ID || 1

    // Resource limits
    const memory = limits.memory || parseInt(env.LIMIT_MEMORY) || 1024
    const disk = limits.disk || parseInt(env.LIMIT_DISK) || 5120
    const cpu = limits.cpu || parseInt(env.LIMIT_CPU) || 100
    const swap = limits.swap || parseInt(env.LIMIT_SWAP) || 0
    const io = limits.io || parseInt(env.LIMIT_IO) || 500
    const threads = env.CPU_THREADS || null

    // Build environment variables yang perlu disalin
    const envVars = {}
    for (const [k, v] of Object.entries(env)) {
        // Skip internal vars
        if (!["STARTUP", "PTERODACTYL", "HOME", "USER"].includes(k)) {
            envVars[k] = v
        }
    }

    // Startup command
    const startup = serverData.startup || env.STARTUP || ""

    // Docker image
    const dockerImage = serverData.docker_image || env.DOCKER_IMAGE || ""

    // Nama server baru (tambahkan suffix _CLONE)
    const newName = (serverData.name || "Server") + "_CLONE"

    // Handle port allocation
    let allocationId = null
    
    // Jika port specified, cari allocation ID-nya
    if (port) {
        const allocData = await getNodeAllocations(targetNodeId)
        const allocations = allocData?.data || allocData || []
        
        // Cari allocation yang sesuai port
        const foundAlloc = allocations.find((a) => 
            a.attributes?.port === port && !a.attributes?.assigned
        )
        
        if (foundAlloc) {
            allocationId = foundAlloc.id
        } else {
            // Port specified tapi tidak ditemukan/tersedia
            throw new Error("Port " + port + " tidak tersedia atau sudah digunakan.")
        }
    } else {
        // Auto-generate port - cari port yang tidak digunakan
        const autoPort = await generateAvailablePort(targetNodeId)
        if (!autoPort) {
            throw new Error("Tidak ada port tersedia di node target.")
        }
        
        // Update port yang dipilih
        port = autoPort
        
        const allocData = await getNodeAllocations(targetNodeId)
        const allocations = allocData?.data || allocData || []
        
        const foundAlloc = allocations.find((a) => 
            a.attributes?.port === autoPort && !a.attributes?.assigned
        )
        
        if (foundAlloc) {
            allocationId = foundAlloc.id
        }
    }

    // Request body untuk create server dengan OWNER YANG SAMA
    const createPayload = {
        name: newName,
        description: "Emergency clone from " + serverUuid + " (same owner)",
        user: ownerId, // <-- OWNER SAMA DENGAN SERVER ASLI!
        egg: eggId,
        docker_image: dockerImage,
        startup: startup,
        environment: envVars,
        limits: {
            memory: memory,
            disk: disk,
            cpu: cpu,
            swap: swap,
            io: io,
            threads: threads
        },
        feature_limits: {
            databases: serverData.feature_limits?.databases || 0,
            allocations: serverData.feature_limits?.allocations || 1,
            backups: serverData.feature_limits?.backups || 0
        },
        allocation: allocationId,
        location: locationId,
        node: targetNodeId,
        mount: serverData.mounts?.map((m) => m.id) || []
    }

    console.log("[Urgent] Payload (same owner):", JSON.stringify(createPayload, null, 2))
    console.log("[Urgent] Owner ID:", ownerId, "(SAME as original server)")

    // Kirim request ke API dengan Cloudflare bypass
    try {
        const response = await cfPost({
            uri: url + "/api/application/servers",
            headers: {
                Authorization: `Bearer ${key}`,
                "Content-Type": "application/json",
                Accept: "application/json"
            },
            body: JSON.stringify(createPayload)
        })

        let result;
        try {
            result = JSON.parse(response)
        } catch {
            result = response
        }
        
        console.log("[Urgent] Server created successfully:", result)
        
        // Tambahkan info ke result
        if (port) {
            result._requestedPort = port
        }
        result._ipAlias = ipAlias
        result._ipAddress = ipAddress
        result._originalOwnerId = ownerId
        result._originalServerUuid = serverUuid
        
        return result
    } catch (error) {
        const errorText = error.message || String(error)
        
        // Check for Cloudflare
        if (error.response?.body?.includes("Cloudflare") || errorText.includes("Cloudflare")) {
            throw new Error(`Cloudflare Protection: Gagal bypass saat create server.`)
        }
        
        // Parse error untuk pesan yang lebih jelas
        let errorMsg = "Gagal membuat server: " + errorText
        try {
            if (error.response?.body) {
                const errorJson = JSON.parse(error.response.body)
                if (errorJson.errors?.[0]?.detail) {
                    errorMsg = errorJson.errors[0].detail
                }
            }
        } catch {}
        
        console.error("[Urgent] Clone error:", errorMsg)
        throw new Error(errorMsg)
    }
}

/**
 * Emergency clone: Clone server dengan UUID ke node tujuan.
 * Lebih sederhana - cukup berikan UUID server dan node target.
 * 
 * @param {string} serverUuid - UUID server yang akan di-clone
 * @param {string|number} targetNodeId - Node ID tujuan
 * @param {number} [port] - Port spesifik (opsional)
 * @returns {Promise<object>}
 */
export async function emergencyClone(serverUuid, targetNodeId, port = null) {
    return cloneServer(serverUuid, targetNodeId, port)
}

// ─── Default Export ───
export default {
    getUrgentConfig,
    isUrgentOpen,
    openUrgent,
    closeUrgent,
    setDefaultNode,
    clearDefaultNode,
    getBlacklistNodes,
    getWhitelistNodes,
    blacklistNode,
    whitelistNode,
    removeWhitelistNode,
    isNodeBlacklisted,
    isNodeWhitelisted,
    isNodeAllowed,
    getClaimedUUIDs,
    isUUIDClaimed,
    claimUUID,
    updateClaimUUID,
    deleteClaimUUID,
    getClaimInfo,
    findServerNode,
    getServerByUUID,
    cloneServer,
    emergencyClone,
    // IP Configuration
    getIpAlias,
    getIpAddress,
    setIpAlias,
    setIpAddress,
    setIpConfig,
    resetIpConfig,
    // Panel URL
    getPanelUrl,
    isPanelConfigured,
    // PLTA
    getPltaConfig,
    isPltaConfigured,
    setPltaConfig,
    clearPlta,
    createUserPlta,
    findUserPlta,
    getUserByIdPlta,
    // Port system
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
    getAvailablePortList
}
