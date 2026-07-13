import Button from "../../lib/button.js"
import { card } from "../../lib/ui.js"
import { resolvePn } from "../../lib/resolve.js"
import { getPlayer, updatePlayer, addMoney, addItem, ITEMS, getRod } from "../../lib/rpg.js"

// Semua rod terurut dari termurah
const RODS = Object.entries(ITEMS)
    .filter(([, it]) => it.type === "rod")
    .sort((a, b) => a[1].price - b[1].price)

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
            if (!p.inventory[id])
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

        // ── Beli / upgrade rod ──
        if (command.startsWith("rod_buy:")) {
            const id = command.split(":")[1]
            const it = ITEMS[id]
            if (!it) return m.reply(card("PANCING", "Pancing tidak ditemukan.", { emoji: "🎣" }))
            const p = getPlayer(me)
            if (p.inventory[id])
                return m.reply(
                    card("PANCING", "Kamu sudah punya pancing ini. Pilih untuk memakainya.", {
                        emoji: "🎣"
                    })
                )
            if (p.money < it.price) {
                return m.reply(
                    card(
                        "PANCING",
                        [
                            `${it.emoji} ${it.name}`,
                            ``,
                            `💸 Harga : $${it.price.toLocaleString("id-ID")}`,
                            `💰 Saldo : $${p.money.toLocaleString("id-ID")}`,
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
                        `💸 -$${it.price.toLocaleString("id-ID")}`,
                        `🍀 Luck ×${it.luck}  ·  🎯 Reel -${it.reel}`
                    ],
                    { emoji: "🎣" }
                )
            )
        }

        // ── Menu daftar rod ──
        const p = getPlayer(me)
        const current = getRod(p)

        const bodyLines = [`💰 Saldo: $${p.money.toLocaleString("id-ID")}`, ``]
        const rows = []
        for (const [id, it] of RODS) {
            const owned = !!p.inventory[id]
            const active = id === current
            const status = active
                ? "✅ dipakai"
                : owned
                  ? "dimiliki"
                  : `$${it.price.toLocaleString("id-ID")}`
            bodyLines.push(`${it.emoji} *${it.name}* — 🍀×${it.luck} 🎯-${it.reel} · ${status}`)
            rows.push({
                title: `${it.emoji} ${it.name}${active ? " ✅" : ""}`,
                description: owned
                    ? active
                        ? "Sedang dipakai"
                        : "Pakai pancing ini"
                    : `Beli — $${it.price.toLocaleString("id-ID")} · Luck ×${it.luck} · Reel -${it.reel}`,
                id: owned ? `rod_use:${id}` : `rod_buy:${id}`
            })
        }

        return Button.menu({
            sock,
            m,
            body: card("PANCING", bodyLines, { emoji: "🎣" }),
            footer: "© Chaeul RPG",
            lock: me,
            sections: [{ title: "🎣 Daftar Pancing", rows }]
        })
    }
}
