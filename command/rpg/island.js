import Button from "../../lib/button.js"
import { card } from "../../lib/ui.js"
import { resolvePn } from "../../lib/resolve.js"
import { getPlayer, getIsland, setIsland } from "../../lib/rpg.js"
import {
    ISLANDS,
    ISLAND_ORDER,
    islandFishTotal,
    islandUnlocked,
    islandUnlockText
} from "../../lib/island.js"

export default {
    command: ["island", "pulau", /^island_go:.+$/],

    category: "RPG",

    description: "Ganti island memancing (island baru terbuka bertahap)",

    async run({ sock, m, command, args }) {
        const me = await resolvePn(sock, m, m.sender)
        const player = getPlayer(me)
        const cur = getIsland(me)

        // ── Pindah island (tombol / .island <nama>) ──
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
            if (!islandUnlocked(player, target)) {
                return m.reply(
                    card(
                        "ISLAND TERKUNCI",
                        [
                            `${info.emoji} *${info.name}* belum bisa dikunjungi.`,
                            ``,
                            `🔓 Syarat: ${islandUnlockText(player, target)}`,
                            `📈 Level kamu: ${player.level}`
                        ],
                        { emoji: "🔒" }
                    )
                )
            }
            if (target === cur) {
                return m.reply(
                    card("ISLAND", `Kamu sudah di ${info.emoji} ${info.name}.`, { emoji: "🏝️" })
                )
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
                        info.stone ? `🔮 Bisa memancing Enchant Stone di sini!` : ``,
                        ``,
                        `Ketik ${global.prefix}mancing untuk memancing!`
                    ].filter((x) => x !== ``),
                    { emoji: "🏝️" }
                )
            )
        }

        // ── Daftar island (list button) ──
        const rows = ISLAND_ORDER.map((id) => {
            const info = ISLANDS[id]
            const unlocked = islandUnlocked(player, id)
            const here = id === cur ? " ✅" : ""
            return {
                title: `${unlocked ? info.emoji : "🔒"} ${info.name}${here}`,
                description: unlocked
                    ? `${islandFishTotal(id)} ikan • ${info.desc}`
                    : islandUnlockText(player, id),
                id: `island_go:${id}`
            }
        })

        return Button.menu({
            sock,
            m,
            body: card(
                "PILIH ISLAND",
                [
                    `📍 Lokasi kamu: ${ISLANDS[cur].emoji} ${ISLANDS[cur].name}`,
                    `📈 Level: ${player.level}`,
                    ``,
                    `Pulau lama gratis; pulau baru terbuka bertahap. 🎉`,
                    `Pilih island di bawah untuk pindah.`
                ],
                { emoji: "🗺️" }
            ),
            footer: "© Chaeul RPG",
            listTitle: "🗺️ Pilih Island",
            sections: [{ title: "✦ ISLAND TERSEDIA", rows }]
        })
    }
}
