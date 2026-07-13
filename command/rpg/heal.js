import { card } from "../../lib/ui.js"
import { resolvePn } from "../../lib/resolve.js"
import { getPlayer, removeItem, setHp, maxHp, ITEMS } from "../../lib/rpg.js"

export default {
    command: ["heal", "sembuh"],

    category: "RPG",

    description: "Pulihkan HP dengan potion",

    async run({ sock, m, args }) {
        const me = await resolvePn(sock, m, m.sender)
        const p = getPlayer(me)
        const mhp = maxHp(p)

        if (p.hp >= mhp) {
            return m.reply(
                card("HEAL", `❤️ HP kamu sudah penuh (${p.hp}/${mhp}). 💪`, { emoji: "🧪" })
            )
        }

        const potionId = args[0]?.toLowerCase() === "hi" ? "hipotion" : "potion"
        const potion = ITEMS[potionId]

        if (!removeItem(me, potionId, 1)) {
            return m.reply(
                card(
                    "HEAL",
                    [
                        `Kamu tidak punya ${potion.emoji} ${potion.name}.`,
                        ``,
                        `Beli: ${global.prefix}buy`
                    ],
                    { emoji: "🧪" }
                )
            )
        }

        const after = setHp(me, p.hp + potion.heal)
        await m.react("🧪")
        return m.reply(
            card(
                "HEAL",
                [
                    `${potion.emoji} Memakai ${potion.name}`,
                    `❤️ HP: ${after.hp}/${mhp} (+${potion.heal})`
                ],
                { emoji: "🧪" }
            )
        )
    }
}
