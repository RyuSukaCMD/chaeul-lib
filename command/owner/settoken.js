import { resolvePn, tag } from "../../lib/resolve.js"
import { setToken } from "../../lib/token.js"

export default {
    command: ["settoken"],

    owner: true,

    category: "Owner",

    description: "Menetapkan jumlah token user",

    async run({ sock, m, args }) {
        let rawTarget = m.mentionedJid?.[0] || m.quoted?.sender
        if (!rawTarget) {
            const numberArg = args.find((a) => /^\d{6,}$/.test(a.replace(/\D/g, "")))
            if (numberArg) rawTarget = numberArg.replace(/\D/g, "") + "@s.whatsapp.net"
        }
        const target = await resolvePn(sock, m, rawTarget)

        const nums = args.filter((a) => /^\d+$/.test(a))
        const targetNum = target ? target.split("@")[0] : null
        const amountCandidates = nums.filter((n) => n !== targetNum)
        const amount = parseInt(amountCandidates[amountCandidates.length - 1], 10)

        if (!target || isNaN(amount)) {
            return m.reply(
                `╭━━━〔 🪙 SET TOKEN 〕━━━⬣\n` +
                    `Tag/reply user & masukkan jumlah.\n\n` +
                    `Contoh:\n` +
                    `${global.prefix}settoken @user 100\n` +
                    `╰━━━━━━━━━━━━━━━━━━⬣`
            )
        }

        const balance = setToken(target, amount)

        return m.reply(
            `╭━━━〔 🪙 SET TOKEN 〕━━━⬣\n` +
                `✅ Token ${tag(target)}\n` +
                `diatur menjadi : ${balance}\n` +
                `╰━━━━━━━━━━━━━━━━━━⬣`,
            { mentions: [target] }
        )
    }
}
