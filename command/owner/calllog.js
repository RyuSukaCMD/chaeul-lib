import { card } from "../../lib/ui.js"
import { getCallLog, getRecentCalls } from "../../lib/pclog.js"
import { toDisplay } from "../../lib/phone.js"

const wib = (ts) =>
    ts
        ? new Date(ts).toLocaleString("id-ID", {
              timeZone: "Asia/Jakarta",
              dateStyle: "short",
              timeStyle: "short"
          })
        : "-"

export default {
    command: ["calllog", "callloglist"],

    owner: true,

    category: "Owner",

    description: "Log panggilan masuk ke bot (nomor + aksi)",

    async run({ m }) {
        const db = getCallLog()
        const callers = Object.values(db.callers || {}).sort((a, b) => (b.last || 0) - (a.last || 0))
        const recent = getRecentCalls(15)

        if (!recent.length)
            return m.reply(card("CALL LOG", "Belum ada panggilan masuk tercatat.", { emoji: "📞" }))

        const blockedCount = callers.filter((c) => c.blocked).length
        const totalCalls = (db.recent || []).length
        const lines = [
            `📊 ${totalCalls} panggilan dari ${callers.length} nomor`,
            `🚷 Terblokir: ${blockedCount} nomor`,
            ""
        ]
        lines.push("━━━━━━━━━━━━━━━━━", "🕒 *PANGGILAN TERBARU*", "")

        recent.forEach((r, i) => {
            const icon = r.action === "rejected+blocked" ? "🚷" : "👁️"
            lines.push(
                `${i + 1}. ${icon} ${r.display || toDisplay(r.num)}${r.isVideo ? " 📹" : ""}`
            )
            lines.push(`   ${r.action} • ${wib(r.at)}`)
        })

        lines.push("", "━━━━━━━━━━━━━━━━━", "📇 *SEMUA PENELEPON*", "")

        callers.slice(0, 15).forEach((c, i) => {
            lines.push(
                `${i + 1}. ${c.display || toDisplay(c.num)}${c.blocked ? " 🚷" : ""}${c.country ? ` (${c.country})` : ""}`
            )
            lines.push(`   ${c.count}x • terakhir ${wib(c.last)}`)
        })

        return m.reply(
            card("CALL LOG", lines, {
                emoji: "📞",
                footer: "🚷 = ditolak+block • 👁️ = hanya dicatat"
            })
        )
    }
}
