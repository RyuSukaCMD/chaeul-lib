import { card } from "../../lib/ui.js"
import { resolvePn, tag } from "../../lib/resolve.js"
import { getPlayer } from "../../lib/rpg.js"

export default {
    command: ["balance", "money", "bal", "saldorpg"],

    category: "RPG",

    description: "Cek saldo money RPG",

    async run({ sock, m }) {
        const rawTarget = m.mentionedJid?.[0] || m.quoted?.sender || m.sender
        const who = await resolvePn(sock, m, rawTarget)
        const p = getPlayer(who)

        return m.reply(
            card(
                "BALANCE",
                [`👤 ${tag(who)}`, ``, `💰 Money : $${p.money}`, `📈 Level : ${p.level}`],
                {
                    emoji: "💰"
                }
            ),
            { mentions: [who] }
        )
    }
}
