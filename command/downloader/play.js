import Button from "../../lib/button.js"
import { card } from "../../lib/ui.js"
import { ytSearch, ytmp3, ytInfo, lyrics, fetchBuffer } from "../../lib/downloader.js"

// Sesi hasil pencarian: id -> { results:[...], chat }
const sessions = new Map()
const newId = () => `${Date.now()}${Math.floor(Math.random() * 1000)}`

// Parse flag: -t Title | -a Artist. Boleh salah satu / keduanya.
// Contoh: ".play -t faded -a alan walker" atau ".play -a coldplay"
function parseQuery(text) {
    const t = text.match(/-t\s+(.+?)(?=\s-a\s|$)/i)?.[1]?.trim()
    const a = text.match(/-a\s+(.+?)(?=\s-t\s|$)/i)?.[1]?.trim()
    if (!t && !a) return null // tidak ada flag
    return { title: t || "", artist: a || "", query: [a, t].filter(Boolean).join(" ") }
}

function fmtViews(v) {
    const n = Number(v || 0)
    if (n >= 1e9) return (n / 1e9).toFixed(1).replace(/\.0$/, "") + "B"
    if (n >= 1e6) return (n / 1e6).toFixed(1).replace(/\.0$/, "") + "M"
    if (n >= 1e3) return (n / 1e3).toFixed(1).replace(/\.0$/, "") + "K"
    return String(n)
}

export default {
    command: ["play", "music", "lagu", /^play_pick:.+$/],

    category: "Downloader",

    description: "Cari lagu (-t judul / -a artis) → pilih dari top 5 → audio + info + lirik",

    async run({ sock, m, command, text }) {
        // ── User memilih salah satu lagu ──
        if (command.startsWith("play_pick:")) {
            const [, id, idxStr] = command.split(":")
            const sess = sessions.get(id)
            if (!sess)
                return m.reply(card("PLAY", "Sesi kedaluwarsa, cari lagi ya.", { emoji: "🎧" }))
            const song = sess.results[Number(idxStr)]
            if (!song) return m.reply(card("PLAY", "Pilihan tidak valid.", { emoji: "🎧" }))
            sessions.delete(id)

            await m.react("⏳")
            try {
                // Info tambahan (channel/artist) dari noembed
                const info = await ytInfo(song.url)
                const artist = info.author || song.author || "-"

                // 1) Kartu informasi lagu + thumbnail, berbarengan dengan audio
                const caption =
                    `╭━━━〔 🎧 *NOW PLAYING* 〕━━━⬣\n` +
                    `┃\n` +
                    `┃ 🎵 *${song.title}*\n` +
                    `┃ 👤 ${artist}\n` +
                    `┃ ⏱️ ${song.duration || "-"}\n` +
                    `┃ 👀 ${fmtViews(song.views)} views\n` +
                    `┃\n` +
                    `┃ 🔗 ${song.url}\n` +
                    `╰━━━━━━━━━━━━━━━━━━⬣`

                if (song.thumbnail) {
                    try {
                        const thumb = await fetchBuffer(song.thumbnail, { timeout: 20000 })
                        await m.sendImage(thumb, caption)
                    } catch {
                        await m.reply(caption)
                    }
                } else {
                    await m.reply(caption)
                }

                // 2) Audio MP3 (mimetype audio/mpeg agar bisa diputar)
                const audio = await ytmp3(song.url)
                const buf = await fetchBuffer(audio.audio)
                await m.sendAudio(buf, false, {
                    mimetype: "audio/mpeg",
                    fileName: `${song.title}.mp3`
                })

                // 3) Lirik (best-effort)
                const q = artist && artist !== "-" ? `${artist} - ${song.title}` : song.title
                const ly = await lyrics(q)
                if (ly) {
                    const trimmed = ly.length > 3500 ? ly.slice(0, 3500) + "\n..." : ly
                    await m.reply(card("LIRIK", [song.title, ``, trimmed], { emoji: "📝" }))
                }

                await m.react("✅")
            } catch (e) {
                await m.react("❌")
                return m.reply(card("PLAY", `Gagal memutar: ${e.message}`, { emoji: "🎧" }))
            }
            return
        }

        // ── Command utama: cari lagu ──
        if (!text) {
            return m.reply(
                card(
                    "PLAY",
                    [
                        `Cari lagu pakai flag:`,
                        `-t = Judul  |  -a = Artis`,
                        ``,
                        `Contoh:`,
                        `${global.prefix}play -t faded`,
                        `${global.prefix}play -a alan walker`,
                        `${global.prefix}play -t faded -a alan walker`
                    ],
                    { emoji: "🎧" }
                )
            )
        }

        // Dukung format lama (tanpa flag) → anggap sebagai judul.
        const parsed = parseQuery(text) || { query: text.trim(), title: text.trim(), artist: "" }

        await m.react("🔎")
        try {
            const results = (await ytSearch(parsed.query)).slice(0, 5)
            if (!results.length) throw new Error("Lagu tidak ditemukan.")

            const id = newId()
            sessions.set(id, { results, chat: m.chat })
            const to = setTimeout(() => sessions.delete(id), 5 * 60 * 1000)
            if (to.unref) to.unref()

            const rows = results.map((r, i) => ({
                title: `${i + 1}. ${r.title}`.slice(0, 60),
                description: `⏱️ ${r.duration || "-"} • 👀 ${fmtViews(r.views)}${r.author ? " • " + r.author : ""}`,
                id: `play_pick:${id}:${i}`
            }))

            const bodyLines = [
                `🔎 Hasil untuk:`,
                parsed.title ? `   🎵 Judul: ${parsed.title}` : ``,
                parsed.artist ? `   👤 Artis: ${parsed.artist}` : ``,
                ``,
                `Pilih salah satu lagu di bawah 👇`
            ].filter(Boolean)

            return Button.menu({
                sock,
                m,
                body: card("PILIH LAGU", bodyLines, { emoji: "🎧" }),
                footer: "© Chaeul • Play",
                lock: m.sender,
                listTitle: "🎧 Top 5 Lagu",
                sections: [{ title: "✦ HASIL PENCARIAN", rows }]
            })
        } catch (e) {
            await m.react("❌")
            return m.reply(card("PLAY", `Gagal: ${e.message}`, { emoji: "🎧" }))
        }
    }
}
