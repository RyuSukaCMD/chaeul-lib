import { readJSON, writeJSON } from "./db.js"
import { smallcaps as sc } from "./font.js"
import axios from "axios"

// ─── Database File ───
const PTERO_DB = "./database/pterodactyl.json"

// ─── Realistic Browser Headers (helps bypass some Cloudflare checks) ───
const UA =
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/128.0.0.0 Safari/537.36"

const DEFAULT_HEADERS = {
    "User-Agent": UA,
    Accept: "application/json, text/plain, */*",
    "Accept-Language": "en-US,en;q=0.9",
    "Accept-Encoding": "gzip, deflate, br",
    Connection: "keep-alive",
    "Upgrade-Insecure-Requests": "1",
    "Sec-Fetch-Dest": "empty",
    "Sec-Fetch-Mode": "cors",
    "Sec-Fetch-Site": "same-origin",
    "Cache-Control": "no-cache",
    Pragma: "no-cache"
}

// ─── Axios instance with better defaults ───
const api = axios.create({
    timeout: 30000,
    headers: DEFAULT_HEADERS,
    validateStatus: (status) => status < 500 // allow 4xx for better error messages
})

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

// ─── API Request (Cloudflare Bypass) ───

/**
 * Helper: fetch ke Pterodactyl API dengan Cloudflare bypass otomatis.
 * @param {string} endpoint
 * @param {object} [options]
 * @returns {Promise<any>}
 */
async function pteroFetch(endpoint, options = {}) {
    const { url, key } = getConfig()

    if (!url || !key) {
        throw new Error("Konfigurasi Pterodactyl belum ada. Gunakan .setpterodactyl untuk mengatur.")
    }

    const requestUrl = `${url}/api/application${endpoint}`
    
    console.log(`[Ptero API] Request: ${options.method || 'GET'} ${requestUrl}`)

    try {        
        const headers = {
            ...DEFAULT_HEADERS,
            Authorization: `Bearer ${key}`,
            "Content-Type": "application/json",
            Accept: "application/json"
        }

        const config = {
            method: options.method || "GET",
            url: requestUrl,
            headers,
            data: options.body || options.data || undefined
        }

        const response = await api(config)
        const body = response.data

        console.log(`[Ptero API] Response status: ${response.status}`)
        console.log(`[Ptero API] Body type: ${typeof body}`)

        if (!body) {
            throw new Error("Empty response from server")
        }

// If response is already parsed JSON (axios does this automatically)
        if (typeof body === "object") {
          
            console.log(`[Ptero API] Parsed JSON successfully`)
            return body
        }
                // Fallback: parse if string
        if (typeof body === "string") {
            try {
                const json = JSON.parse(body)
                console.log(`[Ptero API] Parsed JSON successfully`)
                return json
            } catch (parseError) {
                console.log(`[Ptero API] Raw body preview: ${String(body).substring(0, 500)}`)
                throw new Error(`Failed to parse JSON response: ${parseError.message}`)
            }
        }

        return body
        
    } catch (error) {
        const errorText = error.message || String(error)
        console.error(`[Ptero API] Error: ${errorText}`)

                // Detect Cloudflare HTML response
        if (error.response && error.response.data) {
            const data = error.response.data
            if (typeof data === "string" && (data.includes("<!DOCTYPE") || data.includes("cloudflare") || data.includes("Just a moment"))) {
                console.log(`[Ptero API] Detected Cloudflare challenge page`)
                throw new Error(`Failed to parse JSON response: Unexpected token '<', "<!DOCTYPE "... is not valid JSON`)
            }
        }
        
        // Check if it's a Cloudflare challengeif (errorText.includes("Cloudflare") || errorText.includes("cf-challenge") || errorText.includes("Just a moment")) {
            throw new Error(`Cloudflare Protection detected. Gagal bypass. Pastikan panel tidak menggunakan Cloudflare atau gunakan domain yang tidak terproteksi.`)
        }
        
        throw error
    }

// ─── Node Operations ───

/**
 * Ambil semua node dari Pterodactyl panel.
 * @returns {Promise<any[]>}
 */
export async function getNodes() {
    const result = await pteroFetch("/nodes?per_page=100")
    
    // Handle different response formats
    if (Array.isArray(result)) {
        console.log(`[Ptero] Returning ${result.length} nodes (array format)`)
        return result
    }
    
    if (result.data && Array.isArray(result.data)) {
        console.log(`[Ptero] Returning ${result.data.length} nodes (data array format)`)
        return result.data
    }
    
    console.log(`[Ptero] Warning: Unexpected result format, returning empty array`)
    console.log(`[Ptero] Result keys: ${Object.keys(result || {})}`)
    return []
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
 * @returns {Promise<any[]>}
 */
export async function getLocations() {
    const result = await pteroFetch("/locations?per_page=100")
    
    if (Array.isArray(result)) {
        return result
    }
    
    if (result.data && Array.isArray(result.data)) {
        return result.data
    }
    
    return []
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
 * @returns {Promise<any>}
 */
export async function getNodeStats(nodeUuid) {
    const { url, key } = getConfig()

    if (!url || !key) {
        throw new Error("Konfigurasi Pterodactyl belum ada.")
    }

    try {
        const headers = {
            ...DEFAULT_HEADERS,
            Authorization: `Bearer ${key}`,
            Accept: "application/json"
        }

        const response = await api.get(`${url}/api/client`, { headers })
        
        if (!response.data) return null
        return response.data
    } catch {
        return null
    }
}

/**
 * Ambil semua server yang ada di suatu node.
 * @param {number|string} nodeId
 * @returns {Promise<any>}
 */
export async function getNodeServers(nodeId) {
    return pteroFetch(`/nodes/${nodeId}/servers?per_page=100`)
}

/**
 * Ambil detail server by ID.
 * @param {number|string} serverId
 * @returns {Promise<any>}
 */
export async function getServer(serverId) {
    return pteroFetch(`/servers/${serverId}`)
}

/**
 * Get raw server list from all nodes (alternative endpoint).
 * @returns {Promise<any>}
 */
export async function getAllServers() {
    return pteroFetch("/servers?per_page=1000")
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
    getServer,
    getAllServers,
    formatBytes,
    formatUptime,
    formatMemoryBar,
    formatDiskBar,
    formatCpuBar,
    calcNodeUsage
}
