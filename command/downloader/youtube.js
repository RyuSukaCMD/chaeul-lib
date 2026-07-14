import Button from "../../lib/button.js"
import { card } from "../../lib/ui.js"
import { ytSearch, ytmp3, ytmp4, fetchBuffer } from "../../lib/downloader.js"

const YT_REGEX = /(youtube\.com|youtu\.be)/i

// Cache hasil pencarian sementara agar tombol tahu URL-nya.
const pending = new Map() // id -> { url, title, thumb }
const newId = () => `${Date.now()}${Math.floor(Math.random() * 1000)}`

export default {
    command: ["yt", "youtube", "ytdl", "ytmp3", "ytmp4", /^yt_dl:.+$/],

    category: "Downloader",

    description: "Download YouTube — pilih Video / Music lewat tombol",

    async run({ sock, m, command, text }) {
        // ── Tombol pilih format ──
        if (command.startsWith("yt_dl:")) {
            const [, kind, id] = command.split(":")
            const item = pending.get(id)
            if (!item) return m.reply(card("YOUTUBE", "Sesi kedaluwarsa, ulangi.", { emoji: "📺" }))

            await m.react("⏳")
            try {
                if (kind === "audio") {
                    const a = await ytmp3(item.url)
                    const buf = await fetchBuffer(a.audio)
                    await m.reply(card("YOUTUBE", [`🎵 ${a.title || item.title}`], { emoji: "📺" }))
                    await m.sendAudio(buf, false)
                } else {
                    const v = await ytmp4(item.url)
                    const buf = await fetchBuffer(v.video)
                    await m.sendVideo(buf, `📺 ${v.title || item.title}`)
                }
                pending.delete(id)
                await m.react("✅")
            } catch (e) {
                await m.react("❌")
                return m.reply(card("YOUTUBE", `Gagal: ${e.message}`, { emoji: "📺" }))
            }
            return
        }

        // ── Command utama: link/judul → tampilkan tombol ──
        if (!text) {
            return m.reply(
                card("YOUTUBE", [`Kirim link / judul.`, `${global.prefix}yt <link/judul>`], {
                    emoji: "📺"
                })
            )
        }

        await m.react("🔎")
        try {
            let url = YT_REGEX.test(text) ? text.match(/\S*(youtube\.com|youtu\.be)\S*/i)[0] : null
            let title = ""
            let thumb = ""
            if (!url) {
                const res = await ytSearch(text)
                url = res[0].url
                title = res[0].title
                thumb = res[0].thumbnail
            }

            const id = newId()
            pending.set(id, { url, title, thumb })
            const t = setTimeout(() => pending.delete(id), 5 * 60 * 1000)
            if (t.unref) t.unref()

            const body = card(
                "YOUTUBE DOWNLOADER",
                [title ? `🎬 ${title}` : `🔗 ${url}`, ``, `Pilih format yang mau diunduh 👇`],
                { emoji: "📺" }
            )

            const buttons = [
                { type: "quick", text: "🎬 Video (MP4)", id: `yt_dl:video:${id}` },
                { type: "quick", text: "🎵 Music (MP3)", id: `yt_dl:audio:${id}` }
            ]

            if (thumb) {
                return Button.menu({
                    sock,
                    m,
                    body,
                    footer: "© Chaeul",
                    image: { url: thumb },
                    lock: m.sender,
                    buttons
                })
            }
            return Button.menu({ sock, m, body, footer: "© Chaeul", lock: m.sender, buttons })
        } catch (e) {
            await m.react("❌")
            return m.reply(card("YOUTUBE", `Gagal: ${e.message}`, { emoji: "📺" }))
        }
    }
}
