import { addBlacklist, isBlacklist } from "../../lib/blacklistgroup.js"
import { card } from "../../lib/ui.js"

export default {
    command: ["blacklistgroup", "blgroup"],

    owner: true,

    category: "Owner",

    description: "Blacklist grup saat ini",

    async run({ m }) {
        if (!m.isGroup) {
            return m.reply(
                card("BLACKLIST GROUP", "Command hanya bisa dipakai di grup.", { emoji: "🚫" })
            )
        }

        if (isBlacklist(m.chat)) {
            return m.reply(card("BLACKLIST GROUP", "Grup ini sudah diblacklist.", { emoji: "🚫" }))
        }

        addBlacklist(m.chat)

        await m.react("✅")

        return m.reply(
            card("BLACKLIST GROUP", ["✅ Grup ditambahkan ke blacklist.", "", `🆔 ${m.chat}`], {
                emoji: "🚫"
            })
        )
    }
}
