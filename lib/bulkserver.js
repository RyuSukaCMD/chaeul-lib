import axios from "axios"
import { getPltaConfig, getPanelUrl } from "./urgent.js"
import { getConfig } from "./pterodactyl.js"

// ═══════════════════════════════════════════════════════════
//  BULK SERVER — buat banyak akun panel + server sekaligus.
//
//  Alur wajib (sesuai permintaan): USER DIBUAT DULU, baru SERVER.
//  Server dibuat dengan konfigurasi PERSIS mengikuti egg-nya:
//  docker_image, startup command, dan SEMUA environment variable
//  (memakai default_value egg) diambil langsung dari endpoint
//  GET /nests/{nest}/eggs/{egg}?include=variables — jadi tidak ada
//  field wajib yang kosong dan panel tidak menolak request.
// ═══════════════════════════════════════════════════════════

const FIELDS = [
    "username",
    "password",
    "namaserver",
    "memory",
    "disk",
    "nest",
    "egg",
    "node"
]

export const FIELD_COUNT = FIELDS.length

// ─── HTTP ───

const http = axios.create({
    timeout: 60000,
    headers: {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
        Accept: "application/json"
    }
})

function apiError(error) {
    const errors = error?.response?.data?.errors
    if (Array.isArray(errors) && errors.length) {
        return errors
            .map((e) => {
                const field = e?.meta?.source_field || e?.meta?.rule
                const detail = e.detail || e.code || "Unknown error"
                return field ? `${detail} (${field})` : detail
            })
            .join("; ")
    }
    if (error?.response) {
        const status = error.response.status
        let hint = ""
        if (status === 401) hint = " — API key salah / bukan Application API"
        else if (status === 403) hint = " — API key read-only, butuh permission Read & Write"
        else if (status === 404) hint = " — endpoint/ID tidak ditemukan"
        else if (status === 429) hint = " — kena rate limit panel, coba lagi nanti"
        return `HTTP ${status} ${error.response.statusText || ""}`.trim() + hint
    }

    // Error jaringan (AggregateError dari Node punya message tidak berguna).
    const code = error?.code || error?.errors?.[0]?.code
    if (code) {
        const map = {
            ECONNREFUSED: "koneksi ditolak — URL panel salah atau panel mati",
            ENOTFOUND: "domain panel tidak ditemukan",
            ETIMEDOUT: "koneksi timeout ke panel",
            ECONNABORTED: "request timeout ke panel",
            ECONNRESET: "koneksi terputus oleh panel",
            EHOSTUNREACH: "host panel tidak dapat dijangkau"
        }
        return map[code] || `Gagal terhubung ke panel (${code})`
    }

    return error?.message || String(error)
}

/** Kredensial panel: utamakan PLTA (urgent), fallback ke .setpterodactyl. */
export function getPanelCredentials() {
    const plta = getPltaConfig?.() || {}
    if (plta.url && plta.key) return { url: String(plta.url).replace(/\/+$/, ""), key: plta.key }

    const cfg = getConfig?.() || {}
    if (cfg.url && cfg.key) return { url: String(cfg.url).replace(/\/+$/, ""), key: cfg.key }

    return { url: "", key: "" }
}

export function isPanelReady() {
    const { url, key } = getPanelCredentials()
    return !!(url && key)
}

async function apiRequest(method, endpoint, body) {
    const { url, key } = getPanelCredentials()
    if (!url || !key) {
        throw new Error(
            "Konfigurasi panel belum ada. Atur dulu dengan .setplta atau .setpterodactyl."
        )
    }

    try {
        const response = await http.request({
            method,
            url: `${url}/api/application${endpoint}`,
            headers: {
                Authorization: `Bearer ${key}`,
                "Content-Type": "application/json",
                Accept: "application/json"
            },
            data: body ? JSON.stringify(body) : undefined,
            transformRequest: [(d) => d]
        })
        return response.data
    } catch (error) {
        throw new Error(apiError(error))
    }
}

function unwrap(item) {
    if (!item || typeof item !== "object") return item
    if (item.attributes && typeof item.attributes === "object") {
        const flat = { ...item.attributes }
        const rel = flat.relationships
        if (rel && typeof rel === "object") {
            const out = {}
            for (const [k, v] of Object.entries(rel)) {
                if (Array.isArray(v?.data)) out[k] = v.data.map(unwrap)
                else if (v?.data) out[k] = unwrap(v.data)
                else out[k] = v
            }
            flat.relationships = out
        }
        return flat
    }
    return item
}

