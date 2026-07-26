import { readJSON, writeJSON } from "./db.js"

// Menyimpan pengaturan yang bisa diubah lewat command agar tetap
// bertahan setelah bot restart (prefix, mode tanpa-prefix, dsb).
const DB = "./database/settings.json"

// Toggle boolean di global.settings yang ingin ikut TERSIMPAN (restart-safe).
const SETTING_KEYS = ["grouponly", "blockpc", "blockcall"]

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

    // Pulihkan toggle boolean (grouponly / blockpc / blockcall).
    global.settings ||= {}
    if (s.settings && typeof s.settings === "object") {
        for (const key of SETTING_KEYS) {
            if (typeof s.settings[key] === "boolean") global.settings[key] = s.settings[key]
        }
    }

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

/** Daftar toggle yang dipersist + nilai terkininya. */
export function getSettingToggles() {
    global.settings ||= {}
    const out = {}
    for (const key of SETTING_KEYS) out[key] = !!global.settings[key]
    return out
}

/** Set 1 toggle boolean (grouponly / blockpc / blockcall) + simpan ke DB. */
export function setSettingToggle(key, value) {
    if (!SETTING_KEYS.includes(key)) throw new Error(`Setting tidak dikenal: ${key}`)
    global.settings ||= {}
    global.settings[key] = !!value

    const s = load()
    s.settings ||= {}
    s.settings[key] = !!value
    save(s)
    return global.settings[key]
}

/** Balikkan (flip) 1 toggle; mengembalikan nilai barunya. */
export function flipSettingToggle(key) {
    global.settings ||= {}
    return setSettingToggle(key, !global.settings[key])
}

export default { loadSettings, setPrefix, setNoPrefix, getSettingToggles, setSettingToggle, flipSettingToggle }
