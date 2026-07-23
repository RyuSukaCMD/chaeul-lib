import { card } from "../../lib/ui.js"
import { closeUrgent, isUrgentOpen, getUrgentConfig } from "../../lib/urgent.js"

export default {
    command: ["closeurgent", "urgentclose"],

    owner: true,

    category: "Owner",

    description: "Tutup sistem urgent",

    async run({ sock, m }) {
        if (!isUrgentOpen()) {
            return m.reply(
                card("INFO", ["ℹ️ Sistem urgent sudah *DITUTUP* sebelumnya."], { emoji: "ℹ️" })
            )
        }

        closeUrgent()

        const config = getUrgentConfig()
        const claimedCount = Object.keys(config.claimedUUIDs || {}).length

        return m.reply(
            card(
                "🔴 URGENT CLOSED",
                [
                    "🔴 Sistem urgent berhasil *DITUTUP*!",
                    "",
                    "─────────────────",
                    "",
                    "📊 *Statistik:*",
                    `├ UUID sudah di-claim: ${claimedCount}`,
                    "",
                    "─────────────────",
                    "",
                    "_User tidak bisa lagi menggunakan .urgent_"
                ],
                { emoji: "🔴" }
            )
        )
    }
}
