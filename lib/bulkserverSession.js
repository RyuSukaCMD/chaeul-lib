// ═══════════════════════════════════════════════════════════
//  BULK SERVER SESSION — menyimpan siapa yang sedang diminta
//  mengetik data akun untuk .bulkserver.
//
//  Sesi disimpan di memori saja (sengaja) supaya data password
//  tidak pernah tertulis ke disk. Sesi otomatis kedaluwarsa.
// ═══════════════════════════════════════════════════════════

const sessions = new Map() // sender -> { chat, step, entries, createdAt }

const TTL = 10 * 60 * 1000 // 10 menit

function expired(session) {
    return !session || Date.now() - session.createdAt > TTL
}

export function setBulkSession(sender, data) {
    sessions.set(String(sender), { ...data, createdAt: Date.now() })
}

export function getBulkSession(sender) {
    const key = String(sender)
    const session = sessions.get(key)
    if (expired(session)) {
        sessions.delete(key)
        return null
    }
    return session
}

export function hasBulkSession(sender) {
    return !!getBulkSession(sender)
}

export function clearBulkSession(sender) {
    return sessions.delete(String(sender))
}

export default { setBulkSession, getBulkSession, hasBulkSession, clearBulkSession }
