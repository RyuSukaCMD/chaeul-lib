import { readJSON, writeJSON } from "./db.js"
import { getConfig, getNodes, getNode, getLocations, getNodeServers, getNodeAllocations, getServer, getAllServers } from "./pterodactyl.js"
import cloudscraper from "cloudscraper"

// ─── Cloudflare Bypass Helper (Promise-based wrapper) ───
function cfRequest(options) {
    return new Promise((resolve, reject) => {
        cloudscraper.request(options, (error, response, body) => {
            if (error && error.errorType !== undefined) {
                const err = error.error || error
                reject(new Error(err?.message || err))
            } else if (error) {
                reject(new Error(error.message || String(error)))
            } else {
                resolve({ body, response })
            }
        })
    })
}

function cfGet(url, headers = {}) {
    return new Promise((resolve, reject) => {
        cloudscraper.get(url, (error, response, body) => {
            if (error && error.errorType !== undefined) {
                const err = error.error || error
                reject(new Error(err?.message || err))
            } else if (error) {
                reject(new Error(error.message || String(error)))
            } else {
                resolve({ body, response })
            }
        }, headers)
    })
}

function cfPost(url, body, headers = {}) {
    return new Promise((resolve, reject) => {
        cloudscraper.post(url, body, (error, response, responseBody) => {
            if (error && error.errorType !== undefined) {
                const err = error.error || error
                reject(new Error(err?.message || err))
            } else if (error) {
                reject(new Error(error.message || String(error)))
            } else {
                resolve({ body: responseBody, response })
            }
        }, headers)
    })
}

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
        ipAlias: "pvnode-4.nexhostku.com",
        ipAddress: "0.0.0.0",
        pltaUrl: "",
        pltaKey: "",
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

// ─── PORT ALLOCATION SYSTEM ───

const LOCK_DURATION = 5 * 60 * 1000
const PORT_RANGE_START = 10000
const PORT_RANGE_END = 65535

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
        const allocData = await getNodeAllocations(nodeId)
        const allocations = allocData?.data || Array.isArray(allocData) ? allocData : []
        
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

export async function isPortAvailable(nodeId, port) {
    const allocatedPorts = await getAllocatedPorts(nodeId)
    return !allocatedPorts.includes(port)
}

export async function generateAvailablePort(nodeId, excludePorts = []) {
    const allocatedPorts = await getAllocatedPorts(nodeId)
    const allPorts = new Set([...allocatedPorts, ...excludePorts])
    
    for (let i = 0; i < 100; i++) {
        const port = Math.floor(Math.random() * (PORT_RANGE_END - PORT_RANGE_START)) + PORT_RANGE_START
        
        if (allPorts.has(port)) continue
        
        const lockStatus = isPortLocked(port)
        if (lockStatus.locked) continue
        
        return port
    }
    
    for (let port = PORT_RANGE_START; port <= PORT_RANGE_END; port++) {
        if (allPorts.has(port)) continue
        const lockStatus = isPortLocked(port)
        if (lockStatus.locked) continue
        return port
    }
    
    return null
}

