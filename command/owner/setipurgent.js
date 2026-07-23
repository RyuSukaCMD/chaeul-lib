import { card } from "../../lib/ui.js"
import {
    getIpAlias,
    getIpAddress,
    setIpAlias,
    setIpAddress,
    setIpConfig,
    resetIpConfig
} from "../../lib/urgent.js"

export default {
    command: ["setipurgent", "ipurgent", "setip", "ipconfig"],

    owner: true,

    category: "Owner",

    description: "Set IP alias dan address untuk server urgent",

    async run({ sock, m, args }) {
        // ─── Tampilkan help / status ───
        if (!args[0] || args[0] === "info" || args[0] === "status") {
            const alias = getIpAlias()
            const ip = getIpAddress()

            return m.reply(
                card(
                    "IP CONFIG",
                    [
                        `🌐 *IP Alias:* ${alias}`,
                        `📍 *IP Address:* ${ip}`,
                        "",
                        "─────────────────",
                        "",
                        "📋 *Command:*",
                        "",
                        `${global.prefix}setipurgent alias <alias>`,
                        "└─ Set IP alias saja",
                        "",
                        `${global.prefix}setipurgent ip <ip>`,
                        "└─ Set IP address saja",
                        "",
                        `${global.prefix}setipurgent <alias> <ip>`,
                        "└─ Set keduanya sekaligus",
                        "",
                        `${global.prefix}setipurgent reset`,
                        "└─ Reset ke default",
                        "",
                        "─────────────────",
                        "",
                        "📝 *Default:*",
                        "├ Alias: pvnode-4.nexhostku.com",
                        "└─ IP: 0.0.0.0"
                    ],
                    { emoji: "🌐" }
                )
            )
        }

        // ─── Reset ke default ───
        if (args[0] === "reset" || args[0] === "default") {
            const result = resetIpConfig()
            return m.reply(
                card(
                    "✅ RESET",
                    [
                        "IP config berhasil di-reset ke default:",
                        "",
                        `🌐 *Alias:* ${result.ipAlias}`,
                        `📍 *IP:* ${result.ipAddress}`
                    ],
                    { emoji: "✅" }
                )
            )
        }

        // ─── Set alias saja ───
        if (args[0] === "alias") {
            if (!args[1]) {
                return m.reply(
                    card("ERROR", [
                        "❌ Sertakan alias yang diinginkan.",
                        "",
                        `${global.prefix}setipurgent alias pvnode-5.nexhostku.com`
                    ], { emoji: "❌" })
                )
            }

            const alias = args.slice(1).join(" ").trim()
            if (alias.length > 100) {
                return m.reply(card("ERROR", ["❌ Alias terlalu panjang (maks 100 karakter)."], { emoji: "❌" }))
            }

            const newAlias = setIpAlias(alias)
            return m.reply(
                card(
                    "✅ ALIAS SET",
                    [`🌐 IP Alias berhasil diset: *${newAlias}*`],
                    { emoji: "🌐" }
                )
            )
        }

        // ─── Set IP saja ───
        if (args[0] === "ip") {
            if (!args[1]) {
                return m.reply(
                    card("ERROR", [
                        "❌ Sertakan IP address.",
                        "",
                        `${global.prefix}setipurgent ip 192.168.1.1`,
                        `${global.prefix}setipurgent ip 0.0.0.0`
                    ], { emoji: "❌" })
                )
            }

            const ip = args[1].trim()
            
            // Validasi format IP
            const ipPattern = /^(\d{1,3}\.){3}\d{1,3}$|^0\.0\.0\.0$|^::$/i
            if (!ipPattern.test(ip)) {
                return m.reply(
                    card("ERROR", [
                        "❌ Format IP tidak valid.",
                        "",
                        "Contoh IP yang benar:",
                        "├ 192.168.1.1",
                        "├ 10.0.0.1",
                        "└─ 0.0.0.0"
                    ], { emoji: "❌" })
                )
            }

            try {
                const newIp = setIpAddress(ip)
                return m.reply(
                    card(
                        "✅ IP SET",
                        [`📍 IP Address berhasil diset: *${newIp}*`],
                        { emoji: "📍" }
                    )
                )
            } catch (error) {
                return m.reply(card("ERROR", [`❌ ${error.message}`], { emoji: "❌" }))
            }
        }

        // ─── Set keduanya sekaligus ───
        if (args.length >= 2) {
            // Cek apakah args[0] adalah "alias" atau langsung alias
            let alias, ip

            if (args[0] === "alias" && args[2]) {
                alias = args.slice(1, -1).join(" ").trim()
                ip = args[args.length - 1].trim()
            } else if (args[0] === "ip") {
                // Format: .setipurgent ip 192.168.1.1 my-alias.domain.com
                ip = args[1].trim()
                alias = args.slice(2).join(" ").trim()
            } else {
                // Format: .setipurgent my-alias.domain.com 192.168.1.1
                alias = args[0]
                ip = args[1].trim()
            }

            if (!alias || !ip) {
                return m.reply(
                    card("ERROR", [
                        "❌ Format salah.",
                        "",
                        "Gunakan:",
                        `${global.prefix}setipurgent <alias> <ip>`,
                        "",
                        "Contoh:",
                        `${global.prefix}setipurgent pvnode-5.nexhostku.com 192.168.1.1`
                    ], { emoji: "❌" })
                )
            }

            // Validasi IP
            const ipPattern = /^(\d{1,3}\.){3}\d{1,3}$|^0\.0\.0\.0$|^::$/i
            if (!ipPattern.test(ip)) {
                return m.reply(
                    card("ERROR", [
                        "❌ Format IP tidak valid.",
                        `IP yang kamu masukkan: ${ip}`
                    ], { emoji: "❌" })
                )
            }

            if (alias.length > 100) {
                return m.reply(card("ERROR", ["❌ Alias terlalu panjang (maks 100 karakter)."], { emoji: "❌" }))
            }

            try {
                const result = setIpConfig(alias, ip)
                return m.reply(
                    card(
                        "✅ IP CONFIG SET",
                        [
                            "🌐 *IP Alias:* " + result.ipAlias,
                            "📍 *IP Address:* " + result.ipAddress,
                            "",
                            "Config berhasil disimpan!"
                        ],
                        { emoji: "✅" }
                    )
                )
            } catch (error) {
                return m.reply(card("ERROR", [`❌ ${error.message}`], { emoji: "❌" }))
            }
        }

        // ─── Help ───
        return m.reply(
            card(
                "IP CONFIG",
                [
                    "Penggunaan:",
                    "",
                    `${global.prefix}setipurgent <alias> <ip>`,
                    `${global.prefix}setipurgent alias <alias>`,
                    `${global.prefix}setipurgent ip <ip>`,
                    `${global.prefix}setipurgent reset`
                ],
                { emoji: "🌐" }
            )
        )
    }
}
