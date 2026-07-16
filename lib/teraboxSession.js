// ═══════════════════════════════════════════════════════════
//  SESI TERABOX (in-memory, per-chat)
//  Menyimpan hasil daftar file Terabox terakhir per chat agar user
//  bisa memilih file lewat nomor (mis. ".terabox 2") tanpa kirim link lagi.
//  TTL 10 menit — otomatis kedaluwarsa.
// ═══════════════════════════════════════════════════════════
const store = new Map() // chatJid -> { data, at }
const TTL = 10 * 60 * 1000

export function setTeraboxSession(chat, data) {
    store.set(chat, { data, at: Date.now() })
}

export function getTeraboxSession(chat) {
    const hit = store.get(chat)
    if (!hit) return null
    if (Date.now() - hit.at > TTL) {
        store.delete(chat)
        return null
    }
    return hit.data
}

export function clearTeraboxSession(chat) {
    store.delete(chat)
}

export default { setTeraboxSession, getTeraboxSession, clearTeraboxSession }