function unwrapList(res) {
    if (Array.isArray(res)) return res.map(unwrap)
    if (res && Array.isArray(res.data)) return res.data.map(unwrap)
    return []
}

// ─── Parsing input ───

/** "2gb" → 2048, "512" → 512, "0"/"unlimited" → 0 */
export function parseSize(raw) {
    const text = String(raw || "").trim().toLowerCase().replace(/\s+/g, "")
    if (!text) return null
    if (["0", "unlimited", "unli", "nolimit"].includes(text)) return 0

    const match = text.match(/^([\d.]+)(gb|g|mb|m)?$/)
    if (!match) return null

    const value = parseFloat(match[1])
    if (!Number.isFinite(value) || value < 0) return null

    const unit = match[2] || "mb"
    const mb = unit.startsWith("g") ? value * 1024 : value
    return Math.round(mb)
}

function parseId(raw) {
    const n = Number(String(raw || "").trim())
    return Number.isInteger(n) && n > 0 ? n : null
}

/**
 * Parse teks masukan owner menjadi daftar entri.
 *
 * Toleran terhadap:
 *  • blok dipisah baris kosong ATAU langsung berurutan (kelipatan 8 baris)
 *  • penomoran "1." / "-" / "•" di depan baris
 *  • gaya "username: nexa" (label di depan nilai)
 *
 * @returns {{ entries: object[], errors: string[] }}
 */
export function parseBulkInput(text) {
    const raw = String(text || "")
    const errors = []

    // Bersihkan tiap baris dari bullet/penomoran & label field.
    const lines = raw
        .split(/\r?\n/)
        .map((line) =>
            line
                .replace(/^\s*(?:\d+[.)]|[-*•])\s*/, "")
                .replace(
                    /^\s*(username|user|password|pass|namaserver|nama server|servername|server|memory|ram|disk|storage|id ?nest|nest|id ?egg|egg|id ?node|node)\s*[:=]\s*/i,
                    ""
                )
                .trim()
        )

    // ── Kelompokkan menjadi blok 8 baris ──
    // Strategi 1: pisah berdasarkan baris kosong. Dipakai HANYA bila setiap
    //             blok hasilnya tepat 8 baris (format rapi dari user).
    // Strategi 2: abaikan baris kosong sepenuhnya, lalu potong per 8 baris.
    //             Tahan terhadap enter berlebih / tanpa pemisah sama sekali.
    const groupsByBlank = []
    let current = []
    for (const line of lines) {
        if (!line) {
            if (current.length) groupsByBlank.push(current)
            current = []
            continue
        }
        current.push(line)
    }
    if (current.length) groupsByBlank.push(current)

    const allLines = lines.filter(Boolean)

    let blocks
    if (groupsByBlank.length && groupsByBlank.every((g) => g.length === FIELD_COUNT)) {
        blocks = groupsByBlank
    } else {
        blocks = []
        for (let i = 0; i < allLines.length; i += FIELD_COUNT) {
            blocks.push(allLines.slice(i, i + FIELD_COUNT))
        }
    }

    const entries = []

    blocks.forEach((block, index) => {
        const no = index + 1

        if (block.length !== FIELD_COUNT) {
            errors.push(
                `Data #${no} punya ${block.length} baris (harus ${FIELD_COUNT}): ${block[0] || "-"}`
            )
            return
        }

        const [username, password, name, memoryRaw, diskRaw, nestRaw, eggRaw, nodeRaw] = block

        const memory = parseSize(memoryRaw)
        const disk = parseSize(diskRaw)
        const nest = parseId(nestRaw)
        const egg = parseId(eggRaw)
        const node = parseId(nodeRaw)

        const problems = []
        // Aturan username Pterodactyl: mulai huruf/angka, isi a-z 0-9 . _ -
        if (!/^[a-zA-Z0-9][a-zA-Z0-9._-]{1,190}$/.test(username)) {
            problems.push(
                `username "${username}" tidak valid (mulai huruf/angka, hanya a-z 0-9 . _ -)`
            )
        }
        if (password.length < 8) problems.push("password minimal 8 karakter")
        if (!name) problems.push("nama server kosong")
        if (memory === null) problems.push(`memory "${memoryRaw}" tidak valid`)
        if (disk === null) problems.push(`disk "${diskRaw}" tidak valid`)
        if (!nest) problems.push(`id nest "${nestRaw}" tidak valid`)
        if (!egg) problems.push(`id egg "${eggRaw}" tidak valid`)
        if (!node) problems.push(`id node "${nodeRaw}" tidak valid`)

        if (problems.length) {
            errors.push(`Data #${no} (${username || "?"}) → ${problems.join(", ")}`)
            return
        }

        entries.push({ no, username, password, name, memory, disk, nest, egg, node })
    })

    return { entries, errors }
}

