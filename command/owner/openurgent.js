import { card } from "../../lib/ui.js"
import { openUrgent, isUrgentOpen, getUrgentConfig } from "../../lib/urgent.js"
import { getNodes } from "../../lib/pterodactyl.js"

export default {
    command: ["openurgent", "urgentopen"],

    owner: true,

    category: "Owner",

    description: "Buka sistem urgent untuk user",

    async run({ sock, m }) {
        if (isUrgentOpen()) {
            return m.reply(
                card("INFO", ["ℹ️ Sistem urgent sudah *DIBUKA* sebelumnya."], { emoji: "ℹ️" })
            )
        }

        openUrgent()

        // Cek apakah sudah ada config
        const config = getUrgentConfig()
        const hasDefaultNode = !!config.defaultNode
        const blacklistCount = (config.blacklistNodes || []).length
        const whitelistCount = (config.whitelistNodes || []).length

        let warnText = ""
        if (!hasDefaultNode) {
            warnText += "\n⚠️ *Peringatan:* Default node belum diset!\nGunakan `.nodeto <node_id>` untuk set node target."
        }

        return m.reply(
            card(
                "✅ URGENT OPENED",
                [
                    "🟢 Sistem urgent berhasil *DIBUKA*!",
                    "",
                    "─────────────────",
                    "",
                    "📊 *Status:*",
                    `├ Default Node: ${hasDefaultNode ? `ID ${config.defaultNode}` : "_Belum diset_"}`,
                    `├ Blacklist: ${blacklistCount} node`,
                    `├ Whitelist: ${whitelistCount} node`,
                    "",
                    "─────────────────",
                    "",
                    "📋 *Command untuk user:*",
                    `${global.prefix}urgent <uuid>`,
                    "",
                    warnText
                ],
                { emoji: "🟢" }
            )
        )
    }
}