export async function getAvailablePortList(nodeId, limit = 10) {
    const allocatedPorts = await getAllocatedPorts(nodeId)
    const status = getPortStatus()
    const locks = getPortLocks()
    const now = Date.now()
    
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
    
    return available.sort(() => Math.random() - 0.5).slice(0, limit)
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

        return result.data.find(u => 
            u.attributes?.email?.toLowerCase() === query.toLowerCase() ||
            u.attributes?.username?.toLowerCase() === query.toLowerCase()
        ) || null
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

export function whitelistNode(nodeId) {
    const data = loadUrgent()
    const id = String(nodeId)
    data.blacklistNodes = data.blacklistNodes.filter((n) => n !== id)
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
    if (isNodeBlacklisted(id)) return false
    if (!isNodeWhitelisted(id)) return false
    return true
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

    // Method 1: Try to find via all servers endpoint
    try {
        console.log(`[Urgent] Method 1: Trying /servers endpoint...`)
        const allServers = await getAllServers()
        const servers = allServers?.data || Array.isArray(allServers) ? allServers : []
        console.log(`[Urgent] Total servers from /servers: ${servers.length}`)
        
        for (const server of servers) {
            const serverUuidAttr = server.uuid || server.attributes?.uuid
            const serverUuidShort = server.uuidShort || server.attributes?.uuidShort
            
            if (serverUuidAttr?.toLowerCase() === uuid || serverUuidShort?.toLowerCase() === uuid) {
                console.log(`[Urgent] Found server via /servers endpoint!`)
                
                // Get node info
                const nodeId = server.node?.id || server.attributes?.node?.id
                if (nodeId) {
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
        const nodes = await getNodes()
        const nodeList = nodes?.data || Array.isArray(nodes) ? nodes : []
        console.log(`[Urgent] Total nodes: ${nodeList.length}`)

        for (const node of nodeList) {
            console.log(`[Urgent] Checking node: ${node.name || node.attributes?.name} (ID: ${node.id || node.attributes?.id})`)

            try {
                const serversData = await getNodeServers(node.id || node.attributes?.id)
                const servers = serversData?.data || Array.isArray(serversData) ? serversData : []

                console.log(`[Urgent] Servers on node ${node.id}: ${servers.length}`)

                const found = servers.find(s => {
                    const suuid = s.uuid || s.attributes?.uuid
                    const shortUuid = s.uuidShort || s.attributes?.uuidShort
                    return suuid?.toLowerCase() === uuid || shortUuid?.toLowerCase() === uuid
                })

                if (found) {
                    console.log(`[Urgent] Found server on node ${node.id}!`)
                    return { node, server: found }
                }
            } catch (error) {
                console.warn(`[Urgent] Failed to get servers for node ${node.id}: ${error.message}`)
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

    // Try via all servers endpoint first
    try {
        const allServers = await getAllServers()
        const servers = allServers?.data || Array.isArray(allServers) ? allServers : []
        
        const found = servers.find(s => {
            const suuid = s.uuid || s.attributes?.uuid
            const shortUuid = s.uuidShort || s.attributes?.uuidShort
            return suuid?.toLowerCase() === uuid || shortUuid?.toLowerCase() === uuid
        })
        
        if (found) return found
    } catch {}

    // Try through nodes
    const nodes = await getNodes()
    const nodeList = nodes?.data || Array.isArray(nodes) ? nodes : []

    for (const node of nodeList) {
        try {
            const serversData = await getNodeServers(node.id || node.attributes?.id)
            const servers = serversData?.data || Array.isArray(serversData) ? serversData : []

            const found = servers.find(s => {
                const suuid = s.uuid || s.attributes?.uuid
                const shortUuid = s.uuidShort || s.attributes?.uuidShort
                return suuid?.toLowerCase() === uuid || shortUuid?.toLowerCase() === uuid
            })

            if (found) return found
        } catch {
            continue
        }
    }

    return null
}

// ─── Server Creation (Clone to Another Node with Same Owner) ───

/**
 * Clone server ke node lain dengan owner yang SAMA.
 * @param {string|object} originalServer - UUID string atau server object
 * @param {string|number} targetNodeId - Node target
 * @param {number} [port] - Port spesifik (opsional)
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

    // KUNCI: Ambil owner ID yang SAMA dari server asli
    const ownerId = serverData.user?.id
    
    if (!ownerId) {
        console.error(`[Urgent] Server data:`, JSON.stringify(serverData, null, 2).substring(0, 1000))
        throw new Error("Tidak dapat menemukan owner ID dari server asli.")
    }
    
    console.log(`[Urgent] Using SAME owner ID: ${ownerId}`)

    const env = serverData.container?.environment || serverData.environment || {}
    const limits = serverData.limits || {}

    const nestId = serverData.nest?.id || env.NEST_ID || 1
    const eggId = serverData.egg?.id || env.EGG_ID || env.EGG || 1
    const locationId = serverData.location?.id || env.LOCATION_ID || 1

    const memory = limits.memory || parseInt(env.LIMIT_MEMORY) || 1024
    const disk = limits.disk || parseInt(env.LIMIT_DISK) || 5120
    const cpu = limits.cpu || parseInt(env.LIMIT_CPU) || 100
    const swap = limits.swap || parseInt(env.LIMIT_SWAP) || 0
    const io = limits.io || parseInt(env.LIMIT_IO) || 500
    const threads = env.CPU_THREADS || null

    const envVars = {}
    for (const [k, v] of Object.entries(env)) {
        if (!["STARTUP", "PTERODACTYL", "HOME", "USER"].includes(k)) {
            envVars[k] = v
        }
    }

    const startup = serverData.startup || env.STARTUP || ""
    const dockerImage = serverData.docker_image || env.DOCKER_IMAGE || ""
    const newName = (serverData.name || "Server") + "_CLONE"

    let allocationId = null
    
    // Handle port allocation
    if (port) {
        const allocData = await getNodeAllocations(targetNodeId)
        const allocations = allocData?.data || Array.isArray(allocData) ? allocData : []
        
        const foundAlloc = allocations.find(a => 
            a.attributes?.port === port && !a.attributes?.assigned
        )
        
        if (foundAlloc) {
            allocationId = foundAlloc.id
        } else {
            throw new Error(`Port ${port} tidak tersedia atau sudah digunakan.`)
        }
    } else {
        const autoPort = await generateAvailablePort(targetNodeId)
        if (!autoPort) {
            throw new Error("Tidak ada port tersedia di node target.")
        }
        
        port = autoPort
        
        const allocData = await getNodeAllocations(targetNodeId)
        const allocations = allocData?.data || Array.isArray(allocData) ? allocData : []
        
        const foundAlloc = allocations.find(a => 
            a.attributes?.port === autoPort && !a.attributes?.assigned
        )
        
        if (foundAlloc) {
            allocationId = foundAlloc.id
        }
    }

    const createPayload = {
        name: newName,
        description: `Emergency clone from ${serverUuid} (same owner)`,
        user: ownerId,
        egg: eggId,
        docker_image: dockerImage,
        startup: startup,
        environment: envVars,
        limits: {
            memory,
            disk,
            cpu,
            swap,
            io,
            threads
        },
        feature_limits: {
            databases: serverData.feature_limits?.databases || 0,
            allocations: serverData.feature_limits?.allocations || 1,
            backups: serverData.feature_limits?.backups || 0
        },
        allocation: allocationId,
        location: locationId,
        node: targetNodeId,
        mount: (serverData.mounts || []).map(m => m.id) || []
    }

    console.log(`[Urgent] Creating server with owner ID: ${ownerId}`)

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
        result._ipAlias = ipAlias
        result._ipAddress = ipAddress
        result._originalOwnerId = ownerId
        result._originalServerUuid = serverUuid
        
        return result
    } catch (error) {
        console.error(`[Urgent] Clone error: ${error.message}`)
        throw new Error(`Gagal membuat server: ${error.message}`)
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
    getAvailablePortList
}