// ─── Panel: user ───

export async function findUserByUsername(username) {
    try {
        const res = await apiRequest(
            "GET",
            `/users?filter[username]=${encodeURIComponent(username)}`
        )
        const list = unwrapList(res)
        return (
            list.find((u) => String(u.username).toLowerCase() === String(username).toLowerCase()) ||
            null
        )
    } catch {
        return null
    }
}

/** Buat user panel. Bila username sudah ada → pakai user yang ada. */
export async function createPanelUser({ username, password, email }) {
    const existing = await findUserByUsername(username)
    if (existing) return { user: existing, reused: true }

    const first = username.charAt(0).toUpperCase() + username.slice(1)

    const res = await apiRequest("POST", "/users", {
        email,
        username,
        first_name: first || "User",
        last_name: "Server",
        password,
        root_admin: false,
        language: "en"
    })

    return { user: unwrap(res), reused: false }
}

// ─── Panel: egg ───

const eggCache = new Map()

/**
 * Ambil detail egg LENGKAP (docker image, startup, semua variabel).
 * Hasilnya di-cache per proses agar bulk besar tidak menghajar panel.
 */
export async function getEggDetail(nestId, eggId) {
    const cacheKey = `${nestId}:${eggId}`
    if (eggCache.has(cacheKey)) return eggCache.get(cacheKey)

    const res = await apiRequest("GET", `/nests/${nestId}/eggs/${eggId}?include=variables`)
    const egg = unwrap(res)

    if (!egg || !egg.id) throw new Error(`Egg ${eggId} pada nest ${nestId} tidak ditemukan.`)

    // Docker image: field utama → daftar docker_images → error bila kosong.
    let dockerImage = egg.docker_image
    if (!dockerImage && egg.docker_images && typeof egg.docker_images === "object") {
        dockerImage = Object.values(egg.docker_images)[0]
    }
    if (!dockerImage) throw new Error(`Egg ${eggId} tidak punya docker image.`)

    const startup = egg.startup
    if (!startup) throw new Error(`Egg ${eggId} tidak punya startup command.`)

    const variables = Array.isArray(egg.relationships?.variables)
        ? egg.relationships.variables.map(unwrap)
        : []

    const detail = { id: egg.id, name: egg.name, dockerImage, startup, variables }
    eggCache.set(cacheKey, detail)
    return detail
}

/**
 * Susun environment LENGKAP dari variabel egg.
 * Semua variabel egg diisi (pakai default_value), sehingga tidak ada
 * field wajib yang hilang saat create server.
 */
export function buildEnvironment(eggDetail, overrides = {}) {
    const env = {}

    for (const v of eggDetail.variables) {
        const key = v?.env_variable
        if (!key) continue

        let value = v.default_value
        if (value === null || value === undefined) value = ""
        env[key] = String(value)
    }

    for (const [k, v] of Object.entries(overrides)) {
        if (v === null || v === undefined) continue
        env[k] = String(v)
    }

    return env
}

// ─── Panel: allocation ───

export async function getNodeAllocationList(nodeId) {
    const all = []
    let page = 1
    while (true) {
        const res = await apiRequest("GET", `/nodes/${nodeId}/allocations?per_page=100&page=${page}`)
        all.push(...unwrapList(res))
        const totalPages = res?.meta?.pagination?.total_pages ?? 1
        if (page >= totalPages) break
        page++
    }
    return all
}

/**
 * Ambil satu allocation kosong di node. Bila tidak ada, BUAT baru
 * memakai IP yang paling umum dipakai node tersebut.
 *
 * @param {Set<number>} used allocation id yang sudah dipakai pada sesi bulk ini
 */
