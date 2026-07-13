import { resolvePn, tag } from "./resolve.js"
import { getSettings, isModeActive, consumeBypass, getBypass } from "./antilink.js"
import { detectLinks, hasAnyLink } from "./linkdetect.js"
import { isPremium } from "./premium.js"
import { addWarn, WARN_LIMIT } from "./warn.js"

/**
 * Menegakkan aturan antilink pada sebuah pesan grup.
 * @returns {Promise<boolean>} true bila pesan dilanggar & ditindak (hapus/warn/kick)
 *
 * Aturan:
 *  - Hanya berlaku di grup & bila ada mode antilink aktif.
 *  - Admin/owner grup, bot sendiri, dan user PREMIUM kebal.
 *  - Butuh bot admin untuk menghapus & kick.
 *  - Pelanggaran: hapus pesan → +1 warn → bila warn >= limit, kick.
 *  - User dgn kuota bypass: 1 pelanggaran memakai 1 bypass (tidak ditindak).
 */
export async function enforceAntilink(sock, m, { isCreator }) {
    if (!m.isGroup) return false
    if (m.fromMe) return false

    const settings = getSettings(m.chat)
    const anyActive = Object.values(settings).some(Boolean)
    if (!anyActive) return false

    const body = m.body || ""
    const isTagSw = m.type === "groupStatusMentionMessage"

    // Tentukan pelanggaran sesuai mode aktif
    let violated = false
    let reason = ""

    if (isModeActive(m.chat, "tagsw") && isTagSw) {
        violated = true
        reason = "Tag Status (SW)"
    } else if (isModeActive(m.chat, "all") && hasAnyLink(body)) {
        violated = true
        reason = "Link"
    } else {
        const hits = detectLinks(body)
        for (const h of hits) {
            if (isModeActive(m.chat, h)) {
                violated = true
                reason =
                    h === "group"
                        ? "Link Grup WA"
                        : h === "channel"
                          ? "Link Channel WA"
                          : "Link Sosmed"
                break
            }
        }
    }

    if (!violated) return false

    // Owner bot kebal
    if (isCreator) return false

    // Premium kebal
    const senderPn = await resolvePn(sock, m, m.sender)
    if (isPremium(senderPn) || isPremium(m.sender)) return false

    // Cek admin grup & status bot
    let metadata
    try {
        metadata = await sock.groupMetadata(m.chat)
    } catch {
        return false
    }

    const botId = sock.user?.id?.replace(/:\d+/g, "")
    const botPart = metadata.participants.find(
        (p) => p.id === sock.user?.lid || p.phoneNumber === botId || p.id === botId
    )
    const senderPart = metadata.participants.find(
        (p) => p.id === m.sender || p.phoneNumber === senderPn || p.id === senderPn
    )

    // Pengirim admin → kebal
    if (senderPart?.admin) return false

    // Bot bukan admin → tidak bisa menindak
    if (!botPart?.admin) return false

    // Pakai kuota bypass bila ada
    if (consumeBypass(m.chat, senderPn)) {
        await m.reply(
            `♻️ ${tag(senderPn)} memakai 1 bypass antilink.\n` +
                `Sisa bypass: ${getBypass(m.chat, senderPn)}`,
            { mentions: [senderPn] }
        )
        return true
    }

    // Hapus pesan pelanggar
    try {
        await sock.sendMessage(m.chat, { delete: m.key })
    } catch {}

    // Tambah warn
    const warnCount = addWarn(m.chat, senderPn, 1)

    // Kick bila melewati batas
    if (warnCount >= WARN_LIMIT) {
        try {
            const targetId = senderPart?.id || m.sender
            await sock.groupParticipantsUpdate(m.chat, [targetId], "remove")
            await sock.sendMessage(m.chat, {
                text:
                    `🚫 ANTILINK\n\n${tag(senderPn)} dikeluarkan karena\n` +
                    `mencapai ${WARN_LIMIT} peringatan (${reason}).`,
                mentions: [senderPn]
            })
        } catch {
            await sock.sendMessage(m.chat, {
                text: `⚠️ Gagal kick ${tag(senderPn)}. Pastikan bot admin.`,
                mentions: [senderPn]
            })
        }
        return true
    }

    // Beri peringatan
    await sock.sendMessage(m.chat, {
        text:
            `⚠️ ANTILINK\n\n${tag(senderPn)}, ${reason} tidak diizinkan!\n` +
            `Peringatan: ${warnCount}/${WARN_LIMIT}\n` +
            `Jika mencapai ${WARN_LIMIT}, kamu akan dikeluarkan.`,
        mentions: [senderPn]
    })

    return true
}

export default { enforceAntilink }
