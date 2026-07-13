import { delBlacklist, isBlacklist } from "../../lib/blacklistgroup.js"
import { card } from "../../lib/ui.js"

export default {
    command: ["delblacklistgroup", "delbl"],

    owner: true,

    category: "Owner",

    description: "Hapus grup dari blacklist",

    async run({ m }) {
        if (!m.isGroup) {
            return m.reply(
                card("DEL BLACKLIST", "Command hanya bisa dipakai di grup.", { emoji: "🚫" })
            )
        }

        if (!isBlacklist(m.chat)) {
            return m.reply(
                card("DEL BLACKLIST", "Grup ini tidak ada di blacklist.", { emoji: "🚫" })
            )
        }

        delBlacklist(m.chat)

        await m.react("✅")

        return m.reply(card("DEL BLACKLIST", "✅ Grup dihapus dari blacklist.", { emoji: "🚫" }))
    }
}
