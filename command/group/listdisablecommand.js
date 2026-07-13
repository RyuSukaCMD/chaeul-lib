import { card } from "../../lib/ui.js"
import { checkAdmin } from "../../lib/groupadmin.js"
import { listDisabled } from "../../lib/groupmanage.js"

export default {
    command: ["listdisablecommand", "listdisabledcommand", "listdisable"],

    category: "Group",

    description: "Lihat command yang dimatikan / khusus admin di grup",

    async run({ sock, m, isCreator }) {
        if (!m.isGroup) return m.reply("Command ini hanya untuk grup.")

        const { isAdmin } = await checkAdmin(sock, m, isCreator)
        if (!isAdmin) return m.reply(card("GROUP", "Khusus admin grup.", { emoji: "🔒" }))

        const { disabled, adminOnly, all } = listDisabled(m.chat)

        if (!all && !disabled.length && !adminOnly.length) {
            return m.reply(
                card("DISABLED COMMAND", "Tidak ada command yang dimatikan. ✅", { emoji: "⚙️" })
            )
        }

        const lines = []
        if (all) {
            lines.push(`⛔ *SEMUA command dimatikan.*`)
            lines.push(`   (kecuali group management)`)
            lines.push(`   Aktifkan: ${global.prefix}enablecommand all`)
            lines.push("")
        }
        if (disabled.length) {
            lines.push(`🚫 *Dimatikan:*`)
            lines.push(...disabled.map((c) => `  ◦ ${c}`))
        }
        if (adminOnly.length) {
            if (lines.length) lines.push("")
            lines.push(`🔒 *Khusus Admin:*`)
            lines.push(...adminOnly.map((c) => `  ◦ ${c}`))
        }

        return m.reply(card("DISABLED COMMAND", lines, { emoji: "⚙️" }))
    }
}
