import { card } from "../../lib/ui.js"
import { getPanelUrl, isPanelConfigured } from "../../lib/urgent.js"

export default {
    command: ["panelurl"],

    owner: true,

    category: "Owner",

    description: "Lihat URL panel Pterodactyl",

    async run({ sock, m }) {
        const url = getPanelUrl()

        if (!isPanelConfigured()) {
            return m.reply(
                card(
                    "PANEL URL",
                    [
                        "⚠️ Panel Pterodactyl belum dikonfigurasi.",
                        "",
                        "Gunakan command berikut untuk mengatur:",
                        "",
                        `${global.prefix}setpterodactyl <url> <api_key>`,
                        "",
                        "Contoh:",
                        `${global.prefix}setpterodactyl https://panel.example.com ptsecret-xxxxx`
                    ],
                    { emoji: "🌐" }
                )
            )
        }

        return m.reply(
            card(
                "PANEL URL",
                [
                    `🌐 *URL Panel:*`,
                    "",
                    `${url}`,
                    "",
                    "─────────────────",
                    "",
                    "📝 Command terkait:",
                    `├ ${global.prefix}setpterodactyl - Update config`,
                    `├ ${global.prefix}nodestatus    - Status node`,
                    `├ ${global.prefix}urgent        - Claim server`
                ],
                { emoji: "🌐" }
            )
        )
    }
}
