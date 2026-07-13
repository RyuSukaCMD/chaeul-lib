import { card } from "../../lib/ui.js"
import { resolvePn } from "../../lib/resolve.js"
import { leaderboard } from "../../lib/rpg.js"

const MEDAL = ["🥇", "🥈", "🥉"]

export default {
    command: ["rich", "leaderboard", "lb", "top"],

    category: "RPG",

    description: "Peringkat pemain terkaya",

    async run({ sock, m }) {
        const top = leaderboard(10)

        if (!top.length) {
            return m.reply(
                card("LEADERBOARD", "Belum ada pemain. Mainkan RPG dulu!", { emoji: "🏆" })
            )
        }

        const mentions = top.map((t) => `${t.number}@s.whatsapp.net`)
        const lines = top.map((t, i) => {
            const medal = MEDAL[i] || `${i + 1}.`
            return `${medal} @${t.number} — 💰 $${t.total.toLocaleString("id-ID")} (Lv.${t.level})`
        })

        return m.reply(card("TOP TERKAYA", lines, { emoji: "🏆" }), { mentions })
    }
}
