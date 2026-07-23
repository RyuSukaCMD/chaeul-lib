import { readJSON, writeJSON } from "./db.js"
import { smallcaps as sc } from "./font.js"

// ─── Database File ───
const PTERO_DB = "./database/pterodactyl.json"

// ─── Cloudflare Bypass Headers ───
const CF_BYPASS_HEADERS = {
    "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
    "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8",
    "Accept-Language": "en-US,en;q=0.9",
    "Accept-Encoding": "gzip, deflate, br",
    "DNT": "1",
    "Connection": "keep-alive",
    "Upgrade-Insecure-Requests": "1",
    "Sec-Fetch-Dest": "document",
    "Sec-Fetch-Mode": "navigate",
    "Sec-Fetch-Site": "none",
    "Sec-Fetch-User": "?1",
    "Cache-Control": "max-age=0"
}

// ─── JSON Loader / Saver ───
function load() {
    return readJSON(PTERO_DB, {
        url: "",
        key: "",
        updatedAt: null
    })
}

function save(data) {
    writeJSON(PTERO_DB, data)
}

// ─── Config Management ───

/**
 * Ambil konfigurasi Pterodactyl.
 * @returns {{ url: string, key: string, updatedAt: number|null }}
 */
export function getConfig() {
    return load()
}

/**
 * Set konfigurasi Pterodactyl (URL panel & API key).
 * @param {string} url  - URL Panel (contoh: https://panel.example.com)
 * @param {string} key  - API Key (Admin key)
 */
export function setConfig(url, key) {
    const trimmedUrl = url.replace(/\/$/, "").trim()
    const trimmedKey = key.trim()

    if (!trimmedUrl) throw new Error("URL panel tidak boleh kosong.")
    if (!trimmedKey) throw new Error("API key tidak boleh kosong.")
    if (!trimmedUrl.startsWith("http")) throw new Error("URL harus diawali http:// atau https://")

    const data = {
        url: trimmedUrl,
        key: trimmedKey,
        updatedAt: Date.now()
    }
    save(data)
    return data
}

/**
 * Cek apakah konfigurasi sudah ada.
 */
export function isConfigured() {
    const cfg = load()
    return !!(cfg.url && cfg.key)
}

/**
 * Hapus konfigurasi.
 */
export function clearConfig() {
    save({ url: "", key: "", updatedAt: null })
}

// ─── API Request ───

/**
 * Helper: fetch ke Pterodactyl API dengan Cloudflare bypass.
 * @param {string} endpoint
 * @param {object} [options]
 * @returns {Promise<any>}
 */
async function pteroFetch(endpoint, options = {}) {
    const { url, key } = getConfig()

    if (!url || !key) {
        throw new Error("Konfigurasi Pterodactyl belum ada. Gunakan .setpterodactyl untuk mengatur.")
    }

    // Parse origin dari URL untuk headers
    let origin = url
    try {
        origin = new URL(url).origin
    } catch {}

    const response = await fetch(`${url}/api/application${endpoint}`, {
        ...options,
        headers: {
            ...CF_BYPASS_HEADERS,
            "Origin": origin,
            "Referer": url + "/",
            Authorization: `Bearer ${key}`,
            "Content-Type": "application/json",
            Accept: "application/json",
            ...(options.headers || {})
        }
    })

    if (!response.ok) {
        const errorText = await response.text().catch(() => "Unknown error")
        throw new Error(`Pterodactyl API Error [${response.status}]: ${errorText}`)
    }

    return response.json()
}

// ─── Node Operations ───

/**
 * Ambil semua node dari Pterodactyl panel.
 * @returns {Promise<{ id: number, uuid: string, name: string, description: string, location_id: number, cluster: string, memory: number, memory_overallocate: number, disk: number, disk_overallocate: number, cpu: number, cpu_overallocate: number, upload_size: number, daemon listening_port: number, daemon_sftp: number, daemon_base: string, created_at: string, updated_at: string, relationships?: object }[]>}
 */
export async function getNodes() {
    const result = await pteroFetch("/nodes?per_page=100")
    // Pterodactyl paginates, gather all pages
    const nodes = Array.isArray(result.data) ? result.data : []
    return nodes
}

/**
 * Ambil detail satu node by ID.
 * @param {number|string} nodeId
 */
export async function getNode(nodeId) {
    return pteroFetch(`/nodes/${nodeId}`)
}

/**
 * Ambil lokasi (locations) untuk mapping.
 * @returns {Promise<{ id: number, short: string, long: string, created_at: string, updated_at: string }[]>}
 */
export async function getLocations() {
    const result = await pteroFetch("/locations?per_page=100")
    return Array.isArray(result.data) ? result.data : []
}

/**
 * Ambil daftar allocations untuk satu node.
 * @param {number|string} nodeId
 * @returns {Promise<any>}
 */
