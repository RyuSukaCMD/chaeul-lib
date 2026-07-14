import { card } from "../../lib/ui.js"
import { ytmp3, ytmp4, ytSearch } from "../../lib/downloader.js"

const YT_REGEX = /(youtube\.com|youtu\.be)/i

export default {
    command: ["yt", "ytmp3", "ytmp4", "ytaudio", "ytvideo", "play2"],

    category: "Downloader",

    description: "Download YouTube (mp3/mp4). Bisa pakai link atau judul.",

    async run({ sock, m, command, args, text }) {
        if (!text) {
            return m.reply(
                card(
                    "YOUTUBE",
                    [
                        `Kirim link / judul.`,
                        `${global.prefix}ytmp3 <link/judul>  (audio)`,
                        `${global.prefix}ytmp4 <link/judul>  (video)`
                    ],
                    { emoji: "📺" }
                )
            )
        }

        // mp4 hanya jika command ytmp4/ytvideo; selain itu default mp3
        const wantVideo = command === "ytmp4" || command === "ytvideo"

        await m.react("⏳")
        try {
            // Resolve URL (dari link atau hasil search judul)
            let url = args.find((a) => YT_REGEX.test(a))
            let title = ""
            if (!url) {
                const res = await ytSearch(text)
                url = res[0].url
                title = res[0].title
            }

            if (wantVideo) {
                const v = await ytmp4(url)
                await m.sendVideo(v.video, `📺 ${v.title || title}`)
            } else {
                const a = await ytmp3(url)
                await m.reply(card("YOUTUBE", [`🎵 ${a.title || title}`], { emoji: "📺" }))
                await m.sendAudio(a.audio, false)
            }
            await m.react("✅")
        } catch (e) {
            await m.react("❌")
            return m.reply(card("YOUTUBE", `Gagal: ${e.message}`, { emoji: "📺" }))
        }
    }
}
