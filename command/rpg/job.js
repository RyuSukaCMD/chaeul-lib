import { card } from "../../lib/ui.js"
import { resolvePn } from "../../lib/resolve.js"
import { getPlayer, updatePlayer, addMoney, addXp, JOB_COOLDOWN } from "../../lib/rpg.js"

const JOBS = [
    { name: "Nambang emas", min: 40, max: 120, emoji: "⛏️" },
    { name: "Berdagang", min: 30, max: 100, emoji: "🛒" },
    { name: "Berburu monster", min: 50, max: 150, emoji: "🏹" },
    { name: "Memancing", min: 20, max: 90, emoji: "🎣" },
    { name: "Jadi ojek online", min: 25, max: 80, emoji: "🏍️" }
]

function fmtWait(ms) {
    const s = Math.ceil(ms / 1000)
    const m = Math.floor(s / 60)
    return m ? `${m}m ${s % 60}s` : `${s}s`
}

export default {
    command: ["job", "kerja", "work"],

    category: "RPG",

    description: "Bekerja untuk mendapat money & XP",

    async run({ sock, m }) {
        const me = await resolvePn(sock, m, m.sender)
        const p = getPlayer(me)

        const left = JOB_COOLDOWN - (Date.now() - (p.lastJob || 0))
        if (left > 0) {
            return m.reply(
                card("JOB", [`Kamu masih lelah 😮‍💨`, `Tunggu ${fmtWait(left)} lagi.`], {
                    emoji: "💼"
                })
            )
        }

        const job = JOBS[Math.floor(Math.random() * JOBS.length)]
        const earn = Math.floor(Math.random() * (job.max - job.min + 1)) + job.min
        const xp = Math.floor(earn / 3)

        updatePlayer(me, { lastJob: Date.now() })
        const money = addMoney(me, earn)
        addXp(me, xp)

        await m.react("💼")

        return m.reply(
            card(
                "JOB",
                [
                    `${job.emoji} ${job.name}`,
                    ``,
                    `💰 +$${earn}`,
                    `✨ +${xp} XP`,
                    ``,
                    `💵 Saldo: $${money}`
                ],
                { emoji: "💼" }
            )
        )
    }
}
