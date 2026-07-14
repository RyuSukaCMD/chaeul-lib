import { card } from "../../lib/ui.js"
import { ytSearch, ytmp3, lyrics } from "../../lib/downloader.js"

export default {
    command: ["play", "music", "lagu"],

    category: "Downloader",

    description: "Cari musik → kirim MP3 + link + lirik ke grup",

    async run({ sock, m, text }) {
        if (!text) {
            return m.reply(
                card("PLAY", [`Mau dengar lagu apa?`, `Contoh: ${global.prefix}play faded`], {
                    emoji: "🎧"
                })
            )
        }

        await m.react("⏳")
        try {
            const results = await ytSearch(text)
            const top = results[0]

            // 1) Info + link dulu (selalu berhasil)
            await m.reply(
                card(
                    "NOW PLAYING",
                    [
                        `🎵 ${top.title}`,
                        top.author ? `👤 ${top.author}` : ``,
                        top.duration ? `⏱️ ${top.duration}` : ``,
                        top.views ? `👀 ${Number(top.views).toLocaleString("id-ID")} views` : ``,
                        ``,
                        `🔗 ${top.url}`
                    ].filter(Boolean),
                    { emoji: "🎧" }
                )
            )

            // 2) Lirik (best-effort)
            const ly = await lyrics(top.title)
            if (ly) {
                const trimmed = ly.length > 3500 ? ly.slice(0, 3500) + "\n..." : ly
                await m.reply(card("LIRIK", [top.title, ``, trimmed], { emoji: "📝" }))
            }

            // 3) MP3 (best-effort; API bisa lambat/gagal)
            try {
                const audio = await ytmp3(top.url)
                if (audio.audio) await m.sendAudio(audio.audio, false)
                await m.react("✅")
            } catch {
                await m.react("⚠️")
                await m.reply(
                    card(
                        "PLAY",
                        [
                            `Audio MP3 gagal diambil (API sibuk).`,
                            `Coba lagi atau pakai link di atas.`
                        ],
                        { emoji: "🎧" }
                    )
                )
            }
        } catch (e) {
            await m.react("❌")
            return m.reply(card("PLAY", `Gagal: ${e.message}`, { emoji: "🎧" }))
        }
    }
}
