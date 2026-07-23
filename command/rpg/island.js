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
import { getWeatherEffect } from "../../lib/fishingWeather.js"

export default {
    command: ["island", "pulau", /^island_go:.+$/],

    category: "RPG",

    description: "Pilih lokasi fishing.",

    async run({ sock, m, command, args }) {
        const me = await resolvePn(sock, m, m.sender)
        const player = getPlayer(me)
        const weather = getWeatherEffect()
        const weatherOptions = { weather: { shark_hunter: weather.sharkHunter } }
        let cur = getIsland(me)
        if (!islandUnlocked(player, cur, weatherOptions) && cur === "shark_island") {
            setIsland(me, "fisherman")
            cur = "fisherman"
        }

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
            if (!islandUnlocked(player, target, weatherOptions)) {
                return m.reply(
                    card(
                        "ISLAND TERKUNCI",
                        [
                            `${info.emoji} *${info.name}* belum bisa dikunjungi.`,
                            ``,
                            `🔓 Syarat: ${islandUnlockText(player, target, weatherOptions)}`,
                            `📈 Level ${player.level}`
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
                    "ISLAND",
                    [
                        `✅ Sekarang kamu di:`,
                        `${info.emoji} *${info.name}*`,
                        `${info.desc}`,
                        `🐟 ${islandFishTotal(target)} jenis ikan`,
                        info.stone ? `🔮 Bisa memancing Enchant Stone di sini!` : ``,
                        ``,
                        `${global.prefix}mancing untuk mulai fishing.`
                    ].filter((x) => x !== ``),
                    { emoji: "🏝️" }
                )
            )
        }

        // ── Daftar island (list button) ──
        const visibleIslands = ISLAND_ORDER.filter(
            (id) => id !== "shark_island" || islandUnlocked(player, id, weatherOptions)
        )
        const rows = visibleIslands.map((id) => {
            const info = ISLANDS[id]
            const unlocked = islandUnlocked(player, id, weatherOptions)
            const here = id === cur ? " ✅" : ""
            return {
                title: `${unlocked ? info.emoji : "🔒"} ${info.name}${here}`,
                description: unlocked
                    ? `${islandFishTotal(id)} ikan • ${info.desc}`
                    : islandUnlockText(player, id, weatherOptions),
                id: `island_go:${id}`
            }
        })

        return Button.menu({
            sock,
            m,
            body: card(
                "PILIH ISLAND",
                [
                    `📍 ${ISLANDS[cur].emoji} ${ISLANDS[cur].name}`,
                    `📈 Level ${player.level}`,
                    weather.active.length
                        ? `☁️ ${weather.active.map((item) => `${item.emoji} ${item.name}`).join(" + ")}`
                        : `☁️ Weather normal`,
                    ``,
                    `Pilih lokasi.`
                ],
                { emoji: "🗺️" }
            ),
            footer: "© Chaeul RPG",
            listTitle: "Pilih Lokasi",
            sections: [{ title: "✦ ISLAND TERSEDIA", rows }]
        })
    }
}
