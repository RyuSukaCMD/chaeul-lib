import { card } from "../../lib/ui.js"
import {
    getPltaConfig,
    isPltaConfigured,
    setPltaConfig,
    clearPlta
} from "../../lib/urgent.js"

export default {
    command: ["setplta"],

    owner: true,

    category: "Owner",

    description: "Set PLTA untuk create panel/user",

    async run({ sock, m, args }) {
        // ─── Tampilkan help / status ───
        if (!args[0] || args[0] === "info" || args[0] === "status") {
            const config = getPltaConfig()
            const maskedKey = config.key
                ? config.key.length > 8
                    ? config.key.substring(0, 8) + "..." + config.key.substring(config.key.length - 4)
                    : "********"
                : "_Belum diset_"
            
            const urlDisplay = config.url || "_Belum diset_"

            return m.reply(
                card(
                    "PLTA CONFIG",
                    [
                        `🔗 *URL:* ${urlDisplay}`,
                        `🔑 *Key:* ${maskedKey}`,
                        "",
                        "─────────────────",
                        "",
                        "📋 *Command:*",
                        "",
                        `${global.prefix}setplta <url> <key>`,
                        "└─ Set PLTA URL dan Key",
                        "",
                        `${global.prefix}setplta clear`,
                        "└─ Hapus PLTA config",
                        "",
                        "─────────────────",
                        "",
                        "📝 *Contoh:*",
                        `${global.prefix}setplta https://plta.example.com plta_secret_key_xxx`
                    ],
                    { emoji: "🔑" }
                )
            )
        }

        // ─── Clear PLTA ───
        if (args[0] === "clear" || args[0] === "reset" || args[0] === "remove") {
            clearPlta()
            return m.reply(
                card("✅ PLTA", ["🗑️ PLTA config berhasil dihapus."], { emoji: "🗑️" })
            )
        }

        // ─── Set PLTA URL dan Key ───
        if (args.length < 2) {
            return m.reply(
                card("ERROR", [
                    "❌ Format salah.",
                    "",
                    "Penggunaan:",
                    `${global.prefix}setplta <url> <key>`,
                    "",
                    "Contoh:",
                    `${global.prefix}setplta https://plta.example.com plta_secret_key_xxx`
                ], { emoji: "❌" })
            )
        }

        const [url, ...keyParts] = args
        const key = keyParts.join(" ")

        try {
            const result = setPltaConfig(url, key)
            
            const maskedKey = result.key.length > 8
                ? result.key.substring(0, 8) + "..."
                : "********"
            
            return m.reply(
                card(
                    "✅ PLTA SET",
                    [
                        "🔑 PLTA berhasil dikonfigurasi!",
                        "",
                        `🔗 URL: ${result.url}`,
                        `🔑 Key: ${maskedKey}`,
                        "",
                        "─────────────────",
                        "",
                        "PLTA sekarang bisa digunakan",
                        "untuk membuat user/panel."
                    ],
                    { emoji: "🔑" }
                )
            )
        } catch (error) {
            return m.reply(card("ERROR", [`❌ ${error.message}`], { emoji: "❌" }))
        }
    }
}
