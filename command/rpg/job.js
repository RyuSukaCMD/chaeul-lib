import { card } from "../../lib/ui.js"
import { resolvePn } from "../../lib/resolve.js"
import { getPlayer, addMoney, addXp, addEnergy, cdLeft, setCd, CONFIG } from "../../lib/rpg.js"

const JOBS = [
    { name: "Menambang emas", min: 60, max: 160, emoji: "⛏️" },
    { name: "Berdagang di pasar", min: 50, max: 130, emoji: "🛒" },
    { name: "Menjadi ojek online", min: 40, max: 110, emoji: "🏍️" },
    { name: "Bertani", min: 45, max: 120, emoji: "🌾" },
    { name: "Menjadi pengrajin", min: 55, max: 140, emoji: "🔨" }
]

const fmtWait = (ms) => {
    const s = Math.ceil(ms / 1000)
    return s >= 60 ? `${Math.floor(s / 60)}m ${s % 60}s` : `${s}s`
}

export default {
    command: ["job", "kerja", "work"],

    category: "RPG",

    description: "Bekerja untuk mendapat money, XP & energy",

    async run({ sock, m }) {
        const me = await resolvePn(sock, m, m.sender)

        const left = cdLeft(me, "job", CONFIG.jobCooldown)
        if (left > 0) {
            return m.reply(
                card("KERJA", `😮‍💨 Kamu masih lelah.\nTunggu ${fmtWait(left)} lagi.`, {
                    emoji: "💼"
                })
            )
        }
        setCd(me, "job")

        const job = JOBS[Math.floor(Math.random() * JOBS.length)]
        const earn = Math.floor(Math.random() * (job.max - job.min + 1)) + job.min
        const xp = Math.floor(earn / 4)

        const money = addMoney(me, earn)
        const { leveled } = addXp(me, xp)
        addEnergy(me, 2)

        await m.react("💼")
        return m.reply(
            card(
                "KERJA",
                [
                    `${job.emoji} ${job.name}`,
                    ``,
                    `💰 +$${earn}`,
                    `✨ +${xp} XP${leveled ? "  ·  🎊 NAIK LEVEL!" : ""}`,
                    `⚡ +2 Energy`,
                    ``,
                    `💵 Saldo: $${money}`
                ],
                { emoji: "💼" }
            )
        )
    }
}
