import { card } from "../../lib/ui.js"
import { facebook, instagram } from "../../lib/downloader.js"

const IG_REGEX = /instagram\.com/i
const FB_REGEX = /(facebook\.com|fb\.watch|fb\.com)/i

export default {
    command: ["ig", "instagram", "igdl", "fb", "facebook", "fbdl"],

    category: "Downloader",

    description: "Download video Instagram (Reel) / Facebook",

    async run({ sock, m, command, args }) {
        const isIG = ["ig", "instagram", "igdl"].includes(command)
        const regex = isIG ? IG_REGEX : FB_REGEX
        const label = isIG ? "INSTAGRAM" : "FACEBOOK"
        const emoji = isIG ? "📸" : "📘"

        const url = args.find((a) => regex.test(a))
        if (!url) {
            return m.reply(
                card(label, [`Kirim link ${label}.`, `Contoh: ${global.prefix}${command} <link>`], {
                    emoji
                })
            )
        }

        await m.react("⏳")
        try {
            const d = isIG ? await instagram(url) : await facebook(url)
            await m.sendVideo(d.video, `${emoji} ${d.title || label}`)
            await m.react("✅")
        } catch (e) {
            await m.react("❌")
            return m.reply(card(label, `Gagal: ${e.message}`, { emoji }))
        }
    }
}
