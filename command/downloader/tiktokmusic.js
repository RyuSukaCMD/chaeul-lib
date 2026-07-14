import { card } from "../../lib/ui.js"
import { tiktokMusic, fetchBuffer } from "../../lib/downloader.js"

const TT_REGEX = /tiktok\.com|vt\.tiktok|vm\.tiktok/i

export default {
    command: ["tiktokmusic", "ttmusic", "ttmp3", "ttaudio"],

    category: "Downloader",

    description: "Ambil audio/musik dari video TikTok",

    async run({ sock, m, args }) {
        const url = args.find((a) => TT_REGEX.test(a))
        if (!url) {
            return m.reply(
                card(
                    "TIKTOK MUSIC",
                    [`Kirim link TikTok.`, `Contoh: ${global.prefix}ttmusic <link>`],
                    { emoji: "🎶" }
                )
            )
        }

        await m.react("⏳")
        try {
            const d = await tiktokMusic(url)
            if (!d.audio) throw new Error("Audio tidak ditemukan.")
            await m.reply(
                card("TIKTOK MUSIC", [`🎶 ${d.title}`, `👤 ${d.author}`], { emoji: "🎶" })
            )
            const buf = await fetchBuffer(d.audio)
            await m.sendAudio(buf, false)
            await m.react("✅")
        } catch (e) {
            await m.react("❌")
            return m.reply(card("TIKTOK MUSIC", `Gagal: ${e.message}`, { emoji: "🎶" }))
        }
    }
}
