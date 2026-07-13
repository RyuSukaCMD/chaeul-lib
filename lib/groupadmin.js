import { resolvePn } from "./resolve.js"

/**
 * Cek apakah pengirim adalah admin grup (atau owner bot).
 * @returns {Promise<{ isAdmin:boolean, isBotAdmin:boolean, metadata:object|null }>}
 */
export async function checkAdmin(sock, m, isCreator = false) {
    if (!m.isGroup) return { isAdmin: false, isBotAdmin: false, metadata: null }

    let metadata
    try {
        metadata = await sock.groupMetadata(m.chat)
    } catch {
        return { isAdmin: false, isBotAdmin: false, metadata: null }
    }

    const senderPn = await resolvePn(sock, m, m.sender)
    const botId = sock.user?.id?.replace(/:\d+/g, "")

    const senderPart = metadata.participants.find(
        (p) => p.id === m.sender || p.phoneNumber === senderPn || p.id === senderPn
    )
    const botPart = metadata.participants.find(
        (p) => p.id === sock.user?.lid || p.phoneNumber === botId || p.id === botId
    )

    return {
        isAdmin: isCreator || !!senderPart?.admin,
        isBotAdmin: !!botPart?.admin,
        metadata
    }
}

export default { checkAdmin }
