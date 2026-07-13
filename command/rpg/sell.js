import { card } from "../../lib/ui.js"
import { resolvePn } from "../../lib/resolve.js"
import { getPlayer, removeItem, addMoney, FISH } from "../../lib/rpg.js"

const FISH_MAP = Object.fromEntries(FISH.map((f) => [f.id, f]))

export default {
    command: ["sell", "jual"],

    category: "RPG",

    description: "Jual ikan hasil pancing (semua / tertentu)",

    async run({ sock, m, args }) {
        const me = await resolvePn(sock, m, m.sender)
        const p = getPlayer(me)

        // Item ikan yang dimiliki
        const owned = Object.entries(p.inventory).filter(([id]) => FISH_MAP[id])

        if (!owned.length) {
            return m.reply(
                card(
                    "JUAL",
                    [
                        `Kamu tidak punya ikan untuk dijual.`,
                        ``,
                        `Mancing dulu: ${global.prefix}mancing`
                    ],
                    {
                        emoji: "💰"
                    }
                )
            )
        }

        // .sell <id>  → jual jenis tertentu; .sell → jual semua
        const targetId = args[0]?.toLowerCase()
        let total = 0
        const lines = []

        for (const [id, qty] of owned) {
            if (targetId && id !== targetId) continue
            const fish = FISH_MAP[id]
            const gain = fish.price * qty
            removeItem(me, id, qty)
            addMoney(me, gain)
            total += gain
            lines.push(`${fish.emoji} ${fish.name} ×${qty} → $${gain}`)
        }

        if (!total) {
            return m.reply(
                card("JUAL", `Ikan "${targetId}" tidak ditemukan di tas.`, { emoji: "💰" })
            )
        }

        await m.react("💰")
        return m.reply(
            card(
                "JUAL IKAN",
                [...lines, ``, `💵 Total : $${total}`, `💰 Saldo : $${getPlayer(me).money}`],
                {
                    emoji: "💰"
                }
            )
        )
    }
}
