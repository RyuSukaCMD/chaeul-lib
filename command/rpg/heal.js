import { card } from "../../lib/ui.js"
import { resolvePn } from "../../lib/resolve.js"
import { getPlayer, useItem, setHp, SHOP } from "../../lib/rpg.js"

export default {
    command: ["heal", "sembuh"],

    category: "RPG",

    description: "Pulihkan HP dengan potion",

    async run({ sock, m, args }) {
        const me = await resolvePn(sock, m, m.sender)
        const p = getPlayer(me)

        if (p.hp >= p.maxhp) {
            return m.reply(
                card("HEAL", `HP kamu sudah penuh (${p.hp}/${p.maxhp}). 💪`, { emoji: "🧪" })
            )
        }

        // Pilih potion (default potion biasa, atau argumen "mega")
        const potionId = args[0]?.toLowerCase() === "mega" ? "megapotion" : "potion"
        const potion = SHOP[potionId]

        if (!useItem(me, potionId, 1)) {
            return m.reply(
                card(
                    "HEAL",
                    [
                        `Kamu tidak punya ${potion.emoji} ${potion.name}.`,
                        ``,
                        `Beli dulu: ${global.prefix}buy`
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
                    `❤️ HP: ${after.hp}/${after.maxhp} (+${potion.heal})`
                ],
                { emoji: "🧪" }
            )
        )
    }
}
