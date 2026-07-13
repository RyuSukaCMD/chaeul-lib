import { resolvePn, tag } from "../../lib/resolve.js"
import { delToken } from "../../lib/token.js"

export default {
    command: ["deltoken", "removetoken"],

    owner: true,

    category: "Owner",

    description: "Menghapus akun token user",

    async run({ sock, m, args = [] }) {
        let rawTarget = m.mentionedJid?.[0] || m.quoted?.sender
        if (!rawTarget) {
            const numberArg = args.find((a) => /^\d{6,}$/.test(a.replace(/\D/g, "")))
            if (numberArg) rawTarget = numberArg.replace(/\D/g, "") + "@s.whatsapp.net"
        }
        const target = await resolvePn(sock, m, rawTarget)

        if (!target) {
            return m.reply(
                `╭━━━〔 🪙 DEL TOKEN 〕━━━⬣\n` +
                    `Tag/reply user yang ingin\n` +
                    `dihapus akun token-nya.\n\n` +
                    `Contoh:\n` +
                    `${global.prefix}deltoken @user\n` +
                    `╰━━━━━━━━━━━━━━━━━━⬣`
            )
        }

        const ok = delToken(target)

        if (!ok) {
            return m.reply(
                `╭━━━〔 🪙 DEL TOKEN 〕━━━⬣\n` +
                    `${tag(target)} tidak memiliki\n` +
                    `akun token.\n` +
                    `╰━━━━━━━━━━━━━━━━━━⬣`,
                { mentions: [target] }
            )
        }

        return m.reply(
            `╭━━━〔 🪙 DEL TOKEN 〕━━━⬣\n` +
                `✅ Akun token ${tag(target)}\n` +
                `berhasil dihapus.\n` +
                `╰━━━━━━━━━━━━━━━━━━⬣`,
            { mentions: [target] }
        )
    }
}
