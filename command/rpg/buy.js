import Button from "../../lib/button.js"
import { card } from "../../lib/ui.js"
import { resolvePn } from "../../lib/resolve.js"
import { getPlayer, addMoney, addItem, updatePlayer, SHOP } from "../../lib/rpg.js"

export default {
    command: ["buy", "shop", "toko", /^buy_item:.*/],

    category: "RPG",

    description: "Toko RPG — beli senjata/potion",

    async run({ sock, m, command }) {
        const me = await resolvePn(sock, m, m.sender)

        // ── Handler tombol beli ──
        if (command.startsWith("buy_item:")) {
            const itemId = command.split(":")[1]
            const item = SHOP[itemId]
            if (!item) return m.reply("Item tidak ditemukan.")

            const p = getPlayer(me)
            if (p.money < item.price) {
                return m.reply(
                    card(
                        "BELI GAGAL",
                        [
                            `${item.emoji} ${item.name}`,
                            ``,
                            `Harga : $${item.price}`,
                            `Saldo : $${p.money}`,
                            ``,
                            `Money kamu tidak cukup. 😔`
                        ],
                        { emoji: "🛒" }
                    )
                )
            }

            addMoney(me, -item.price)

            if (item.type === "weapon") {
                updatePlayer(me, { weapon: itemId })
            } else {
                addItem(me, itemId, 1)
            }

            await m.react("✅")
            return m.reply(
                card(
                    "BELI SUKSES",
                    [
                        `✅ Membeli ${item.emoji} ${item.name}`,
                        `💸 -$${item.price}`,
                        `💵 Saldo: $${getPlayer(me).money}`
                    ],
                    { emoji: "🛒" }
                ),
                {}
            )
        }

        // ── Tampilkan toko (button pilihan) ──
        const p = getPlayer(me)

        const rows = Object.entries(SHOP).map(([id, it]) => ({
            title: `${it.emoji} ${it.name} — $${it.price}`,
            description:
                it.type === "weapon" ? `Senjata · ATK ${it.atk}` : `Potion · Heal ${it.heal} HP`,
            id: `buy_item:${id}`
        }))

        return Button.menu({
            sock,
            m,
            body: card(
                "TOKO RPG",
                [`💵 Saldo kamu: $${p.money}`, ``, `Pilih item yang ingin dibeli 👇`],
                {
                    emoji: "🛒"
                }
            ),
            footer: "© Chaeul RPG",
            lock: m.sender,
            sections: [{ title: "🛒 Item Toko", rows }]
        })
    }
}
