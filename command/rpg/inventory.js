import { card } from "../../lib/ui.js"
import { resolvePn } from "../../lib/resolve.js"
import { getPlayer, ITEMS } from "../../lib/rpg.js"
import { FISH, MUTATIONS, fishDisplay } from "../../lib/fish.js"

const FISH_MAP = Object.fromEntries(FISH.map((f) => [f.id, f]))
const MUT_MAP = Object.fromEntries(MUTATIONS.map((mt) => [mt.id, mt]))

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

        const gear = []
        const fishes = []
        let fishTotal = 0

        for (const [key, qty] of Object.entries(p.inventory || {})) {
            const [fid, mid] = key.split("#")
            if (FISH_MAP[fid]) {
                const disp = fishDisplay(FISH_MAP[fid], mid ? MUT_MAP[mid] : null)
                fishes.push(`  ${disp} ×${qty}`)
                fishTotal += qty
            } else if (ITEMS[key]) {
                gear.push(`  ${ITEMS[key].emoji} ${ITEMS[key].name} ×${qty}`)
            } else {
                gear.push(`  📦 ${key} ×${qty}`)
            }
        }

        if (!gear.length && !fishes.length) {
            lines.push("Tas kosong. 🎒")
        } else {
            if (gear.length) lines.push(`📦 *Item:*`, ...gear)
            if (fishes.length) {
                lines.push(``, `🐟 *Ikan (${fishTotal}):*`)
                // Batasi tampilan
                lines.push(...fishes.slice(0, 15))
                if (fishes.length > 15) lines.push(`  ... dan ${fishes.length - 15} jenis lagi`)
            }
        }

        return m.reply(card("INVENTORY", lines, { emoji: "🎒" }))
    }
}
