import { card } from "../../lib/ui.js"
import { resolvePn } from "../../lib/resolve.js"
import { getPlayer, removeItem, addMoney } from "../../lib/rpg.js"
import { MUTATIONS, fishValue, fishDisplay } from "../../lib/fish.js"
import { getFishById } from "../../lib/island.js"
import { getStackedEffect } from "../../lib/events.js"

const MUT_MAP = Object.fromEntries(MUTATIONS.map((mt) => [mt.id, mt]))

/** Parse inventory key "island_i" atau "island_i#mut" → { fish, mutation }. */
function parseKey(key) {
    const [fid, mid] = key.split("#")
    const fish = getFishById(fid)
    if (!fish) return null
    return { fish, mutation: mid ? MUT_MAP[mid] : null }
}

export default {
    command: ["sell", "jual"],

    category: "RPG",

    description: "Jual ikan hasil pancing",

    async run({ sock, m, args }) {
        const me = await resolvePn(sock, m, m.sender)
        const p = getPlayer(me)

        // Kumpulkan semua ikan di inventory
        const owned = Object.entries(p.inventory)
            .map(([key, qty]) => ({ key, qty, ...parseKey(key) }))
            .filter((x) => x.fish)

        if (!owned.length) {
            return m.reply(
                card(
                    "JUAL",
                    [`Kamu tidak punya ikan.`, ``, `Mancing dulu: ${global.prefix}mancing`],
                    { emoji: "💰" }
                )
            )
        }

        // .sell all / .sell (default semua). .sell <rarity> → jual per rarity.
        const filter = args[0]?.toLowerCase()
        // Buff harga jual saat event Market Boom (gabungan stack)
        const priceMult = getStackedEffect().money || 1

        let total = 0
        const lines = []

        for (const it of owned) {
            if (filter && filter !== "all" && it.fish.rarity !== filter) continue
            const each = Math.round(fishValue(it.fish, it.mutation) * priceMult)
            const gain = each * it.qty
            removeItem(me, it.key, it.qty)
            addMoney(me, gain)
            total += gain
            lines.push(
                `${fishDisplay(it.fish, it.mutation)} ×${it.qty} → $${gain.toLocaleString("id-ID")}`
            )
        }

        if (!total) {
            return m.reply(
                card("JUAL", `Tidak ada ikan rarity "${filter}" untuk dijual.`, { emoji: "💰" })
            )
        }

        // Batasi tampilan bila terlalu banyak
        const shown = lines.slice(0, 12)
        if (lines.length > 12) shown.push(`... dan ${lines.length - 12} lainnya`)

        await m.react("💰")
        return m.reply(
            card(
                "JUAL IKAN",
                [
                    ...shown,
                    ``,
                    `💵 Total : $${total.toLocaleString("id-ID")}`,
                    `💰 Saldo : $${getPlayer(me).money.toLocaleString("id-ID")}`
                ],
                {
                    emoji: "💰"
                }
            )
        )
    }
}
