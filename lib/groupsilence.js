import { isBlacklist } from "./blacklistgroup.js"
import { isAllDisabled, ALL_KEY } from "./groupmanage.js"

// ═══════════════════════════════════════════════════════════
//  GROUP SILENCE — grup "mati total".
//
//  Sebuah grup dianggap mati bila:
//   1. Masuk BLACKLIST (.blgroup), ATAU
//   2. Kena "disable all" ( .disablecommand all / kunci __all__ ).
//
//  Di grup seperti ini bot BENAR-BENAR tidak bekerja:
//   • tidak memproses command / tombol / antilink / AFK-notif / sesi
//   • tidak mengirim teks apa pun (termasuk "grup belum terdaftar")
//   • tidak mengirim notifikasi background (weather, node status,
//     pengingat absen, welcome/goodbye, dst)
//
//  Owner tetap bisa memakai command (untuk recovery: .delbl /
//  .enablecommand all). Selain itu, command recovery tetap lolos
//  di grup "disable all" agar admin bisa menyalakan lagi (cek di
//  handler).
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

/** Grup mati total = blacklist ATAU disable all. */
export function isGroupSilent(jid) {
    return isGroupBlacklisted(jid) || isGroupAllDisabled(jid)
}

export { ALL_KEY }

export default { isGroupSilent, isGroupBlacklisted, isGroupAllDisabled }
