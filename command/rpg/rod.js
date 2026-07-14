import Button from "../../lib/button.js"
import { card } from "../../lib/ui.js"
import { resolvePn } from "../../lib/resolve.js"
import {
    getPlayer,
    updatePlayer,
    addMoney,
    addItem,
    ITEMS,
    getRod,
    getEnchantOf
} from "../../lib/rpg.js"
import { enchantLabel } from "../../lib/enchant.js"

// Rod yang DIJUAL di menu (punya harga). Rod quest (price null) tidak dijual.
const SHOP_RODS = Object.entries(ITEMS)
    .filter(([, it]) => it.type === "rod" && typeof it.price === "number")
    .sort((a, b) => a[1].price - b[1].price)

// Format harga aman (null → "Quest").
const fmtPrice = (v) => (typeof v === "number" ? `$${v.toLocaleString("id-ID")}` : "Quest")

export default {
    command: ["rod", "pancing", /^rod_use:.*/, /^rod_buy:.*/],

    category: "RPG",

    description: "Pilih / upgrade pancing (luck & reel speed)",

    async run({ sock, m, command }) {
        const me = await resolvePn(sock, m, m.sender)

        // ── Pakai rod yang dimiliki ──
        if (command.startsWith("rod_use:")) {
            const id = command.split(":")[1]
            const p = getPlayer(me)
            if (!p.inventory[id] || ITEMS[id]?.type !== "rod")
                return m.reply(card("PANCING", "Kamu tidak punya pancing ini.", { emoji: "🎣" }))
            updatePlayer(me, { rod: id })
            const it = ITEMS[id]
            await m.react("✅")
            return m.reply(
                card(
                    "PANCING",
                    [
                        `✅ Memakai ${it.emoji} ${it.name}`,
                        `🍀 Luck ×${it.luck}  ·  🎯 Reel -${it.reel}`
                    ],
                    { emoji: "🎣" }
                )
            )
        }

        // ── Beli / upgrade rod (hanya rod berharga) ──
        if (command.startsWith("rod_buy:")) {
            const id = command.split(":")[1]
            const it = ITEMS[id]
            if (!it || it.type !== "rod")
                return m.reply(card("PANCING", "Pancing tidak ditemukan.", { emoji: "🎣" }))
            if (typeof it.price !== "number")
                return m.reply(
                    card("PANCING", "Pancing ini hanya bisa didapat dari quest.", { emoji: "🎣" })
                )
            const p = getPlayer(me)
            if (p.inventory[id])
                return m.reply(
                    card("PANCING", "Kamu sudah punya pancing ini. Pilih untuk memakainya.", {
                        emoji: "🎣"
                    })
                )
            if ((p.money || 0) < it.price) {
                return m.reply(
                    card(
                        "PANCING",
                        [
                            `${it.emoji} ${it.name}`,
                            ``,
                            `💸 Harga : ${fmtPrice(it.price)}`,
                            `💰 Saldo : $${(p.money || 0).toLocaleString("id-ID")}`,
                            ``,
                            `Uangmu tidak cukup. 😔`
                        ],
                        { emoji: "🎣" }
                    )
                )
            }
            addMoney(me, -it.price)
            addItem(me, id, 1)
            updatePlayer(me, { rod: id })
            await m.react("✅")
            return m.reply(
                card(
                    "PANCING",
                    [
                        `✅ Membeli & memakai ${it.emoji} ${it.name}`,
                        `💸 -${fmtPrice(it.price)}`,
                        `🍀 Luck ×${it.luck}  ·  🎯 Reel -${it.reel}`
                    ],
                    { emoji: "🎣" }
                )
            )
        }

        // ── Menu daftar rod ──
        const p = getPlayer(me)
        const current = getRod(p)

        // Rod yang dimiliki tapi TIDAK dijual (quest rods) tetap ditampilkan.
        const ownedQuestRods = Object.keys(p.inventory || {}).filter(
            (id) => ITEMS[id]?.type === "rod" && typeof ITEMS[id].price !== "number"
        )
        const allIds = [...new Set([...SHOP_RODS.map(([id]) => id), ...ownedQuestRods])]

        const bodyLines = [`💰 Saldo: $${(p.money || 0).toLocaleString("id-ID")}`, ``]
        const rows = []
        for (const id of allIds) {
            const it = ITEMS[id]
            if (!it) continue
            const owned = !!p.inventory[id]
            const active = id === current
            const ench = getEnchantOf(me, id)
            const enchTxt = ench ? ` [${enchantLabel(ench)}]` : ""
            const status = active ? "✅ dipakai" : owned ? "dimiliki" : fmtPrice(it.price)
            bodyLines.push(
                `${it.emoji} *${it.name}*${enchTxt} — 🍀×${it.luck} 🎯-${it.reel} · ${status}`
            )
            rows.push({
                title: `${it.emoji} ${it.name}${active ? " ✅" : ""}`,
                description: owned
                    ? active
                        ? "Sedang dipakai"
                        : "Pakai pancing ini"
                    : `Beli — ${fmtPrice(it.price)} · Luck ×${it.luck} · Reel -${it.reel}`,
                // Rod quest yang belum dimiliki tidak bisa dibeli → arahkan ke quest info
                id: owned ? `rod_use:${id}` : `rod_buy:${id}`
            })
        }

        return Button.menu({
            sock,
            m,
            body: card("PANCING", bodyLines, { emoji: "🎣" }),
            footer: "© Chaeul RPG",
            lock: me,
            listTitle: "🎣 Pilih Pancing",
            sections: [{ title: "🎣 Daftar Pancing", rows }]
        })
    }
}
