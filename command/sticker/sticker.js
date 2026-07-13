import Sticker from "../../lib/sticker.js"

export default {
    command: ["s", "sticker", "stiker"],

    category: "Sticker",

    description: "Buat sticker dari gambar/video (opsional: NamaPack|NamaCreator)",

    async run({ m, text }) {
        const q = m.quoted || m

        if (!q.mimetype) {
            return m.reply(
                `╭━━━〔 🎨 STICKER 〕━━━⬣\n` +
                    `Kirim / reply gambar atau video\n` +
                    `dengan caption:\n\n` +
                    `${global.prefix}sticker NamaPack|NamaCreator\n\n` +
                    `Contoh:\n` +
                    `${global.prefix}sticker Chaeul|Ryu\n` +
                    `╰━━━━━━━━━━━━━━━━━━⬣`
            )
        }

        if (
            !Sticker.isImage(q.mimetype) &&
            !Sticker.isVideo(q.mimetype) &&
            !Sticker.isWebp(q.mimetype)
        ) {
            return m.reply("Media tidak didukung.")
        }

        if (Sticker.isVideo(q.mimetype) && q.seconds > 10) {
            return m.reply("Video maksimal 10 detik.")
        }

        // Parse "NamaPack|NamaCreator" dari teks (opsional)
        let packname = global.sticker?.packname || global.packname
        let author = global.sticker?.author || global.author

        if (text && text.includes("|")) {
            const [pack, creator] = text.split("|")
            if (pack?.trim()) packname = pack.trim()
            if (creator?.trim()) author = creator.trim()
        } else if (text && text.trim()) {
            // Hanya nama pack
            packname = text.trim()
        }

        await m.react("🎨")

        try {
            const buffer = await q.download()

            const sticker = await Sticker.from(buffer, q.mimetype, {
                packname,
                author
            })

            await m.sendSticker(sticker)
            return m.react("✅")
        } catch (e) {
            await m.react("❌")
            return m.reply(`Gagal membuat sticker.\n${e.message}`)
        }
    }
}
