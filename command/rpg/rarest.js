import { card } from "../../lib/ui.js"
import { resolvePn, tag } from "../../lib/resolve.js"
import { getRarestCatch } from "../../lib/rpg.js"
import { RARITY } from "../../lib/fish.js"
import { ISLANDS } from "../../lib/island.js"

export default {
    command: ["rarest", "rarestcatch", "terlangka"],

    category: "RPG",

    description: "Lihat ikan terlangka yang pernah kamu tangkap (dari fishdex)",

    async run({ sock, m }) {
        const rawTarget = m.mentionedJid?.[0] || m.quoted?.sender || m.sender
        const who = await resolvePn(sock, m, rawTarget)

        const best = await getRarestCatch(who)
        if (!best) {
            return m.reply(
                card(
                    "RAREST CATCH",
                    [`Belum ada ikan tertangkap.`, `Mancing dulu: ${global.prefix}mancing`],
                    { emoji: "🌟" }
                ),
                { mentions: [who] }
            )
        }

        const rar = RARITY[best.rarity]
        const island = ISLANDS[best.fish.island]
        return m.reply(
            card(
                "RAREST CATCH",
                [
                    `👤 ${tag(who)}`,
                    ``,
                    `${rar.emoji} ${best.fish.emoji} *${best.fish.name}*`,
                    `🏆 Rarity : ${rar.label}`,
                    `🏝️ Island : ${island?.emoji || ""} ${island?.name || best.fish.island}`,
                    `📦 Ditangkap : ${best.count}×`,
                    ``,
                    `Ini rekor kelangkaan tertinggimu! 🎉`
                ],
                { emoji: "🌟" }
            ),
            { mentions: [who] }
        )
    }
}
