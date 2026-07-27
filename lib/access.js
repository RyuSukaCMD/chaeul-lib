import { isTrustedGroup, isTrustedUser } from "./trust.js"

// ═══════════════════════════════════════════════════════════
//  ACCESS — penentu OWNER / TRUSTED yang dipakai seluruh bot.
//
//  Masalah lama:
//   • `m.sender.startsWith(owner)` memberi FALSE POSITIVE/NEGATIVE
//     (nomor "628" cocok dengan "6281...", dan gagal untuk @lid).
//   • Pesan dari @lid membuat senderNumber berisi angka LID, bukan
//     nomor asli → owner/trusted tidak terdeteksi → command diam.
//
//  Solusi: kumpulkan SEMUA identitas yang mungkin milik pengirim
//  (sender, senderNumber, participant, participantAlt, remoteJidAlt,
//  dan chat untuk PC) lalu cocokkan sebagai DIGIT PENUH.
// ═══════════════════════════════════════════════════════════

/** Ambil digit nomor murni dari JID/nomor apa pun. */
export function digits(value) {
    return String(value || "")
        .split("@")[0]
        .split(":")[0]
        .replace(/\D/g, "")
}

/**
 * Semua kandidat nomor milik pengirim sebuah pesan.
 * @returns {string[]} daftar digit unik (tanpa string kosong)
 */
export function senderCandidates(m) {
    if (!m) return []

    const raw = [
        m.sender,
        m.senderNumber,
        m.key?.participant,
        m.key?.participantAlt,
        m.key?.remoteJidAlt,
        m.participant,
        // Untuk private chat, remoteJid = lawan bicara.
        m.isGroup ? null : m.chat,
        m.isGroup ? null : m.key?.remoteJid
    ]

    const out = new Set()
    for (const value of raw) {
        const num = digits(value)
        if (num) out.add(num)
    }
    return [...out]
}

/**
 * Cocokkan sebuah nomor dengan daftar nomor (owner dsb).
 * Perbandingan berbasis digit penuh; toleran terhadap awalan 0 / +62
 * dan sufiks perangkat (":12").
 */
export function numberMatches(candidate, target) {
    const a = digits(candidate)
    const b = digits(target)
    if (!a || !b) return false
    if (a === b) return true

    // Toleransi format lokal: 08xxx vs 628xxx.
    const localToIntl = (n) => (n.startsWith("0") ? `62${n.slice(1)}` : n)
    return localToIntl(a) === localToIntl(b)
}

/** Apakah pesan ini berasal dari OWNER bot. */
export function isOwner(m) {
    const owners = global.owner || []
    if (!owners.length) return false

    const candidates = senderCandidates(m)
    if (!candidates.length) return false

    return owners.some((owner) => candidates.some((c) => numberMatches(c, owner)))
}

/** Apakah nomor/JID tertentu milik owner (untuk konteks non-pesan: call, dll). */
export function isOwnerNumber(numOrJid) {
    const owners = global.owner || []
    return owners.some((owner) => numberMatches(numOrJid, owner))
}

/** Apakah pengirim terdaftar sebagai trusted user (di mana pun). */
export function isTrustedSender(m) {
    return senderCandidates(m).some((num) => isTrustedUser(num))
}

/**
 * Trusted access penuh = user trusted DI grup yang di-trust.
 * Di luar grup trust, user trusted tetap user biasa (aturan lama).
 */
export function hasTrustedAccess(m) {
    if (!m?.isGroup) return false
    if (!isTrustedGroup(m.chat)) return false
    return isTrustedSender(m)
}

/**
 * Ringkasan hak akses sebuah pesan — dipakai handler.
 * @returns {{ isCreator: boolean, isTrusted: boolean, isPrivileged: boolean, sender: string }}
 */
export function resolveAccess(m) {
    const isCreator = isOwner(m)

    // Trusted "penuh" (akses command owner) = user trust DI grup trust.
    const isTrusted = !isCreator && hasTrustedAccess(m)

    // Trusted user di mana pun → cukup untuk MELEWATI gate grup
    // (blacklist / belum terdaftar / disable command) supaya bot tetap
    // membalas mereka, tanpa memberi hak command owner.
    const trustedAnywhere = !isCreator && isTrustedSender(m)

    return {
        isCreator,
        isTrusted,
        trustedAnywhere,
        // Kebal seluruh gate grup.
        isPrivileged: isCreator || isTrusted || trustedAnywhere,
        sender: digits(m?.senderNumber || m?.sender)
    }
}

export default {
    digits,
    senderCandidates,
    numberMatches,
    isOwner,
    isOwnerNumber,
    isTrustedSender,
    hasTrustedAccess,
    resolveAccess
}
