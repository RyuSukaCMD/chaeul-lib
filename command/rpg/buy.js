import Button from "../../lib/button.js"
import { card } from "../../lib/ui.js"
import { resolvePn } from "../../lib/resolve.js"
import { getPlayer, addMoney, addItem, updatePlayer, addEnergy, ITEMS } from "../../lib/rpg.js"

const TYPE_LABEL = {
    weapon: "Senjata",
    armor: "Armor",
    potion: "Potion",
    rod: "Pancing",
    bait: "Umpan",
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
            if (typeof item.price !== "number")
                return m.reply(card("TOKO", "Item ini tidak dijual di toko.", { emoji: "🛒" }))

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
            else if (item.type === "rod") {
                addItem(me, id, 1)
                updatePlayer(me, { rod: id }) // rod baru langsung dipakai
            } else if (item.type === "bait") {
                addItem(me, id, 1)
                updatePlayer(me, { bait: id }) // bait baru langsung dipakai
            } else if (item.type === "misc" && item.energy) addEnergy(me, item.energy)
            else addItem(me, id, 1)

            const equipNote =
                item.type === "weapon"
                    ? "\n⚔️ Senjata terpasang."
                    : item.type === "armor"
                      ? "\n🛡️ Armor terpasang."
                      : item.type === "rod"
                        ? "\n🎣 Pancing terpasang."
                        : item.type === "bait"
                          ? "\n🪱 Umpan terpasang."
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

        // ── Tampilkan toko (dikelompokkan per tipe) ──
        const p = getPlayer(me)
        const SECTION_ORDER = [
            ["weapon", "⚔️ Senjata"],
            ["armor", "🛡️ Armor"],
            ["potion", "🧪 Healing"],
            ["rod", "🎣 Pancing"],
            ["bait", "🪱 Umpan"],
            ["misc", "📦 Item Lain"]
        ]

        const rowFor = (id, it) => {
            let desc = TYPE_LABEL[it.type] || ""
            if (it.atk) desc += ` · ATK ${it.atk}`
            if (it.def) desc += ` · DEF ${it.def}`
            if (it.heal) desc += it.heal >= 99999 ? ` · Full Heal` : ` · Heal ${it.heal}`
            if (it.luck) desc += ` · Luck ×${it.luck}`
            if (it.reel) desc += ` · Reel ${it.reel}`
            if (it.energy) desc += ` · +${it.energy} Energy`
            if (it.type === "bait")
                desc += ` · Luck ×${it.rarityLuck} · Mutasi ×${it.mutationBoost}`
            return {
                title: `${it.emoji} ${it.name} — $${it.price.toLocaleString("id-ID")}`,
                description: desc,
                id: `buy_item:${id}`
            }
        }

        const sections = []
        for (const [type, title] of SECTION_ORDER) {
            const rows = Object.entries(ITEMS)
                .filter(
                    ([, it]) =>
                        it.type === type &&
                        (type === "bait" ? typeof it.price === "number" : it.price > 0)
                )
                .map(([id, it]) => rowFor(id, it))
            if (rows.length) sections.push({ title, rows })
        }

        return Button.menu({
            sock,
            m,
            body: card(
                "TOKO RPG",
                [
                    `💵 Saldo kamu: $${p.money.toLocaleString("id-ID")}`,
                    ``,
                    `Pilih item yang ingin dibeli 👇`,
                    `Gunakan potion: ${global.prefix}heal`
                ],
                { emoji: "🛒" }
            ),
            footer: "© Chaeul RPG",
            lock: me,
            listTitle: "🛒 Toko RPG",
            sections
        })
    }
}
