import { card } from "../../lib/ui.js"
import { getPcLog, getRecentPc } from "../../lib/pclog.js"
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
    command: ["pclog", "pcloglist"],

    owner: true,

    category: "Owner",

    description: "Daftar nomor yang pernah chat private ke bot",

    async run({ m }) {
        const users = getPcLog()

        if (!users.length)
            return m.reply(
                card("PRIVATE CHAT LOG", "Belum ada private chat tercatat.", { emoji: "📒" })
            )

        const blocked = users.filter((u) => u.blocked).length
        const recent = getRecentPc(10)

        const lines = [
            `📊 Total   : ${users.length} nomor`,
            `🚷 Diblokir : ${blocked} nomor`,
            ""
        ]

        if (recent.length) {
            lines.push("━━━━━━━━━━━━━━━━━", "🕒 *CHAT TERBARU*", "")
            recent.forEach((r, i) => {
                const icon = r.action === "blocked" ? "🚷" : r.action === "ignored" ? "🔇" : "💬"
                lines.push(`${i + 1}. ${icon} ${r.display || toDisplay(r.num)}`)
                lines.push(`   ${r.name || "-"} • ${wib(r.at)}`)
            })
            lines.push("")
        }

        lines.push("━━━━━━━━━━━━━━━━━", "📇 *SEMUA NOMOR*", "")

        users.slice(0, 20).forEach((u, i) => {
            lines.push(
                `${i + 1}. ${u.display || toDisplay(u.num)}${u.blocked ? " 🚷" : ""}${u.country ? ` (${u.country})` : ""}`
            )
            lines.push(`   ${u.name || "-"} • ${u.count} pesan • ${wib(u.last)}`)
        })

        if (users.length > 20) lines.push("", `…dan ${users.length - 20} nomor lainnya.`)

        return m.reply(
            card("PRIVATE CHAT LOG", lines, {
                emoji: "📒",
                footer: "💬 = tercatat • 🔇 = diabaikan • 🚷 = diblokir"
            })
        )
    }
}
