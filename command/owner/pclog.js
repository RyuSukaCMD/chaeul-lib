import { card } from "../../lib/ui.js"
import { getPcLog } from "../../lib/pclog.js"

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
            return m.reply(card("PRIVATE CHAT LOG", "Belum ada private chat tercatat.", { emoji: "📒" }))

        const lines = [`📊 Total: ${users.length} nomor tersimpan`, ""]
        const mentions = []

        users.slice(0, 20).forEach((u, i) => {
            mentions.push(`${u.num}@s.whatsapp.net`)
            lines.push(`${i + 1}. @${u.num}${u.name ? ` — ${u.name}` : ""}`)
            lines.push(`   ${u.count} pesan • terakhir ${wib(u.last)}`)
        })

        if (users.length > 20) lines.push("", `…dan ${users.length - 20} nomor lainnya.`)

        return m.reply(card("PRIVATE CHAT LOG", lines, { emoji: "📒" }), { mentions })
    }
}
