import fs from "fs"
import path from "path"

// Helper database JSON yang "self-healing":
// otomatis membuat folder ./database dan file bila belum ada,
// sehingga menghapus folder database tidak akan membuat bot crash.

const DB_DIR = "./database"

/** Pastikan folder database ada. */
export function ensureDir() {
    if (!fs.existsSync(DB_DIR)) fs.mkdirSync(DB_DIR, { recursive: true })
}

/** Pastikan sebuah file JSON ada (buat dengan nilai default bila belum). */
export function ensureFile(file, fallback = "{}") {
    ensureDir()
    const dir = path.dirname(file)
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true })
    if (!fs.existsSync(file)) fs.writeFileSync(file, fallback)
}

/**
 * Membaca file JSON dengan aman.
 * @param {string} file
 * @param {*} fallback nilai default bila file tidak ada / rusak ({} atau [])
 */
export function readJSON(file, fallback = {}) {
    try {
        ensureFile(file, JSON.stringify(fallback))
        const raw = fs.readFileSync(file, "utf8")
        return raw ? JSON.parse(raw) : fallback
    } catch {
        return fallback
    }
}

/** Menulis file JSON dengan aman (folder dibuat otomatis). */
export function writeJSON(file, data) {
    ensureFile(file, "{}")
    fs.writeFileSync(file, JSON.stringify(data, null, 4))
}

export default { ensureDir, ensureFile, readJSON, writeJSON }
