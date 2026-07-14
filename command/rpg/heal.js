import { card } from "../../lib/ui.js"
import { resolvePn } from "../../lib/resolve.js"
import { getPlayer, removeItem, setHp, maxHp, ITEMS } from "../../lib/rpg.js"

// Alias input → item id
const ALIAS = {
    potion: "potion",
    hi: "hipotion",
    hipotion: "hipotion",
    mega: "megapotion",
    megapotion: "megapotion",
    elixir: "elixir",
    revive: "revive"
}

export default {
    command: ["heal", "sembuh"],

    category: "RPG",

    description: "Pulihkan HP dengan potion (potion/hi/mega/elixir/revive)",

    async run({ sock, m, args }) {
        const me = await resolvePn(sock, m, m.sender)
        const p = getPlayer(me)
        const mhp = maxHp(p)

        if (p.hp >= mhp) {
            return m.reply(
                card("HEAL", `❤️ HP kamu sudah penuh (${p.hp}/${mhp}). 💪`, { emoji: "🧪" })
            )
        }

        // Tentukan potion: dari argumen, atau otomatis pilih yang PALING KECIL
        // yang cukup (hemat), fallback terkecil yang dimiliki.
        let potionId = ALIAS[args[0]?.toLowerCase()]
        if (!potionId) {
            const inv = p.inventory || {}
            const owned = ["potion", "hipotion", "megapotion", "elixir", "revive"].filter(
                (id) => (inv[id] || 0) > 0
            )
            if (!owned.length) {
                return m.reply(
                    card("HEAL", [`Kamu tidak punya potion.`, `Beli: ${global.prefix}buy`], {
                        emoji: "🧪"
                    })
                )
            }
            const need = mhp - p.hp
            // pilih potion terkecil yang menutup 'need', else terbesar yang dimiliki
            owned.sort((a, b) => ITEMS[a].heal - ITEMS[b].heal)
            potionId = owned.find((id) => ITEMS[id].heal >= need) || owned[owned.length - 1]
        }

        const potion = ITEMS[potionId]
        if (!potion) return m.reply(card("HEAL", "Potion tidak dikenal.", { emoji: "🧪" }))

        if (!removeItem(me, potionId, 1)) {
            return m.reply(
                card(
                    "HEAL",
                    [
                        `Kamu tidak punya ${potion.emoji} ${potion.name}.`,
                        `Beli: ${global.prefix}buy`
                    ],
                    { emoji: "🧪" }
                )
            )
        }

        const healAmt = Math.min(potion.heal, mhp - p.hp)
        const after = setHp(me, p.hp + potion.heal)
        await m.react("🧪")
        return m.reply(
            card(
                "HEAL",
                [
                    `${potion.emoji} Memakai ${potion.name}`,
                    `❤️ HP: ${after.hp}/${mhp} (+${healAmt})`
                ],
                { emoji: "🧪" }
            )
        )
    }
}
