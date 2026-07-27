import { isBlacklist } from "./blacklistgroup.js"
import { isAllDisabled, isGroupRegistered, ALL_KEY } from "./groupmanage.js"
import { isSystemEnabled, isGroupNotifMuted } from "./systems.js"

// ═══════════════════════════════════════════════════════════
//  GROUP GATE — pemisahan tegas antara "command" dan "notifikasi".
//
//  Aturan resmi (revisi):
//
//   1. BLACKLIST GRUP (.blgroup) & GRUP BELUM TERDAFTAR
//      → bot hanya TIDAK MEMBALAS COMMAND di grup itu (diam saja,
//        tanpa teks penolakan). Sistem lain (notifikasi background,
//        welcome, auto-read, auto-typing, antilink, dll) TIDAK
//        terpengaruh.
//      → Owner & trusted user BISA bypass (command tetap jalan).
//
//   2. DISABLE COMMAND (.disablecommand / .disablecommand all)
//      → hanya membuat bot TIDAK MELISTEN command tersebut di grup
//        itu. Mematikan sebuah command otomatis mematikan SELURUH
//        alias & sub-command (tombol) milik command yang sama.
//      → Tidak memengaruhi notifikasi apa pun.
//
//   3. NOTIFIKASI (.disable)
//      → satu-satunya pengatur notifikasi. Bisa global maupun
//        PER-GRUP. Tidak memengaruhi command sama sekali.
//
//  Auto-read, auto-typing, auto-voice, dan pencatatan log SELALU
//  jalan, apa pun setelan di atas.
// ═══════════════════════════════════════════════════════════

/** Apakah grup sedang diblacklist. */
export function isGroupBlacklisted(jid) {
    try {
        return isBlacklist(jid)
    } catch {
        return false
    }
}

/** Apakah grup sedang kena "disable all" (kunci __all__). */
export function isGroupAllDisabled(jid) {
    try {
        return isAllDisabled(jid)
    } catch {
        return false
    }
}

/**
 * Apakah COMMAND diblokir di grup ini karena blacklist / belum terdaftar.
 * Hanya soal command — tidak menyentuh notifikasi.
 */
export function isCommandBlocked(jid) {
    try {
        if (!String(jid).endsWith("@g.us")) return false
        return isGroupBlacklisted(jid) || !isGroupRegistered(jid)
    } catch {
        return false
    }
}

/**
 * Boleh mengirim notifikasi sistem `key` ke grup ini?
 * Ditentukan HANYA oleh .disable (global + override per-grup).
 */
export function canNotify(jid, key) {
    try {
        if (!key) return !isGroupNotifMuted(jid)
        return isSystemEnabled(key, jid)
    } catch {
        return true
    }
}

/**
 * @deprecated Dipertahankan agar modul lama tidak error.
 * Dulu berarti "grup mati total". Sekarang blacklist/disable-all TIDAK
 * lagi membungkam notifikasi, jadi selalu false.
 */
export function isGroupSilent() {
    return false
}

export { ALL_KEY }

export default {
    isGroupBlacklisted,
    isGroupAllDisabled,
    isCommandBlocked,
    canNotify,
    isGroupSilent
}
