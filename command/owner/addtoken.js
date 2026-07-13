import { resolvePn, tag } from "../../lib/resolve.js"
import { addToken, getBalance } from "../../lib/token.js"

export default {
    command: ["addtoken", "givetoken"],

    owner: true,

    category: "Owner",

    description: "Menambah token milik user",

    async run({ sock, m, args }) {
        // Target: dari mention / reply / nomor pada argumen
        let rawTarget = m.mentionedJid?.[0] || m.quoted?.sender
        if (!rawTarget) {
            const numberArg = args.find((a) => /^\d{6,}$/.test(a.replace(/\D/g, "")))
            if (numberArg) rawTarget = numberArg.replace(/\D/g, "") + "@s.whatsapp.net"
        }
        const target = await resolvePn(sock, m, rawTarget)

        // Jumlah: angka terakhir yang BUKAN nomor target
        const nums = args.filter((a) => /^\d+$/.test(a))
        const targetNum = target ? target.split("@")[0] : null
        const amountCandidates = nums.filter((n) => n !== targetNum)
        const amount = parseInt(amountCandidates[amountCandidates.length - 1], 10)

        if (!target || isNaN(amount) || amount <= 0) {
            return m.reply(
                `╭━━━〔 🪙 ADD TOKEN 〕━━━⬣\n` +
                    `Tag/reply user & masukkan jumlah.\n\n` +
                    `Contoh:\n` +
                    `${global.prefix}addtoken @user 50\n` +
                    `${global.prefix}addtoken 628xxx 50\n` +
                    `╰━━━━━━━━━━━━━━━━━━⬣`
            )
        }

        const balance = addToken(target, amount)

        return m.reply(
            `╭━━━〔 🪙 ADD TOKEN 〕━━━⬣\n` +
                `✅ +${amount} token untuk\n` +
                `${tag(target)}\n\n` +
                `Saldo sekarang : ${balance}\n` +
                `╰━━━━━━━━━━━━━━━━━━⬣`,
            { mentions: [target] }
        )
    }
}
