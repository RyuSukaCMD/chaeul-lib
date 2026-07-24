import { card } from "../../lib/ui.js"
import { setConfig as setPteroConfig, isConfigured as isPteroConfigured, getConfig as getPteroConfig } from "../../lib/pterodactyl.js"
import { setPltaConfig, getPltaConfig, isPltaConfigured, setPltcConfig, getPltcConfig, isPltcConfigured } from "../../lib/urgent.js"

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
            const pltcConfig = getPltcConfig()

            const mask = (key) =>
                key
                    ? key.length > 8
                        ? key.substring(0, 8) + "..."
                        : "********"
                    : "_Belum diset_"

            return m.reply(card("SETUP STATUS", [
                "⚙️ *Konfigurasi Saat Ini:*",
                "",
                "📦 *Pterodactyl (Panel Utama):*",
                "├ URL: " + (pteroConfig.url || "_Belum diset_"),
                "├ Key: " + mask(pteroConfig.key),
                "├ Status: " + (isPteroConfigured() ? "✅ Terkonfigurasi" : "❌ Belum"),
                "",
                "🔑 *PLTA (Application Key):*",
                "├ URL: " + (pltaConfig.url || "_Belum diset_"),
                "├ Key: " + mask(pltaConfig.key),
                "├ Status: " + (isPltaConfigured() ? "✅ Terkonfigurasi" : "❌ Belum"),
                "",
                "🗝️ *PLTC (Client Key):*",
                "├ URL: " + (pltcConfig.url || "_Belum diset_"),
                "├ Key: " + mask(pltcConfig.key),
                "├ Status: " + (isPltcConfigured() ? "✅ Terkonfigurasi" : "❌ Belum"),
                "",
                "─────────────────",
                "",
                "📋 *Command:*",
                "",
                global.prefix + "setup ptero <url> <key>",
                global.prefix + "setup plta <url> <key>",
                global.prefix + "setup pltc <url> <key>",
                "",
                " Atau via command khusus:",
                global.prefix + "setpterodactyl / setplta / setpltc"
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

        // ─── Setup PLTC saja ───
        if (args[0] === "pltc") {
            if (args.length < 3) {
                return m.reply(card("ERROR", [
                    "❌ Format salah.",
                    "",
                    global.prefix + "setup pltc <url> <key>",
                    "",
                    "Contoh:",
                    global.prefix + "setup pltc https://panel.com ptlc_client_key"
                ], { emoji: "❌" }))
            }

            const key = args.slice(2).join(" ")

            try {
                setPltcConfig(args[1], key)
                return m.reply(card("✅ PLTC SET", [
                    "🗝️ PLTC berhasil dikonfigurasi!",
                    "",
                    "URL: " + args[1],
                    "Status: ✅ Siap digunakan"
                ], { emoji: "🗝️" }))
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
            "Semua sekaligus (ptero + plta):",
            global.prefix + "setup <ptero_url> <ptero_key> <plta_url> <plta_key>",
            "",
            "Terpisah:",
            global.prefix + "setup ptero <url> <key>",
            global.prefix + "setup plta <url> <key>",
            global.prefix + "setup pltc <url> <key>",
            "",
            "Cek status:",
            global.prefix + "setup"
        ], { emoji: "⚙️" }))
    }
}
