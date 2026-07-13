import { readJSON, writeJSON } from "./db.js"

// Menyimpan pengaturan yang bisa diubah lewat command agar tetap
// bertahan setelah bot restart (prefix, mode tanpa-prefix, dsb).
const DB = "./database/settings.json"

function load() {
    return readJSON(DB, {})
}

function save(data) {
    writeJSON(DB, data)
}

/** Muat pengaturan tersimpan ke dalam global (dipanggil saat startup). */
export function loadSettings() {
    const s = load()

    if (typeof s.prefix === "string" && s.prefix) global.prefix = s.prefix
    if (typeof s.noPrefix === "boolean") global.noPrefix = s.noPrefix
    else global.noPrefix ??= false

    return s
}

/** Ubah prefix bot & simpan. */
export function setPrefix(prefix) {
    global.prefix = prefix
    const s = load()
    s.prefix = prefix
    save(s)
    return prefix
}

/** Aktif/nonaktifkan mode tanpa-prefix & simpan. */
export function setNoPrefix(value) {
    global.noPrefix = !!value
    const s = load()
    s.noPrefix = !!value
    save(s)
    return global.noPrefix
}

export default { loadSettings, setPrefix, setNoPrefix }