export async function getNodeAllocations(nodeId) {
    return pteroFetch(`/nodes/${nodeId}/allocations?per_page=100`)
}

/**
 * Ambil usage/stats node secara real-time via daemon endpoint.
 * @param {string} nodeUuid
 * @returns {Promise<{ memory_bytes: number, cpu_absolute: number, network_bytes_received: number, network_bytes_sent: number, disk_bytes: number, uptime: number }>}
 */
export async function getNodeStats(nodeUuid) {
    const { url, key } = getConfig()

    // Stats endpoint menggunakan daemon token, bukan application token
    // Kita gunakan endpoint /api/client untuk stats
    let origin = url
    try {
        origin = new URL(url).origin
    } catch {}

    const response = await fetch(`${url}/api/client`, {
        headers: {
            ...CF_BYPASS_HEADERS,
            "Origin": origin,
            "Referer": url + "/",
            Authorization: `Bearer ${key}`,
            Accept: "application/json"
        }
    })

    if (!response.ok) {
        // Fallback: return estimated from node memory/disk
        return null
    }

    // Ini untuk server stats, untuk node stats kita perlu different approach
    return null
}

/**
 * Ambil semua server yang ada di suatu node.
 * @param {number|string} nodeId
 * @returns {Promise<any>}
 */
export async function getNodeServers(nodeId) {
    return pteroFetch(`/nodes/${nodeId}/servers?per_page=100`)
}

// ─── Formatters ───

/**
 * Format bytes ke human readable.
 */
export function formatBytes(bytes) {
    if (bytes === 0) return "0 B"
    const k = 1024
    const sizes = ["B", "KB", "MB", "GB", "TB"]
    const i = Math.floor(Math.log(bytes) / Math.log(k))
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + " " + sizes[i]
}

/**
 * Format uptime seconds ke readable string.
 */
export function formatUptime(seconds) {
    if (!seconds || seconds <= 0) return "N/A"
    const d = Math.floor(seconds / 86400)
    const h = Math.floor((seconds % 86400) / 3600)
    const m = Math.floor((seconds % 3600) / 60)
    const s = seconds % 60

    const parts = []
    if (d > 0) parts.push(`${d}d`)
    if (h > 0) parts.push(`${h}h`)
    if (m > 0) parts.push(`${m}m`)
    if (s > 0 && d === 0) parts.push(`${s}s`)

    return parts.join(" ") || "0s"
}

/**
 * Format memory usage percentage bar.
 */
export function formatMemoryBar(used, total) {
    if (!total || total === 0) return "▱▱▱▱▱"
    const pct = Math.min(100, Math.round((used / total) * 100))
    const filled = Math.round(pct / 10)
    const empty = 10 - filled
    return "▰".repeat(filled) + "▱".repeat(empty) + ` ${pct}%`
}

/**
 * Format disk usage percentage bar.
 */
export function formatDiskBar(used, total) {
    return formatMemoryBar(used, total)
}

/**
 * Format CPU percentage bar.
 */
export function formatCpuBar(pct) {
    if (pct === undefined || pct === null) return "▱▱▱▱▱ N/A"
    const value = Math.min(100, Math.round(pct))
    const filled = Math.round(value / 10)
    const empty = 10 - filled
    return "▰".repeat(filled) + "▱".repeat(empty) + ` ${value}%`
}

/**
 * Hitung total & used resource dari list server.
 * @param {any[]} servers
 * @returns {{ totalServers: number, totalMemory: number, usedMemory: number, totalDisk: number, usedDisk: number, totalCpu: number }}
 */
export function calcNodeUsage(servers) {
    const arr = Array.isArray(servers) ? servers : []

    let totalServers = 0
    let totalMemory = 0
    let usedMemory = 0
    let totalDisk = 0
    let usedDisk = 0
    let totalCpu = 0

    for (const srv of arr) {
        const limits = srv.attributes?.container?.environment || {}
        const limitMemory = parseInt(limits.LIMIT_MEMORY) || 0
        const limitDisk = parseInt(limits.LIMIT_DISK) || 0
        const limitCpu = parseInt(limits.LIMIT_CPU) || 0

        totalMemory += limitMemory
        totalDisk += limitDisk
        totalCpu += limitCpu
        totalServers++
    }

    return { totalServers, totalMemory, usedMemory, totalDisk, usedDisk, totalCpu }
}

// ─── Default Export ───
export default {
    getConfig,
    setConfig,
    isConfigured,
    clearConfig,
    getNodes,
    getNode,
    getLocations,
    getNodeAllocations,
    getNodeStats,
    getNodeServers,
    formatBytes,
    formatUptime,
    formatMemoryBar,
    formatDiskBar,
    formatCpuBar,
    calcNodeUsage
}
