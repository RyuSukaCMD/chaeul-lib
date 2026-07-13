import { card } from "../../lib/ui.js"
import { resolvePn, tag } from "../../lib/resolve.js"
import { getDex } from "../../lib/rpg.js"
import { FISH, RARITY, RARITY_ORDER } from "../../lib/fish.js"

// Kelompokkan ikan per rarity sekali (dipakai ulang)
const byRarity = {}
for (const f of FISH) (byRarity[f.rarity] ||= []).push(f)

function bar(cur, max, len = 10) {
    const filled = Math.max(0, Math.min(len, Math.round((cur / max) * len)))
    return "█".repeat(filled) + "░".repeat(len - filled)
}

export default {
    command: ["fishdex", "fishindex", "dex", "koleksi"],

    category: "RPG",

    description: "Lihat koleksi ikan yang pernah ditangkap",

    async run({ sock, m, args }) {
        const rawTarget = m.mentionedJid?.[0] || m.quoted?.sender || m.sender
        const who = await resolvePn(sock, m, rawTarget)
        const dex = getDex(who)

        // .fishdex <rarity> → detail daftar ikan rarity itu
        const wanted = args[0]?.toLowerCase()
        if (wanted && RARITY[wanted]) {
            const pool = byRarity[wanted] || []
            const lines = pool.map((f) => {
                const got = dex[f.id]
                return got ? `✅ ${f.emoji} ${f.name} ×${got}` : `⬛ ??? (belum tertangkap)`
            })
            const caught = pool.filter((f) => dex[f.id]).length
            const shown = lines.slice(0, 25)
            if (lines.length > 25) shown.push(`... (${lines.length - 25} lagi)`)
            return m.reply(
                card(
                    `FISHDEX · ${RARITY[wanted].label}`,
                    [`${RARITY[wanted].emoji} ${caught}/${pool.length} tertangkap`, ``, ...shown],
                    { emoji: "📖" }
                )
            )
        }

        // Ringkasan semua rarity
        let totalCaught = 0
        const totalFish = FISH.length
        const lines = []
        for (const r of RARITY_ORDER) {
            const pool = byRarity[r] || []
            const caught = pool.filter((f) => dex[f.id]).length
            totalCaught += caught
            const pct = Math.round((caught / pool.length) * 100)
            lines.push(`${RARITY[r].emoji} *${RARITY[r].label}*  ${caught}/${pool.length}`)
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
                    `Detail: ${global.prefix}fishdex <rarity>`
                ],
                { emoji: "📖" }
            ),
            { mentions: [who] }
        )
    }
}
