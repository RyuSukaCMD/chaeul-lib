import { card } from "../../lib/ui.js"
import { resolvePn, tag } from "../../lib/resolve.js"
import { getDex } from "../../lib/rpg.js"
import { RARITY } from "../../lib/fish.js"
import { ISLANDS, ISLAND_ORDER, ISLAND_CATALOG, islandFishTotal } from "../../lib/island.js"

function bar(cur, max, len = 10) {
    const filled = Math.max(0, Math.min(len, Math.round((cur / max) * len)))
    return "█".repeat(filled) + "░".repeat(len - filled)
}

export default {
    command: ["fishdex", "fishindex", "dex", "koleksi"],

    category: "RPG",

    description: "Lihat koleksi ikan per island (index per-island)",

    async run({ sock, m, args }) {
        const rawTarget = m.mentionedJid?.[0] || m.quoted?.sender || m.sender
        const who = await resolvePn(sock, m, rawTarget)
        const dex = getDex(who)

        // .fishdex <island> → detail ikan di island itu
        const wanted = args[0]?.toLowerCase()
        const islandId = ISLAND_ORDER.find(
            (id) => id === wanted || ISLANDS[id].name.toLowerCase().includes(wanted || "___")
        )

        if (islandId) {
            const info = ISLANDS[islandId]
            const pool = ISLAND_CATALOG[islandId]
            const lines = pool.map((f) => {
                const got = dex[f.id]
                const r = RARITY[f.rarity]
                return got
                    ? `#${f.index} ✅ ${r.emoji} ${f.emoji} ${f.name} ×${got}`
                    : `#${f.index} ⬛ ??? (belum tertangkap)`
            })
            const caught = pool.filter((f) => dex[f.id]).length
            return m.reply(
                card(
                    `FISHDEX · ${info.name}`,
                    [`${info.emoji} ${caught}/${pool.length} tertangkap`, ``, ...lines],
                    { emoji: "📖" }
                )
            )
        }

        // Ringkasan semua island
        let totalCaught = 0
        let totalFish = 0
        const lines = []
        for (const id of ISLAND_ORDER) {
            const info = ISLANDS[id]
            const pool = ISLAND_CATALOG[id]
            const caught = pool.filter((f) => dex[f.id]).length
            totalCaught += caught
            totalFish += pool.length
            const pct = Math.round((caught / pool.length) * 100)
            lines.push(`${info.emoji} *${info.name}*  ${caught}/${pool.length}`)
            lines.push(`   ${bar(caught, pool.length)} ${pct}%`)
        }

        const overall = Math.round((totalCaught / totalFish) * 100)

        return m.reply(
            card(
                "FISHDEX",
                [
                    `👤 ${tag(who)}`,
                    `📊 Koleksi: ${totalCaught}/${totalFish} (${overall}%)`,
                    ``,
                    ...lines,
                    ``,
                    `Detail: ${global.prefix}fishdex <island>`,
                    `Contoh: ${global.prefix}fishdex coral`
                ],
                { emoji: "📖" }
            ),
            { mentions: [who] }
        )
    }
}
