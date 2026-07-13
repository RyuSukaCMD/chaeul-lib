import Button from "../../lib/button.js"
import { card } from "../../lib/ui.js"
import { resolvePn } from "../../lib/resolve.js"
import {
    getPlayer,
    getIsland,
    setIsland,
    hasIsland,
    unlockIsland,
    addMoney,
    getMoney
} from "../../lib/rpg.js"
import { ISLANDS, ISLAND_ORDER, islandFishTotal } from "../../lib/island.js"

export default {
    command: ["island", "pulau", /^island_go:.+$/],

    category: "RPG",

    description: "Ganti island memancing (tiap island punya ikan berbeda)",

    async run({ sock, m, command, args }) {
        const me = await resolvePn(sock, m, m.sender)
        const cur = getIsland(me)

        // ── Tombol pindah island ──
        let target = null
        if (command.startsWith("island_go:")) target = command.split(":")[1]
        else if (args[0]) {
            const q = args[0].toLowerCase()
            target = ISLAND_ORDER.find(
                (id) => id === q || ISLANDS[id].name.toLowerCase().includes(q)
            )
        }

        if (target && ISLANDS[target]) {
            const info = ISLANDS[target]
            if (target === cur) {
                return m.reply(
                    card("ISLAND", `Kamu sudah di ${info.emoji} ${info.name}.`, { emoji: "🏝️" })
                )
            }
            // Belum terbuka → coba beli
            if (!hasIsland(me, target)) {
                if (getMoney(me) < info.unlockPrice) {
                    return m.reply(
                        card(
                            "ISLAND TERKUNCI",
                            [
                                `${info.emoji} ${info.name}`,
                                `Harga buka: $${info.unlockPrice.toLocaleString("id-ID")}`,
                                `Uangmu: $${getMoney(me).toLocaleString("id-ID")}`,
                                ``,
                                `Kumpulkan uang lebih dulu ya!`
                            ],
                            { emoji: "🔒" }
                        )
                    )
                }
                addMoney(me, -info.unlockPrice)
                unlockIsland(me, target)
            }
            setIsland(me, target)
            await m.react("🏝️")
            return m.reply(
                card(
                    "PINDAH ISLAND",
                    [
                        `✅ Sekarang kamu di:`,
                        `${info.emoji} *${info.name}*`,
                        `${info.desc}`,
                        `🐟 ${islandFishTotal(target)} jenis ikan`,
                        ``,
                        `Ketik ${global.prefix}mancing untuk memancing!`
                    ],
                    { emoji: "🏝️" }
                )
            )
        }

        // ── Tampilkan daftar island (list button) ──
        const p = getPlayer(me)
        const rows = ISLAND_ORDER.map((id) => {
            const info = ISLANDS[id]
            const owned = hasIsland(me, id)
            const here = id === cur ? " ✅" : ""
            const lock = owned ? "" : ` 🔒$${info.unlockPrice.toLocaleString("id-ID")}`
            return {
                title: `${info.emoji} ${info.name}${here}${lock}`,
                description: `${islandFishTotal(id)} ikan • ${info.desc}`,
                id: `island_go:${id}`
            }
        })

        const bodyLines = [
            `📍 Lokasi kamu: ${ISLANDS[cur].emoji} ${ISLANDS[cur].name}`,
            `💰 Uang: $${(p.money || 0).toLocaleString("id-ID")}`,
            ``,
            `Pilih island di bawah untuk pindah.`,
            `Island terkunci akan dibeli otomatis.`
        ]

        return Button.menu({
            sock,
            m,
            body: card("PILIH ISLAND", bodyLines, { emoji: "🗺️" }),
            footer: "© Chaeul RPG",
            listTitle: "🗺️ Pilih Island",
            sections: [{ title: "✦ ISLAND TERSEDIA", rows }]
        })
    }
}
