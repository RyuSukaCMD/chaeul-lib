// Cache metadata grup agar tidak fetch berulang (mengurangi delay).
// TTL pendek supaya perubahan admin/member tetap ter-update.

const cache = new Map() // jid -> { data, at }
const TTL = 60 * 1000 // 1 menit

/** Ambil groupMetadata dengan cache. */
export async function getMetadata(sock, jid, force = false) {
    const hit = cache.get(jid)
    if (!force && hit && Date.now() - hit.at < TTL) return hit.data

    const data = await sock.groupMetadata(jid)
    cache.set(jid, { data, at: Date.now() })
    return data
}

/** Hapus cache sebuah grup (mis. setelah kick/promote). */
export function invalidate(jid) {
    cache.delete(jid)
}

export default { getMetadata, invalidate }
