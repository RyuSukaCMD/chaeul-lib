// ═══════════════════════════════════════════════════════════
//  ANTI-SPAM — pembatas laju command per user.
//
//  Versi lama terlalu galak: jeda WAJIB 5 detik antar command,
//  3 pelanggaran → di-blacklist diam-diam 60 detik. Akibatnya user
//  normal (yang wajar mengetik 2–3 command beruntun) merasa
//  "bot tidak merespon".
//
//  Versi ini memakai jendela geser (sliding window):
//   • Boleh BURST sampai BURST_LIMIT command dalam WINDOW_MS.
//   • Melebihi itu → diberi peringatan (sekali per periode, tidak
//     spam balasan), command diabaikan sementara.
//   • Cooldown pulih otomatis; tidak ada hukuman berjenjang yang
//     membuat bot bisu berkepanjangan.
//   • Owner/trusted tidak pernah lewat sini (dicek di handler).
// ═══════════════════════════════════════════════════════════

export const WINDOW_MS = 10_000 // jendela pengamatan
export const BURST_LIMIT = 6 // maksimal command dalam 1 jendela
export const COOLDOWN_MS = 8_000 // durasi tenang setelah melewati batas

// state: Map<number, { hits: number[], cooldownUntil: number, notified: boolean }>
const state = new Map()

function norm(jid = "") {
    return String(jid).split("@")[0].split(":")[0].replace(/\D/g, "")
}

function get(num) {
    let s = state.get(num)
    if (!s) {
        s = { hits: [], cooldownUntil: 0, notified: false }
        state.set(num, s)
    }
    return s
}

/**
 * Cek status cooldown user (tanpa mencatat percobaan baru).
 * @returns {{ blocked: boolean, remaining: number }}
 */
export function checkBlacklist(jid) {
    const s = get(norm(jid))
    const now = Date.now()
    if (s.cooldownUntil > now) {
        return { blocked: true, remaining: Math.ceil((s.cooldownUntil - now) / 1000) }
    }
    return { blocked: false, remaining: 0 }
}

/**
 * Catat sebuah percobaan command & tentukan tindakan.
 *
 * @returns {{ action: "ok"|"warn"|"silent", remaining: number, hits: number }}
 *   - ok     : jalankan command
 *   - warn   : beri peringatan sekali, jangan jalankan
 *   - silent : masih cooldown & sudah diperingatkan → abaikan diam-diam
 */
export function registerAttempt(jid) {
    const num = norm(jid)
    const s = get(num)
    const now = Date.now()

    // Masih dalam masa cooldown.
    if (s.cooldownUntil > now) {
        const remaining = Math.ceil((s.cooldownUntil - now) / 1000)
        if (!s.notified) {
            s.notified = true
            return { action: "warn", remaining, hits: s.hits.length }
        }
        return { action: "silent", remaining, hits: s.hits.length }
    }

    // Cooldown selesai → bersihkan state.
    if (s.cooldownUntil && s.cooldownUntil <= now) {
        s.cooldownUntil = 0
        s.notified = false
        s.hits = []
    }

    // Buang jejak di luar jendela.
    s.hits = s.hits.filter((t) => now - t < WINDOW_MS)
    s.hits.push(now)

    if (s.hits.length > BURST_LIMIT) {
        s.cooldownUntil = now + COOLDOWN_MS
        s.notified = true
        return { action: "warn", remaining: Math.ceil(COOLDOWN_MS / 1000), hits: s.hits.length }
    }

    return { action: "ok", remaining: 0, hits: s.hits.length }
}

/** Bersihkan state seorang user (mis. saat di-trust). */
export function clearAttempts(jid) {
    state.delete(norm(jid))
}

/** Reset state (untuk test). */
export function _reset() {
    state.clear()
}

export default {
    WINDOW_MS,
    BURST_LIMIT,
    COOLDOWN_MS,
    checkBlacklist,
    registerAttempt,
    clearAttempts,
    _reset
}
