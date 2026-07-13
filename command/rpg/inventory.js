import { card } from "../../lib/ui.js"
import { resolvePn } from "../../lib/resolve.js"
import { getPlayer, ITEMS, FISH } from "../../lib/rpg.js"

const FISH_MAP = Object.fromEntries(FISH.map((f) => [f.id, f]))

export default {
    command: ["inventory", "inv", "tas"],

    category: "RPG",

    description: "Lihat inventaris item & ikan",

    async run({ sock, m }) {
        const me = await resolvePn(sock, m, m.sender)
        const p = getPlayer(me)

        const lines = []

        // Equipment
        if (p.weapon && ITEMS[p.weapon])
            lines.push(`⚔️ Senjata : ${ITEMS[p.weapon].emoji} ${ITEMS[p.weapon].name}`)
        if (p.armor && ITEMS[p.armor])
            lines.push(`🛡️ Armor   : ${ITEMS[p.armor].emoji} ${ITEMS[p.armor].name}`)
        if (lines.length) lines.push("")

        const items = Object.entries(p.inventory || {})
        if (!items.length) {
            lines.push("Tas kosong. 🎒")
        } else {
            const gear = []
            const fishes = []
            for (const [id, qty] of items) {
                if (FISH_MAP[id]) fishes.push(`${FISH_MAP[id].emoji} ${FISH_MAP[id].name} ×${qty}`)
                else if (ITEMS[id]) gear.push(`${ITEMS[id].emoji} ${ITEMS[id].name} ×${qty}`)
                else gear.push(`📦 ${id} ×${qty}`)
            }
            if (gear.length) lines.push(`📦 *Item:*`, ...gear.map((x) => `  ${x}`))
            if (fishes.length) lines.push(``, `🐟 *Ikan:*`, ...fishes.map((x) => `  ${x}`))
        }

        return m.reply(card("INVENTORY", lines, { emoji: "🎒" }))
    }
}
