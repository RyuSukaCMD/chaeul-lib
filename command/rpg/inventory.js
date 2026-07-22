import { card } from "../../lib/ui.js"
import { resolvePn } from "../../lib/resolve.js"
import { getPlayer, ITEMS, getEnchantOf, isFav } from "../../lib/rpg.js"
import { MUTATIONS, fishDisplay } from "../../lib/fish.js"
import { getFishById } from "../../lib/island.js"
import { STONE_ITEM, STONE_INFO, enchantLabel } from "../../lib/enchant.js"

const MUT_MAP = Object.fromEntries(MUTATIONS.map((mt) => [mt.id, mt]))

export default {
    command: ["inventory", "inv", "tas"],

    category: "RPG",

    description: "Lihat inventaris item & ikan (enchant tampil di nama rod)",

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

        const rods = []
        const gear = []
        const fishes = []
        let fishTotal = 0

        for (const [key, qty] of Object.entries(p.inventory || {})) {
            const [fid, mid] = key.split("#")
            const fish = getFishById(fid)
            if (fish) {
                const fav = isFav(me, fish.id) ? "⭐ " : ""
                const disp = fishDisplay(fish, mid ? MUT_MAP[mid] : null)
                fishes.push(`  ${fav}${disp} ×${qty}`)
                fishTotal += qty
            } else if (ITEMS[key] && ITEMS[key].type === "rod") {
                // Rod: tampilkan enchant di NAMA rod (jika ada)
                const ench = getEnchantOf(me, key)
                const equipped = p.rod === key ? " (dipakai)" : ""
                const enchTxt = ench ? ` [${enchantLabel(ench)}]` : ""
                rods.push(`  ${ITEMS[key].emoji} ${ITEMS[key].name}${enchTxt}${equipped}`)
            } else if (key === STONE_ITEM) {
                gear.push(`  ${STONE_INFO.emoji} ${STONE_INFO.name} ×${qty}`)
            } else if (ITEMS[key]) {
                const active = ITEMS[key].type === "bait" && p.bait === key ? " (aktif)" : ""
                gear.push(`  ${ITEMS[key].emoji} ${ITEMS[key].name}${active} ×${qty}`)
            } else {
                gear.push(`  📦 ${key} ×${qty}`)
            }
        }

        if (!gear.length && !fishes.length && !rods.length) {
            lines.push("Tas kosong. 🎒")
        } else {
            if (rods.length) lines.push(`🎣 *Rod:*`, ...rods)
            if (gear.length) lines.push(rods.length ? `` : ``, `📦 *Item:*`, ...gear)
            if (fishes.length) {
                lines.push(``, `🐟 *Ikan (${fishTotal}):*`)
                lines.push(...fishes.slice(0, 15))
                if (fishes.length > 15) lines.push(`  ... dan ${fishes.length - 15} jenis lagi`)
                lines.push(``, `⭐ = favorit (tak bisa dijual) • ${global.prefix}fishfav`)
            }
        }

        return m.reply(card("INVENTORY", lines, { emoji: "🎒" }))
    }
}
