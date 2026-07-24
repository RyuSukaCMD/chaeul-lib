import { readJSON, writeJSON } from "./db.js"
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
            const errors = error.response.data?.errors
            const detail = Array.isArray(errors) && errors.length
                ? errors.map((e) => e.detail || e.code).join("; ")
                : error.response.statusText
            throw new Error(`API Error ${error.response.status}: ${detail}`)
        }
        throw error
    }
}

// ─── Response Normalizer (JSON reader sesuai response Pterodactyl) ───
//
// Pterodactyl Application API SELALU membungkus data seperti ini:
//   List   : { "object": "list",  "data": [ { "object": "node", "attributes": {...} }, ... ], "meta": { "pagination": {...} } }
//   Single : { "object": "node",  "attributes": {...} }
//
// Artinya field asli (id, uuid, name, memory, disk, cpu, fqdn, dst)
// ada di dalam `.attributes`, BUKAN di level atas. Helper di bawah ini
// membuka bungkus tersebut supaya semua command bisa mengakses field
// secara langsung (node.name, node.memory, dst) tanpa error "undefined".

export function unwrapItem(item) {
    if (!item || typeof item !== "object") return item ?? null

    // Format baku Pterodactyl: { object: "...", attributes: {...} }
    if (item.attributes && typeof item.attributes === "object") {
        const flat = { ...item.attributes }

        // Relasi (bila di-include) dibuka juga supaya konsisten
        const rel = flat.relationships
        if (rel && typeof rel === "object") {
            const flatRel = {}
            for (const [relKey, relVal] of Object.entries(rel)) {
                if (Array.isArray(relVal?.data)) {
                    flatRel[relKey] = relVal.data.map(unwrapItem)
                } else if (relVal?.data && typeof relVal.data === "object") {
                    flatRel[relKey] = unwrapItem(relVal.data)
                } else {
                    flatRel[relKey] = relVal
                }
            }
            flat.relationships = flatRel
        }

        return flat
    }

    return item
}

export function unwrapList(result) {
    // Bisa array mentah, { object: "list", data: [...] }, atau null
    if (Array.isArray(result)) return result.map(unwrapItem)
    if (result && Array.isArray(result.data)) return result.data.map(unwrapItem)
    return []
}

// Ambil SEMUA halaman (Pterodactyl membatasi per_page maks 100),
// jadi loop mengikuti meta.pagination.total_pages.
async function pteroFetchAll(endpoint) {
    const joiner = endpoint.includes("?") ? "&" : "?"
    const items = []
    let page = 1

    while (true) {
        const result = await pteroFetch(`${endpoint}${joiner}per_page=100&page=${page}`)
        items.push(...unwrapList(result))

        const totalPages = result?.meta?.pagination?.total_pages ?? 1
        if (page >= totalPages) break
        page++
    }

    return items
}

// ─── Node Operations ───
// Semua fungsi di bawah mengembalikan object/array yang SUDAH di-unwrap
// (field langsung di level atas, tanpa .attributes lagi).

export async function getNodes() {
    return pteroFetchAll("/nodes")
}

export async function getNode(nodeId) {
    return unwrapItem(await pteroFetch(`/nodes/${nodeId}`))
}

export async function getLocations() {
    return pteroFetchAll("/locations")
}

export async function getNodeAllocations(nodeId) {
    return pteroFetchAll(`/nodes/${nodeId}/allocations`)
}

export async function getNodeServers(nodeId) {
    // Jalur 1: endpoint servers-per-node (Pterodactyl v1 penuh)
    try {
        const servers = await pteroFetchAll(`/nodes/${nodeId}/servers`)
        if (servers.length) return servers
    } catch {}

    // Jalur 2: resmi di docs — ?include=servers pada detail node.
    // relationships sudah otomatis di-unwrap oleh unwrapItem.
    try {
        const node = unwrapItem(await pteroFetch(`/nodes/${nodeId}?include=servers`))
        const rel = node?.relationships?.servers
        if (Array.isArray(rel) && rel.length) return rel
    } catch {}

    // Jalur 3: filter di endpoint list server global
    try {
        const servers = await pteroFetchAll(`/servers?filter[node_id]=${encodeURIComponent(nodeId)}`)
        if (servers.length) return servers
    } catch {}

    return []
}

export async function getServer(serverId) {
    return unwrapItem(await pteroFetch(`/servers/${serverId}`))
}

export async function getAllServers() {
    return pteroFetchAll("/servers")
}

// ─── Formatters ───

export function formatBytes(bytes) {
    if (!bytes || bytes <= 0) return "0 B"
    const k = 1024
    const sizes = ["B", "KB", "MB", "GB", "TB"]
    const i = Math.min(sizes.length - 1, Math.floor(Math.log(bytes) / Math.log(k)))
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

// Hitung total resource yang dialokasikan ke server-server pada sebuah node.
// Setelah unwrap, tiap server punya `limits` langsung:
//   limits.memory (MB), limits.disk (MB), limits.cpu (%)
export function calcNodeUsage(servers) {
    const arr = Array.isArray(servers) ? servers : []

    let totalServers = 0
    let totalMemory = 0
    let usedMemory = 0
    let totalDisk = 0
    let usedDisk = 0
    let totalCpu = 0

    for (const srv of arr) {
        const attr = srv?.attributes || srv || {}
        const limits = attr.limits || {}
        const env = attr.container?.environment || {}

        const limitMemory = Number(limits.memory ?? env.LIMIT_MEMORY) || 0
        const limitDisk = Number(limits.disk ?? env.LIMIT_DISK) || 0
        const limitCpu = Number(limits.cpu ?? env.LIMIT_CPU) || 0

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
    unwrapItem,
    unwrapList,
    getNodes,
    getNode,
    getLocations,
    getNodeAllocations,
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
