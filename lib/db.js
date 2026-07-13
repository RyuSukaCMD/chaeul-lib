import fs from "fs"
import path from "path"

// Helper database JSON yang "self-healing" + BER-CACHE.
// - Otomatis membuat folder ./database & file bila belum ada.
// - Cache di memori agar tidak baca+parse file di setiap command (anti-delay).
// - Tulis di-debounce (ditunda sedikit) supaya banyak update beruntun hanya
//   sekali flush ke disk.

const DB_DIR = "./database"

const cache = new Map() // file -> data (objek/array)
const dirty = new Set() // file yang perlu di-flush
let flushTimer = null

export function ensureDir() {
    if (!fs.existsSync(DB_DIR)) fs.mkdirSync(DB_DIR, { recursive: true })
}

export function ensureFile(file, fallback = "{}") {
    ensureDir()
    const dir = path.dirname(file)
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true })
    if (!fs.existsSync(file)) fs.writeFileSync(file, fallback)
}

/** Membaca JSON (dari cache bila ada). */
export function readJSON(file, fallback = {}) {
    if (cache.has(file)) return cache.get(file)

    let data = fallback
    try {
        ensureFile(file, JSON.stringify(fallback))
        const raw = fs.readFileSync(file, "utf8")
        data = raw ? JSON.parse(raw) : fallback
    } catch {
        data = fallback
    }

    cache.set(file, data)
    return data
}

/** Menulis JSON: update cache + jadwalkan flush ke disk (debounce). */
export function writeJSON(file, data) {
    cache.set(file, data)
    dirty.add(file)
    scheduleFlush()
    return data
}

function scheduleFlush() {
    if (flushTimer) return
    flushTimer = setTimeout(flushAll, 400)
    if (flushTimer.unref) flushTimer.unref()
}

/** Tulis semua file yang berubah ke disk. */
export function flushAll() {
    flushTimer = null
    for (const file of dirty) {
        try {
            ensureFile(file, "{}")
            fs.writeFileSync(file, JSON.stringify(cache.get(file), null, 2))
        } catch {}
    }
    dirty.clear()
}

// Pastikan data tersimpan saat proses berhenti (biar tidak hilang).
const _onExit = () => {
    try {
        flushAll()
    } catch {}
}
process.on("exit", _onExit)
process.on("SIGINT", () => {
    _onExit()
    process.exit(0)
})
process.on("SIGTERM", () => {
    _onExit()
    process.exit(0)
})

export default { ensureDir, ensureFile, readJSON, writeJSON, flushAll }
