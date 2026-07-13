import Button from "../../lib/button.js"
import { card } from "../../lib/ui.js"
import { resolvePn } from "../../lib/resolve.js"
import { getPlayer, addMoney, addItem, updatePlayer, addEnergy, ITEMS } from "../../lib/rpg.js"

const TYPE_LABEL = {
    weapon: "Senjata",
    armor: "Armor",
    potion: "Potion",
    rod: "Pancing",
    misc: "Item"
}

export default {
    command: ["buy", "shop", "toko", /^buy_item:.*/],

    category: "RPG",

    description: "Toko RPG — beli senjata, armor, potion, pancing",

    async run({ sock, m, command }) {
        const me = await resolvePn(sock, m, m.sender)

        // ── Handler tombol beli ──
        if (command.startsWith("buy_item:")) {
            const id = command.split(":")[1]
            const item = ITEMS[id]
            if (!item) return m.reply(card("TOKO", "Item tidak ditemukan.", { emoji: "🛒" }))

            const p = getPlayer(me)
            if (p.money < item.price) {
                return m.reply(
                    card(
                        "BELI GAGAL",
                        [
                            `${item.emoji} ${item.name}`,
                            ``,
                            `💸 Harga : $${item.price}`,
                            `💰 Saldo : $${p.money}`,
                            ``,
                            `Uangmu tidak cukup. 😔`
                        ],
                        { emoji: "🛒" }
                    )
                )
            }

            addMoney(me, -item.price)

            if (item.type === "weapon") updatePlayer(me, { weapon: id })
            else if (item.type === "armor") updatePlayer(me, { armor: id })
            else if (item.type === "misc" && item.energy) addEnergy(me, item.energy)
            else addItem(me, id, 1)

            const equipNote =
                item.type === "weapon"
                    ? "\n⚔️ Senjata terpasang."
                    : item.type === "armor"
                      ? "\n🛡️ Armor terpasang."
                      : ""

            await m.react("✅")
            return m.reply(
                card(
                    "BELI SUKSES",
                    [
                        `✅ Membeli ${item.emoji} ${item.name}`,
                        `💸 -$${item.price}${equipNote}`,
                        `💵 Saldo: $${getPlayer(me).money}`
                    ],
                    { emoji: "🛒" }
                )
            )
        }

        // ── Tampilkan toko ──
        const p = getPlayer(me)
        const rows = Object.entries(ITEMS)
            .filter(([, it]) => it.price > 0)
            .map(([id, it]) => {
                let desc = TYPE_LABEL[it.type]
                if (it.atk) desc += ` · ATK ${it.atk}`
                if (it.def) desc += ` · DEF ${it.def}`
                if (it.heal) desc += ` · Heal ${it.heal}`
                if (it.luck) desc += ` · Luck ×${it.luck}`
                if (it.energy) desc += ` · +${it.energy} Energy`
                return {
                    title: `${it.emoji} ${it.name} — $${it.price}`,
                    description: desc,
                    id: `buy_item:${id}`
                }
            })

        return Button.menu({
            sock,
            m,
            body: card(
                "TOKO RPG",
                [`💵 Saldo kamu: $${p.money}`, ``, `Pilih item yang ingin dibeli 👇`],
                { emoji: "🛒" }
            ),
            footer: "© Chaeul RPG",
            lock: me,
            sections: [{ title: "🛒 Daftar Item", rows }]
        })
    }
}
