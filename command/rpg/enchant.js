import Button from "../../lib/button.js"
import { card } from "../../lib/ui.js"
import { resolvePn } from "../../lib/resolve.js"
import { getPlayer, getRod, getEnchantId, setEnchant, removeItem } from "../../lib/rpg.js"
import { ITEMS } from "../../lib/rpg.js"
import {
    ENCHANTS,
    ENCHANT_ORDER,
    STONE_ITEM,
    STONE_INFO,
    getEnchant,
    enchantLabel,
    tierLabel
} from "../../lib/enchant.js"

export default {
    command: ["enchant", /^enchant_do:.+$/],

    category: "RPG",

    description: "Enchant rod pakai Enchant Stone (1 enchant per rod)",

    async run({ sock, m, command, args }) {
        const me = await resolvePn(sock, m, m.sender)
        const p = getPlayer(me)
        const rodId = getRod(p)
        const rod = ITEMS[rodId]
        const inv = p.inventory || {}
        const curEnchant = getEnchantId(me)

        // ── Proses enchant (dari tombol atau .enchant <id>) ──
        let pick = null
        if (command.startsWith("enchant_do:")) pick = command.split(":")[1]
        else if (args[0]) pick = args[0].toLowerCase()

        if (pick && ENCHANTS[pick]) {
            const ench = getEnchant(pick)
            const stoneItem = STONE_ITEM[ench.tier]
            const stoneInfo = STONE_INFO[ench.tier]

            if (curEnchant === pick) {
                return m.reply(
                    card("ENCHANT", `Rod-mu sudah punya enchant ${enchantLabel(pick)}.`, {
                        emoji: "✨"
                    })
                )
            }

            // Butuh stone sesuai tier
            if ((inv[stoneItem] || 0) < 1) {
                return m.reply(
                    card(
                        "ENCHANT GAGAL",
                        [
                            `${ench.emoji} ${ench.name} (${tierLabel(ench.tier)})`,
                            `Butuh: ${stoneInfo.emoji} ${stoneInfo.name} ×1`,
                            `Punyamu: ${inv[stoneItem] || 0}`,
                            ``,
                            `Dapatkan Enchant Stone dari memancing!`,
                            ench.tier === "rare" ? `Rare stone: mancing di 🌿 Sacred Jungle.` : ``
                        ].filter(Boolean),
                        { emoji: "🪨" }
                    )
                )
            }

            // Pakai stone & pasang enchant (menimpa yang lama)
            removeItem(me, stoneItem, 1)
            setEnchant(me, pick)
            await m.react("✨")
            return m.reply(
                card(
                    "ENCHANT BERHASIL",
                    [
                        `${rod.emoji} ${rod.name}`,
                        `➕ ${ench.emoji} *${ench.name}*`,
                        `${ench.desc}`,
                        curEnchant ? `\n(Enchant lama ${enchantLabel(curEnchant)} tergantikan)` : ``
                    ].filter((x) => x !== ``),
                    { emoji: "✨" }
                )
            )
        }

        // ── Tampilkan menu enchant (list button) ──
        const rows = ENCHANT_ORDER.map((id) => {
            const e = ENCHANTS[id]
            const stone = STONE_INFO[e.tier]
            const have = inv[STONE_ITEM[e.tier]] || 0
            const active = curEnchant === id ? " ✅" : ""
            return {
                title: `${e.emoji} ${e.name} [${tierLabel(e.tier)}]${active}`,
                description: `${e.desc} | Butuh ${stone.emoji}×1 (punya ${have})`,
                id: `enchant_do:${id}`
            }
        })

        const stoneLine = ["common", "uncommon", "rare"]
            .map((t) => `${STONE_INFO[t].emoji} ${inv[STONE_ITEM[t]] || 0}`)
            .join("  ")

        const bodyLines = [
            `🎣 Rod: ${rod.emoji} ${rod.name}`,
            `✨ Enchant aktif: ${curEnchant ? enchantLabel(curEnchant) : "Tidak ada"}`,
            ``,
            `🪨 Stone: ${stoneLine}`,
            ``,
            `Pilih enchant di bawah (1 enchant per rod).`,
            `Enchant baru menimpa yang lama.`
        ]

        return Button.menu({
            sock,
            m,
            body: card("ENCHANT ROD", bodyLines, { emoji: "✨" }),
            footer: "© Chaeul RPG",
            listTitle: "✨ Pilih Enchant",
            sections: [{ title: "✦ DAFTAR ENCHANT", rows }]
        })
    }
}
