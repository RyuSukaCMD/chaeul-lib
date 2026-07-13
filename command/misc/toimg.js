import Sticker from "../../lib/sticker.js"

export default {
    command: ["toimg", "toimage", "togif"],

    category: "Misc",

    description: "Ubah sticker menjadi gambar (sticker gif/animasi → video)",

    async run({ m }) {
        const q = m.quoted || m

        if (!q.mimetype || !Sticker.isWebp(q.mimetype)) {
            return m.reply(
                `╭━━━〔 🖼️ TO IMAGE 〕━━━⬣\n` +
                    `Reply sebuah *sticker*\n` +
                    `yang ingin diubah.\n` +
                    `╰━━━━━━━━━━━━━━━━━━⬣`
            )
        }

        await m.react("🖼️")

        try {
            const buffer = await q.download()

            // Sticker animasi (gif) → video, sticker statis → gambar
            if (Sticker.isAnimatedWebp(buffer)) {
                try {
                    // Utama: webp animasi → GIF → MP4
                    const video = await Sticker.toVideo(buffer)
                    await m.send("video", video, {
                        mimetype: "video/mp4",
                        caption: "✅ Sticker animasi → video"
                    })
                } catch (err) {
                    // Fallback: kirim GIF sebagai video ber-gifPlayback
                    // (bila ffmpeg/libx264 bermasalah, GIF tetap tampil animasi)
                    const gif = await Sticker.toGif(buffer)
                    await m.send("video", gif, {
                        mimetype: "video/mp4",
                        gifPlayback: true,
                        caption: "✅ Sticker animasi → GIF"
                    })
                }
            } else {
                const image = await Sticker.toImage(buffer)
                await m.sendImage(image, "✅ Sticker → gambar")
            }

            return m.react("✅")
        } catch (e) {
            await m.react("❌")
            return m.reply(`Gagal mengubah sticker.\n${e.message}`)
        }
    }
}
