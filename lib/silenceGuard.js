import { isGroupSilent } from "./groupsilence.js"

// ═══════════════════════════════════════════════════════════
//  SILENCE GUARD — penjaga output tingkat SOCKET.
//
//  Saat sebuah grup "mati total" (.blgroup / .disablecommand all),
//  bot BENAR-BENAR tidak boleh bekerja di grup itu:
//   • tidak membalas command / tombol
//   • tidak mengirim notifikasi apa pun (welcome, goodbye, absen,
//     weather, node status, license, urgent, antilink, dsb)
//   • tidak mengirim teks "grup belum terdaftar"
//   • tidak react / typing / recording / read receipt
//
//  Gate di handler hanya menutup jalur command. Banyak modul lain
//  (welcome.js, license.js, absentWarn.js, proposalFlow.js, cron,
//  dll) memanggil sock.sendMessage LANGSUNG. Karena itu guard ini
//  membungkus (patch) fungsi socket-nya sekali per koneksi, agar
//  SEMUA output ke grup mati otomatis dibuang.
//
//  Pengecualian: aksi "delete" (hapus pesan) tetap diizinkan supaya
//  moderasi darurat oleh owner tidak ikut terkunci.
// ═══════════════════════════════════════════════════════════

const PATCHED = Symbol.for("chaeul.silenceGuard")

// Grup yang sementara diberi izin bicara (recovery oleh owner/admin:
// .delbl, .enablecommand all, dst). Diaktifkan hanya selama command
// recovery berjalan, lalu dimatikan lagi.
const bypass = new Set()
const timers = new Map()

/** Izinkan/blokir output ke grup mati sementara (recovery). */
export function setSilenceBypass(jid, on) {
    if (!jid) return
    if (on) bypass.add(String(jid))
    else bypass.delete(String(jid))
}

/**
 * Beri izin bicara sementara (default 15 detik) untuk grup mati —
 * dipakai handler saat command RECOVERY dijalankan, agar balasannya
 * (dan react/typing-nya) tetap sampai tanpa membuka grup sepenuhnya.
 */
export function allowSilenceTemporarily(jid, ms = 15000) {
    if (!jid) return
    setSilenceBypass(jid, true)
    clearTimeout(timers.get(String(jid)))
    timers.set(
        String(jid),
        setTimeout(() => {
            setSilenceBypass(jid, false)
            timers.delete(String(jid))
        }, ms)
    )
}

/** Jalankan fn dengan output ke grup mati diizinkan (recovery). */
export async function withSilenceBypass(jid, fn) {
    setSilenceBypass(jid, true)
    try {
        return await fn()
    } finally {
        // beri jeda kecil agar balasan async (react/typing) ikut lolos
        setTimeout(() => setSilenceBypass(jid, false), 5000)
    }
}

function isOwnerJid(id) {
    const num = String(id).split("@")[0].split(":")[0]
    return (global.owner || []).some((o) => num === o || String(id).startsWith(o))
}

/** Apakah JID ini target yang sedang dibungkam (grup mati / PC terkunci). */
function blocked(jid) {
    try {
        const id = String(jid || "")
        if (bypass.has(id)) return false

        if (id.endsWith("@g.us")) return isGroupSilent(id)

        // Chat private: saat grouponly / blockpc aktif, bot tidak boleh
        // mengirim apa pun ke non-owner (termasuk notifikasi background).
        // Peringatan block-pc dikirim lewat bypass sesaat dari handler.
        if (id.endsWith("@s.whatsapp.net") || id.endsWith("@lid")) {
            const locked = !!global.settings?.grouponly || !!global.settings?.blockpc
            if (!locked) return false
            return !isOwnerJid(id)
        }

        return false
    } catch {
        return false
    }
}

export function isSilenced(jid) {
    return blocked(jid)
}

/**
 * Pasang guard ke socket (idempotent — aman dipanggil berkali-kali).
 * Dipanggil lazily dari handler seperti watcher lainnya.
 */
export function applySilenceGuard(sock) {
    if (!sock || sock[PATCHED]) return sock
    sock[PATCHED] = true

    // ── sendMessage ──
    if (typeof sock.sendMessage === "function") {
        const original = sock.sendMessage.bind(sock)
        sock.sendMessage = async (jid, content, options) => {
            // Hapus pesan tetap diizinkan (moderasi), sisanya dibuang.
            if (blocked(jid) && !(content && content.delete)) return undefined
            return original(jid, content, options)
        }
    }

    // ── presence (typing / recording) ──
    if (typeof sock.sendPresenceUpdate === "function") {
        const original = sock.sendPresenceUpdate.bind(sock)
        sock.sendPresenceUpdate = async (type, jid) => {
            if (blocked(jid)) return undefined
            return original(type, jid)
        }
    }

    // ── read receipt / autoread ──
    if (typeof sock.readMessages === "function") {
        const original = sock.readMessages.bind(sock)
        sock.readMessages = async (keys) => {
            const list = (keys || []).filter((k) => !blocked(k?.remoteJid))
            if (!list.length) return undefined
            return original(list)
        }
    }

    // ── relayMessage (jalur low-level, dipakai beberapa lib tombol) ──
    if (typeof sock.relayMessage === "function") {
        const original = sock.relayMessage.bind(sock)
        sock.relayMessage = async (jid, message, options) => {
            if (blocked(jid) && !message?.protocolMessage) return undefined
            return original(jid, message, options)
        }
    }

    return sock
}

export default {
    applySilenceGuard,
    isSilenced,
    setSilenceBypass,
    allowSilenceTemporarily,
    withSilenceBypass
}
