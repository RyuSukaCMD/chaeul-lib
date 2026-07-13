import { resolvePn, tag } from "../../lib/resolve.js"

export default {
    command: ["getpp", "pp", "profilepic"],

    category: "Misc",

    description: "Ambil foto profil user yang di-tag / reply",

    async run({ sock, m }) {
        // Target: mention → reply → diri sendiri
        const rawTarget = m.mentionedJid?.[0] || m.quoted?.sender || m.sender
        const target = await resolvePn(sock, m, rawTarget)

        await m.react("🖼️")

        try {
            // "image" = HD; fallback ke thumbnail bila HD tidak tersedia
            let url
            try {
                url = await sock.profilePictureUrl(target, "image")
            } catch {
                url = await sock.profilePictureUrl(target).catch(() => null)
            }

            if (!url) {
                await m.react("❌")
                return m.reply(
                    `╭━━━〔 🖼️ GET PP 〕━━━⬣\n` +
                        `${tag(target)} tidak memiliki\n` +
                        `foto profil atau disembunyikan.\n` +
                        `╰━━━━━━━━━━━━━━━━━━⬣`,
                    { mentions: [target] }
                )
            }

            await m.send(
                "image",
                { url },
                {
                    caption:
                        `╭━━━〔 🖼️ PROFILE PICTURE 〕━━━⬣\n` +
                        `👤 ${tag(target)}\n` +
                        `╰━━━━━━━━━━━━━━━━━━⬣`,
                    mentions: [target]
                }
            )

            return m.react("✅")
        } catch (e) {
            await m.react("❌")
            return m.reply(`Gagal mengambil foto profil.\n${e.message}`)
        }
    }
}
