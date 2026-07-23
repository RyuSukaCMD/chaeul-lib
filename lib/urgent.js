import { readJSON, writeJSON } from "./db.js"
import { getConfig, getNodes, getNode, getLocations, getNodeServers, getNodeAllocations } from "./pterodactyl.js"

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
    const maxSearch = 1000
    let count = 0
    
    for (let port = PORT_RANGE_START; port <= PORT_RANGE_END && count < limit + 50; port++) {
        if (!unavailable.has(port)) {
            available.push(port)
            count++
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

/** Claim UUID. */
export function claimUUID(uuid, ownerJid, newServerId) {
    const data = loadUrgent()
    const key = String(uuid).toLowerCase()
    if (!data.claimedUUIDs) data.claimedUUIDs = {}
    data.claimedUUIDs[key] = {
        ownerJid,
        newServerId,
        claimedAt: Date.now()
    }
    saveUrgent(data)
    return data.claimedUUIDs[key]
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

    // Ambil data server untuk setiap node
    for (const node of nodeList) {
        try {
            // Coba cari server di node ini
            const serversData = await getNodeServers(node.id)
            const servers = serversData?.data || serversData || []

            const server = servers.find(
                (s) => s.uuid?.toLowerCase() === uuid || s.uuidShort?.toLowerCase() === uuid
            )

            if (server) {
                return { node, server }
            }
        } catch (error) {
            // Skip node ini jika error
            console.warn(`[Urgent] Gagal cek node ${node.id}:`, error.message)
            continue
        }
    }

    // Fallback: coba cari di semua node dengan pagination
    // Ini lebih lambat tapi lebih akurat
    for (const node of nodeList) {
        try {
            // Ambil detail server langsung dari API jika memungkinkan
            const nodeServers = await getNodeServers(node.id)
            const servers = nodeServers?.data || nodeServers || []

            const server = servers.find(
                (s) => s.uuid?.toLowerCase() === uuid || s.uuidShort?.toLowerCase() === uuid
            )

            if (server) {
                return { node, server }
            }
        } catch {
            continue
        }
    }

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

// ─── Server Creation ───

/**
 * Clone server dengan spesifikasi yang sama.
 * @param {object} originalServer - Data server asli
 * @param {string|number} targetNodeId - Node target untuk server baru
 * @param {number} [port] - Port spesifik (opsional, jika null akan auto-generate)
 * @returns {Promise<object>}
 */
export async function cloneServer(originalServer, targetNodeId, port = null) {
    const { url, key } = getConfig()

    if (!url || !key) {
        throw new Error("Konfigurasi Pterodactyl belum ada.")
    }

    // Ambil detail lengkap server
    const serverUuid = originalServer.uuid

    // Buat request ke API untuk create server
    const serverData = originalServer.attributes || originalServer

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
    const swap = limits.swap || parseInt(env.LIMIT_swap) || 0
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

    // Owner (pakai user dari panel, ini perlu API admin)
    const ownerId = serverData.user?.id || 1

    // Nama server baru (tambahkan suffix _URGENT)
    const newName = `${serverData.name}_URGENT`

    // Handle port allocation
    let allocationId = serverData.allocation?.id || null
    let assignedPort = port
    
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
            throw new Error(`Port ${port} tidak tersedia atau sudah digunakan.`)
        }
    }

    // Request body untuk create server
    const createPayload = {
        name: newName,
        description: `Emergency clone from ${serverUuid}`,
        user: ownerId,
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

    // Kirim request ke API
    const response = await fetch(`${url}/api/application/servers`, {
        method: "POST",
        headers: {
            Authorization: `Bearer ${key}`,
            "Content-Type": "application/json",
            Accept: "application/json"
        },
        body: JSON.stringify(createPayload)
    })

    if (!response.ok) {
        const errorText = await response.text().catch(() => "Unknown error")
        
        // Parse error untuk pesan yang lebih jelas
        let errorMsg = `Gagal membuat server: [${response.status}]`
        try {
            const errorJson = JSON.parse(errorText)
            if (errorJson.errors?.[0]?.detail) {
                errorMsg = errorJson.errors[0].detail
            }
        } catch {}
        
        throw new Error(errorMsg)
    }

    const result = response.json()
    
    // Tambahkan info port ke result
    if (port) {
        result._requestedPort = port
    }
    
    return result
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
    getClaimInfo,
    findServerNode,
    getServerByUUID,
    cloneServer,
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
