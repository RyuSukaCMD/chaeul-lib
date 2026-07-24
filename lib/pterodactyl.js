import { readJSON, writeJSON } from "./db.js"
import { smallcaps as sc } from "./font.js"
import axios from "axios"

// ─── Database File ───
const PTERO_DB = "./database/pterodactyl.json"

// ─── Simple Axios Instance ───
const api = axios.create({
    timeout: 30000,
    headers: {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
        Accept: "application/json"
    }
})

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

export function getConfig() {
    return load()
}

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

export function isConfigured() {
    const cfg = load()
    return !!(cfg.url && cfg.key)
}

export function clearConfig() {
    save({ url: "", key: "", updatedAt: null })
}

// ─── Simple API Request (no Cloudflare bypass) ───

async function pteroFetch(endpoint, options = {}) {
    const { url, key } = getConfig()

    if (!url || !key) {
        throw new Error("Konfigurasi Pterodactyl belum ada. Gunakan .setpterodactyl untuk mengatur.")
    }

    const requestUrl = `${url}/api/application${endpoint}`

    try {
        const config = {
            method: options.method || "GET",
            url: requestUrl,
            headers: {
                Authorization: `Bearer ${key}`,
                "Content-Type": "application/json",
                Accept: "application/json"
            },
            data: options.body || options.data || undefined
        }

        const response = await api(config)
        return response.data
    } catch (error) {
        if (error.response) {
            throw new Error(`API Error ${error.response.status}: ${error.response.statusText}`)
        }
        throw error
    }
}

// ─── Node Operations ───

export async function getNodes() {
    const result = await pteroFetch("/nodes?per_page=100")
    
    if (Array.isArray(result)) return result
    if (result.data && Array.isArray(result.data)) return result.data
    return []
}

export async function getNode(nodeId) {
    return pteroFetch(`/nodes/${nodeId}`)
}

export async function getLocations() {
    const result = await pteroFetch("/locations?per_page=100")
    if (Array.isArray(result)) return result
    if (result.data && Array.isArray(result.data)) return result.data
    return []
}

export async function getNodeAllocations(nodeId) {
    return pteroFetch(`/nodes/${nodeId}/allocations?per_page=100`)
}

export async function getNodeServers(nodeId) {
    return pteroFetch(`/nodes/${nodeId}/servers?per_page=100`)
}

export async function getServer(serverId) {
    return pteroFetch(`/servers/${serverId}`)
}

export async function getAllServers() {
    return pteroFetch("/servers?per_page=1000")
}

export async function getNodeStats(nodeUuid) {
    const { url, key } = getConfig()
    if (!url || !key) return null

    try {
        const response = await api.get(`${url}/api/client`, {
            headers: {
                Authorization: `Bearer ${key}`,
                Accept: "application/json"
            }
        })
        return response.data
    } catch {
        return null
    }
}

// ─── Formatters ───

export function formatBytes(bytes) {
    if (bytes === 0) return "0 B"
    const k = 1024
    const sizes = ["B", "KB", "MB", "GB", "TB"]
    const i = Math.floor(Math.log(bytes) / Math.log(k))
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + " " + sizes[i]
}

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

export function formatMemoryBar(used, total) {
    if (!total || total === 0) return "▱▱▱▱▱"
    const pct = Math.min(100, Math.round((used / total) * 100))
    const filled = Math.round(pct / 10)
    const empty = 10 - filled
    return "▰".repeat(filled) + "▱".repeat(empty) + ` ${pct}%`
}

export function formatDiskBar(used, total) {
    return formatMemoryBar(used, total)
}

export function formatCpuBar(pct) {
    if (pct === undefined || pct === null) return "▱▱▱▱▱ N/A"
    const value = Math.min(100, Math.round(pct))
    const filled = Math.round(value / 10)
    const empty = 10 - filled
    return "▰".repeat(filled) + "▱".repeat(empty) + ` ${value}%`
}

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