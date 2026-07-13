import { performance } from "perf_hooks"
import Loader from "../../lib/loader.js"
import System from "../../lib/system.js"

export default {
    command: ["ping", "p", "status"],

    category: "Main",

    description: "Cek status & kecepatan bot",

    // Command dasar → gratis (tidak potong token)
    free: true,

    async run({ m }) {
        // Ukur latency respon (waktu proses hingga siap membalas)
        const start = performance.now()
        await m.react("🚀")
        const latency = (performance.now() - start).toFixed(2)

        const mode = global.settings.public ? "Public" : "Self"

        const sys = await System({
            latency: `${latency} ms`,

            plugin: Loader.commandCount(),

            mode
        })

        const speedIcon = latency < 300 ? "🟢" : latency < 800 ? "🟡" : "🔴"

        const caption =
            `╭━━━━〔 🚀 *Chaeul STATUS* 〕━━━━⬣\n` +
            `┃\n` +
            `┃ ${speedIcon} *Speed*\n` +
            `┃   └ ${latency} ms\n` +
            `┃\n` +
            `┃ ⏱️ *Uptime*\n` +
            `┃   └ ${sys.runtime}\n` +
            `┃\n` +
            `┣━━━ 💻 *SYSTEM* ━━━\n` +
            `┃\n` +
            `┃ 🖥️ Platform : ${sys.platform}\n` +
            `┃ 🟩 NodeJS   : ${sys.node}\n` +
            `┃ 💾 Memory   : ${sys.ram} (${sys.ramPercent}%)\n` +
            `┃ 💽 Storage  : ${sys.storage}%\n` +
            `┃\n` +
            `┣━━━ 🤖 *BOT* ━━━\n` +
            `┃\n` +
            `┃ 📂 Command  : ${Loader.commandCount()} command\n` +
            `┃ ⚙️ Mode     : ${mode}\n` +
            `┃ 📦 Version  : v${global.version}\n` +
            `┃\n` +
            `╰━━━━━━━━━━━━━━━━━━━⬣`

        try {
            await m.sendImage(sys.image, caption)
        } catch {
            // Fallback bila gagal membuat/mengirim gambar
            await m.reply(caption)
        }
    }
}