export async function pickAllocation(nodeId, used = new Set()) {
    const allocations = await getNodeAllocationList(nodeId)

    // Panel bisa mengembalikan entri duplikat/ganjil — saring yang id-nya valid.
    const free = allocations.find(
        (a) => a && Number.isFinite(Number(a.id)) && !a.assigned && !used.has(a.id)
    )
    if (free) {
        used.add(free.id)
        return { id: free.id, port: free.port, created: false }
    }

    // Tidak ada allocation kosong → buat port baru.
    const ipCount = {}
    for (const a of allocations) {
        if (a.ip) ipCount[a.ip] = (ipCount[a.ip] || 0) + 1
    }
    const ip = Object.keys(ipCount).sort((x, y) => ipCount[y] - ipCount[x])[0] || "0.0.0.0"
    const existingPorts = new Set(allocations.map((a) => Number(a.port)))

    let port = null
    for (let i = 0; i < 200; i++) {
        const candidate = 15000 + Math.floor(Math.random() * 20000)
        if (!existingPorts.has(candidate)) {
            port = candidate
            break
        }
    }
    if (!port) throw new Error(`Tidak menemukan port kosong di node ${nodeId}.`)

    await apiRequest("POST", `/nodes/${nodeId}/allocations`, {
        ip: String(ip),
        ports: [String(port)]
    })

    // Ambil ulang untuk mendapatkan ID allocation yang baru dibuat.
    const refreshed = await getNodeAllocationList(nodeId)
    const created = refreshed.find(
        (a) =>
            Number(a.port) === Number(port) &&
            !a.assigned &&
            Number.isFinite(Number(a.id)) &&
            !used.has(a.id)
    )
    if (!created) throw new Error(`Allocation port ${port} gagal dibuat di node ${nodeId}.`)

    used.add(created.id)
    return { id: created.id, port: created.port, created: true }
}

// ─── Panel: server ───

export async function createPanelServer({ entry, userId, eggDetail, allocationId }) {
    const environment = buildEnvironment(eggDetail, {
        SERVER_MEMORY: entry.memory,
        SERVER_DISK: entry.disk
    })

    // Hanya kirim variabel milik egg (plus yang memang dideklarasikan egg),
    // supaya panel tidak menolak karena variabel asing.
    const allowed = new Set(eggDetail.variables.map((v) => v.env_variable).filter(Boolean))
    const finalEnv = {}
    for (const [k, v] of Object.entries(environment)) {
        if (allowed.has(k)) finalEnv[k] = v
    }

    const payload = {
        name: entry.name,
        user: Number(userId),
        egg: Number(entry.egg),
        nest: Number(entry.nest),
        docker_image: eggDetail.dockerImage,
        startup: eggDetail.startup,
        environment: finalEnv,
        limits: {
            memory: Number(entry.memory),
            swap: 0,
            disk: Number(entry.disk),
            io: 500,
            cpu: 0
        },
        feature_limits: {
            databases: 5,
            allocations: 5,
            backups: 5
        },
        allocation: { default: Number(allocationId) },
        deploy: undefined,
        start_on_completion: true,
        skip_scripts: false,
        oom_disabled: true
    }

    delete payload.deploy

    const res = await apiRequest("POST", "/servers", payload)
    return unwrap(res)
}

// ─── Orkestrasi 1 entri: user dulu, baru server ───

export async function provisionEntry(entry, { emailDomain = "chaeul.id", usedAllocations }) {
    const email = `${entry.username.toLowerCase()}@${emailDomain}`

    // 1) USER dulu.
    const { user, reused } = await createPanelUser({
        username: entry.username,
        password: entry.password,
        email
    })

    // 2) Egg (docker image, startup, seluruh variabel).
    const eggDetail = await getEggDetail(entry.nest, entry.egg)

    // 3) Allocation + 4) SERVER.
    //    Allocation bisa direbut proses lain di detik yang sama, jadi bila
    //    panel menolak karena allocation, coba allocation lain (maks 3x).
    let allocation = null
    let server = null
    let lastError = null

    for (let attempt = 1; attempt <= 3; attempt++) {
        allocation = await pickAllocation(entry.node, usedAllocations)

        try {
            server = await createPanelServer({
                entry,
                userId: user.id,
                eggDetail,
                allocationId: allocation.id
            })
            break
        } catch (error) {
            lastError = error
            const msg = String(error?.message || "")

            // Bukan masalah allocation → langsung lempar, jangan buang port.
            if (!/allocation/i.test(msg)) throw error

            usedAllocations.add(allocation.id)
            console.warn(
                `[BulkServer] ${entry.username}: allocation #${allocation.id} ditolak (${msg}) — percobaan ${attempt}/3`
            )
        }
    }

    if (!server) {
        throw new Error(
            `Gagal menyiapkan allocation di node ${entry.node}: ${lastError?.message || "tidak diketahui"}`
        )
    }

    return {
        entry,
        email,
        user,
        userReused: reused,
        egg: eggDetail,
        allocation,
        server,
        panelUrl: getPanelUrl?.() || getPanelCredentials().url
    }
}

export default {
    FIELD_COUNT,
    parseBulkInput,
    parseSize,
    isPanelReady,
    getPanelCredentials,
    createPanelUser,
    findUserByUsername,
    getEggDetail,
    buildEnvironment,
    pickAllocation,
    createPanelServer,
    provisionEntry
}
