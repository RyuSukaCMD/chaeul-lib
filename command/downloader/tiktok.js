import { card } from "../../lib/ui.js"
import { tiktok } from "../../lib/downloader.js"
import { formatCount, formatDuration } from "../../lib/dlformat.js"

const TT_REGEX = /tiktok\.com|vt\.tiktok|vm\.tiktok/i

export default {
    command: ["tiktok", "tt", "ttdl"],

    category: "Downloader",

    description: "Download video TikTok (tanpa watermark)",

    async run({ sock, m, args }) {
        const url = args.find((a) => TT_REGEX.test(a))
        if (!url) {
            return m.reply(
                card("TIKTOK", [`Kirim link TikTok.`, `Contoh: ${global.prefix}tt <link>`], {
                    emoji: "🎵"
                })
            )
        }

        await m.react("⏳")
        try {
            const d = await tiktok(url)

            // Slideshow (foto) → kirim gambar
            if (d.images?.length) {
                for (const img of d.images.slice(0, 10)) {
                    await m.sendImage(img, "").catch(() => {})
                }
                await m.react("✅")
                return
            }

            const caption =
                `🎵 *TIKTOK*\n\n` +
                `👤 ${d.author.nickname} (@${d.author.unique_id})\n` +
                `👀 ${formatCount(d.play_count)} • ❤️ ${formatCount(d.digg_count)}\n` +
                `⏱️ ${formatDuration(d.duration)}\n` +
                `🎶 ${d.music_info.title}\n\n` +
                `${(d.title || "").slice(0, 200)}`

            await m.sendVideo(d.video, caption)
            await m.react("✅")
        } catch (e) {
            await m.react("❌")
            return m.reply(card("TIKTOK", `Gagal: ${e.message}`, { emoji: "🎵" }))
        }
    }
}
