import { card } from "../../lib/ui.js"
import { resolvePn, tag } from "../../lib/resolve.js"
import { getPlayer, removeItem, addItem, isFav } from "../../lib/rpg.js"
import { MUTATIONS, fishDisplay } from "../../lib/fish.js"
import { getFishById } from "../../lib/island.js"

const MUT_MAP = Object.fromEntries(MUTATIONS.map((mt) => [mt.id, mt]))

export default {
    command: ["gift", "giftfish", "kadoikan"],

    category: "RPG",

    description: "Beri ikan ke pemain lain (tag/reply)",

    async run({ sock, m, args }) {
        const me = await resolvePn(sock, m, m.sender)
        const raw = m.mentionedJid?.[0] || m.quoted?.sender
        const target = await resolvePn(sock, m, raw)

        if (!target) {
            return m.reply(
                card(
                    "GIFT",
                    [
                        `Tag/reply user penerima.`,
                        `${global.prefix}gift @user <idIkan> [jumlah]`,
                        ``,
                        `Lihat id ikan: ${global.prefix}inventory`,
                        `Contoh: ${global.prefix}gift @user sea_5 2`
                    ],
                    { emoji: "🎁" }
                )
            )
        }
        if (target === me)
            return m.reply(card("GIFT", "Tidak bisa beri ke diri sendiri. 😅", { emoji: "🎁" }))

        // Ambil id ikan (arg yang cocok pola island_i, boleh ada #mut)
        const fishKey = args.find((a) => /^[a-z]+_\d+(#\w+)?$/i.test(a))
        const qty =
            parseInt(
                args.find((a) => /^\d+$/.test(a)),
                10
            ) || 1

        if (!fishKey) {
            return m.reply(
                card("GIFT", [`Sebutkan id ikan (lihat ${global.prefix}inventory).`], {
                    emoji: "🎁"
                })
            )
        }

        const p = getPlayer(me)
        const baseId = fishKey.split("#")[0]
        const fish = getFishById(baseId)
        if (!fish) return m.reply(card("GIFT", `Ikan "${baseId}" tidak dikenal.`, { emoji: "🎁" }))

        if ((p.inventory[fishKey] || 0) < qty) {
            return m.reply(
                card("GIFT", `Ikan tidak cukup (punya ${p.inventory[fishKey] || 0}).`, {
                    emoji: "🎁"
                })
            )
        }
        // Ikan favorit tidak boleh diberikan (proteksi)
        if (isFav(me, baseId)) {
            return m.reply(
                card(
                    "GIFT",
                    [
                        `Ikan ini di-favorite ⭐ (dilindungi).`,
                        `Unfav dulu: ${global.prefix}fishfav`
                    ],
                    { emoji: "🎁" }
                )
            )
        }

        removeItem(me, fishKey, qty)
        addItem(target, fishKey, qty)

        const mid = fishKey.split("#")[1]
        await m.react("🎁")
        return m.reply(
            card(
                "GIFT TERKIRIM",
                [
                    `🎁 ${tag(me)} → ${tag(target)}`,
                    `${fishDisplay(fish, mid ? MUT_MAP[mid] : null)} ×${qty}`
                ],
                { emoji: "🎁" }
            ),
            { mentions: [me, target] }
        )
    }
}
