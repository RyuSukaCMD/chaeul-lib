import Button from "../../lib/button.js"
import { card } from "../../lib/ui.js"
import { resolvePn } from "../../lib/resolve.js"
import { getPlayer, getBait, setBait, ITEMS } from "../../lib/rpg.js"

const BAIT_IDS = Object.keys(ITEMS).filter((id) => ITEMS[id].type === "bait")

function baitBonus(it) {
    const parts = [`Luck ×${it.rarityLuck}`, `Mutasi ×${it.mutationBoost}`]
    if (it.newRarityBoost > 1) parts.push(`Abnormal/Extinct ×${it.newRarityBoost}`)
    return parts.join(" • ")
}

export default {
    command: ["bait", "umpan", /^bait_use:.*/],

    category: "RPG",

    description: "Kelola bait fishing.",

    async run({ sock, m, command }) {
        const me = await resolvePn(sock, m, m.sender)

        if (command.startsWith("bait_use:")) {
            const id = command.split(":")[1]
            const it = ITEMS[id]
            if (!it || it.type !== "bait")
                return m.reply(card("UMPAN", "Umpan tidak ditemukan.", { emoji: "🪱" }))
            if (!setBait(me, id))
                return m.reply(
                    card("UMPAN", `Kamu tidak punya ${it.name}. Beli lewat ${global.prefix}buy.`, {
                        emoji: "🪱"
                    })
                )
            await m.react("✅")
            return m.reply(
                card(
                    "UMPAN AKTIF",
                    [`✅ ${it.emoji} *${it.name}*`, ``, baitBonus(it), ``, `Konsumsi: 1 per sesi.`],
                    { emoji: "🪱" }
                )
            )
        }

        const p = getPlayer(me)
        const active = getBait(me)
        const rows = BAIT_IDS.map((id) => {
            const it = ITEMS[id]
            const qty = p.inventory?.[id] || 0
            const selected = active?.id === id
            return {
                title: `${selected ? "✅ " : ""}${it.emoji} ${it.name} ×${qty}`,
                description: `${baitBonus(it)}${qty > 0 ? " · Tersedia" : " · Tidak tersedia"}`,                id: `bait_use:${id}`
            }
        })

        return Button.menu({
            sock,
            m,
            body: card(
                "BAIT"
                [
                    active
                        ? `🪱 Aktif: ${active.emoji} ${active.name} ×${active.qty}`
                        : `🪱 Aktif: tidak ada umpan`,
                    ``,
                    `Konsumsi: 1 per sesi fishing.`,
                    `Beli: ${global.prefix}buy`,
                    `Pilih bait.`
                ],
                { emoji: "🪱" }
            ),
            footer: "© Chaeul RPG",
            lock: me,
            listTitle: "🪱 Pilih Umpan",
            sections: [{ title: "✦ DAFTAR UMPAN", rows }]
        })
    }
}
