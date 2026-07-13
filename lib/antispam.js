// Anti-spam command:
//  - Jeda minimal 5 detik antar command per-user.
//  - Melanggar (spam) → +1 strike. Jika strike >= 3 → blacklist (command
//    tidak dilisten) selama durasi yang bertambah tiap pelanggaran berulang.
//  - Base blacklist 60 detik; tiap kali blacklist habis lalu langgar lagi,
//    durasi bertambah (60s → 120s → 180s ...).
//
// Disimpan di memori (Map) — anti-spam sifatnya sementara, tak perlu disk.

export const COOLDOWN_MS = 5000 // jeda minimal antar command
export const SPAM_LIMIT = 3 // strike sebelum blacklist
const BASE_BLACKLIST_MS = 60000 // durasi blacklist dasar (1 menit)

// state: Map<number, { last, strikes, blockedUntil, offenses }>
const state = new Map()

function norm(jid = "") {
    return String(jid).replace(/[^0-9]/g, "")
}

function get(num) {
    let s = state.get(num)
    if (!s) {
        s = { last: 0, strikes: 0, blockedUntil: 0, offenses: 0 }
        state.set(num, s)
    }
    return s
}

/**
 * Cek status blacklist user. Bila masih di-blacklist, kembalikan sisa detik.
 * @returns {{ blocked: boolean, remaining: number }}
 */
export function checkBlacklist(jid) {
    const num = norm(jid)
    const s = get(num)
    if (s.blockedUntil && Date.now() < s.blockedUntil) {
        return { blocked: true, remaining: Math.ceil((s.blockedUntil - Date.now()) / 1000) }
    }
    // Blacklist habis
    if (s.blockedUntil && Date.now() >= s.blockedUntil) {
        s.blockedUntil = 0
        s.strikes = 0
    }
    return { blocked: false, remaining: 0 }
}

/**
 * Catat sebuah percobaan command & tentukan tindakan.
 * @returns {{ action:"ok"|"warn"|"blacklist", strikes:number, remaining:number, warnLeft:number, blockSec:number }}
 *   - ok        : boleh lanjut
 *   - warn      : terlalu cepat (spam) → beri peringatan, jangan jalankan command
 *   - blacklist : strike penuh → di-blacklist, jangan dilisten
 */
export function registerAttempt(jid) {
    const num = norm(jid)
    const s = get(num)
    const now = Date.now()

    // Sedang di-blacklist → tetap blocked (tidak dilisten)
    if (s.blockedUntil && now < s.blockedUntil) {
        return {
            action: "blacklist",
            strikes: s.strikes,
            remaining: Math.ceil((s.blockedUntil - now) / 1000),
            warnLeft: 0,
            blockSec: 0
        }
    }

    const delta = now - s.last

    // Cukup jeda → reset strike, izinkan
    if (delta >= COOLDOWN_MS) {
        s.last = now
        s.strikes = 0
        return { action: "ok", strikes: 0, remaining: 0, warnLeft: SPAM_LIMIT, blockSec: 0 }
    }

    // Terlalu cepat → spam
    s.strikes += 1
    s.last = now // update supaya tetap harus nunggu

    if (s.strikes >= SPAM_LIMIT) {
        s.offenses += 1
        const dur = BASE_BLACKLIST_MS * s.offenses // bertambah tiap pelanggaran
        s.blockedUntil = now + dur
        return {
            action: "blacklist",
            strikes: s.strikes,
            remaining: Math.ceil(dur / 1000),
            warnLeft: 0,
            blockSec: Math.ceil(dur / 1000)
        }
    }

    return {
        action: "warn",
        strikes: s.strikes,
        remaining: Math.ceil((COOLDOWN_MS - delta) / 1000),
        warnLeft: SPAM_LIMIT - s.strikes,
        blockSec: 0
    }
}

/** Reset state (untuk test). */
export function _reset() {
    state.clear()
}

export default { COOLDOWN_MS, SPAM_LIMIT, checkBlacklist, registerAttempt, _reset }
