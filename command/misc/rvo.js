import { downloadMediaMessage } from "baileys"

export default {
    command: ["rvo", "readviewonce", "rvonce"],

    category: "Misc",

    description: "Mengubah pesan view once menjadi media biasa",

    async run({ sock, m }) {
        if (!m.quoted) {
            return m.reply(
                `╭━━━〔 👁️ READ VIEW ONCE 〕━━━⬣\n` +
                    `Reply pesan *view once*\n` +
                    `(foto/video) yang ingin dibuka.\n` +
                    `╰━━━━━━━━━━━━━━━━━━⬣`
            )
        }

        // Ambil pesan asli yang di-quote
        const raw = m.quoted.message

        // Cari konten view once (beberapa kemungkinan struktur Baileys)
        const voWrap =
            raw?.viewOnceMessageV2Extension?.message ||
            raw?.viewOnceMessageV2?.message ||
            raw?.viewOnceMessage?.message ||
            raw

        const inner =
            voWrap?.imageMessage ||
            voWrap?.videoMessage ||
            m.quoted.msg?.imageMessage ||
            m.quoted.msg?.videoMessage ||
            (m.quoted.mimetype?.startsWith("image/") || m.quoted.mimetype?.startsWith("video/")
                ? m.quoted.msg
                : null)

        if (!inner) {
            return m.reply(
                `╭━━━〔 👁️ READ VIEW ONCE 〕━━━⬣\n` +
                    `Ini bukan pesan view once\n` +
                    `foto/video.\n` +
                    `╰━━━━━━━━━━━━━━━━━━⬣`
            )
        }

        const isVideo = !!(voWrap?.videoMessage || m.quoted.msg?.videoMessage) || inner.seconds

        await m.react("👁️")

        try {
            // Susun ulang pesan agar bisa di-download sebagai media biasa
            const fakeMsg = {
                key: m.quoted.key,
                message: isVideo ? { videoMessage: inner } : { imageMessage: inner }
            }

            const buffer = await downloadMediaMessage(
                fakeMsg,
                "buffer",
                {},
                { logger: sock.logger, reuploadRequest: sock.updateMediaMessage }
            )

            const caption =
                `╭━━━〔 👁️ VIEW ONCE UNLOCKED 〕━━━⬣\n` +
                `${inner.caption || "Berhasil dibuka."}\n` +
                `╰━━━━━━━━━━━━━━━━━━⬣`

            if (isVideo) {
                await m.send("video", buffer, { caption, mimetype: "video/mp4" })
            } else {
                await m.sendImage(buffer, caption)
            }

            return m.react("✅")
        } catch (e) {
            await m.react("❌")
            return m.reply(`Gagal membuka view once.\n${e.message}`)
        }
    }
}
