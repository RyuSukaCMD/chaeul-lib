import { readJSON, writeJSON } from "./db.js"
import { getConfig, getNodes, getNode, getLocations, getNodeServers } from "./pterodactyl.js"

// ─── Database File ───
const URGENT_DB = "./database/urgent.json"
const NODE_DB = "./database/ur_nodes.json"

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

function loadNodeDb() {
    return readJSON(NODE_DB, {})
}

function saveUrgent(data) {
    writeJSON(URGENT_DB, data)
}

function saveNodeDb(data) {
    writeJSON(NODE_DB, data)
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
 * @returns {Promise<object>}
 */
export async function cloneServer(originalServer, targetNodeId) {
    const { url, key } = getConfig()

    if (!url || !key) {
        throw new Error("Konfigurasi Pterodactyl belum ada.")
    }

    // Ambil detail lengkap server
    const serverUuid = originalServer.uuid

    // Buat request ke API untuk create server
    // Kita perlunest dari egg, nest, location, dll
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
    for (const [key, value] of Object.entries(env)) {
        // Skip internal vars
        if (!["STARTUP", "PTERODACTYL", "HOME", "USER"].includes(key)) {
            envVars[key] = value
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
        allocation: serverData.allocation?.id || null,
        location: locationId,
        node: targetNodeId,
        // Copy mounting dan volume
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
        const error = await response.text().catch(() => "Unknown error")
        throw new Error(`Gagal membuat server: [${response.status}] ${error}`)
    }

    return response.json()
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
    cloneServer
}
