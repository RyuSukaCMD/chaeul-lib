import { card } from "../../lib/ui.js"
import { getCallLog } from "../../lib/pclog.js"

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
        const recent = [...(db.recent || [])].reverse()

        if (!recent.length)
            return m.reply(card("CALL LOG", "Belum ada panggilan masuk tercatat.", { emoji: "📞" }))

        const blockedCount = callers.filter((c) => c.blocked).length
        const lines = [
            `📊 ${recent.length} panggilan dari ${callers.length} nomor`,
            `🚷 Terblokir: ${blockedCount} nomor`,
            ""
        ]
        const mentions = []

        recent.slice(0, 15).forEach((r) => {
            mentions.push(`${r.num}@s.whatsapp.net`)
            const icon = r.action === "rejected+blocked" ? "🚷" : "👁️"
            lines.push(`${icon} @${r.num}${r.isVideo ? " 📹" : ""} — ${r.action}`)
            lines.push(`   ${wib(r.at)}`)
        })

        if (recent.length > 15) lines.push("", `…dan ${recent.length - 15} panggilan lainnya.`)

        return m.reply(card("CALL LOG", lines, { emoji: "📞", footer: "🚷 = ditolak+block • 👁️ = hanya dicatat" }), { mentions })
    }
}
