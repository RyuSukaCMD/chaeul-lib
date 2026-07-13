import { card } from "../../lib/ui.js"
import { resolvePn } from "../../lib/resolve.js"
import { getPlayer, SHOP } from "../../lib/rpg.js"

export default {
    command: ["inventory", "inv", "tas"],

    category: "RPG",

    description: "Lihat inventaris item RPG",

    async run({ sock, m }) {
        const me = await resolvePn(sock, m, m.sender)
        const p = getPlayer(me)

        const lines = []

        // Senjata terpasang
        if (p.weapon && SHOP[p.weapon]) {
            lines.push(
                `⚔️ Senjata: ${SHOP[p.weapon].emoji} ${SHOP[p.weapon].name} (ATK ${SHOP[p.weapon].atk})`
            )
            lines.push("")
        }

        const items = Object.entries(p.inventory || {})
        if (!items.length) {
            lines.push("Tas kosong. 🎒")
        } else {
            for (const [id, qty] of items) {
                const it = SHOP[id]
                lines.push(`${it ? it.emoji : "📦"} ${it ? it.name : id} × ${qty}`)
            }
        }

        return m.reply(card("INVENTORY", lines, { emoji: "🎒" }))
    }
}
