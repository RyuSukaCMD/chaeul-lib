import { card } from "../../lib/ui.js"
import { imageURLResolved } from "../../lib/ai.js"
import { fetchBuffer } from "../../lib/downloader.js"

export default {
    command: ["imagine", "img", "aiimage", "genimage", "dalle"],

    category: "AI",

    description: "Buat gambar dari teks pakai AI (text-to-image)",

    async run({ sock, m, text }) {
        if (!text) {
            return m.reply(
                card(
                    "AI IMAGE",
                    [
                        `Deskripsikan gambar yang mau dibuat.`,
                        ``,
                        `Contoh:`,
                        `${global.prefix}imagine kucing astronot di bulan`,
                        `${global.prefix}img sunset di pantai, gaya anime`
                    ],
                    { emoji: "🎨" }
                )
            )
        }

        await m.react("🎨")
        try {
            const url = await imageURLResolved(text, { width: 1024, height: 1024 })
            // Unduh jadi buffer supaya pasti terkirim (URL di-generate on-the-fly)
            const buf = await fetchBuffer(url, { timeout: 90000 })
            await m.sendImage(buf, `🎨 *${text}*\n\n_Dibuat oleh Starnova AI_`)
            await m.react("✅")
        } catch (e) {
            await m.react("❌")
            return m.reply(card("AI IMAGE", `Gagal membuat gambar: ${e.message}`, { emoji: "🎨" }))
        }
    }
}
