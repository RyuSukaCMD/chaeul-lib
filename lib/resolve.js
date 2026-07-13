/**
 * Helper untuk mengubah JID (termasuk @lid) menjadi phone-number JID
 * (@s.whatsapp.net) agar mention benar-benar nge-tag user, bukan
 * menampilkan angka LID.
 *
 * Urutan usaha:
 *  1. Sudah @s.whatsapp.net → langsung dipakai.
 *  2. @lid → konversi via signalRepository.lidMapping.getPNForLID().
 *  3. Fallback (grup) → cari phoneNumber di groupMetadata.
 */
export async function resolvePn(sock, m, jid) {
    if (!jid) return jid

    // Sudah nomor asli
    if (jid.endsWith("@s.whatsapp.net")) return jid

    if (jid.endsWith("@lid")) {
        // Coba konversi LID → PN lewat mapping bawaan Baileys
        try {
            const pn = await sock.signalRepository?.lidMapping?.getPNForLID(jid)
            if (pn) return pn.replace(/:\d+@/, "@")
        } catch {
            // abaikan, lanjut ke fallback
        }

        // Fallback: cari di metadata grup
        if (m.isGroup) {
            try {
                const metadata = await sock.groupMetadata(m.chat)
                const p = metadata.participants.find((v) => v.id === jid || v.lid === jid)
                if (p?.phoneNumber) return p.phoneNumber.replace(/:\d+@/, "@")
            } catch {
                // abaikan
            }
        }
    }

    return jid
}

/** Ambil nomor dari JID untuk tag @mention. */
export const tag = (jid = "") => `@${String(jid).split("@")[0]}`

export default { resolvePn, tag }
