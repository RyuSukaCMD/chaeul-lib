import { resolvePn, tag } from "../../lib/resolve.js"
import { hasAccount, addToken, getBalance } from "../../lib/token.js"
import { DAILY_REWARD, claimedToday, markClaimed, msUntilReset } from "../../lib/daily.js"

function formatWait(ms) {
    const h = Math.floor(ms / 3600000)
    const m = Math.floor((ms % 3600000) / 60000)
    return `${h} jam ${m} menit`
}

export default {
    command: ["daily", "claim"],

    category: "Main",

    description: "Klaim hadiah harian (30 coins)",

    // Daily gratis (tidak memotong token)
    free: true,

    async run({ sock, m }) {
        const me = await resolvePn(sock, m, m.sender)

        if (!hasAccount(me)) {
            return m.reply(
                `╭━━━〔 🎁 DAILY 〕━━━⬣\n` +
                    `Kamu belum terdaftar.\n\n` +
                    `Daftar dulu: ${global.prefix}register\n` +
                    `╰━━━━━━━━━━━━━━━━━━⬣`
            )
        }

        // Sudah klaim hari ini?
        if (claimedToday(me)) {
            return m.reply(
                `╭━━━〔 🎁 DAILY 〕━━━⬣\n` +
                    `┃\n` +
                    `┃ Kamu sudah klaim hari ini! ✅\n` +
                    `┃\n` +
                    `┃ ⏳ Reset dalam:\n` +
                    `┃   ${formatWait(msUntilReset())}\n` +
                    `┃\n` +
                    `┃ 🪙 Saldo: ${getBalance(me)} coins\n` +
                    `┃\n` +
                    `╰━━━━━━━━━━━━━━━━━━⬣`
            )
        }

        // Beri reward
        markClaimed(me)
        const balance = addToken(me, DAILY_REWARD)

        await m.react("🎉")

        return m.reply(
            `╭━━━〔 🎁 DAILY REWARD 〕━━━⬣\n` +
                `┃\n` +
                `┃ Selamat ${tag(me)}! 🎉\n` +
                `┃\n` +
                `┃ 🪙 +${DAILY_REWARD} coins\n` +
                `┃ 💰 Saldo : ${balance} coins\n` +
                `┃\n` +
                `┃ Kembali lagi besok ya! 😊\n` +
                `┃\n` +
                `╰━━━━━━━━━━━━━━━━━━⬣`,
            { mentions: [me] }
        )
    }
}
