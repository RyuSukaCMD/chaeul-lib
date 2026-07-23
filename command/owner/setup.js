import { card } from "../../lib/ui.js"
import { setConfig as setPteroConfig, isConfigured as isPteroConfigured, getConfig as getPteroConfig } from "../../lib/pterodactyl.js"
import { setPltaConfig, getPltaConfig, isPltaConfigured } from "../../lib/urgent.js"

export default {
    command: ["setup"],
    owner: true,
    category: "Owner",
    description: "Setup Pterodactyl dan PLTA",

    async run({ sock, m, args }) {
        // ─── Tampilkan status / help ───
        if (!args[0] || args[0] === "info" || args[0] === "status") {
            const pteroConfig = getPteroConfig()
            const pltaConfig = getPltaConfig()

            const pteroUrl = pteroConfig.url || "_Belum diset_"
            const pteroKeyMask = pteroConfig.key 
                ? (pteroConfig.key.length > 8 
                    ? pteroConfig.key.substring(0, 8) + "..." 
                    : "********") 
                : "_Belum diset_"

            const pltaUrl = pltaConfig.url || "_Belum diset_"
            const pltaKeyMask = pltaConfig.key 
                ? (pltaConfig.key.length > 8 
                    ? pltaConfig.key.substring(0, 8) + "..." 
                    : "********") 
                : "_Belum diset_"

            return m.reply(card("SETUP STATUS", [
                "⚙️ *Konfigurasi Saat Ini:*",
                "",
                "📦 *Pterodactyl (Panel Utama):*",
                "├ URL: " + pteroUrl,
                "├ Key: " + pteroKeyMask,
                "├ Status: " + (isPteroConfigured() ? "✅ Terkonfigurasi" : "❌ Belum"),
                "",
                "🔑 *PLTA (Create Panel):*",
                "├ URL: " + pltaUrl,
                "├ Key: " + pltaKeyMask,
                "├ Status: " + (isPltaConfigured() ? "✅ Terkonfigurasi" : "❌ Belum"),
                "",
                "─────────────────",
                "",
                "📋 *Command:*",
                "",
                global.prefix + "setup <ptero_url> <ptero_key> <plta_url> <plta_key>",
                "",
                " Atau pisah:",
                global.prefix + "setup ptero <url> <key>",
                global.prefix + "setup plta <url> <key>",
                "",
                " Contoh lengkap:",
                global.prefix + "setup https://panel.com key123 https://plta.com plta456"
            ], { emoji: "⚙️" }))
        }

        // ─── Setup Pterodactyl saja ───
        if (args[0] === "ptero") {
            if (args.length < 3) {
                return m.reply(card("ERROR", [
                    "❌ Format salah.",
                    "",
                    global.prefix + "setup ptero <url> <key>",
                    "",
                    "Contoh:",
                    global.prefix + "setup ptero https://panel.com ptla_secret_key"
                ], { emoji: "❌" }))
            }

            const [cmd, url, ...keyParts] = args
            const key = keyParts.join(" ")

            try {
                setPteroConfig(url, key)
                return m.reply(card("✅ PTERO SET", [
                    "📦 Pterodactyl berhasil dikonfigurasi!",
                    "",
                    "URL: " + url,
                    "Status: ✅ Siap digunakan"
                ], { emoji: "📦" }))
            } catch (error) {
                return m.reply(card("ERROR", ["❌ " + error.message], { emoji: "❌" }))
            }
        }

        // ─── Setup PLTA saja ───
        if (args[0] === "plta") {
            if (args.length < 3) {
                return m.reply(card("ERROR", [
                    "❌ Format salah.",
                    "",
                    global.prefix + "setup plta <url> <key>",
                    "",
                    "Contoh:",
                    global.prefix + "setup plta https://plta.com plta_secret_key"
                ], { emoji: "❌" }))
            }

            const [cmd, url, ...keyParts] = args
            const key = keyParts.join(" ")

            try {
                setPltaConfig(url, key)
                return m.reply(card("✅ PLTA SET", [
                    "🔑 PLTA berhasil dikonfigurasi!",
                    "",
                    "URL: " + url,
                    "Status: ✅ Siap digunakan"
                ], { emoji: "🔑" }))
            } catch (error) {
                return m.reply(card("ERROR", ["❌ " + error.message], { emoji: "❌" }))
            }
        }

        // ─── Setup keduanya sekaligus ───
        if (args.length >= 4) {
            const [pteroUrl, pteroKey, pltaUrl, pltaKey, ...extra] = args

            let results = { ptero: null, plta: null }

            // Setup Pterodactyl
            try {
                setPteroConfig(pteroUrl, pteroKey)
                results.ptero = { success: true, url: pteroUrl }
            } catch (error) {
                results.ptero = { success: false, error: error.message }
            }

            // Setup PLTA
            try {
                setPltaConfig(pltaUrl, pltaKey)
                results.plta = { success: true, url: pltaUrl }
            } catch (error) {
                results.plta = { success: false, error: error.message }
            }

            // Build response
            let statusText = "⚙️ *Hasil Setup:*\n\n"

            if (results.ptero.success) {
                statusText += "📦 Pterodactyl: ✅ Berhasil\n"
                statusText += "   URL: " + results.ptero.url + "\n\n"
            } else {
                statusText += "📦 Pterodactyl: ❌ Gagal\n"
                statusText += "   Error: " + results.ptero.error + "\n\n"
            }

            if (results.plta.success) {
                statusText += "🔑 PLTA: ✅ Berhasil\n"
                statusText += "   URL: " + results.plta.url + "\n\n"
            } else {
                statusText += "🔑 PLTA: ❌ Gagal\n"
                statusText += "   Error: " + results.plta.error + "\n\n"
            }

            statusText += "─────────────────\n\n"
            statusText += "Sekarang kamu bisa menggunakan:\n"
            statusText += "├ " + global.prefix + "nodestatus - Cek status node\n"
            statusText += "├ " + global.prefix + "openurgent - Buka sistem urgent\n"
            statusText += "└ " + global.prefix + "urgentstatus - Status urgent"

            return m.reply(card("SETUP COMPLETE", [
                statusText
            ], { emoji: "✅" }))
        }

        // ─── Help ───
        return m.reply(card("SETUP", [
            "⚙️ *Cara Setup:*",
            "",
            "Semua sekaligus:",
            global.prefix + "setup <ptero_url> <ptero_key> <plta_url> <plta_key>",
            "",
            "Terpisah:",
            global.prefix + "setup ptero <url> <key>",
            global.prefix + "setup plta <url> <key>",
            "",
            "Cek status:",
            global.prefix + "setup"
        ], { emoji: "⚙️" }))
    }
}
