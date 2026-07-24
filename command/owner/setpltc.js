import { card } from "../../lib/ui.js"
import {
    getPltcConfig,
    isPltcConfigured,
    setPltcConfig,
    clearPltc
} from "../../lib/urgent.js"

export default {
    command: ["setpltc"],

    owner: true,

    category: "Owner",

    description: "Set PLTC (Client API Key) untuk live resource server",

    async run({ sock, m, args }) {
        // ─── Tampilkan help / status ───
        if (!args[0] || args[0] === "info" || args[0] === "status") {
            const config = getPltcConfig()
            const maskedKey = config.key
                ? config.key.length > 8
                    ? config.key.substring(0, 8) + "..." + config.key.substring(config.key.length - 4)
                    : "********"
                : "_Belum diset_"

            const urlDisplay = config.url || "_Belum diset_"

            return m.reply(
                card(
                    "PLTC CONFIG",
                    [
                        `🔗 *URL:* ${urlDisplay}`,
                        `🔑 *Key:* ${maskedKey}`,
                        `📊 *Status:* ${isPltcConfigured() ? "✅ Terkonfigurasi" : "❌ Belum"}`,
                        "",
                        "─────────────────",
                        "",
                        "📋 *Command:*",
                        "",
                        `${global.prefix}setpltc <url> <key>`,
                        "└─ Set PLTC URL dan Key",
                        "",
                        `${global.prefix}setpltc clear`,
                        "└─ Hapus PLTC config",
                        "",
                        "─────────────────",
                        "",
                        "📝 *Contoh:*",
                        `${global.prefix}setpltc https://panel.example.com ptlc_client_key_xxx`,
                        "",
                        "_PLTC = Client API Key (Account → API Credentials),",
                        "dipakai untuk live resource server._"
                    ],
                    { emoji: "🗝️" }
                )
            )
        }

        // ─── Clear PLTC ───
        if (args[0] === "clear" || args[0] === "reset" || args[0] === "remove") {
            clearPltc()
            return m.reply(card("✅ PLTC", ["🗑️ PLTC config berhasil dihapus."], { emoji: "🗑️" }))
        }

        // ─── Set PLTC URL dan Key ───
        if (args.length < 2) {
            return m.reply(
                card("ERROR", [
                    "❌ Format salah.",
                    "",
                    "Penggunaan:",
                    `${global.prefix}setpltc <url> <key>`,
                    "",
                    "Contoh:",
                    `${global.prefix}setpltc https://panel.example.com ptlc_client_key_xxx`
                ], { emoji: "❌" })
            )
        }

        const [url, ...keyParts] = args
        const key = keyParts.join(" ")

        try {
            const result = setPltcConfig(url, key)

            const maskedKey = result.key.length > 8
                ? result.key.substring(0, 8) + "..."
                : "********"

            return m.reply(
                card(
                    "✅ PLTC SET",
                    [
                        "🗝️ PLTC berhasil dikonfigurasi!",
                        "",
                        `🔗 URL: ${result.url}`,
                        `🔑 Key: ${maskedKey}`,
                        "",
                        "─────────────────",
                        "",
                        "PLTC sekarang dipakai untuk",
                        "live resource server (Client API)."
                    ],
                    { emoji: "🗝️" }
                )
            )
        } catch (error) {
            return m.reply(card("ERROR", [`❌ ${error.message}`], { emoji: "❌" }))
        }
    }
}
