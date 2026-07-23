import { card } from "../../lib/ui.js"
import {
    getPltaConfig,
    isPltaEnabled,
    setPltaWebhook,
    enablePlta,
    disablePlta,
    clearPlta
} from "../../lib/urgent.js"

export default {
    command: ["setplta", "plta"],

    owner: true,

    category: "Owner",

    description: "Set PLTA webhook untuk notifikasi",

    async run({ sock, m, args }) {
        // ─── Tampilkan help / status ───
        if (!args[0] || args[0] === "info" || args[0] === "status") {
            const config = getPltaConfig()
            const maskedWebhook = config.webhook
                ? config.webhook.length > 30
                    ? config.webhook.substring(0, 30) + "..."
                    : config.webhook
                : "_Belum diset_"

            return m.reply(
                card(
                    "PLTA CONFIG",
                    [
                        `📊 *Status:* ${config.enabled ? "🟢 AKTIF" : "🔴 NONAKTIF"}`,
                        `🔗 *Webhook:* ${maskedWebhook}`,
                        "",
                        "─────────────────",
                        "",
                        "📋 *Command:*",
                        "",
                        `${global.prefix}setplta <webhook>`,
                        "└─ Set webhook dan aktifkan",
                        "",
                        `${global.prefix}setplta enable`,
                        "└─ Aktifkan PLTA",
                        "",
                        `${global.prefix}setplta disable`,
                        "└─ Nonaktifkan PLTA",
                        "",
                        `${global.prefix}setplta clear`,
                        "└─ Hapus PLTA config",
                        "",
                        "─────────────────",
                        "",
                        "📝 *Catatan:*",
                        "PLTA adalah sistem notifikasi",
                        "yang akan mengirim data server",
                        "yang di-claim ke webhook."
                    ],
                    { emoji: "⚡" }
                )
            )
        }

        // ─── Enable PLTA ───
        if (args[0] === "enable" || args[0] === "on") {
            try {
                enablePlta()
                return m.reply(
                    card("✅ PLTA", ["🟢 PLTA berhasil diaktifkan."], { emoji: "⚡" })
                )
            } catch (error) {
                return m.reply(card("ERROR", [`❌ ${error.message}`], { emoji: "❌" }))
            }
        }

        // ─── Disable PLTA ───
        if (args[0] === "disable" || args[0] === "off") {
            disablePlta()
            return m.reply(
                card("✅ PLTA", ["🔴 PLTA berhasil dinonaktifkan."], { emoji: "⚡" })
            )
        }

        // ─── Clear PLTA ───
        if (args[0] === "clear" || args[0] === "reset" || args[0] === "remove") {
            clearPlta()
            return m.reply(
                card("✅ PLTA", ["🗑️ PLTA config berhasil dihapus."], { emoji: "🗑️" })
            )
        }

        // ─── Set webhook ───
        const webhook = args.join(" ").trim()

        if (!webhook) {
            return m.reply(
                card("ERROR", [
                    "❌ Sertakan webhook URL.",
                    "",
                    `${global.prefix}setplta https://your-webhook.com/notify`,
                    "",
                    "Webhook akan menerima POST request",
                    "saat ada server yang di-claim."
                ], { emoji: "❌" })
            )
        }

        // Validasi format URL
        try {
            new URL(webhook)
        } catch {
            return m.reply(
                card("ERROR", [
                    "❌ Format webhook tidak valid.",
                    "",
                    "Harus berupa URL lengkap:",
                    "https://your-domain.com/webhook"
                ], { emoji: "❌" })
            )
        }

        try {
            const result = setPltaWebhook(webhook)
            return m.reply(
                card(
                    "✅ PLTA SET",
                    [
                        "⚡ PLTA webhook berhasil diset!",
                        "",
                        `🔗 Webhook: ${webhook.substring(0, 50)}${webhook.length > 50 ? "..." : ""}`,
                        "",
                        "Status: 🟢 AKTIF",
                        "",
                        "Notifikasi akan dikirim saat",
                        "ada server yang di-claim."
                    ],
                    { emoji: "⚡" }
                )
            )
        } catch (error) {
            return m.reply(card("ERROR", [`❌ ${error.message}`], { emoji: "❌" }))
        }
    }
}
