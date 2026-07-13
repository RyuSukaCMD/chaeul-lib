import Button from "../../lib/button.js"
import { card } from "../../lib/ui.js"
import { resolvePn } from "../../lib/resolve.js"
import { getPlayer, getEnchantOf, setEnchantOf, removeItem, ITEMS } from "../../lib/rpg.js"
import {
    STONE_ITEM,
    STONE_INFO,
    rollEnchant,
    getEnchant,
    enchantLabel,
    enchantTierLabel
} from "../../lib/enchant.js"

// Daftar id rod yang dimiliki player (dari inventory).
function ownedRods(p) {
    return Object.keys(p.inventory || {}).filter((id) => ITEMS[id]?.type === "rod")
}

export default {
    command: ["enchant", /^enchant_pick:.+$/, /^enchant_go:.+$/, "enchant_cancel"],

    category: "RPG",

    description: "Enchant rod (RANDOM) pakai Enchant Stone. Enchant muncul di nama rod.",

    async run({ sock, m, command }) {
        const me = await resolvePn(sock, m, m.sender)
        const p = getPlayer(me)
        const inv = p.inventory || {}
        const stoneQty = inv[STONE_ITEM] || 0

        // ── Batal ──
        if (command === "enchant_cancel") {
            return m.reply(card("ENCHANT", "Dibatalkan. ✋", { emoji: "✨" }))
        }

        // ── Konfirmasi & proses enchant sebuah rod ──
        if (command.startsWith("enchant_go:")) {
            const rodId = command.split(":")[1]
            const rod = ITEMS[rodId]
            if (!rod || rod.type !== "rod")
                return m.reply(card("ENCHANT", "Rod tidak valid.", { emoji: "✨" }))
            if (!inv[rodId])
                return m.reply(card("ENCHANT", "Kamu tidak punya rod itu.", { emoji: "✨" }))
            if ((inv[STONE_ITEM] || 0) < 1) {
                return m.reply(
                    card(
                        "ENCHANT GAGAL",
                        [
                            `Butuh ${STONE_INFO.emoji} ${STONE_INFO.name} ×1.`,
                            `Pancing di 🌿 Sacred Jungle untuk dapat!`
                        ],
                        { emoji: "🔮" }
                    )
                )
            }

            // Pakai stone → roll enchant acak
            removeItem(me, STONE_ITEM, 1)
            const old = getEnchantOf(me, rodId)
            const newId = rollEnchant()
            setEnchantOf(me, rodId, newId)
            const ench = getEnchant(newId)

            await m.react("✨")
            return m.reply(
                card(
                    "ENCHANT BERHASIL",
                    [
                        `${rod.emoji} ${rod.name}`,
                        `🎲 Hasil acak:`,
                        `${ench.emoji} *${ench.name}* [${enchantTierLabel(newId)}]`,
                        `${ench.desc}`,
                        old ? `\n(Enchant lama ${enchantLabel(old)} tergantikan)` : ``,
                        ``,
                        `Sisa stone: ${getPlayer(me).inventory[STONE_ITEM] || 0}`
                    ].filter((x) => x !== ``),
                    { emoji: "✨" }
                )
            )
        }

        // ── Pilih rod → tampilkan konfirmasi ──
        if (command.startsWith("enchant_pick:")) {
            const rodId = command.split(":")[1]
            const rod = ITEMS[rodId]
            if (!rod) return m.reply(card("ENCHANT", "Rod tidak valid.", { emoji: "✨" }))
            const cur = getEnchantOf(me, rodId)

            const lines = [
                `Rod dipilih: ${rod.emoji} ${rod.name}`,
                `Enchant sekarang: ${cur ? enchantLabel(cur) : "Tidak ada"}`,
                ``,
                `Biaya: ${STONE_INFO.emoji} 1 Enchant Stone`,
                `Enchant yang didapat *ACAK*. 🎲`
            ]
            if (cur) {
                lines.push(``)
                lines.push(`⚠️ Rod ini SUDAH ada enchant!`)
                lines.push(`Enchant baru akan MENIMPA yang lama.`)
            }
            lines.push(``, `Lanjutkan?`)

            return Button.menu({
                sock,
                m,
                body: card("KONFIRMASI ENCHANT", lines, { emoji: "✨" }),
                footer: "© Chaeul RPG",
                lock: me,
                buttons: [
                    { type: "quick", text: "✅ Ya, Enchant!", id: `enchant_go:${rodId}` },
                    { type: "quick", text: "❌ Batal", id: "enchant_cancel" }
                ]
            })
        }

        // ── Menu utama: pilih rod yang mau di-enchant ──
        const rods = ownedRods(p)
        if (!rods.length) {
            return m.reply(card("ENCHANT", "Kamu belum punya rod.", { emoji: "✨" }))
        }

        const rows = rods.map((id) => {
            const rod = ITEMS[id]
            const cur = getEnchantOf(me, id)
            const equipped = p.rod === id ? " (dipakai)" : ""
            return {
                title: `${rod.emoji} ${rod.name}${equipped}`,
                description: cur ? `Enchant: ${enchantLabel(cur)}` : `Belum di-enchant`,
                id: `enchant_pick:${id}`
            }
        })

        return Button.menu({
            sock,
            m,
            body: card(
                "ENCHANT ROD",
                [
                    `🔮 Enchant Stone: ${stoneQty}`,
                    ``,
                    `Enchant bersifat *ACAK* (1 stone = 1 enchant).`,
                    `Rarity lemah lebih sering muncul.`,
                    ``,
                    stoneQty < 1
                        ? `⚠️ Kamu belum punya stone. Pancing di 🌿 Sacred Jungle!`
                        : `Pilih rod yang mau di-enchant 👇`
                ],
                { emoji: "✨" }
            ),
            footer: "© Chaeul RPG",
            listTitle: "✨ Pilih Rod",
            sections: [{ title: "✦ ROD KAMU", rows }]
        })
    }
}
