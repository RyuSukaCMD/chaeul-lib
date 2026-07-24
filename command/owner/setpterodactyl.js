import { card } from "../../lib/ui.js"
import { setConfig, isConfigured, getConfig, clearConfig } from "../../lib/pterodactyl.js"

export default {
    command: ["setpterodactyl", "pteroconfig"],

    category: "Owner",

    description: "Atur konfigurasi Pterodactyl Panel",

    owner: true,

    async run({ sock, m, args }) {
        // ─── Hapus konfigurasi ───
        if (args[0] === "reset" || args[0] === "remove" || args[0] === "delete") {
            if (!isConfigured()) {
                return m.reply(
                    card("PTERODACTYL", ["❌ Konfigurasi belum ada."], { emoji: "⚙️" })
                )
            }

            clearConfig()
            return m.reply(
                card("PTERODACTYL", ["✅ Konfigurasi Pterodactyl berhasil dihapus."], {
                    emoji: "🗑️"
                })
            )
        }

        // ─── Tampilkan konfigurasi saat ini ───
        if (args.length === 0 || (args.length === 1 && args[0] === "info")) {
            const cfg = getConfig()

            if (!cfg.url || !cfg.key) {
                return m.reply(
                    card(
                        "PTERODACTYL CONFIG",
                        [
                            "⚠️ Konfigurasi belum diatur.",
                            "",
                            `${global.prefix}setpterodactyl <url> <api_key>`,
                            "",
                            "Contoh:",
                            `${global.prefix}setpterodactyl https://panel.example.com ptsecret-xxxxx`
                        ],
                        { emoji: "⚙️" }
                    )
                )
            }

            // Mask API key
            const maskedKey = cfg.key.length > 8
                ? cfg.key.substring(0, 8) + "..." + cfg.key.substring(cfg.key.length - 4)
                : "********"

            const lastUpdate = cfg.updatedAt
                ? new Date(cfg.updatedAt).toLocaleString("id-ID", { timeZone: "Asia/Jakarta" })
                : "Belum pernah"

            return m.reply(
                card(
                    "PTERODACTYL CONFIG",
                    [
                        `🌐 URL: *${cfg.url}*`,
                        `🔑 Key: *${maskedKey}*`,
                        ``,
                        `📅 Diatur: ${lastUpdate}`,
                        ``,
                        `_Tip: Gunakan \`${global.prefix}setpterodactyl reset\` untuk menghapus konfigurasi._`
                    ],
                    { emoji: "⚙️" }
                )
            )
        }

        // ─── Set konfigurasi baru ───
        if (args.length < 2) {
            return m.reply(
                card(
                    "PTERODACTYL",
                    [
                        "⚠️ Format salah.",
                        "",
                        `${global.prefix}setpterodactyl <url> <api_key>`,
                        "",
                        "Contoh:",
                        `${global.prefix}setpterodactyl https://panel.example.com ptsecret-xxxxx`
                    ],
                    { emoji: "⚙️" }
                )
            )
        }

        const [url, ...keyParts] = args
        const apiKey = keyParts.join(" ")

        try {
            const config = setConfig(url, apiKey)

            return m.reply(
                card(
                    "PTERODACTYL",
                    [
                        "✅ Konfigurasi berhasil disimpan!",
                        "",
                        `🌐 URL: *${config.url}*`,
                        `🔑 API Key: *${apiKey.substring(0, 8)}...*`,
                        "",
                        "Sekarang kamu bisa menggunakan:",
                        `• ${global.prefix}nodestatus`,
                        `• ${global.prefix}nodes`,
                        `• ${global.prefix}node`
                    ],
                    { emoji: "✅" }
                )
            )
        } catch (error) {
            return m.reply(
                card("ERROR", [`❌ ${error.message}`], { emoji: "❌" })
            )
        }
    }
}
